// templates/listeCandidatsTemplate.js
// Génère le HTML (RTL, arabe) du document officiel "قائمة المترشحين للامتحان ورخصة السياقة"
// à partir des données de l'app (candidats d'un même examen / même date / même type).
//
// Utilisation :
//   const html = buildListeCandidatsHTML({
//     wilaya: "بجاية",
//     centreExamen: "القصر",
//     dateDepot: "2026/03/15",
//     dateExamen: "2026/03/29",
//     nomEcole: "اسم مدرسة القيادة",
//     candidats: [
//       { rang: 1, numDossier: "2348", nomPrenom: "Merzougui Sabrina", dateNaissance: "2001/11/25", categorie: "ب", dateDepot: "2026/03/15" },
//       ...
//     ],
//   });

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Convertit une catégorie de permis latine (A, B, C...) en lettre arabe utilisée
// dans les formulaires officiels algériens. Adaptez/complétez selon vos besoins.
const CATEGORIE_AR = {
  A: "أ",
  A1: "أ1",
  B: "ب",
  C: "ج",
  D: "د",
  E: "هـ",
};

function categorieToArabic(cat) {
  if (!cat) return "";
  return CATEGORIE_AR[String(cat).toUpperCase()] || cat;
}

function buildRowsHTML(candidats, minRows = 15) {
  const rows = candidats.map((c, i) => `
      <tr>
        <td>${String(c.rang ?? i + 1).padStart(2, "0")}</td>
        <td>${escapeHtml(c.numDossier ?? "")}</td>
        <td class="name-cell">${escapeHtml(c.nomPrenom ?? "")}</td>
        <td>${escapeHtml(c.dateNaissance ?? "")}</td>
        <td>${escapeHtml(categorieToArabic(c.categorie))}</td>
        <td>${escapeHtml(c.dateDepot ?? "")}</td>
        <td>${escapeHtml(c.dateExamenRapport ?? "")}</td>
        <td>${escapeHtml(c.observations ?? "")}</td>
      </tr>`);

  // Lignes vides pour compléter visuellement la page (comme dans le modèle papier)
  const blanks = Math.max(0, minRows - candidats.length);
  for (let i = 0; i < blanks; i++) {
    const rang = candidats.length + i + 1;
    rows.push(`
      <tr>
        <td>${String(rang).padStart(2, "0")}</td>
        <td></td><td class="name-cell"></td><td></td><td></td><td></td><td></td><td></td>
      </tr>`);
  }
  return rows.join("\n");
}

function buildListeCandidatsHTML({
  wilaya = "",
  centreExamen = "",
  dateDepot = "",
  dateExamen = "",
  nomEcole = "",
  candidats = [],
} = {}) {
  const dateImpression = new Date().toLocaleDateString("fr-FR");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>قائمة المترشحين للامتحان</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Arial", "Tahoma", sans-serif;
    direction: rtl;
    font-size: 12px;
    color: #111;
    margin: 0;
  }
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .header-table td { border: 1px solid #2b537e; vertical-align: top; padding: 6px 8px; font-size: 11px; }
  .header-logo-cell { width: 22%; text-align: center; background: #eef3f9; }
  .header-logo-cell .logo-placeholder {
    height: 50px; display: flex; align-items: center; justify-content: center;
    color: #94a3b8; font-size: 9px; border: 1px dashed #b9c6d6; margin-bottom: 4px;
  }
  .header-center-cell { width: 56%; text-align: center; }
  .header-center-cell .republic { font-weight: bold; font-size: 13px; margin-bottom: 2px; }
  .header-center-cell .ministry { font-size: 11px; margin-bottom: 6px; }
  .header-center-cell .doc-title {
    background: #d7e3f0; border: 1px solid #2b537e; display: inline-block;
    padding: 4px 14px; font-weight: bold; text-decoration: underline; font-size: 13px;
  }
  .header-right-cell { width: 22%; text-align: center; background: #eef3f9; font-size: 10px; line-height: 1.5; }

  .info-bar { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .info-bar td {
    border: 1px solid #2b537e; background: #eef3f9; padding: 6px 10px;
    font-size: 11px; font-weight: bold; white-space: nowrap;
  }
  .info-bar .label { color: #1f3b5c; }

  table.main-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.main-table th {
    background: #2b537e; color: #fff; border: 1px solid #1f3b5c;
    padding: 6px 4px; font-weight: 600; text-align: center;
  }
  table.main-table td { border: 1px solid #94a3b8; padding: 5px 4px; text-align: center; height: 22px; }
  table.main-table tbody tr:nth-child(even) { background: #f8fafc; }
  .name-cell {
    text-align: right !important; padding-right: 8px !important;
    font-weight: 600; direction: ltr; unicode-bidi: embed;
  }

  .col-num   { width: 5%; }
  .col-file  { width: 9%; }
  .col-name  { width: 22%; }
  .col-dob   { width: 11%; }
  .col-cat   { width: 6%; }
  .col-dep   { width: 11%; }
  .col-exam  { width: 11%; }
  .col-notes { width: 25%; }

  .footer-note { margin-top: 14px; font-size: 11px; display: flex; justify-content: space-between; }
</style>
</head>
<body>

  <table class="header-table">
    <tr>
      <td class="header-logo-cell">
        <div class="logo-placeholder">شعار مدرسة القيادة</div>
        <div>${escapeHtml(nomEcole)}</div>
      </td>
      <td class="header-center-cell">
        <div class="republic">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="ministry">ولاية ${escapeHtml(wilaya)} &nbsp;—&nbsp; مديرية النقل</div>
        <div class="doc-title">قائمة المترشحين للامتحان ورخصة السياقة</div>
      </td>
      <td class="header-right-cell">
        <div>المديرية العامة للأمن الوطني</div>
        <div>مديرية أمن الولاية</div>
        <div>فرقة المرور</div>
      </td>
    </tr>
  </table>

  <table class="info-bar">
    <tr>
      <td style="width:34%"><span class="label">مركز الامتحان:</span> ${escapeHtml(centreExamen)}</td>
      <td style="width:33%"><span class="label">تاريخ الإيداع:</span> ${escapeHtml(dateDepot)}</td>
      <td style="width:33%"><span class="label">تاريخ الامتحان:</span> ${escapeHtml(dateExamen)}</td>
    </tr>
  </table>

  <table class="main-table">
    <thead>
      <tr>
        <th class="col-num">الرقم</th>
        <th class="col-file">رقم الملف</th>
        <th class="col-name">اللقب والاسم</th>
        <th class="col-dob">تاريخ الميلاد</th>
        <th class="col-cat">الصنف</th>
        <th class="col-dep">تاريخ إيداع الملف</th>
        <th class="col-exam">تاريخ تقرير الامتحان</th>
        <th class="col-notes">الملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${buildRowsHTML(candidats)}
    </tbody>
  </table>

  <div class="footer-note">
    <div>عدد المترشحين: <strong>${candidats.length}</strong></div>
    <div>تاريخ الطبع: ${dateImpression}</div>
  </div>

</body>
</html>`;
}

module.exports = { buildListeCandidatsHTML };
