import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PaymentModal from "../components/PaymentModal";
import SeanceSupModal from "../components/SeanceSupModal";
import InvoiceGenerator from "../components/Invoicegenerator";
import { jsPDF } from "jspdf";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/payment.css";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PRIX_PERMIS = 30000;
const AUTOECOLE = { nom: "Auto-École El Amal", telephone: "0550 00 00 00", adresse: "Sétif, Algérie" };

// ─── Utilitaires ──────────────────────────────────────────────────────────────
// const fDA   = (n) => `${Number(n || 0).toLocaleString("fr-DZ")} DA`;
const fDA = (n) => {
  const num = Number(n || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DA";
};
const fDate = (s) => s ? new Date(s).toLocaleDateString("fr-FR") : "—";
const mLabel = (m) => ({ ccp: "CCP", carte: "Carte", especes: "Espèces" })[m] ?? (m || "—");

function statutCandidat(montantRestant, aVerse) {
  if (!aVerse)                     return { label: "Jamais payé",  bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  if (Number(montantRestant) <= 0) return { label: "Soldé ✓",      bg: "#dcfce7", color: "#166534", dot: "#22c55e" };
  return                                  { label: "En cours",      bg: "#fef9c3", color: "#a16207", dot: "#eab308" };
}

// ─── PDF Reçu ─────────────────────────────────────────────────────────────────
function genererRecuPDF(versement, candidat) {
  const doc    = new jsPDF({ unit: "mm", format: "a4" });
  const W      = doc.internal.pageSize.getWidth();
  const paye   = PRIX_PERMIS - Number(versement.montantRestant || 0);
  const pct    = Math.min(100, Math.round((paye / PRIX_PERMIS) * 100));
  const numero = `REC-${versement.idVersement || Date.now()}`;

  doc.setFillColor(43, 83, 126);
  doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(`${AUTOECOLE.nom}`, 14, 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(180, 210, 240);
  doc.text(`${AUTOECOLE.adresse}  ·  Tél : ${AUTOECOLE.telephone}`, 14, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text("REÇU DE PAIEMENT", W - 14, 13, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(180, 210, 240);
  doc.text(numero, W - 14, 20, { align: "right" });
  doc.text(`Le ${fDate(new Date())}`, W - 14, 26, { align: "right" });

  let y = 46;
  doc.setFillColor(240, 244, 250);
  doc.roundedRect(14, y, W - 28, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(43, 83, 126);
  doc.text(`${candidat.prenom || ""} ${candidat.nom || ""}`.trim(), 20, y + 9);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  const infos = [candidat.telephone && `${candidat.telephone}`, candidat.email && `${candidat.email}`].filter(Boolean);
  infos.forEach((t, i) => doc.text(t, 20 + i * 70, y + 17));
  y += 30;

  doc.setFillColor(240, 253, 244); doc.setDrawColor(134, 239, 172);
  doc.roundedRect(14, y, W - 28, 20, 3, 3, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(22, 101, 52);
  doc.text("Montant versé", 20, y + 8);
  doc.setFontSize(17);
  doc.text(fDA(versement.montant), W - 20, y + 14, { align: "right" });
  y += 28;

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(43, 83, 126);
  doc.text("DÉTAILS DU VERSEMENT", 14, y); y += 5;
  [
    ["Date",    fDate(versement.dateVersement)],
    ["Méthode", mLabel(versement.methode)],
    ["Remarque",versement.remarque || "—"],
  ].forEach(([label, val], i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y, W - 28, 8, "F"); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(label, 18, y + 5.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
    doc.text(val, 70, y + 5.5);
    doc.setDrawColor(226, 232, 240); doc.line(14, y + 8, W - 14, y + 8);
    y += 8;
  });
  y += 8;

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(43, 83, 126);
  doc.text("RÉCAPITULATIF DU SOLDE", 14, y); y += 5;
  [
    ["Total formation", fDA(PRIX_PERMIS),              [30, 41, 59]],
    ["Total réglé",     fDA(paye),                     [22, 101, 52]],
    ["Solde restant",   fDA(versement.montantRestant), Number(versement.montantRestant) > 0 ? [185, 28, 28] : [22, 101, 52]],
  ].forEach(([label, val, color], i) => {
    if (i === 2) { doc.setFillColor(254, 242, 242); doc.rect(14, y, W - 28, 9, "F"); }
    doc.setFont("helvetica", i === 2 ? "bold" : "normal"); doc.setFontSize(i === 2 ? 9.5 : 8.5);
    doc.setTextColor(100, 116, 139); doc.text(label, 18, y + 6);
    doc.setTextColor(...color); doc.text(val, W - 18, y + 6, { align: "right" });
    doc.setDrawColor(226, 232, 240); doc.line(14, y + 9, W - 14, y + 9);
    y += 9;
  });
  y += 8;

  doc.setFillColor(203, 213, 225); doc.roundedRect(14, y, W - 28, 5, 2, 2, "F");
  if (pct > 0) {
    doc.setFillColor(pct >= 100 ? 22 : 78, pct >= 100 ? 101 : 150, pct >= 100 ? 52 : 225);
    doc.roundedRect(14, y, ((W - 28) * pct) / 100, 5, 2, 2, "F");
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(30, 41, 59);
  doc.text(`${pct}% réglé`, W - 14, y + 4, { align: "right" });
  y += 14;

  if (Number(versement.montantRestant) <= 0) {
    doc.setFillColor(220, 252, 231); doc.roundedRect(14, y, W - 28, 12, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(22, 101, 52);
    doc.text("Dossier entièrement soldé — Félicitations !", W / 2, y + 8, { align: "center" });
  }

  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240); doc.line(14, H - 16, W - 14, H - 16);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
  doc.text(`${numero} — ${AUTOECOLE.nom} — Document officiel`, W / 2, H - 9, { align: "center" });
  return doc;
}

function genererHistoriquePDF(candidat, versements) {
  versements = versements || [];
  const doc       = new jsPDF({ unit: "mm", format: "a4" });
  const W         = doc.internal.pageSize.getWidth();
  const totalPaye = versements.reduce((s, v) => s + Number(v.montant || 0), 0);
  const reste     = Number(candidat.montantRestant ?? PRIX_PERMIS);
  const pct       = Math.min(100, Math.round((totalPaye / PRIX_PERMIS) * 100));

  doc.setFillColor(43, 83, 126); doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(`${AUTOECOLE.nom}`, 14, 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(180, 210, 240);
  doc.text(`${AUTOECOLE.adresse}  ·  Tél : ${AUTOECOLE.telephone}`, 14, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text("HISTORIQUE DES PAIEMENTS", W - 14, 13, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(180, 210, 240);
  doc.text(`Généré le ${fDate(new Date())}`, W - 14, 20, { align: "right" });

  let y = 46;
  doc.setFillColor(240, 244, 250); doc.roundedRect(14, y, W - 28, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(43, 83, 126);
  doc.text(`${candidat.prenom || ""} ${candidat.nom || ""}`.trim(), 20, y + 9);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  if (candidat.telephone) doc.text(`${candidat.telephone}`, 20, y + 17);
  if (candidat.email)     doc.text(`${candidat.email}`, 90, y + 17);
  y += 30;

  const bW = (W - 28 - 8) / 3;
  [
    { label: "Total formation", val: fDA(PRIX_PERMIS),  bg: [240, 244, 250], fg: [43, 83, 126] },
    { label: "Total versé",     val: fDA(totalPaye),    bg: [240, 253, 244], fg: [22, 101, 52] },
    { label: "Reste à payer",   val: fDA(reste),        bg: reste > 0 ? [254, 242, 242] : [240, 253, 244], fg: reste > 0 ? [185, 28, 28] : [22, 101, 52] },
  ].forEach((b, i) => {
    const x = 14 + i * (bW + 4);
    doc.setFillColor(...b.bg); doc.roundedRect(x, y, bW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + bW / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...b.fg);
    doc.text(b.val, x + bW / 2, y + 14, { align: "center" });
  });
  y += 26;

  doc.setFillColor(203, 213, 225); doc.roundedRect(14, y, W - 28, 5, 2, 2, "F");
  if (pct > 0) {
    doc.setFillColor(pct >= 100 ? 22 : 78, pct >= 100 ? 101 : 150, pct >= 100 ? 52 : 225);
    doc.roundedRect(14, y, ((W - 28) * pct) / 100, 5, 2, 2, "F");
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(30, 41, 59);
  doc.text(`${pct}% réglé`, W - 14, y + 4, { align: "right" });
  y += 14;

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(43, 83, 126);
  doc.text(`DÉTAIL DES VERSEMENTS (${versements.length})`, 14, y); y += 5;

  if (versements.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("Aucun versement enregistré.", W / 2, y + 10, { align: "center" });
  } else {
    const cols = [
      { label: "#",        w: 10 },
      { label: "Date",     w: 30 },
      { label: "Montant",  w: 38 },
      { label: "Méthode",  w: 35 },
      { label: "Remarque", w: W - 28 - 10 - 30 - 38 - 35 },
    ];
    const xs = cols.reduce((acc, c, i) => { acc.push(i === 0 ? 14 : acc[i - 1] + cols[i - 1].w); return acc; }, []);
    const totW = cols.reduce((s, c) => s + c.w, 0);
    doc.setFillColor(43, 83, 126); doc.rect(14, y, totW, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    cols.forEach((c, i) => doc.text(c.label, xs[i] + 2, y + 6));
    y += 9;
    const sorted = [...versements].sort((a, b) => new Date(a.dateVersement) - new Date(b.dateVersement));
    sorted.forEach((v, ri) => {
      if (y + 10 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
      if (ri % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(14, y, totW, 8, "F"); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(31, 41, 55);
      [String(ri + 1), fDate(v.dateVersement), fDA(v.montant), mLabel(v.methode), v.remarque || "—"]
        .forEach((val, i) => {
          doc.setTextColor(i === 2 ? 22 : 31, i === 2 ? 101 : 41, i === 2 ? 52 : 55);
          doc.text(val, xs[i] + 2, y + 5.5);
        });
      doc.setDrawColor(229, 231, 235); doc.line(14, y + 8, 14 + totW, y + 8);
      y += 8;
    });
    y += 2;
    doc.setFillColor(240, 244, 250); doc.rect(14, y, totW, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(43, 83, 126);
    doc.text("TOTAL", 18, y + 6.5);
    doc.text(fDA(totalPaye), W - 18, y + 6.5, { align: "right" });
    y += 14;
  }

  if (reste <= 0) {
    doc.setFillColor(220, 252, 231); doc.roundedRect(14, y, W - 28, 12, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(22, 101, 52);
    doc.text("Dossier entièrement soldé", W / 2, y + 8, { align: "center" });
  } else {
    doc.setFillColor(254, 242, 242); doc.roundedRect(14, y, W - 28, 12, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(185, 28, 28);
    doc.text(`Solde restant : ${fDA(reste)}`, W / 2, y + 8, { align: "center" });
  }
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240); doc.line(14, H - 16, W - 14, H - 16);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
  doc.text(`Historique — ${candidat.prenom} ${candidat.nom} — ${AUTOECOLE.nom}`, W / 2, H - 9, { align: "center" });
  return doc;
}

// ─── Export groupé PDF ────────────────────────────────────────────────────────
function genererRapportGroupePDF(fiches, dateDebut, dateFin) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();

  const versementsFiltrés = (fiches, deb, fin) => {
    return fiches.flatMap(f =>
      f.versements
        .filter(v => {
          const d = new Date(v.dateVersement);
          return (!deb || d >= new Date(deb)) && (!fin || d <= new Date(fin + "T23:59:59"));
        })
        .map(v => ({ ...v, candidat: f }))
    ).sort((a, b) => new Date(a.dateVersement) - new Date(b.dateVersement));
  };

  const tous = versementsFiltrés(fiches, dateDebut, dateFin);
  const totalRapport = tous.reduce((s, v) => s + Number(v.montant || 0), 0);
  const periode = dateDebut || dateFin
    ? `${dateDebut ? fDate(dateDebut) : "…"} → ${dateFin ? fDate(dateFin) : "…"}`
    : "Toute la période";

  doc.setFillColor(43, 83, 126); doc.rect(0, 0, W, 50, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(AUTOECOLE.nom, W / 2, 22, { align: "center" });
  doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 210, 240);
  doc.text("RAPPORT D'ENCAISSEMENT", W / 2, 32, { align: "center" });
  doc.text(periode, W / 2, 41, { align: "center" });

  let y = 62;
  const stats = [
    { label: "Versements", val: String(tous.length) },
    { label: "Candidats", val: String(new Set(tous.map(v => v.candidat.idCandidat)).size) },
    { label: "Total encaissé", val: fDA(totalRapport) },
  ];
  const bW = (W - 28 - 8) / 3;
  stats.forEach((s, i) => {
    const x = 14 + i * (bW + 4);
    doc.setFillColor(240, 244, 250); doc.roundedRect(x, y, bW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(s.label, x + bW / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(43, 83, 126);
    doc.text(s.val, x + bW / 2, y + 14, { align: "center" });
  });
  y += 26;

  const cols = [
    { label: "Date",      w: 28 },
    { label: "Candidat",  w: 52 },
    { label: "Montant",   w: 36 },
    { label: "Méthode",   w: 30 },
    { label: "Remarque",  w: W - 28 - 28 - 52 - 36 - 30 },
  ];
  const xs = cols.reduce((acc, c, i) => { acc.push(i === 0 ? 14 : acc[i - 1] + cols[i - 1].w); return acc; }, []);
  const totW = cols.reduce((s, c) => s + c.w, 0);

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(43, 83, 126);
  doc.text(`DÉTAIL DES VERSEMENTS (${tous.length})`, 14, y); y += 5;

  doc.setFillColor(43, 83, 126); doc.rect(14, y, totW, 9, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  cols.forEach((c, i) => doc.text(c.label, xs[i] + 2, y + 6));
  y += 9;

  tous.forEach((v, ri) => {
    if (y + 10 > H - 20) { doc.addPage(); y = 20; }
    if (ri % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(14, y, totW, 8, "F"); }
    const nomCandidat = `${v.candidat.prenom || ""} ${v.candidat.nom || ""}`.trim();
    [fDate(v.dateVersement), nomCandidat, fDA(v.montant), mLabel(v.methode), v.remarque || "—"]
      .forEach((val, ci) => {
        doc.setFont("helvetica", ci === 2 ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(ci === 2 ? 22 : 31, ci === 2 ? 101 : 41, ci === 2 ? 52 : 55);
        doc.text(val, xs[ci] + 2, y + 5.5);
      });
    doc.setDrawColor(229, 231, 235); doc.line(14, y + 8, 14 + totW, y + 8);
    y += 8;
  });

  y += 4;
  if (y + 12 > H - 20) { doc.addPage(); y = 20; }
  doc.setFillColor(43, 83, 126); doc.rect(14, y, totW, 10, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text("TOTAL ENCAISSÉ", 18, y + 7);
  doc.text(fDA(totalRapport), W - 18, y + 7, { align: "right" });

  const pH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240); doc.line(14, pH - 16, W - 14, pH - 16);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
  doc.text(`Rapport généré le ${fDate(new Date())} — ${AUTOECOLE.nom}`, W / 2, pH - 9, { align: "center" });

  return doc;
}

// ─── Export groupé CSV ────────────────────────────────────────────────────────
function exporterCSV(fiches, dateDebut, dateFin) {
  const lignes = [];
  lignes.push(["Date", "Candidat", "Téléphone", "Montant (DA)", "Méthode", "Solde restant (DA)", "Remarque"].join(";"));

  fiches.forEach(f => {
    f.versements
      .filter(v => {
        const d = new Date(v.dateVersement);
        return (!dateDebut || d >= new Date(dateDebut)) && (!dateFin || d <= new Date(dateFin + "T23:59:59"));
      })
      .sort((a, b) => new Date(a.dateVersement) - new Date(b.dateVersement))
      .forEach(v => {
        lignes.push([
          fDate(v.dateVersement),
          `${f.prenom || ""} ${f.nom || ""}`.trim(),
          f.telephone || "",
          v.montant || 0,
          mLabel(v.methode),
          v.montantRestant ?? "",
          v.remarque || "",
        ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"));
      });
  });

  const csv = "\uFEFF" + lignes.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Export_Paiements_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Modal Export groupé ──────────────────────────────────────────────────────
function ExportModal({ fiches, onClose }) {
  const [dateDebut,     setDateDebut]     = useState("");
  const [dateFin,       setDateFin]       = useState("");
  const [recherche,     setRecherche]     = useState("");
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [selectAll,     setSelectAll]     = useState(false);
  const [format,        setFormat]        = useState("pdf");
  const [step,          setStep]          = useState("form");
  const [previewDoc,    setPreviewDoc]    = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  // Arrivée depuis l'agenda (milestone 20 séances) → ouvre directement le paiement
  useEffect(() => {
    if (location.state?.openSeanceSup) {
      setShowSeanceSup(true);
      // Nettoie le state pour éviter une réouverture si l'utilisateur revient en arrière
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const fichesFiltrees = fiches.filter(f => {
    const nom = `${f.prenom || ""} ${f.nom || ""}`.toLowerCase();
    return nom.includes(recherche.toLowerCase());
  });

  const toggleCandidat = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setSelectAll(false);
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(fichesFiltrees.map(f => f.idCandidat)));
      setSelectAll(true);
    }
  };

  useEffect(() => {
    if (fichesFiltrees.length > 0 && selectedIds.size === fichesFiltrees.length) setSelectAll(true);
    else setSelectAll(false);
  }, [selectedIds, fichesFiltrees.length]);

  const fichesExport = fiches.filter(f => selectedIds.has(f.idCandidat));

  const totalVersementsExport = fichesExport.reduce((s, f) => {
    return s + f.versements.filter(v => {
      const d = new Date(v.dateVersement);
      return (!dateDebut || d >= new Date(dateDebut)) && (!dateFin || d <= new Date(dateFin + "T23:59:59"));
    }).reduce((ss, v) => ss + Number(v.montant || 0), 0);
  }, 0);

  const nbVersementsExport = fichesExport.reduce((s, f) => {
    return s + f.versements.filter(v => {
      const d = new Date(v.dateVersement);
      return (!dateDebut || d >= new Date(dateDebut)) && (!dateFin || d <= new Date(dateFin + "T23:59:59"));
    }).length;
  }, 0);

  const handlePreview = () => {
    if (fichesExport.length === 0 || nbVersementsExport === 0) return;
    if (format === "csv") {
      exporterCSV(fichesExport, dateDebut, dateFin);
      onClose();
      return;
    }
    const doc = genererRapportGroupePDF(fichesExport, dateDebut, dateFin);
    const url = doc.output("bloburl");
    setPreviewDoc(doc);
    setPreviewUrl(url);
    setStep("preview");
  };

  const handleTelecharger = () => {
    if (previewDoc) {
      previewDoc.save(`Rapport_Paiements_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
    if (format === "both") {
      exporterCSV(fichesExport, dateDebut, dateFin);
    }
    onClose();
  };

  const handleRetour = () => {
  setPreviewUrl(null);
  setPreviewDoc(null);
  setStep("form");
};

  const inp = {
    padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9,
    fontSize: 13, outline: "none", background: "#f8fafc", color: "#1e293b", width: "100%", boxSizing: "border-box",
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%",
        maxWidth: step === "preview" ? 820 : 580,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden",
        transition: "max-width .2s ease",
      }}>
        <div style={{ background: "linear-gradient(135deg,#2b537e,#1e3a5f)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              {step === "form" ? "Export des paiements" : "Aperçu du rapport"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {step === "form" ? "PDF · CSV · Filtrage par période et candidat" : "Vérifiez avant de télécharger"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {step === "form" && (
          <>
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Période</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Date début</label>
                    <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Date fin</label>
                    <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={inp} />
                  </div>
                </div>
                {(dateDebut || dateFin) && (
                  <button onClick={() => { setDateDebut(""); setDateFin(""); }} style={{ marginTop: 6, background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                    ✕ Effacer la période
                  </button>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Format d'export</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["pdf", "📄 PDF"], ["csv", "📊 Excel/CSV"], ["both", "📄+📊 Les deux"]].map(([val, label]) => (
                    <button key={val} onClick={() => setFormat(val)} style={{
                      flex: 1, padding: "9px 6px", borderRadius: 9, border: `2px solid ${format === val ? "#2b537e" : "#e2e8f0"}`,
                      background: format === val ? "#eff6ff" : "#f8fafc",
                      color: format === val ? "#2b537e" : "#64748b",
                      fontWeight: format === val ? 700 : 500, fontSize: 12, cursor: "pointer",
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Candidats — {selectedIds.size} sélectionné{selectedIds.size !== 1 ? "s" : ""}
                </div>
                <input
                  type="text"
                  placeholder="🔍 Filtrer les candidats…"
                  value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  style={{ ...inp, marginBottom: 8 }}
                />
                <div
                  onClick={toggleAll}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "#f1f5f9", cursor: "pointer", marginBottom: 6, userSelect: "none" }}
                >
                  <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${selectAll ? "#2b537e" : "#cbd5e1"}`, background: selectAll ? "#2b537e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selectAll && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Sélectionner tous ({fichesFiltrees.length})</span>
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
                  {fichesFiltrees.map((f, i) => (
                    <div
                      key={f.idCandidat}
                      onClick={() => toggleCandidat(f.idCandidat)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                        cursor: "pointer", borderBottom: i < fichesFiltrees.length - 1 ? "1px solid #e2e8f0" : "none",
                        background: selectedIds.has(f.idCandidat) ? "#eff6ff" : "transparent",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${selectedIds.has(f.idCandidat) ? "#2b537e" : "#cbd5e1"}`, background: selectedIds.has(f.idCandidat) ? "#2b537e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {selectedIds.has(f.idCandidat) && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{f.prenom} {f.nom}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{f.versements.length} versement{f.versements.length !== 1 ? "s" : ""} · {fDA(f.totalVerse)}</div>
                      </div>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: f.statut.bg, color: f.statut.color }}>
                        {f.statut.label}
                      </span>
                    </div>
                  ))}
                  {fichesFiltrees.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun candidat trouvé</div>
                  )}
                </div>
              </div>

              {selectedIds.size > 0 && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", marginBottom: 8 }}>Aperçu de l'export</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div><span style={{ fontSize: 11, color: "#94a3b8" }}>Candidats : </span><strong style={{ color: "#0369a1" }}>{selectedIds.size}</strong></div>
                    <div><span style={{ fontSize: 11, color: "#94a3b8" }}>Versements : </span><strong style={{ color: "#0369a1" }}>{nbVersementsExport}</strong></div>
                    <div><span style={{ fontSize: 11, color: "#94a3b8" }}>Total : </span><strong style={{ color: "#166534" }}>{fDA(totalVersementsExport)}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, flexShrink: 0, background: "#f8fafc" }}>
              <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                Annuler
              </button>
              <button
                onClick={handlePreview}
                disabled={selectedIds.size === 0 || nbVersementsExport === 0}
                style={{
                  flex: 2, padding: 11, borderRadius: 10, border: "none",
                  background: selectedIds.size === 0 || nbVersementsExport === 0 ? "#94a3b8" : "#2b537e",
                  color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: selectedIds.size === 0 || nbVersementsExport === 0 ? "not-allowed" : "pointer",
                }}
              >
                {nbVersementsExport === 0
                  ? "Aucun versement dans la période"
                  : format === "csv"
                    ? `Exporter le CSV (${nbVersementsExport} versement${nbVersementsExport > 1 ? "s" : ""})`
                    : `👁 Aperçu (${nbVersementsExport} versement${nbVersementsExport > 1 ? "s" : ""})`}
              </button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <div style={{ flex: 1, background: "#525659", padding: 12, overflow: "hidden" }}>
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  title="Aperçu du rapport"
                  style={{ width: "100%", height: "100%", minHeight: 420, border: "none", borderRadius: 6, background: "#fff" }}
                />
              )}
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, flexShrink: 0, background: "#f8fafc" }}>
              <button onClick={handleRetour} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ← Modifier
              </button>
              <button
                onClick={handleTelecharger}
                style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: "#166534", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                ⬇ Télécharger{format === "both" ? " (PDF + CSV)" : " le PDF"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal Rappel ─────────────────────────────────────────────────────────────
function RappelModal({ candidat, onClose }) {
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [erreur,   setErreur]   = useState("");
  const [msgPerso, setMsgPerso] = useState("");

  if (!candidat) return null;
  const montantDA  = fDA(candidat.montantRestant ?? PRIX_PERMIS);
  const msgSuggere = `Bonjour ${candidat.prenom} ${candidat.nom},\n\nNous vous contactons au sujet de votre dossier de formation au permis de conduire à ${AUTOECOLE.nom}.\n\nUn solde de ${montantDA} reste à régler. Nous vous invitons à régulariser votre situation dans les meilleurs délais.\n\nPour tout renseignement, contactez-nous au ${AUTOECOLE.telephone}.\n\nCordialement,\nL'équipe ${AUTOECOLE.nom}`;

  const handleEnvoyer = async () => {
    if (!candidat.email) { setErreur("Aucune adresse email pour ce candidat."); return; }
    setSending(true); setErreur("");
    try {
      const result = await window.electron.sendRappelPaiement({
        email: candidat.email, nomCandidat: `${candidat.prenom} ${candidat.nom}`,
        montantRestant: candidat.montantRestant ?? PRIX_PERMIS, montantTotal: PRIX_PERMIS,
        telephone: AUTOECOLE.telephone, messagePersonnalise: msgPerso.trim() || null,
      });
      if (result?.success) setSent(true);
      else setErreur("Erreur : " + (result?.error || "inconnue"));
    } finally { setSending(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 500, boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📧</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Rappel de paiement</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{candidat.prenom} {candidat.nom} · {montantDA}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>Email envoyé !</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Envoyé à <strong>{candidat.email}</strong></div>
              <button onClick={onClose} style={{ marginTop: 20, padding: "10px 28px", borderRadius: 10, background: "#166534", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Fermer</button>
            </div>
          ) : (
            <>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>Destinataire : </span>
                {candidat.email
                  ? <strong style={{ color: "#1e293b" }}>{candidat.email}</strong>
                  : <span style={{ color: "#ef4444", fontWeight: 600 }}>⚠ Aucun email enregistré</span>}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>✏️ Message</label>
                  {msgPerso.trim() && <button onClick={() => setMsgPerso("")} style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer", padding: 0 }}>↩ Revenir au message suggéré</button>}
                </div>
                <textarea
                  value={msgPerso || msgSuggere}
                  onChange={e => setMsgPerso(e.target.value === msgSuggere ? "" : e.target.value)}
                  rows={8}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: `1.5px solid ${msgPerso.trim() ? "#f97316" : "#cbd5e1"}`, borderRadius: 10, resize: "vertical", outline: "none", color: "#1e293b", boxSizing: "border-box", fontFamily: "'Segoe UI', sans-serif", lineHeight: 1.65, background: msgPerso.trim() ? "#fff7ed" : "#f8fafc" }}
                />
              </div>
              {erreur && <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>⚠️ {erreur}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Annuler</button>
                <button onClick={handleEnvoyer} disabled={sending || !candidat.email} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: sending || !candidat.email ? "#94a3b8" : "#f97316", color: "#fff", fontWeight: 700, fontSize: 13, cursor: sending || !candidat.email ? "not-allowed" : "pointer" }}>
                  {sending ? "⏳ Envoi…" : "📧 Envoyer"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Historique ─────────────────────────────────────────────────────────
function HistoriqueModal({ candidat, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [doc,        setDoc]        = useState(null);

  useEffect(() => {
    if (!candidat) return;
    const d   = genererHistoriquePDF(candidat, candidat.versements);
    const url = d.output("bloburl");
    setDoc(d);
    setPreviewUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [candidat]);

  if (!candidat) return null;

  const handleTelecharger = () => {
    if (doc) doc.save(`Historique_${candidat.nom}_${candidat.prenom}.pdf`);
    onClose();
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 820,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#6d28d9,#5b21b6)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              Historique des paiements
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {candidat.prenom} {candidat.nom} · {candidat.versements.length} versement{candidat.versements.length !== 1 ? "s" : ""} · {fDA(candidat.totalVerse)} versé
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Aperçu PDF */}
        <div style={{ flex: 1, background: "#525659", padding: 12, overflow: "hidden" }}>
          {previewUrl
            ? (
              <iframe
                src={previewUrl}
                title="Aperçu historique"
                style={{ width: "100%", height: "100%", minHeight: 460, border: "none", borderRadius: 6, background: "#fff" }}
              />
            )
            : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 460, color: "#ccc", fontSize: 13 }}>
                ⏳ Génération du PDF…
              </div>
            )
          }
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, flexShrink: 0, background: "#f8fafc" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            Fermer
          </button>
          <button
            onClick={handleTelecharger}
            disabled={!doc}
            style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: doc ? "#6d28d9" : "#94a3b8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: doc ? "pointer" : "not-allowed" }}
          >
            ⬇ Télécharger le PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────
const Payments = () => {
  const [selected,       setSelected]       = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [showInvoices,   setShowInvoices]   = useState(false);
  const [showExport,     setShowExport]     = useState(false);
  const [showSeanceSup,  setShowSeanceSup]  = useState(false);
  const [rappelCand,     setRappelCand]     = useState(null);
  const [historiqueCand, setHistoriqueCand] = useState(null);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filtreStatut,   setFiltreStatut]   = useState("tous");
  const [sortConfig,     setSortConfig]     = useState({ key: "nom", dir: "asc" });
  const [expanded,       setExpanded]       = useState(new Set());
  const [toastMsg,       setToastMsg]       = useState(null);
  const [paymentsData,   setPaymentsData]   = useState([]);
  const [allCandidates,  setAllCandidates]  = useState([]);

  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [payments, candidates] = await Promise.all([window.electron.getPayments(), window.electron.getCandidats()]);
      setPaymentsData(payments || []);
      setAllCandidates(candidates || []);
    } catch (err) { console.error("Erreur fetchData:", err); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddPayment = async (paymentData) => {
    try {
      const result = await window.electron.addPayment(paymentData);
      if (result.success) {
        setShowModal(false); setSelected(null);
        await fetchData();
        showToast("Versement enregistré !");
      } else {
        alert("Erreur : " + (result.message || "Action impossible"));
      }
    } catch (err) { console.error(err); }
  };

  // ── Fiches candidats ───────────────────────────────────────────────────────
  const fichesCandidats = allCandidates.map(c => {
    const versements     = paymentsData.filter(p => p.idCandidat === (c.idCandidat || c.id));
    const totalVerse     = versements.reduce((s, v) => s + Number(v.montant || 0), 0);
    const montantRestant = Number(c.montantRestant ?? PRIX_PERMIS);
    const aVerse         = versements.length > 0;
    const statut         = statutCandidat(montantRestant, aVerse);
    const pct            = Math.min(100, Math.round(((PRIX_PERMIS - montantRestant) / PRIX_PERMIS) * 100));
    return { ...c, idCandidat: c.idCandidat || c.id, versements, totalVerse, montantRestant, aVerse, statut, pct };
  });

  // ── Stats globales ─────────────────────────────────────────────────────────
  const totalEncaisse = paymentsData.reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalRestant  = fichesCandidats.reduce((s, f) => s + f.montantRestant, 0);
  const nbDebiteurs   = fichesCandidats.filter(f => f.montantRestant > 0).length;
  const mois  = new Date().getMonth();
  const annee = new Date().getFullYear();
  const revenuMois = paymentsData
    .filter(p => { const d = new Date(p.dateVersement); return d.getMonth() === mois && d.getFullYear() === annee; })
    .reduce((s, p) => s + Number(p.montant || 0), 0);

  // ── Filtrage + tri ─────────────────────────────────────────────────────────
  const fichesFiltrees = fichesCandidats
    .filter(f => {
      const nom = `${f.prenom || ""} ${f.nom || ""}`.toLowerCase();
      if (!nom.includes(searchTerm.toLowerCase())) return false;
      if (filtreStatut === "solde")    return f.montantRestant <= 0 && f.aVerse;
      if (filtreStatut === "en_cours") return f.montantRestant > 0 && f.aVerse;
      if (filtreStatut === "jamais")   return !f.aVerse;
      return true;
    })
    .sort((a, b) => {
      const dir = sortConfig.dir === "asc" ? 1 : -1;
      if (sortConfig.key === "nom")            return dir * (`${a.prenom} ${a.nom}`).localeCompare(`${b.prenom} ${b.nom}`);
      if (sortConfig.key === "totalVerse")     return dir * (a.totalVerse - b.totalVerse);
      if (sortConfig.key === "montantRestant") return dir * (a.montantRestant - b.montantRestant);
      if (sortConfig.key === "pct")            return dir * (a.pct - b.pct);
      if (sortConfig.key === "versements")     return dir * (a.versements.length - b.versements.length);
      return 0;
    });

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <span style={{ color: "#cbd5e1", marginLeft: 4 }}>↕</span>;
    return <span style={{ color: "#2b537e", marginLeft: 4 }}>{sortConfig.dir === "asc" ? "↑" : "↓"}</span>;
  };

  const thStyle = (key) => ({
    padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: sortConfig.key === key ? "#2b537e" : "#64748b",
    textTransform: "uppercase", letterSpacing: "0.05em",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  });

  const btnAct = (bg, color, border) => ({
    padding: "5px 11px", borderRadius: 7, border: `1px solid ${border || color}`,
    background: bg, color, cursor: "pointer", fontSize: 11, fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  });

  return (
    <div className="container">
      <div className="main">

        {/* Toast */}
        {toastMsg && (
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 3000, background: toastMsg.type === "success" ? "#22c55e" : "#ef4444", color: "#fff", padding: "11px 22px", borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", animation: "slideUp .25s ease" }}>
            {toastMsg.msg}
            <style>{`@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          </div>
        )}

        {/* Header */}
        <div className="header">
          <img src={ConnexionImg} alt="" className="header-img" />
          <h1><img src={SmallCar} alt="" width={38} style={{ marginRight: 10 }} />Gestion des Encaissements</h1>
          <p>Vue unifiée — tous les candidats, tous les paiements</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22, marginTop: 18 }}>
          {[
            { title: "Total encaissé",    value: fDA(totalEncaisse), color: "#2b537e", icon: "💰" },
            { title: "Reste à recouvrer", value: fDA(totalRestant),  color: totalRestant > 0 ? "#b91c1c" : "#166534", icon: "⏳" },
            { title: "Revenus ce mois",   value: fDA(revenuMois),    color: "#0369a1", icon: "📅" },
            { title: "Débiteurs",         value: String(nbDebiteurs), color: nbDebiteurs > 0 ? "#b91c1c" : "#166534", icon: "👥" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", borderLeft: `4px solid ${c.color}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{c.title}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Barre actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍 Rechercher un candidat…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, outline: "none", fontSize: 13, background: "#fff" }}
          />
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
            {[["tous","Tous"], ["en_cours","En cours"], ["jamais","Jamais payé"], ["solde","Soldés"]].map(([val, label]) => (
              <button key={val} onClick={() => setFiltreStatut(val)} style={{
                padding: "7px 13px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer",
                background: filtreStatut === val ? "#fff" : "transparent",
                color: filtreStatut === val ? "#2b537e" : "#64748b",
                boxShadow: filtreStatut === val ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowExport(true)} style={{ padding: "10px 18px", borderRadius: 10, background: "#0369a1", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ⬇ Export
          </button>
          <button onClick={() => setShowInvoices(true)} style={{ padding: "10px 18px", borderRadius: 10, background: "#2b537e", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            📄 Factures
          </button>
          <button onClick={() => { setSelected(null); setShowModal(true); }} style={{ padding: "10px 18px", borderRadius: 10, background: "#166534", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Versement
          </button>
          <button
            onClick={() => setShowSeanceSup(true)}
            style={{ padding: "10px 18px", borderRadius: 10, background: "#d97706", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            ➕ Séance Sup.
          </button>
        </div>

        {/* Compteur */}
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>
          {fichesFiltrees.length} candidat{fichesFiltrees.length !== 1 ? "s" : ""} affiché{fichesFiltrees.length !== 1 ? "s" : ""}
        </div>

        {/* ── Tableau ── */}
        {fichesFiltrees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", background: "#fff", borderRadius: 14, fontSize: 14 }}>
            Aucun candidat trouvé.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle("nom"), width: 36 }}></th>
                    <th style={thStyle("nom")} onClick={() => handleSort("nom")}>Candidat <SortIcon colKey="nom" /></th>
                    <th style={thStyle("statut")}>Statut</th>
                    <th style={thStyle("totalVerse")} onClick={() => handleSort("totalVerse")}>Versé <SortIcon colKey="totalVerse" /></th>
                    <th style={thStyle("montantRestant")} onClick={() => handleSort("montantRestant")}>Restant <SortIcon colKey="montantRestant" /></th>
                    <th style={thStyle("pct")} onClick={() => handleSort("pct")}>Progression <SortIcon colKey="pct" /></th>
                    <th style={thStyle("versements")} onClick={() => handleSort("versements")}>Nb. <SortIcon colKey="versements" /></th>
                    <th style={{ ...thStyle("actions"), cursor: "default" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fichesFiltrees.map((f, ri) => (
                    <React.Fragment key={f.idCandidat}>
                      {/* Ligne principale */}
                      <tr
                        style={{
                          background: expanded.has(f.idCandidat) ? "#f0f6ff" : (ri % 2 === 1 ? "#fafafa" : "#fff"),
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background .15s",
                        }}
                      >
                        {/* Expand toggle */}
                        <td style={{ padding: "0 6px 0 12px", verticalAlign: "middle" }}>
                          {f.versements.length > 0 && (
                            <button
                              onClick={() => toggleExpand(f.idCandidat)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#94a3b8", padding: 4, lineHeight: 1 }}
                              title={expanded.has(f.idCandidat) ? "Masquer" : "Voir les versements"}
                            >
                              {expanded.has(f.idCandidat) ? "▼" : "▶"}
                            </button>
                          )}
                        </td>

                        {/* Candidat */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{f.prenom} {f.nom}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {f.telephone && <span style={{ marginRight: 10 }}>📞 {f.telephone}</span>}
                            {f.email && <span>✉ {f.email}</span>}
                          </div>
                        </td>

                        {/* Statut */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: f.statut.bg, color: f.statut.color, whiteSpace: "nowrap" }}>
                            {f.statut.label}
                          </span>
                        </td>

                        {/* Versé */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", fontWeight: 700, color: "#166534", fontSize: 13 }}>
                          {fDA(f.totalVerse)}
                        </td>

                        {/* Restant */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", fontWeight: 700, color: f.montantRestant > 0 ? "#b91c1c" : "#166534", fontSize: 13 }}>
                          {fDA(f.montantRestant)}
                        </td>

                        {/* Progression */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", minWidth: 110 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ flex: 1, height: 7, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${f.pct}%`, background: f.pct >= 100 ? "#22c55e" : "#4e96e1", borderRadius: 6 }} />
                            </div>
                            <span style={{ fontSize: 11, color: "#64748b", minWidth: 30, textAlign: "right" }}>{f.pct}%</span>
                          </div>
                        </td>

                        {/* Nb versements */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", textAlign: "center" }}>
                          <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{f.versements.length}</span>
                        </td>

                        {/* ── Actions ── */}
                        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {f.versements.length > 0 && (
                              <>
                                <button
                                  onClick={() => { const d = genererRecuPDF(f.versements[0], f); d.save(`Recu_${f.nom}_${f.prenom}.pdf`); }}
                                  style={btnAct("#f0fdf4", "#166534", "#86efac")}
                                  title="Télécharger le reçu PDF"
                                >
                                  ⬇ Reçu
                                </button>
                                <button
                                  onClick={() => { const d = genererRecuPDF(f.versements[0], f); window.open(d.output("bloburl"), "_blank"); }}
                                  style={btnAct("#f0f4fa", "#2b537e", "#93c5fd")}
                                  title="Imprimer le reçu"
                                >
                                  🖨 Imprimer
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setHistoriqueCand(f)}
                              style={btnAct("#f5f3ff", "#6d28d9", "#c4b5fd")}
                              title="Aperçu et téléchargement de l'historique PDF"
                            >
                              📋 Historique
                            </button>
                            <button
                              onClick={() => setRappelCand(f)}
                              style={btnAct("#fff7ed", "#f97316", "#fed7aa")}
                              title="Envoyer un rappel par email"
                            >
                              📧 Rappel
                            </button>
                            {f.montantRestant > 0 && (
                              <button
                                onClick={() => { setSelected(f); setShowModal(true); }}
                                style={btnAct("#ecfdf5", "#166534", "#6ee7b7")}
                                title="Ajouter un versement"
                              >
                                + Versement
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Ligne dépliée — versements */}
                      {expanded.has(f.idCandidat) && f.versements.length > 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: "#f0f6ff" }}>
                            <div style={{ padding: "10px 20px 14px 52px" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "#e0eaff" }}>
                                    {["Date", "Montant", "Méthode", "Remarque", "Actions"].map(h => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#2b537e", fontWeight: 700, fontSize: 11 }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...f.versements].sort((a, b) => new Date(b.dateVersement) - new Date(a.dateVersement)).map((v, vi) => (
                                    <tr key={v.idVersement || vi} style={{ borderBottom: "1px solid #dce8ff" }}>
                                      <td style={{ padding: "6px 10px", color: "#475569" }}>{fDate(v.dateVersement)}</td>
                                      <td style={{ padding: "6px 10px", fontWeight: 700, color: "#166534" }}>{fDA(v.montant)}</td>
                                      <td style={{ padding: "6px 10px", color: "#475569" }}>{mLabel(v.methode)}</td>
                                      <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{v.remarque || "—"}</td>
                                      <td style={{ padding: "6px 10px" }}>
                                        <div style={{ display: "flex", gap: 5 }}>
                                          <button
                                            onClick={() => { const d = genererRecuPDF(v, f); d.save(`Recu_${f.nom}_${v.idVersement}.pdf`); }}
                                            style={{ ...btnAct("#f0fdf4", "#166634", "#86efac"), padding: "3px 9px" }}
                                          >
                                            ⬇ Reçu
                                          </button>
                                          <button
                                            onClick={() => { const d = genererRecuPDF(v, f); window.open(d.output("bloburl"), "_blank"); }}
                                            style={{ ...btnAct("#f0f4fa", "#2b537e", "#93c5fd"), padding: "3px 9px" }}
                                          >
                                            🖨 Imprimer
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modales ── */}
        {showModal && (
          <PaymentModal
            candidate={selected}
            allCandidates={allCandidates}
            onClose={() => { setShowModal(false); setSelected(null); }}
            onAddPayment={handleAddPayment}
          />
        )}

        {showExport && (
          <ExportModal fiches={fichesCandidats} onClose={() => setShowExport(false)} />
        )}

       {showSeanceSup && (
          <SeanceSupModal
            prefillCandidat={location.state?.openSeanceSup ? location.state : null}
            onClose={() => setShowSeanceSup(false)}
            onAddPayment={async (paymentData) => {
              const result = await window.electron.addPayment(paymentData);
              if (result?.success) {
                await fetchData();
                showToast(`Séance supplémentaire enregistrée — ${Number(paymentData.montant).toLocaleString("fr-DZ")} DA !`);
              } else {
                alert("Erreur : " + (result?.message || "Action impossible"));
              }
            }}
          />
        )}
        {showInvoices && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1500, overflowY: "auto" }}>
            <div style={{ background: "#F0F4FA", minHeight: "100vh", maxWidth: 960, margin: "0 auto", position: "relative" }}>
              <button onClick={() => setShowInvoices(false)} style={{ position: "fixed", top: 20, right: "calc(50% - 460px)", background: "#2b537e", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 18, cursor: "pointer", zIndex: 1600, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              <InvoiceGenerator />
            </div>
          </div>
        )}

        {rappelCand && (
          <RappelModal candidat={rappelCand} onClose={() => setRappelCand(null)} />
        )}

        {historiqueCand && (
          <HistoriqueModal candidat={historiqueCand} onClose={() => setHistoriqueCand(null)} />
        )}

      </div>
    </div>
  );
};

export default Payments;