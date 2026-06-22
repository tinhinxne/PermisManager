function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CATEGORIE_AR = { A: "أ", A1: "أ1", B: "ب", C: "ج", D: "د", E: "هـ" };
function categorieToArabic(cat) {
  if (!cat) return "";
  return CATEGORIE_AR[String(cat).toUpperCase()] || cat;
}

// Code → قانون المرور   |   Créneau → المناورات   |   Circulation → السياقة
const TYPE_EXAMEN_AR = {
  "code":        "قانون المرور",
  "créneau":     "المناورات",
  "creneau":     "المناورات",
  "manoeuvres":  "المناورات",
  "circulation": "السياقة",
  "conduite":    "السياقة",
};
function typeExamenToArabic(type) {
  if (!type) return "";
  return TYPE_EXAMEN_AR[String(type).toLowerCase()] || type;
}

function buildRowsHTML(candidats, minRows = 15) {
  const rows = [];
  const total = Math.max(minRows, candidats.length);
  for (let i = 0; i < total; i++) {
    const c    = candidats[i];
    const rang = String(i + 1).padStart(2, "0");
    if (c) {
      const hasAr  = c.nomPrenomAr && String(c.nomPrenomAr).trim() !== "";
      const nomAff = hasAr ? c.nomPrenomAr : c.nomPrenom;
      const dir    = hasAr ? "rtl" : "ltr";
      rows.push(`<tr>
        <td>${rang}</td>
        <td>${escapeHtml(c.numDossier ?? "")}</td>
        <td class="name-cell" style="direction:${dir};">${escapeHtml(nomAff ?? "")}</td>
        <td>${escapeHtml(c.dateNaissance ?? "")}</td>
        <td>${escapeHtml(categorieToArabic(c.categorie))}</td>
        <td>${escapeHtml(typeExamenToArabic(c.typeExamen ?? c.type ?? ""))}</td>
        <td>${escapeHtml(c.dateDepot ?? "")}</td>
        <td>${escapeHtml(c.dateExamenRapport ?? "")}</td>
        <td></td>
      </tr>`);
    } else {
      rows.push(`<tr>
        <td>${rang}</td><td></td><td class="name-cell"></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>`);
    }
  }
  return rows.join("\n");
}

