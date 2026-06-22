/**
 * templates/listeEnvoiTemplate.js
 */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CATEGORIE_AR = {
  A: "أ", A1: "أ1", B: "ب", C: "ج", C1: "ج1",
  D: "د", E: "هـ", BE: "ب+هـ", CE: "ج+هـ", DE: "د+هـ", F: "و"
};
function categorieToArabic(cat) {
  if (!cat) return "";
  return CATEGORIE_AR[String(cat).toUpperCase()] || cat;
}

/**
 * Formate une date peu importe sa forme :
 *  - Objet Date JavaScript (retourné par MySQL)
 *  - String ISO "2000-05-12T00:00:00.000Z"
 *  - String simple "2000-05-12"
 * → Retourne "2000/05/12"
 */
function formatDate(rawDate) {
  if (!rawDate) return "";

  // CAS 1 : Objet Date (ce que MySQL retourne nativement)
  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return "";
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, "0");
    const d = String(rawDate.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }

  // CAS 2 : String quelconque
  const str = String(rawDate).trim();
  if (!str) return "";

  // Sous-cas : ISO string "2000-05-12T..." ou "2000-05-12"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}/${isoMatch[2]}/${isoMatch[3]}`;
  }

  // Sous-cas : déjà formatée "2000/05/12"
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str;

  return str; // fallback
}

/**
 * Normalise un objet candidat peu importe la source
 * (objet DB brut, objet formaté frontend, etc.)
 */
function normaliseCandidat(c) {
  // ── NOM COMPLET ──────────────────────────────────────────────────────────
  let nomComplet = "";
  let isArabic   = false;

  if (c.nomPrenomAr && String(c.nomPrenomAr).trim()) {
    nomComplet = String(c.nomPrenomAr).trim();
    isArabic   = true;
  } else if (c.nomPrenom && String(c.nomPrenom).trim()) {
    nomComplet = String(c.nomPrenom).trim();
  } else {
    // Champs arabes séparés (nom_ar / prenom_ar) — priorité si disponibles
    const nomAr    = (c.nom_ar    || "").trim();
    const prenomAr = (c.prenom_ar || "").trim();
    if (nomAr || prenomAr) {
      nomComplet = `${nomAr} ${prenomAr}`.trim();
      isArabic   = true;
    } else {
      // Champs latins : nom + prenom
      const nom    = (c.nom    || c.lastName  || "").trim();
      const prenom = (c.prenom || c.firstName || "").trim();
      nomComplet   = `${nom} ${prenom}`.trim();
    }
  }

  // ── DATE DE NAISSANCE ────────────────────────────────────────────────────
  // Accepte tous les noms de champs possibles
  const rawDate =
    c.date_naissance  ??   // objet DB MySQL (peut être Date ou string)
    c.dateNaissance   ??
    c.dob             ??   // objet formaté frontend (string "YYYY-MM-DD")
    c.birthDate       ??
    c.naissance       ??
    null;

  const dateAff = formatDate(rawDate);

  // ── CATÉGORIE ────────────────────────────────────────────────────────────
  const rawCat =
    c.categoriePermis  ||
    c.categorie        ||
    c.categorie_permis ||
    c.permis           ||
    c.category         ||
    "B";

  const categorieAr = categorieToArabic(String(rawCat).trim().toUpperCase());

  return { nomComplet, isArabic, dateAff, categorieAr };
}

/**
 * Construit les lignes du tableau (minimum 10 lignes)
 */
function buildRows(candidats, minRows = 10) {
  const rows  = [];
  const total = Math.max(minRows, candidats.length);

  for (let i = 0; i < total; i++) {
    const c   = candidats[i];
    const num = String(i + 1).padStart(2, "0");

    if (c) {
      const { nomComplet, isArabic, dateAff, categorieAr } = normaliseCandidat(c);
      const dir   = isArabic ? "rtl" : "ltr";
      const align = isArabic ? "right" : "left";

      rows.push(`<tr>
        <td class="num-col">${escapeHtml(num)}</td>
        <td class="name-col" style="direction:${dir};text-align:${align};padding-right:8px;">${escapeHtml(nomComplet)}</td>
        <td class="date-col">${escapeHtml(dateAff)}</td>
        <td class="cat-col">${escapeHtml(categorieAr)}</td>
        <td class="obs-col"></td>
      </tr>`);
    } else {
      rows.push(`<tr>
        <td class="num-col">${escapeHtml(num)}</td>
        <td class="name-col"></td>
        <td class="date-col"></td>
        <td class="cat-col"></td>
        <td class="obs-col"></td>
      </tr>`);
    }
  }
  return rows.join("\n");
}

/**
 * @param {object} opts
 * @param {string} opts.wilaya      - ex: "بجاية"
 * @param {string} opts.nomEcole    - nom de l'auto-école
 * @param {string} opts.dateDepot   - date de dépôt ex: "2026/02/16"
 * @param {Array}  opts.candidats   - tableau de candidats (tous formats acceptés)
 */
