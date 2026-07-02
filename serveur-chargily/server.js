const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const mysql   = require("mysql2/promise");

const app = express();
app.use(cors());

// ─── Map en mémoire pour le polling rapide ───────────────────────────────────
const confirmedCheckouts = new Map();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use("/chargily/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ─── CONNEXION MYSQL ──────────────────────────────────────────────────────────
let db;
async function connectDB() {
  db = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "auto_ecole_db",
  });
  console.log("✅ Connecté à MySQL");
}
connectDB();

// ─── ROUTE 1 — Créer un checkout + enregistrer candidat / paiement / versement
app.post("/chargily/payer", async (req, res) => {
  const {
    idCandidat,
    montant,             // montant de CETTE tranche
    nomCandidat,
    prenomCandidat,
    dateNaissance,       // format "YYYY-MM-DD"
    sexe,                // "M" ou "F"
    prixFormationTotal,  // prix total configuré dans Paramètres
    chargilyKey,
    chargilyMode,
  } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!idCandidat || !montant || !chargilyKey) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }
  if (!nomCandidat || !prenomCandidat || !dateNaissance || !sexe) {
    return res.status(400).json({
      success: false,
      message: "Infos candidat incomplètes (nom, prénom, date de naissance, sexe requis)",
    });
  }
  if (!prixFormationTotal) {
    return res.status(400).json({ success: false, message: "Prix total de la formation manquant" });
  }

  const baseUrl = chargilyMode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";

  const APP_URL = process.env.APP_URL || "https://permismanager.onrender.com";

  try {
    // ── 1) Créer le checkout côté Chargily ──────────────────────────────────
    const response = await axios.post(
      `${baseUrl}/checkouts`,
      {
        amount:           montant,
        currency:         "dzd",
        success_url:      `${APP_URL}/chargily/retour?status=success`,
        failure_url:      `${APP_URL}/chargily/retour?status=failed`,
        webhook_endpoint: `${APP_URL}/chargily/webhook`,
        locale:           "fr",
        description:      `Formation permis — ${nomCandidat} ${prenomCandidat}`,
        metadata: { idCandidat: String(idCandidat), montant: String(montant) },
      },
      { headers: { "Authorization": `Bearer ${chargilyKey}`, "Content-Type": "application/json" } }
    );
    const checkout = response.data;

    // ── 2) S'assurer que le candidat existe dans Railway ────────────────────
    // insertId est fiable même en cas d'UPDATE (ON DUPLICATE KEY) : MySQL renvoie
    // l'id existant si on force idCandidat explicitement.
    await db.query(
      `INSERT INTO Candidat (idCandidat, nom, prenom, date_naissance, sexe)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nom = VALUES(nom), prenom = VALUES(prenom)`,
      [idCandidat, nomCandidat, prenomCandidat, dateNaissance, sexe]
    );

    // ── 3) Trouver un paiement global existant et non soldé, sinon en créer un
    const [existing] = await db.query(
      `SELECT idPaiement, montantRestant
       FROM Paiement
       WHERE idCandidat = ? AND statutPaiement != 'payé'
       ORDER BY idPaiement DESC LIMIT 1`,
      [idCandidat]
    );

    let idPaiement;
    if (existing.length > 0) {
      idPaiement = existing[0].idPaiement;
    } else {
      const [result] = await db.query(
        `INSERT INTO Paiement (montantTotal, montantRestant, typePaiement, statutPaiement, idCandidat)
         VALUES (?, ?, 'tranche', 'en_attente', ?)`,
        [prixFormationTotal, prixFormationTotal, idCandidat]
      );
      idPaiement = result.insertId;
    }

    // ── 4) Créer la tranche (Versement) liée à ce checkout précis ───────────
    await db.query(
      `INSERT INTO Versement
         (montant, typeVersement, datePaiement, methode, dateVersement, idPaiement, checkoutId, statutVersement)
       VALUES (?, 'seance', CURDATE(), 'carte', CURDATE(), ?, ?, 'en_attente')`,
      [montant, idPaiement, checkout.id]
    );

    return res.json({ success: true, checkoutId: checkout.id, checkoutUrl: checkout.checkout_url });

  } catch (err) {
    console.error("Erreur Chargily /checkouts:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur Chargily" });
  }
});

