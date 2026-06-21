import React from 'react';

/**
 * PdfGenerator.js
 * ───────────────────────────────────────────────────────────────────────────
 * Génération PDF côté navigateur (React/Electron renderer) avec jsPDF.
 *
 * INSTALLATION :
 *   npm install jspdf
 *
 * EXPORTS :
 *   - telechargerRecuPDF(versement, candidat, autoecole)
 *       → télécharge un reçu d'un seul versement
 *
 *   - telechargerHistoriquePDF(candidat, versements, autoecole)
 *       → télécharge l'historique complet de paiements d'un candidat
 *
 *   - BoutonRecuPDF          → bouton React prêt à l'emploi (reçu)
 *   - BoutonHistoriquePDF    → bouton React prêt à l'emploi (historique)
 * ───────────────────────────────────────────────────────────────────────────
 */

import { jsPDF } from 'jspdf';

const PRIX_PERMIS = 30000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fDA(n)     { return `${Number(n || 0).toLocaleString('fr-DZ')} DA`; }
function fDate(str) { return str ? new Date(str).toLocaleDateString('fr-FR') : '—'; }

function methodeLabel(m) {
  return { ccp: 'CCP', carte: 'Carte bancaire', especes: 'Espèces' }[m] ?? (m || '—');
}

function couleurHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ── Entête commune ────────────────────────────────────────────────────────────

function dessinerEntete(doc, autoecole, titre, sousTitre) {
  const w = doc.internal.pageSize.getWidth();

  // Fond bleu header
  doc.setFillColor(43, 83, 126);
  doc.rect(0, 0, w, 38, 'F');

  // Nom auto-école
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(autoecole?.nom || 'Auto-École', 14, 14);

  // Adresse & tél
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 240);
  const infoEcole = [autoecole?.adresse, autoecole?.telephone ? `Tél : ${autoecole.telephone}` : null].filter(Boolean).join('  ·  ');
  if (infoEcole) doc.text(infoEcole, 14, 21);

  // Titre à droite
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(titre, w - 14, 14, { align: 'right' });

  // Sous-titre à droite
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 240);
  if (sousTitre) doc.text(sousTitre, w - 14, 21, { align: 'right' });

  // Date
  doc.text(`Le ${fDate(new Date())}`, w - 14, 27, { align: 'right' });

  // Reset couleur
  doc.setTextColor(30, 41, 59);
}

// ── Pied de page ──────────────────────────────────────────────────────────────

function dessinerPiedDePage(doc, texte) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(14, h - 16, w - 14, h - 16);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(texte || 'Document généré automatiquement', w / 2, h - 9, { align: 'center' });
}

// ── Carte info candidat ───────────────────────────────────────────────────────

