/**
 * templates/listeEnvoiTemplate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Génère le HTML de la لائحة ارسال (liste d'envoi au commissaire de sécurité routière)
 * Format identique au formulaire administratif algérien officiel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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

/**
 * Construit les lignes du tableau (minimum 15 lignes)
 */
function buildRows(candidats, minRows = 15) {
  const rows = [];
  const total = Math.max(minRows, candidats.length);

  for (let i = 0; i < total; i++) {
    const c = candidats[i];
    const num = String(i + 1).padStart(2, "0");

    if (c) {
      // Préférer le nom en arabe si disponible
      const hasAr = c.nomPrenomAr && String(c.nomPrenomAr).trim() !== "";
      const nomAff = hasAr ? c.nomPrenomAr : (c.nomPrenom || "");
      const dir = hasAr ? "rtl" : "ltr";
      const categorie = categorieToArabic(c.categorie || c.categoriePermis || "");

      rows.push(`<tr>
  <td class="num-col">${escapeHtml(num)}</td>
  <td class="name-col" style="direction:${dir};text-align:${dir==='rtl'?'right':'left'};">${escapeHtml(nomAff)}</td>
  <td>${escapeHtml(c.dateNaissance || "")}</td>
  <td class="cat-col">${escapeHtml(categorie)}</td>
  <td class="obs-col"></td>
</tr>`);
    } else {
      rows.push(`
        <tr>
          <td class="num-col">${escapeHtml(num)}</td>
          <td class="name-col"></td>
          <td></td>
          <td class="cat-col"></td>
          <td class="obs-col"></td>
        </tr>`);
    }
  }
  return rows.join("\n");
}

/**
 * @param {object} opts
 * @param {string} opts.wilaya          - ex: "بجاية"
 * @param {string} opts.nomEcole        - nom de l'auto-école (optionnel)
 * @param {string} opts.dateDepot       - date de dépôt (القصر في)
 * @param {Array}  opts.candidats       - tableau de candidats
 */
function buildListeEnvoiHTML({
  wilaya    = "بجاية",
  nomEcole  = "",
  dateDepot = "",
  candidats = [],
} = {}) {
  const total = candidats.length;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>لائحة ارسال</title>
<style>
  @page {
    size: A4 portrait;
    margin: 14mm 16mm 12mm 16mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Arial", "Tahoma", sans-serif;
    direction: rtl;
    font-size: 12px;
    color: #111;
    background: #fff;
  }

  /* ── TITRE ── */
  .page-title {
    text-align: center;
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 6px;
    border-bottom: 2px solid #111;
    padding-bottom: 6px;
    margin-bottom: 18px;
  }

  /* ── DESTINATAIRE ── */
  .destinataire {
    font-size: 13px;
    font-weight: bold;
    text-align: right;
    margin-bottom: 4px;
    line-height: 1.8;
  }

  /* ── LIEU + DATE ── */
  .lieu-date {
    text-align: right;
    font-size: 12px;
    margin-bottom: 12px;
    color: #222;
  }

  /* ── OBJET ── */
  .objet {
    text-align: right;
    font-size: 12px;
    margin-bottom: 14px;
    color: #cc0000;
  }
  .objet strong {
    font-weight: bold;
    text-decoration: underline;
  }

  /* ── TABLEAU ── */
  table.main-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    margin-bottom: 10px;
  }
  table.main-table th {
    background: #fff;
    border: 1.5px solid #111;
    padding: 5px 4px;
    text-align: center;
    font-weight: bold;
    font-size: 11px;
  }
  table.main-table td {
    border: 1.5px solid #111;
    padding: 2px 4px;
    text-align: center;
    height: 20px;
    font-size: 11px;
  }

  .num-col  { width: 8%;  }
  .name-col { width: 35%; text-align: right !important; padding-right: 6px !important; }
  .cat-col  { width: 9%;  }
  .obs-col  { width: 24%; }

  /* ── TOTAL ── */
  .total-row td {
    text-align: right !important;
    font-size: 11px;
    padding-right: 8px !important;
    font-weight: bold;
    border: 1.5px solid #111;
  }

  /* ── SIGNATURE ── */
  .signature-section {
    margin-top: 18px;
    text-align: right;
  }
  .signature-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 8px;
    text-decoration: underline;
  }
  .sig-line {
    font-size: 12px;
    color: #cc0000;
    margin-bottom: 6px;
    line-height: 2;
  }
</style>
</head>
<body>

<!-- ══ TITRE ══ -->
<div class="page-title">لائـــحـــة ارسـال</div>

<!-- ══ DESTINATAIRE ══ -->
<div class="destinataire">
  الى السيد مكلف المندوبية الولائية للأمن في الطرق<br/>
  لولاية ${escapeHtml(wilaya)}
</div>

<!-- ══ LIEU + DATE ══ -->
<div class="lieu-date">
  القصر في : ${escapeHtml(dateDepot)}
</div>

<!-- ══ OBJET ══ -->
<div class="objet">
  <strong>تجدون في الطرف:</strong> ملفات رخصة السياقة للمرشحين:
</div>

<!-- ══ TABLEAU ══ -->
<table class="main-table">
 <thead>
  <tr>
    <th class="num-col">الرقم</th>
    <th class="name-col">الاسم و اللقب</th>
    <th>تاريخ الازدياد</th>
    <th class="cat-col">الصنف</th>
    <th class="obs-col">ملاحظات</th>
  </tr>
</thead>
  <tbody>
    ${buildRows(candidats)}
    <tr class="total-row">
      <td colspan="4" style="text-align:right; padding-right:10px;">
        عدد الملفات:..............................
      </td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- ══ SIGNATURE ══ -->
<div class="signature-section">
  <div class="signature-title">إقرار بالاستلام:</div>
  <div class="sig-line">سلم في:..........................................</div>
  <div class="sig-line">من طرف السيد:..................................</div>
</div>

</body>
</html>`;
}

module.exports = { buildListeEnvoiHTML };