function buildListeEnvoiHTML({
  wilaya    = "بجاية",
  nomEcole  = "",
  dateDepot = "",
  candidats = [],
} = {}) {
  const totalStr = String(candidats.length).padStart(2, "0");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>لائحة ارسال</title>
<style>
  @page { size: A4 portrait; margin: 10mm 14mm 10mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Arial", "Tahoma", sans-serif;
    direction: rtl; font-size: 11px; color: #111; background: #fff;
  }

  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .header-table td { vertical-align: top; padding: 2px 6px; font-size: 10px; line-height: 1.7; }
  .header-right  { text-align: right; width: 33%; font-weight: bold; font-size: 10px; }
  .header-center { text-align: center; width: 34%; font-size: 11px; font-weight: bold; }
  .header-left   { text-align: center; width: 33%; }
  .stamp-box {
    border: 1.5px solid #111; min-height: 60px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: #555; padding: 4px; line-height: 1.6;
  }

  hr.sep { border: none; border-top: 1.5px solid #111; margin: 4px 0 10px 0; }

  .titre-container { text-align: center; margin-bottom: 12px; }
  .titre-box {
    display: inline-block; border: 2px solid #111;
    padding: 4px 40px; font-size: 20px; font-weight: bold;
    letter-spacing: 4px; text-decoration: underline;
  }

  .destinataire { text-align: right; font-size: 12px; font-weight: bold; margin-bottom: 10px; line-height: 2; }
  .lieu-date    { text-align: right; font-size: 12px; margin-bottom: 10px; font-weight: bold; }
  .objet        { text-align: right; font-size: 12px; margin-bottom: 10px; }
  .objet-label  { font-weight: bold; text-decoration: underline; }

  table.main-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  table.main-table th {
    background: #fff; border: 1.5px solid #111;
    padding: 4px 3px; text-align: center; font-weight: bold; font-size: 11px;
  }
  table.main-table td {
    border: 1.5px solid #111; padding: 1px 3px;
    text-align: center; height: 18px; font-size: 11px;
  }
  .num-col  { width: 8%;  }
  .name-col { width: 36%; }
  .date-col { width: 18%; }
  .cat-col  { width: 8%;  }
  .obs-col  { width: 30%; }

  .total-section { text-align: right; margin-bottom: 14px; font-size: 12px; font-weight: bold; }
  .total-num-box {
    display: inline-block; border: 1.5px solid #111;
    padding: 1px 10px; font-weight: bold; font-size: 12px;
    min-width: 32px; text-align: center;
  }

  .wssl-title { text-align: right; font-size: 12px; font-weight: bold; text-decoration: underline; margin-bottom: 8px; }
  .sig-line   { text-align: right; font-size: 12px; margin-bottom: 10px; line-height: 2; }
</style>
</head>
<body>

<table class="header-table">
  <tr>
    <td class="header-right">
      المندوبية الوطنية للأمن في الطرق<br/>
      المندوبية الولائية للأمن في الطرق<br/>
      ولاية : ${escapeHtml(wilaya)}
    </td>
    <td class="header-center">
      الجمهورية الجزائرية الديمقراطية الشعبية<br/>
      وزارة الداخلية والجماعات المحلية و النقل
    </td>
    <td class="header-left">
      <div class="stamp-box">
        خاتم مدرسة تعليم السياقة<br/>
        ${escapeHtml(nomEcole)}
      </div>
    </td>
  </tr>
</table>

<hr class="sep"/>

<div class="titre-container">
  <div class="titre-box">لائـحـة ارسـال</div>
</div>

<div class="destinataire">
  الى السيد (ة) رئيس (ة) المندوبية الولائية للأمن في الطرق لولاية ${escapeHtml(wilaya)}
</div>

<div class="lieu-date">
  ${escapeHtml(wilaya)} في ${escapeHtml(dateDepot)}
</div>

<div class="objet">
  <span class="objet-label">تجدون العثور على الوثائق المرفقة :</span>
  &nbsp; ملفات رخصة السياقة للمرشحين :
</div>

<table class="main-table">
  <thead>
    <tr>
      <th class="num-col">العدد</th>
      <th class="name-col">الاسم و اللقب</th>
      <th class="date-col">تاريخ الميلاد</th>
      <th class="cat-col">الصنف</th>
      <th class="obs-col">الملاحظات</th>
    </tr>
  </thead>
  <tbody>
    ${buildRows(candidats)}
  </tbody>
</table>

<div class="total-section">
  <span>عدد الملفات</span>
  &nbsp;
  <span class="total-num-box">${escapeHtml(totalStr)}</span>
</div>

<div class="wssl-title">وصل إرسال</div>
<div class="sig-line">استلم في : .................................................................</div>
<div class="sig-line">من طرف السيد (ة) : ........................................................</div>

</body>
</html>`;
}

module.exports = { buildListeEnvoiHTML };