function dessinerCarteCandidat(doc, candidat, yStart) {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(240, 244, 250);
  doc.roundedRect(14, yStart, w - 28, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(43, 83, 126);
  doc.text(`${candidat.prenom || ''} ${candidat.nom || ''}`.trim(), 20, yStart + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

const infos = [
  candidat.telephone  ? `Tél : ${candidat.telephone}` : null,
  candidat.email      ? `Email : ${candidat.email}`   : null,
  candidat.idCandidat ? `ID : ${candidat.idCandidat}` : null,
].filter(Boolean);

  infos.forEach((info, i) => {
    doc.text(info, 20 + i * 62, yStart + 19);
  });

  return yStart + 32;
}

// ── Barre de progression ──────────────────────────────────────────────────────

function dessinerBarre(doc, montantPaye, montantTotal, yStart) {
  const w      = doc.internal.pageSize.getWidth();
  const pct    = Math.min(100, Math.round((montantPaye / montantTotal) * 100));
  const barW   = w - 28;
  const fillW  = (pct / 100) * barW;

  doc.setFillColor(203, 213, 225);
  doc.roundedRect(14, yStart, barW, 5, 2, 2, 'F');

  if (fillW > 0) {
    doc.setFillColor(pct >= 100 ? 22 : 78, pct >= 100 ? 101 : 150, pct >= 100 ? 52 : 225);
    doc.roundedRect(14, yStart, fillW, 5, 2, 2, 'F');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${pct}% réglé`, w - 14, yStart + 4, { align: 'right' });

  return yStart + 10;
}

// ── Tableau générique ─────────────────────────────────────────────────────────

function dessinerTableau(doc, colonnes, lignes, yStart, options = {}) {
  const w          = doc.internal.pageSize.getWidth();
  const { bgHeader = [43, 83, 126], rowH = 8 } = options;
  const colX       = colonnes.reduce((acc, col, i) => {
    acc.push(i === 0 ? 14 : acc[i - 1] + colonnes[i - 1].width);
    return acc;
  }, []);
  const totalW     = colonnes.reduce((s, c) => s + c.width, 0);

  // Header
  doc.setFillColor(...bgHeader);
  doc.rect(14, yStart, totalW, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  colonnes.forEach((col, i) => {
    doc.text(col.header, colX[i] + 3, yStart + 6);
  });

  let y = yStart + 9;

  // Lignes
  lignes.forEach((ligne, rowIdx) => {
    const h       = doc.internal.pageSize.getHeight();
    if (y + rowH + 10 > h - 20) {
      doc.addPage();
      y = 20;
    }

    // Fond alterné
    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, totalW, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);

    colonnes.forEach((col, i) => {
      const val = ligne[col.key] ?? '—';
      // Couleur spéciale si demandée
      if (col.color) doc.setTextColor(...couleurHex(col.color(ligne)));
      else           doc.setTextColor(31, 41, 55);

      doc.text(String(val), colX[i] + 3, y + (rowH - 1));
    });

    // Séparateur
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y + rowH, 14 + totalW, y + rowH);
    y += rowH;
  });

  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT 1 : Reçu d'un versement unique
// ─────────────────────────────────────────────────────────────────────────────

export function telechargerRecuPDF(versement, candidat, autoecole = {}) {
  const doc      = new jsPDF({ unit: 'mm', format: 'a4' });
  const w        = doc.internal.pageSize.getWidth();
  const montantPaye = (autoecole.prixPermis || PRIX_PERMIS) - Number(versement.montantRestant || 0);

  // Numéro de reçu
  const numeroRecu = `REC-${versement.idVersement || Date.now()}`;

  dessinerEntete(doc, autoecole, 'REÇU DE PAIEMENT', numeroRecu);

  let y = 48;

  // ── Carte candidat
  y = dessinerCarteCandidat(doc, candidat, y);

  // ── Encadré montant principal
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(14, y, w - 28, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('Montant versé', 20, y + 8);

  doc.setFontSize(18);
  doc.setTextColor(22, 101, 52);
  doc.text(fDA(versement.montant), w - 20, y + 14, { align: 'right' });

  y += 28;

  // ── Détails versement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(43, 83, 126);
  doc.text('DÉTAILS DU VERSEMENT', 14, y);
  y += 6;

  const details = [
    { label: 'Numéro de reçu',    val: numeroRecu },
    { label: 'Date du versement', val: fDate(versement.dateVersement) },
    { label: 'Méthode',           val: methodeLabel(versement.methode) },
    { label: 'Remarque',          val: versement.remarque || '—' },
  ];

  details.forEach(({ label, val }) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, w - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 18, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(val, 80, y + 5.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 8, w - 14, y + 8);
    y += 8;
  });

  y += 10;

  // ── Récapitulatif solde
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(43, 83, 126);
  doc.text('RÉCAPITULATIF DU SOLDE', 14, y);
  y += 6;

  const soldes = [
    { label: 'Total formation',  val: fDA(autoecole.prixPermis || PRIX_PERMIS), color: [30, 41, 59] },
    { label: 'Total réglé',      val: fDA(montantPaye),                         color: [22, 101, 52] },
    { label: 'Solde restant',    val: fDA(versement.montantRestant),             color: Number(versement.montantRestant) > 0 ? [185, 28, 28] : [22, 101, 52] },
  ];

  soldes.forEach(({ label, val, color }, i) => {
    if (i === soldes.length - 1) {
      doc.setFillColor(254, 242, 242);
      doc.rect(14, y, w - 28, 9, 'F');
    }
    doc.setFont('helvetica', i === soldes.length - 1 ? 'bold' : 'normal');
    doc.setFontSize(i === soldes.length - 1 ? 9.5 : 8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 18, y + 6);
    doc.setTextColor(...color);
    doc.text(val, w - 18, y + 6, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 9, w - 14, y + 9);
    y += 9;
  });

  y += 10;

  // Barre de progression
  y = dessinerBarre(doc, montantPaye, autoecole.prixPermis || PRIX_PERMIS, y);

  // Mention soldé
  if (Number(versement.montantRestant) <= 0) {
    y += 5;
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, y, w - 28, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text('Dossier entièrement soldé — Félicitations !', w / 2, y + 8, { align: 'center' });
  }

  // Signature
  const hPage = doc.internal.pageSize.getHeight();
  doc.setDrawColor(203, 213, 225);
  doc.line(w - 80, hPage - 40, w - 20, hPage - 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature et cachet', w - 50, hPage - 35, { align: 'center' });

  dessinerPiedDePage(doc, `Reçu ${numeroRecu} — ${autoecole.nom || 'Auto-École'} — Document officiel`);

  doc.save(`Recu_${candidat.nom}_${candidat.prenom}_${fDate(versement.dateVersement).replace(/\//g, '-')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT 2 : Historique complet des paiements d'un candidat
// ─────────────────────────────────────────────────────────────────────────────

export function telechargerHistoriquePDF(candidat, versements, autoecole = {}) {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' });
  const w          = doc.internal.pageSize.getWidth();
  const prixTotal  = autoecole.prixPermis || PRIX_PERMIS;
  const montantPaye = versements.reduce((s, v) => s + Number(v.montant || 0), 0);
  const reste       = Number(candidat.montantRestant ?? prixTotal);

  dessinerEntete(
    doc,
    autoecole,
    'HISTORIQUE DES PAIEMENTS',
    `Généré le ${fDate(new Date())}`
  );

  let y = 48;

  // ── Carte candidat
  y = dessinerCarteCandidat(doc, candidat, y);

  // ── 3 stats horizontales
  const statsBlocs = [
    { label: 'Total formation', val: fDA(prixTotal),    bg: [240, 244, 250], fg: [43, 83, 126] },
    { label: 'Total versé',     val: fDA(montantPaye),  bg: [240, 253, 244], fg: [22, 101, 52] },
    { label: 'Reste à payer',   val: fDA(reste),        bg: reste > 0 ? [254, 242, 242] : [240, 253, 244], fg: reste > 0 ? [185, 28, 28] : [22, 101, 52] },
  ];

  const blocW = (w - 28 - 8) / 3;
  statsBlocs.forEach((b, i) => {
    const x = 14 + i * (blocW + 4);
    doc.setFillColor(...b.bg);
    doc.roundedRect(x, y, blocW, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + blocW / 2, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...b.fg);
    doc.text(b.val, x + blocW / 2, y + 14, { align: 'center' });
  });

  y += 24;

  // ── Barre de progression
  y = dessinerBarre(doc, montantPaye, prixTotal, y);
  y += 6;

  // ── Titre tableau
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(43, 83, 126);
  doc.text(`DÉTAIL DES VERSEMENTS (${versements.length})`, 14, y);
  y += 6;

  // ── Tableau
  if (versements.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun versement enregistré.', w / 2, y + 8, { align: 'center' });
    y += 16;
  } else {
    // Trier par date croissante
    const sorted = [...versements].sort((a, b) => new Date(a.dateVersement) - new Date(b.dateVersement));

    const lignes = sorted.map((v, i) => ({
      num:     String(i + 1),
      date:    fDate(v.dateVersement),
      montant: fDA(v.montant),
      methode: methodeLabel(v.methode),
      remarque: v.remarque || '—',
      _raw:    v,
    }));

    const colonnes = [
      { key: 'num',     header: '#',          width: 10 },
      { key: 'date',    header: 'Date',        width: 30 },
      { key: 'montant', header: 'Montant',     width: 38, color: () => '#166534' },
      { key: 'methode', header: 'Méthode',     width: 36 },
      { key: 'remarque',header: 'Remarque',    width: w - 28 - 10 - 30 - 38 - 36 },
    ];

    y = dessinerTableau(doc, colonnes, lignes, y);

    // ── Ligne total
    y += 2;
    doc.setFillColor(240, 244, 250);
    const totW = w - 28;
    doc.rect(14, y, totW, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(43, 83, 126);
    doc.text('TOTAL', 18, y + 6.5);
    doc.setFontSize(10);
    doc.text(fDA(montantPaye), w - 18, y + 6.5, { align: 'right' });
    y += 14;
  }

  // ── Mention soldé / en attente
  if (reste <= 0) {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, y, w - 28, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text('✔ Dossier entièrement soldé', w / 2, y + 8, { align: 'center' });
  } else {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, y, w - 28, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(`Solde restant : ${fDA(reste)}`, w / 2, y + 8, { align: 'center' });
  }

  dessinerPiedDePage(doc, `Historique paiements — ${candidat.prenom} ${candidat.nom} — ${autoecole.nom || 'Auto-École'}`);

  doc.save(`Historique_${candidat.nom}_${candidat.prenom}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANTS REACT — Boutons prêts à l'emploi
// ─────────────────────────────────────────────────────────────────────────────

const btnStyle = (color) => ({
  padding: '6px 10px',
  borderRadius: 6,
  border: `1px solid ${color}`,
  background: `${color}18`,
  color,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'background 0.15s',
});

/**
 * Bouton "⬇ Reçu PDF" pour la colonne Actions du tableau versements
 *
 * Usage :
 *   <BoutonRecuPDF versement={item} candidat={{ prenom, nom, telephone, email }} autoecole={{ nom, telephone, adresse }} />
 */
export function BoutonRecuPDF({ versement, candidat, autoecole = {} }) {
  return (
    <button
      onClick={() => telechargerRecuPDF(versement, candidat, autoecole)}
      style={btnStyle('#166534')}
      title="Télécharger le reçu PDF"
    >
      ⬇ Reçu
    </button>
  );
}

/**
 * Bouton "📋 Historique PDF" pour la liste des débiteurs ou l'historique candidat
 *
 * Usage :
 *   <BoutonHistoriquePDF candidat={c} versements={allPayments.filter(p => p.idCandidat === c.idCandidat)} autoecole={...} />
 */
export function BoutonHistoriquePDF({ candidat, versements, autoecole = {} }) {
  return (
    <button
      onClick={() => telechargerHistoriquePDF(candidat, versements, autoecole)}
      style={btnStyle('#2b537e')}
      title="Télécharger l'historique PDF"
    >
      📋 Historique
    </button>
  );
}