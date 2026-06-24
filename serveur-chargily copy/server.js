const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const crypto  = require("crypto");

const app = express();
app.use(cors());

// ─── CONFIG CHARGILY ──────────────────────────────────────────────────────────
// Cette instance serveur tourne en LOCAL sur le poste d'une seule auto-école
// (un tunnel ngrok / APP_URL par poste). La clé Chargily n'est plus fixée en
// .env : elle est envoyée par l'app Electron (qui la lit dans sa propre DB
// locale) à chaque requête. On la garde aussi en mémoire pour pouvoir
// vérifier la signature du webhook (qui n'a pas accès au body en clair avant
// vérification, et qui ne reçoit pas la clé directement de Chargily).
const APP_URL = process.env.APP_URL || "https://lesser-flashcard-unfazed.ngrok-free.dev";

// Mémorise la dernière clé/mode utilisés sur ce poste, pour la vérification webhook.
// Mis à jour chaque fois que /chargily/payer est appelé.
let lastChargilyKey  = null;
let lastChargilyMode = "test";

function getBaseUrl(mode) {
  return mode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";
}

// ─── Commandes confirmées (polling) ───────────────────────────────────────────
const confirmedCheckouts = new Map(); // checkoutId → { success, orderInfo }

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1 — Electron appelle cette route pour créer un checkout Chargily
// POST /chargily/payer
// Body : { idCandidat, montant, nomCandidat, chargilyKey, chargilyMode }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chargily/payer", express.json(), async (req, res) => {
  const { idCandidat, montant, nomCandidat, chargilyKey, chargilyMode } = req.body;

  if (!idCandidat || !montant || !chargilyKey) {
    return res.status(400).json({ success: false, message: "Paramètres manquants (idCandidat, montant et chargilyKey requis)" });
  }

  const mode    = chargilyMode === "live" ? "live" : "test";
  const baseUrl = getBaseUrl(mode);

  // On retient la clé/le mode pour la vérification de signature du webhook.
  lastChargilyKey  = chargilyKey;
  lastChargilyMode = mode;

  try {
    const response = await axios.post(
      `${baseUrl}/checkouts`,
      {
        amount:           montant,        // en DA directement (pas de centimes !)
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
      {
        headers: {
          "Authorization": `Bearer ${chargilyKey}`,
          "Content-Type":  "application/json",
        },
      }
    );

    const checkout = response.data;

    return res.json({
      success:     true,
      checkoutId:  checkout.id,
      checkoutUrl: checkout.checkout_url, // ← URL vers laquelle rediriger le candidat
    });

  } catch (err) {
    // On ne logue jamais la clé elle-même, seulement le message d'erreur Chargily.
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
// Note : on vérifie la signature avec la dernière clé connue pour ce poste
// (lastChargilyKey). Comme chaque instance ne sert qu'une seule auto-école
// (un ngrok/APP_URL par poste), c'est cohérent — mais ça suppose qu'au moins
// un /chargily/payer ait été appelé depuis le démarrage du serveur avant que
// le premier webhook n'arrive.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chargily/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["signature"];
  const payload   = req.body;

  if (!lastChargilyKey) {
    console.error("Webhook reçu mais aucune clé Chargily connue pour ce poste (aucun /chargily/payer effectué encore).");
    return res.status(401).send("Unauthorized");
  }

  const computedSig = crypto
    .createHmac("sha256", lastChargilyKey)
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
// Headers requis : x-chargily-key, x-chargily-mode
// ─────────────────────────────────────────────────────────────────────────────
app.get("/chargily/statut/:checkoutId", async (req, res) => {
  const { checkoutId } = req.params;
  const chargilyKey  = req.headers["x-chargily-key"];
  const chargilyMode = req.headers["x-chargily-mode"] === "live" ? "live" : "test";

  if (!chargilyKey) {
    return res.status(400).json({ status: "error", message: "Header x-chargily-key manquant" });
  }

  // 1. Vérifier d'abord dans les confirmations webhook reçues
  const webhookResult = confirmedCheckouts.get(checkoutId);
  if (webhookResult) {
    confirmedCheckouts.delete(checkoutId);
    return res.json({ status: "success", orderInfo: webhookResult.orderInfo });
  }

  // 2. Sinon interroger l'API Chargily directement
  const baseUrl = getBaseUrl(chargilyMode);

  try {
    const response = await axios.get(
      `${baseUrl}/checkouts/${checkoutId}`,
      {
        headers: {
          "Authorization": `Bearer ${chargilyKey}`,
          "Content-Type":  "application/json",
        },
      }
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