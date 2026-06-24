const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const crypto  = require("crypto");

const app = express();
app.use(express.json());
app.use(cors());

// ─── CONFIG CHARGILY ──────────────────────────────────────────────────────────
const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY || "test_sk_VUBUlBXWwpNYUOtySb4WDBuJgPAogzXfGJsp4R";
const APP_URL             = process.env.APP_URL             || "http://localhost:3000";

// Mode test → pay.chargily.net/test/api/v2
// Mode live → pay.chargily.net/api/v2
const CHARGILY_BASE_URL = process.env.CHARGILY_MODE === "live"
  ? "https://pay.chargily.net/api/v2"
  : "https://pay.chargily.net/test/api/v2";

const chargilyHeaders = {
  "Authorization": `Bearer ${CHARGILY_SECRET_KEY}`,
  "Content-Type":  "application/json",
};

// ─── Commandes confirmées (polling) ───────────────────────────────────────────
const confirmedCheckouts = new Map(); // checkoutId → { success, orderInfo }

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1 — Electron appelle cette route pour créer un checkout Chargily
// POST /chargily/payer
// Body : { idCandidat, montant, nomCandidat }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chargily/payer", async (req, res) => {
  const { idCandidat, montant, nomCandidat } = req.body;

  if (!idCandidat || !montant) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    const response = await axios.post(
      `${CHARGILY_BASE_URL}/checkouts`,
      {
        amount:       montant,        // en DA directement (pas de centimes !)
        currency:     "dzd",
        success_url:  `${APP_URL}/chargily/retour?status=success`,
        failure_url:  `${APP_URL}/chargily/retour?status=failed`,
        webhook_endpoint: `${APP_URL}/chargily/webhook`,
        locale:       "fr",
        description:  `Formation permis — Candidat ${nomCandidat || idCandidat}`,
        metadata: {
          idCandidat: String(idCandidat),
          montant:    String(montant),
        },
      },
      { headers: chargilyHeaders }
    );

    const checkout = response.data;

    return res.json({
      success:     true,
      checkoutId:  checkout.id,
      checkoutUrl: checkout.checkout_url, // ← URL vers laquelle rediriger le candidat
    });

  } catch (err) {
    console.error("Erreur Chargily /checkouts:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Erreur serveur Chargily" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2 — Page affichée au candidat après paiement (success_url / failure_url)
// GET /chargily/retour?status=success|failed&checkout_id=xxx
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
// ROUTE 3 — Webhook Chargily (confirmation automatique serveur → serveur)
// POST /chargily/webhook
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chargily/webhook", express.raw({ type: "application/json" }), (req, res) => {
  // Vérification signature Chargily
  const signature = req.headers["signature"];
  const payload   = req.body;

  const computedSig = crypto
    .createHmac("sha256", CHARGILY_SECRET_KEY)
    .update(payload)
    .digest("hex");

  if (computedSig !== signature) {
    console.error("Signature webhook invalide !");
    return res.status(401).send("Unauthorized");
  }

  const event = JSON.parse(payload);

  if (event.type === "checkout.paid") {
    const checkout = event.data;
    confirmedCheckouts.set(checkout.id, {
      success:   true,
      orderInfo: checkout.metadata || {},
    });
    console.log(`✅ Paiement confirmé : ${checkout.id}`);
  }

  return res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4 — Electron interroge cette route (polling) pour savoir si c'est payé
// GET /chargily/statut/:checkoutId
// ─────────────────────────────────────────────────────────────────────────────
app.get("/chargily/statut/:checkoutId", async (req, res) => {
  const { checkoutId } = req.params;

  // 1. Vérifier d'abord dans les confirmations webhook reçues
  const webhookResult = confirmedCheckouts.get(checkoutId);
  if (webhookResult) {
    confirmedCheckouts.delete(checkoutId);
    return res.json({ status: "success", orderInfo: webhookResult.orderInfo });
  }

  // 2. Sinon interroger l'API Chargily directement
  try {
    const response = await axios.get(
      `${CHARGILY_BASE_URL}/checkouts/${checkoutId}`,
      { headers: chargilyHeaders }
    );
    const checkout = response.data;

    if (checkout.status === "paid") {
      return res.json({ status: "success", orderInfo: checkout.metadata || {} });
    } else if (checkout.status === "failed" || checkout.status === "canceled") {
      return res.json({ status: "failed" });
    } else {
      return res.json({ status: "pending" }); // encore en cours
    }

  } catch (err) {
    console.error("Erreur vérification statut:", err.message);
    return res.json({ status: "pending" });
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur Chargily démarré sur le port ${PORT}`));