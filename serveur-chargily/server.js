const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const crypto  = require("crypto");
const mysql   = require("mysql2/promise");

const app = express();
app.use(cors());

// ─── Map en mémoire pour le polling ──────────────────────────────────────────
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

// ─── ROUTE 1 — Créer un checkout ─────────────────────────────────────────────
app.post("/chargily/payer", async (req, res) => {
  const { idCandidat, montant, nomCandidat, chargilyKey, chargilyMode } = req.body;

  if (!idCandidat || !montant || !chargilyKey) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  const baseUrl = chargilyMode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";

  const APP_URL = process.env.APP_URL || "https://permismanager.onrender.com";

  try {
    const response = await axios.post(
      `${baseUrl}/checkouts`,
      {
        amount:           montant,
        currency:         "dzd",
        success_url:      `${APP_URL}/chargily/retour?status=success`,
        failure_url:      `${APP_URL}/chargily/retour?status=failed`,
        webhook_endpoint: `${APP_URL}/chargily/webhook`,
        locale:           "fr",
        description:      `Formation permis — ${nomCandidat || idCandidat}`,
        metadata: { idCandidat: String(idCandidat), montant: String(montant) },
      },
      { headers: { "Authorization": `Bearer ${chargilyKey}`, "Content-Type": "application/json" } }
    );

    const checkout = response.data;

    // INSERT dans Paiement
    await db.query(
      `INSERT INTO Paiement (montantTotal, montantRestant, typePaiement, statutPaiement, idCandidat, checkoutId, dateCreation)
       VALUES (?, ?, 'complet', 'en_attente', ?, ?, NOW())`,
      [montant, montant, idCandidat, checkout.id]
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
      await db.query(
        `UPDATE Paiement SET statutPaiement = 'payé', datePaiement = NOW(), montantRestant = 0 WHERE checkoutId = ?`,
        [checkout.id]
      );
      console.log(`✅ Paiement confirmé : ${checkout.id}`);
    } else if (event.type === "checkout.failed") {
      const checkout = event.data;
      confirmedCheckouts.set(checkout.id, { status: "failed" });
      await db.query(
        `UPDATE Paiement SET statutPaiement = 'échoué' WHERE checkoutId = ?`,
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

  // Vérifier Map d'abord
  const result = confirmedCheckouts.get(checkoutId);
  if (result) {
    confirmedCheckouts.delete(checkoutId);
    return res.json(result);
  }

  // Vérifier BDD
  try {
    const [rows] = await db.query(
      `SELECT statutPaiement, idCandidat, montantTotal FROM Paiement WHERE checkoutId = ?`,
      [checkoutId]
    );
    if (rows.length > 0) {
      const p = rows[0];
      if (p.statutPaiement === "payé")    return res.json({ status: "success", orderInfo: p });
      if (p.statutPaiement === "échoué") return res.json({ status: "failed" });
    }
  } catch (e) {
    console.error("Erreur BDD statut:", e.message);
  }

  // Vérifier directement Chargily
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