// ─── ROUTE 2 — Page retour candidat ──────────────────────────────────────────
app.get("/chargily/retour", (req, res) => {
  const success = req.query.status === "success";
  return res.send(`
    <html><head><meta charset="utf-8"></head>
    <body style="font-family:sans-serif;text-align:center;padding:60px;background:#f8fafc">
      <div style="max-width:400px;margin:0 auto;background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="font-size:56px;margin-bottom:16px">${success ? "✅" : "❌"}</div>
        <h2 style="color:${success ? "#166534" : "#dc2626"};margin:0 0 12px">
          ${success ? "Paiement réussi !" : "Paiement échoué"}
        </h2>
        <p style="color:#64748b;font-size:14px">
          ${success
            ? "Votre versement a été enregistré. Vous pouvez fermer cette fenêtre."
            : "Le paiement n'a pas abouti. Veuillez réessayer ou contacter l'auto-école."}
        </p>
      </div>
    </body></html>
  `);
});

// ─── ROUTE 3 — Webhook Chargily ───────────────────────────────────────────────
app.post("/chargily/webhook", async (req, res) => {
  const payload = req.body;

  try {
    const event = JSON.parse(payload);

    if (event.type === "checkout.paid") {
      const checkout = event.data;
      confirmedCheckouts.set(checkout.id, { status: "success", orderInfo: checkout });

      // 1) Marquer CE versement comme confirmé
      await db.query(
        `UPDATE Versement SET statutVersement = 'confirme' WHERE checkoutId = ?`,
        [checkout.id]
      );

      // 2) Diminuer le montant restant du paiement global lié à ce versement,
      //    et passer le paiement à "payé" si tout est réglé.
      await db.query(
        `UPDATE Paiement p
         JOIN Versement v ON v.idPaiement = p.idPaiement
         SET p.montantRestant = GREATEST(p.montantRestant - v.montant, 0),
             p.statutPaiement = IF(p.montantRestant - v.montant <= 0, 'payé', 'en_attente')
         WHERE v.checkoutId = ?`,
        [checkout.id]
      );

      console.log(`✅ Paiement confirmé : ${checkout.id}`);

    } else if (event.type === "checkout.failed") {
      const checkout = event.data;
      confirmedCheckouts.set(checkout.id, { status: "failed" });

      await db.query(
        `UPDATE Versement SET statutVersement = 'echoue' WHERE checkoutId = ?`,
        [checkout.id]
      );
    }
  } catch (e) {
    console.error("Erreur parsing webhook:", e.message);
  }

  return res.status(200).send("OK");
});

// ─── ROUTE 4 — Statut polling ─────────────────────────────────────────────────
app.get("/chargily/statut/:checkoutId", async (req, res) => {
  const { checkoutId } = req.params;
  const chargilyKey    = req.headers["x-chargily-key"];
  const chargilyMode   = req.headers["x-chargily-mode"] || "test";

  // 1) Vérifier la Map en mémoire d'abord (le plus rapide)
  const result = confirmedCheckouts.get(checkoutId);
  if (result) {
    confirmedCheckouts.delete(checkoutId);
    return res.json(result);
  }

  // 2) Vérifier en base (utile si le serveur a redémarré depuis)
  try {
    const [rows] = await db.query(
      `SELECT statutVersement, montant FROM Versement WHERE checkoutId = ?`,
      [checkoutId]
    );
    if (rows.length > 0) {
      const v = rows[0];
      if (v.statutVersement === "confirme") return res.json({ status: "success" });
      if (v.statutVersement === "echoue")   return res.json({ status: "failed" });
    }
  } catch (e) {
    console.error("Erreur BDD statut:", e.message);
  }

  // 3) Vérifier directement auprès de Chargily en dernier recours
  if (!chargilyKey) return res.json({ status: "pending" });

  const baseUrl = chargilyMode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";

  try {
    const response = await axios.get(
      `${baseUrl}/checkouts/${checkoutId}`,
      { headers: { "Authorization": `Bearer ${chargilyKey}`, "Content-Type": "application/json" } }
    );
    const checkout = response.data;
    if (checkout.status === "paid")                                      return res.json({ status: "success" });
    if (checkout.status === "failed" || checkout.status === "canceled") return res.json({ status: "failed" });
    return res.json({ status: "pending" });
  } catch (err) {
    return res.json({ status: "pending" });
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Serveur Chargily démarré sur le port ${PORT}`));