function buildListeCandidatsHTML({
  wilaya       = "",
  centreExamen = "",
  dateDepot    = "",
  dateExamen   = "",
  nomEcole     = "",
  morkaba      = "",   // المركبة الأولى (ex: "رونو كليو 03")
  candidats    = [],
} = {}) {
  const dateImpression = new Date().toLocaleDateString("fr-FR");
  const total = candidats.length;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>قائمة المترشحين للامتحان</title>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Arial","Tahoma",sans-serif; direction: rtl; font-size: 11px; color: #111; }

  /* ── EN-TÊTE 3 colonnes ── */
  .top-header {
    display: table;
    width: 100%;
    border: 1.5px solid #2b537e;
    border-collapse: collapse;
    margin-bottom: 0;
  }
  .th-cell {
    display: table-cell;
    border: 1.5px solid #2b537e;
    vertical-align: middle;
    padding: 6px 8px;
  }
  .th-right { width: 28%; text-align: right; font-size: 10px; line-height: 1.7; }
  .th-center { width: 44%; text-align: center; }
  .th-left { width: 28%; text-align: center; background: #f5f8fc; font-size: 10px; }

  .republic  { font-weight: bold; font-size: 12.5px; margin-bottom: 2px; }
  .ministry  { font-size: 10.5px; color: #333; margin-bottom: 6px; }
  .doc-title {
    display: inline-block;
    border: 1.5px solid #2b537e;
    background: #d7e3f0;
    padding: 4px 14px;
    font-weight: bold;
    font-size: 12.5px;
    text-decoration: underline;
  }
  .logo-box {
    border: 1px dashed #b0bec5;
    height: 52px;
    display: flex; align-items: center; justify-content: center;
    color: #90a4ae; font-size: 9px;
    margin-bottom: 4px;
  }
  .school-name { font-size: 10px; font-weight: bold; color: #1f3b5c; }

  /* ── BARRE INFO ── */
  .info-bar {
    display: table;
    width: 100%;
    border: 1.5px solid #2b537e;
    border-top: none;
    border-collapse: collapse;
    margin-bottom: 8px;
    background: #f5f8fc;
  }
  .info-bar .ib-cell {
    display: table-cell;
    border-right: 1.5px solid #2b537e;
    padding: 5px 8px;
    font-size: 10.5px;
    white-space: nowrap;
  }
  .info-bar .ib-cell:first-child { border-right: none; }
  .ib-label { font-weight: bold; color: #1f3b5c; margin-left: 4px; }
  .ib-val   { border-bottom: 1px solid #555; display: inline-block; min-width: 80px; padding: 0 3px; }

  /* ── TABLEAU PRINCIPAL ── */
  table.main-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  table.main-table th {
    background: #2b537e;
    color: #fff;
    border: 1px solid #1f3b5c;
    padding: 5px 3px;
    text-align: center;
    font-size: 10px;
    font-weight: 600;
  }
  table.main-table td {
    border: 1px solid #b0bec5;
    padding: 3px 3px;
    text-align: center;
    height: 19px;
    font-size: 10.5px;
  }
  table.main-table tbody tr:nth-child(even) { background: #f8fafc; }
  .name-cell { text-align: right !important; padding-right: 5px !important; font-weight: 600; }

  /* ── PIED ── */
  .footer-wrap {
    display: table;
    width: 100%;
    margin-top: 10px;
    border-collapse: collapse;
  }
  .footer-wrap .fw-cell {
    display: table-cell;
    vertical-align: top;
    padding: 0 6px;
  }
  .fw-cell:first-child { padding-right: 0; }
  .fw-cell:last-child  { padding-left: 0; }

  table.result-table {
    border-collapse: collapse;
    font-size: 10px;
    width: 100%;
  }
  table.result-table caption {
    font-weight: bold;
    font-size: 10.5px;
    text-align: right;
    margin-bottom: 4px;
    color: #2b537e;
    text-decoration: underline;
  }
  table.result-table th {
    background: #2b537e; color: #fff;
    border: 1px solid #1f3b5c;
    padding: 4px 5px; text-align: center; font-size: 9.5px;
  }
  table.result-table td {
    border: 1px solid #b0bec5;
    padding: 3px 5px; text-align: center; height: 18px; font-size: 10px;
  }
  table.result-table .rl { text-align: right; padding-right: 5px; background: #eef3f9; font-weight: bold; }

  .sig-box {
    border: 1px solid #b0bec5;
    padding: 6px 10px;
    min-height: 80px;
    font-size: 10px;
    text-align: center;
  }
  .sig-title { font-weight: bold; margin-bottom: 40px; }
  .sig-line  { border-top: 1px solid #555; padding-top: 3px; font-size: 9px; color: #555; }

  .total-line { font-size: 10.5px; font-weight: bold; color: #1f3b5c; margin-bottom: 6px; }
  .print-date { font-size: 9px; color: #999; text-align: left; margin-top: 6px; }
</style>
</head>
<body>

<!-- ══ EN-TÊTE ══ -->
<div class="top-header">
  <!-- bloc droit : sécurité nationale -->
  <div class="th-cell th-right">
    <div>المديرية العامة للأمن الوطني</div>
    <div>مديرية أمن الولاية</div>
    <div>فرقة المرور</div>
  </div>

  <!-- bloc centre : titre officiel -->
  <div class="th-cell th-center">
    <div class="republic">الجمهورية الجزائرية الديمقراطية الشعبية</div>
    <div class="ministry">ولاية ${escapeHtml(wilaya)} &nbsp;—&nbsp; مديرية النقل</div>
    <div><span class="doc-title">قائمة المترشحين للامتحان ورخصة السياقة</span></div>
  </div>

  <!-- bloc gauche : logo école -->
  <div class="th-cell th-left">
    <div class="logo-box">شعار مدرسة القيادة</div>
    <div class="school-name">${escapeHtml(nomEcole)}</div>
  </div>
</div>

<!-- ══ BARRE INFO ══ -->
<div class="info-bar">
  <div class="ib-cell">
    <span class="ib-label">مركز الامتحان :</span>
    <span class="ib-val">${escapeHtml(centreExamen)}</span>
  </div>
  <div class="ib-cell">
    <span class="ib-label">تاريخ الإيداع :</span>
    <span class="ib-val">${escapeHtml(dateDepot)}</span>
  </div>
  <div class="ib-cell">
    <span class="ib-label">تاريخ الامتحان :</span>
    <span class="ib-val">${escapeHtml(dateExamen)}</span>
  </div>
</div>

<!-- ══ TABLEAU ══ -->
<table class="main-table">
  <thead>
    <tr>
      <th style="width:5%">الرقم</th>
      <th style="width:8%">رقم الملف</th>
      <th style="width:20%">اللقب والاسم</th>
      <th style="width:10%">تاريخ الميلاد</th>
      <th style="width:5%">الصنف</th>
      <th style="width:10%">طبيعة الامتحان</th>
      <th style="width:10%">تاريخ إيداع الملف</th>
      <th style="width:10%">تاريخ تقرير الامتحان</th>
      <th style="width:22%">الملاحظات</th>
    </tr>
  </thead>
  <tbody>
    ${buildRowsHTML(candidats)}
  </tbody>
</table>

<!-- ══ PIED ══ -->
<div class="footer-wrap">

  <!-- nombre + signature école -->
  <div class="fw-cell" style="width:34%">
    <div class="total-line">عدد المترشحين : <strong>${total}</strong></div>
    <div class="sig-box">
      <div class="sig-title">مدير مدرسة تعليم السياقة</div>
      <div class="sig-line">الإمضاء والختم</div>
    </div>
  </div>

  <!-- tableau résultats -->
  <div class="fw-cell" style="width:40%">
    <div style="font-size:10px; font-weight:bold; color:#2b537e; margin-bottom:6px;">
      المركبة الأولى : <span style="color:#111;">${escapeHtml(morkaba)}</span>
    </div>
    <table class="result-table">
      <caption>نتائج الامتحان</caption>
      <thead>
        <tr>
          <th>البيان</th>
          <th>عدد الممتحنين</th>
          <th>عدد الناجحين</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="rl">قانون المرور</td><td>${total}</td><td></td></tr>
        <tr><td class="rl">المناورات</td><td></td><td></td></tr>
        <tr><td class="rl">السياقة</td><td></td><td></td></tr>
        <tr><td class="rl" style="font-weight:bold;">المجموع</td><td>${total}</td><td></td></tr>
      </tbody>
    </table>
  </div>

  <!-- signature inspecteur -->
  <div class="fw-cell" style="width:26%">
    <div class="sig-box">
      <div class="sig-title">ختم وإمضاء المفتش</div>
      <div class="sig-line">Signature de l'inspecteur</div>
    </div>
  </div>

</div>

<div class="print-date">تاريخ الطبع : ${dateImpression}</div>

</body>
</html>`;
}

module.exports = { buildListeCandidatsHTML };