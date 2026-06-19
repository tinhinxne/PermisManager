// src/renderer/components/RecuPDF.jsx
// Génère un reçu PDF imprimable dans une fenêtre popup du navigateur Electron

import React from "react";

/**
 * Ouvre une fenêtre d'impression avec un reçu professionnel
 * @param {object} versement  - ligne du versement
 * @param {object} candidat   - { prenom, nom, telephone }
 * @param {string} autoEcole  - nom de l'auto-école (optionnel)
 */
export function imprimerRecu(versement, candidat, autoEcole = "Auto-École") {
  const numeroRecu = `REC-${String(versement.idVersement || Date.now()).padStart(6, "0")}`;
  const date = versement.dateVersement
    ? new Date(versement.dateVersement).toLocaleDateString("fr-DZ", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : new Date().toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" });

  const montant = Number(versement.montant || 0).toLocaleString("fr-DZ");
  const montantRestant = Number(versement.montantRestant || 0).toLocaleString("fr-DZ");
  const montantTotal = Number(versement.montantTotal || 30000).toLocaleString("fr-DZ");
  const methodeMap = { especes: "Espèces", ccp: "CCP", carte: "Carte bancaire" };
  const methode = methodeMap[versement.methode] || versement.methode || "—";
  const nomComplet = `${candidat?.prenom || ""} ${candidat?.nom || ""}`.trim();

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Reçu ${numeroRecu}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f0f4fa;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 20px;
    }
    .recu {
      background: #fff;
      width: 520px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    }
    .header {
      background: linear-gradient(135deg, #1e3a5f, #2b537e);
      padding: 28px 32px 22px;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .header p  { font-size: 12px; opacity: 0.75; }
    .badge-recu {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px;
      padding: 8px 14px;
      text-align: center;
    }
    .badge-recu .num  { font-size: 13px; font-weight: 800; letter-spacing: 1px; }
    .badge-recu .lbl  { font-size: 10px; opacity: 0.7; margin-top: 2px; }
    .stripe {
      height: 5px;
      background: repeating-linear-gradient(90deg, #fbbf24 0, #fbbf24 30px, transparent 30px, transparent 60px);
    }
    .body { padding: 28px 32px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
      margin-top: 22px;
    }
    .section-title:first-of-type { margin-top: 0; }
    .candidat-block {
      background: #f0f6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .avatar {
      width: 42px; height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2b537e, #4e96e1);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800;
      flex-shrink: 0;
    }
    .candidat-nom  { font-size: 15px; font-weight: 700; color: #1e293b; }
    .candidat-tel  { font-size: 12px; color: #64748b; margin-top: 2px; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .row:last-child { border-bottom: none; }
    .row .lbl { color: #64748b; }
    .row .val { font-weight: 600; color: #1e293b; }
    .montant-block {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1.5px solid #86efac;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 16px 0;
    }
    .montant-lbl  { font-size: 13px; color: #166534; font-weight: 600; }
    .montant-val  { font-size: 28px; font-weight: 900; color: #166534; }
    .montant-da   { font-size: 14px; font-weight: 600; color: #166534; }
    .reste-block {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .reste-lbl { color: #92400e; font-weight: 600; }
    .reste-val { font-weight: 800; color: ${Number(versement.montantRestant || 0) <= 0 ? "#166534" : "#b91c1c"}; font-size: 16px; }
    .solde-badge {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 8px 14px;
      text-align: center;
      color: #166534;
      font-weight: 700;
      font-size: 13px;
      margin-top: 12px;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer .signature {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .recu { box-shadow: none; border-radius: 0; width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="recu">
    <div class="header">
      <div>
        <h1>🚗 ${autoEcole}</h1>
        <p>Reçu de paiement officiel</p>
        <p style="margin-top:6px; font-size:11px; opacity:0.65;">Émis le ${date}</p>
      </div>
      <div class="badge-recu">
        <div class="num">${numeroRecu}</div>
        <div class="lbl">N° REÇU</div>
      </div>
    </div>
    <div class="stripe"></div>

    <div class="body">
      <div class="section-title">Candidat</div>
      <div class="candidat-block">
        <div class="avatar">${(candidat?.prenom?.[0] || "?").toUpperCase()}${(candidat?.nom?.[0] || "").toUpperCase()}</div>
        <div>
          <div class="candidat-nom">${nomComplet}</div>
          <div class="candidat-tel">${candidat?.telephone || "—"}</div>
        </div>
      </div>

      <div class="section-title" style="margin-top:20px;">Détails du versement</div>
      <div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
      <div class="row"><span class="lbl">Méthode de paiement</span><span class="val">${methode}</span></div>
      <div class="row"><span class="lbl">Forfait total</span><span class="val">${montantTotal} DA</span></div>

      <div class="montant-block">
        <div>
          <div class="montant-lbl">Montant encaissé</div>
          <div style="font-size:11px; color:#166534; margin-top:2px;">Ce versement</div>
        </div>
        <div style="display:flex; align-items:baseline; gap:6px;">
          <div class="montant-val">${montant}</div>
          <div class="montant-da">DA</div>
        </div>
      </div>

      <div class="reste-block">
        <span class="reste-lbl">Reste à payer</span>
        <span class="reste-val">${montantRestant} DA</span>
      </div>

      ${Number(versement.montantRestant || 0) <= 0 ? `
      <div class="solde-badge">✅ Dossier entièrement soldé — Formation payée intégralement</div>
      ` : ""}

      ${versement.remarque ? `
      <div class="section-title" style="margin-top:16px;">Remarque</div>
      <div style="font-size:13px; color:#475569; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
        ${versement.remarque}
      </div>` : ""}
    </div>

    <div class="footer">
      <div>
        <div>${autoEcole}</div>
        <div style="margin-top:2px;">Document généré automatiquement</div>
      </div>
      <div class="signature">
        <div>Signature & Cachet</div>
        <div style="margin-top:20px; border-top:1px solid #cbd5e1; padding-top:4px; width:120px;">Auto-École</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</body>
</html>`;

  const popup = window.open("", "_blank", "width=620,height=820,scrollbars=yes");
  if (popup) {
    popup.document.write(html);
    popup.document.close();
  }
}

export default function RecuPDFButton({ versement, candidat, autoEcole }) {
  return (
    <button
      onClick={() => imprimerRecu(versement, candidat, autoEcole)}
      title="Imprimer / Sauvegarder le reçu PDF"
      style={{
        padding: "6px 12px",
        borderRadius: "6px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1d4ed8",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      🧾 Reçu
    </button>
  );
}