const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const crypto  = require("crypto");
const mysql   = require("mysql2/promise");

const app = express();
app.use(express.json());
app.use(cors());

// ─── CONFIG CHARGILY ─────────────────────────────────────────────────────────
const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY || "test_sk_VUBUlBXWwpNYUOtySb4WDBuJgPAogzXfGJsp4R";
const APP_URL             = process.env.APP_URL             || "http://localhost:3000";

const CHARGILY_BASE_URL = process.env.CHARGILY_MODE === "live"
  ? "https://pay.chargily.net/api/v2"
  : "https://pay.chargily.net/test/api/v2";

const chargilyHeaders = {
  "Authorization": `Bearer ${CHARGILY_SECRET_KEY}`,
  "Content-Type":  "application/json",
};

// ─── CONNEXION MYSQL ──────────────────────────────────────────────────────────
// ⚠️ La Map est supprimée, remplacée par MySQL
let db;
async function connectDB() {
  db = await mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "autoecole",
  });
  console.log("✅ Connecté à MySQL");
}
connectDB();

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1 — Créer un checkout Chargily + INSERT en BDD
// POST /chargily/payer
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chargily/payer", async (req, res) => {
  const { idCandidat, montant, nomCandidat, typePaiement } = req.body;

  if (!idCandidat || !montant) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // 1. Créer le checkout sur Chargily
    const response = await axios.post(
      `${CHARGILY_BASE_URL}/checkouts`,
      {
        amount:           montant,
        currency:         "dzd",
        success_url:      `${APP_URL}/chargily/retour?status=success`,
        failure_url:      `${APP_URL}/chargily/retour?status=failed`,
        webhook_endpoint: `${APP_URL}/chargily/webhook`,
        locale:           "fr",
        description:      `Formation permis — Candidat ${nomCandidat || idCandidat}`,
        metadata: {
          idCandidat: String(idCandidat),
          montant:    String(montant),
        },
      },
      { headers: chargilyHeaders }
    );

    const checkout = response.data;

    // 2. ✅ INSERT dans ta table PAIEMENT
    await db.query(
      `INSERT INTO PAIEMENT 
       (idCandidat, montantTotal, montantRestant, typePaiement, statutPaiement, checkoutId, dateCreation)
       VALUES (?, ?, ?, ?, 'en_attente', ?, NOW())`,
      [
        idCandidat,
        montant,
        montant,                          // au départ restant = total
        typePaiement || "complet",
        checkout.id,
      ]
    );

    return res.json({
      success:     true,
      checkoutId:  checkout.id,
      checkoutUrl: checkout.checkout_url,
    });

  } catch (err) {
    console.error("Erreur /chargily/payer:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2 — Page retour candidat après paiement
// GET /chargily/retour?status=success|failed
// ─────────────────────────────────────────────────────────────────────────────
app.get("/chargily/retour", (req, res) => {
  const { status } = req.query;
  const success = status === "success";

  return res.send(`
    <html>
      <head><meta charset="utf-8"></head>
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
      </body>
    </html>
  `);
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3 — Webhook Chargily → UPDATE BDD
// POST /chargily/webhook
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chargily/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["signature"];
  const payload   = req.body;

  // Vérification signature
  const computedSig = crypto
    .createHmac("sha256", CHARGILY_SECRET_KEY)
    .update(payload)
    .digest("hex");

  if (computedSig !== signature) {
    console.error("❌ Signature webhook invalide !");
    return res.status(401).send("Unauthorized");
  }

  const event = JSON.parse(payload);

  if (event.type === "checkout.paid") {
    const checkout = event.data;

    // ✅ UPDATE dans ta table PAIEMENT (plus de Map !)
    await db.query(
      `UPDATE PAIEMENT 
       SET statutPaiement = 'payé',
           datePaiement   = NOW(),
           montantRestant = 0
       WHERE checkoutId = ?`,
      [checkout.id]
    );

    console.log(`✅ Paiement confirmé en BDD : ${checkout.id}`);

  } else if (event.type === "checkout.failed") {
    const checkout = event.data;

    await db.query(
      `UPDATE PAIEMENT 
       SET statutPaiement = 'échoué'
       WHERE checkoutId = ?`,
      [checkout.id]
    );

    console.log(`❌ Paiement échoué en BDD : ${checkout.id}`);
  }

  return res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4 — Polling statut paiement → depuis BDD directement
// GET /chargily/statut/:checkoutId
// ─────────────────────────────────────────────────────────────────────────────
app.get("/chargily/statut/:checkoutId", async (req, res) => {
  const { checkoutId } = req.params;

  try {
    // ✅ On lit directement depuis la BDD, plus depuis la Map
    const [rows] = await db.query(
      `SELECT statutPaiement, idCandidat, montantTotal 
       FROM PAIEMENT 
       WHERE checkoutId = ?`,
      [checkoutId]
    );

    if (rows.length === 0) {
      return res.json({ status: "pending" });
    }

    const paiement = rows[0];

    if (paiement.statutPaiement === "payé") {
      return res.json({ status: "success", orderInfo: paiement });
    } else if (paiement.statutPaiement === "échoué") {
      return res.json({ status: "failed" });
    } else {
      return res.json({ status: "pending" });
    }

  } catch (err) {
    console.error("Erreur /statut:", err.message);
    return res.json({ status: "pending" });
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur Chargily démarré sur le port ${PORT}`));