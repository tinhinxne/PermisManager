import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaymentModal from "../components/PaymentModal";
import SeanceSupModal from "../components/SeanceSupModal";
import InvoiceGenerator from "../components/Invoicegenerator";
import { jsPDF } from "jspdf";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/payment.css";

const PRIX_PERMIS = 30000;
const AUTOECOLE = { nom: "Auto-École El Amal", telephone: "0550 00 00 00", adresse: "Sétif, Algérie" };

const fDA = (n) => {
  const num = Number(n || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DA";
};
const fDate = (s) => (s ? new Date(s).toLocaleDateString("fr-FR") : "—");
const mLabel = (m) => ({ ccp: "CCP", carte: "Carte", especes: "Espèces" })[m] ?? (m || "—");

function statutCandidat(montantRestant, aVerse) {
  if (!aVerse) return { label: "Jamais payé", bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  if (Number(montantRestant) <= 0) return { label: "Soldé ✓", bg: "#dcfce7", color: "#166534", dot: "#22c55e" };
  return { label: "En cours", bg: "#fef9c3", color: "#a16207", dot: "#eab308" };
}

function genererRecuPDF(versement, candidat) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const paye = PRIX_PERMIS - Number(versement.montantRestant || 0);
  const pct = Math.min(100, Math.round((paye / PRIX_PERMIS) * 100));
  const numero = `REC-${versement.idVersement || Date.now()}`;

  doc.setFillColor(43, 83, 126);
  doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${AUTOECOLE.nom}`, 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 240);
  doc.text(`${AUTOECOLE.adresse}  ·  Tél : ${AUTOECOLE.telephone}`, 14, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("REÇU DE PAIEMENT", W - 14, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 240);
  doc.text(numero, W - 14, 20, { align: "right" });
  doc.text(`Le ${fDate(new Date())}`, W - 14, 26, { align: "right" });

  let y = 46;
  doc.setFillColor(240, 244, 250);
  doc.roundedRect(14, y, W - 28, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(43, 83, 126);
  doc.text(`${candidat.prenom || ""} ${candidat.nom || ""}`.trim(), 20, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const infos = [candidat.telephone && `${candidat.telephone}`, candidat.email && `${candidat.email}`].filter(Boolean);
  infos.forEach((t, i) => doc.text(t, 20 + i * 70, y + 17));
  y += 30;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(14, y, W - 28, 20, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text("Montant versé", 20, y + 8);
  doc.setFontSize(17);
  doc.text(fDA(versement.montant), W - 20, y + 14, { align: "right" });
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(43, 83, 126);
  doc.text("DÉTAILS DU VERSEMENT", 14, y);
  y += 5;

  [["Date", fDate(versement.dateVersement)], ["Méthode", mLabel(versement.methode)], ["Remarque", versement.remarque || "—"]].forEach(
    ([label, val], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, W - 28, 8, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 18, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.text(val, 70, y + 5.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 8, W - 14, y + 8);
      y += 8;
    }
  );

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(43, 83, 126);
  doc.text("RÉCAPITULATIF DU SOLDE", 14, y);
  y += 5;

  [
    ["Total formation", fDA(PRIX_PERMIS), [30, 41, 59]],
    ["Total réglé", fDA(paye), [22, 101, 52]],
    ["Solde restant", fDA(versement.montantRestant), Number(versement.montantRestant) > 0 ? [185, 28, 28] : [22, 101, 52]],
  ].forEach(([label, val, color], i) => {
    if (i === 2) {
      doc.setFillColor(254, 242, 242);
      doc.rect(14, y, W - 28, 9, "F");
    }
    doc.setFont("helvetica", i === 2 ? "bold" : "normal");
    doc.setFontSize(i === 2 ? 9.5 : 8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 18, y + 6);
    doc.setTextColor(...color);
    doc.text(val, W - 18, y + 6, { align: "right" });
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 9, W - 14, y + 9);
    y += 9;
  });

  y += 8;
  doc.setFillColor(203, 213, 225);
  doc.roundedRect(14, y, W - 28, 5, 2, 2, "F");
  if (pct > 0) {
    doc.setFillColor(pct >= 100 ? 22 : 78, pct >= 100 ? 101 : 150, pct >= 100 ? 52 : 225);
    doc.roundedRect(14, y, ((W - 28) * pct) / 100, 5, 2, 2, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${pct}% réglé`, W - 14, y + 4, { align: "right" });

  if (Number(versement.montantRestant) <= 0) {
    y += 14;
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, y, W - 28, 12, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text("Dossier entièrement soldé — Félicitations !", W / 2, y + 8, { align: "center" });
  }

  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(14, H - 16, W - 14, H - 16);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${numero} — ${AUTOECOLE.nom} — Document officiel`, W / 2, H - 9, { align: "center" });
  return doc;
}

function genererHistoriquePDF(candidat, versements) {
  versements = versements || [];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const totalPaye = versements.reduce((s, v) => s + Number(v.montant || 0), 0);
  const reste = Number(candidat.montantRestant ?? PRIX_PERMIS);
  const pct = Math.min(100, Math.round((totalPaye / PRIX_PERMIS) * 100));

  doc.setFillColor(43, 83, 126);
  doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${AUTOECOLE.nom}`, 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 240);
  doc.text(`${AUTOECOLE.adresse}  ·  Tél : ${AUTOECOLE.telephone}`, 14, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("HISTORIQUE DES PAIEMENTS", W - 14, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 240);
  doc.text(`Généré le ${fDate(new Date())}`, W - 14, 20, { align: "right" });

  let y = 46;
  doc.setFillColor(240, 244, 250);
  doc.roundedRect(14, y, W - 28, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(43, 83, 126);
  doc.text(`${candidat.prenom || ""} ${candidat.nom || ""}`.trim(), 20, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (candidat.telephone) doc.text(`${candidat.telephone}`, 20, y + 17);
  if (candidat.email) doc.text(`${candidat.email}`, 90, y + 17);
  y += 30;

  const bW = (W - 28 - 8) / 3;
  [
    { label: "Total formation", val: fDA(PRIX_PERMIS), bg: [240, 244, 250], fg: [43, 83, 126] },
    { label: "Total versé", val: fDA(totalPaye), bg: [240, 253, 244], fg: [22, 101, 52] },
    { label: "Reste à payer", val: fDA(reste), bg: reste > 0 ? [254, 242, 242] : [240, 253, 244], fg: reste > 0 ? [185, 28, 28] : [22, 101, 52] },
  ].forEach((b, i) => {
    const x = 14 + i * (bW + 4);
    doc.setFillColor(...b.bg);
    doc.roundedRect(x, y, bW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, x + bW / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...b.fg);
    doc.text(b.val, x + bW / 2, y + 14, { align: "center" });
  });
  y += 26;

  doc.setFillColor(203, 213, 225);
  doc.roundedRect(14, y, W - 28, 5, 2, 2, "F");
  if (pct > 0) {
    doc.setFillColor(pct >= 100 ? 22 : 78, pct >= 100 ? 101 : 150, pct >= 100 ? 52 : 225);
    doc.roundedRect(14, y, ((W - 28) * pct) / 100, 5, 2, 2, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${pct}% réglé`, W - 14, y + 4, { align: "right" });
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(43, 83, 126);
  doc.text(`DÉTAIL DES VERSEMENTS (${versements.length})`, 14, y);
  y += 5;

  if (versements.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Aucun versement enregistré.", W / 2, y + 10, { align: "center" });
  } else {
    const cols = [
      { label: "#", w: 10 },
      { label: "Date", w: 30 },
      { label: "Montant", w: 38 },
      { label: "Méthode", w: 35 },
      { label: "Remarque", w: W - 28 - 10 - 30 - 38 - 35 },
    ];
    const xs = cols.reduce((acc, c, i) => {
      acc.push(i === 0 ? 14 : acc[i - 1] + cols[i - 1].w);
      return acc;
    }, []);
    const totW = cols.reduce((s, c) => s + c.w, 0);

    doc.setFillColor(43, 83, 126);
    doc.rect(14, y, totW, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    cols.forEach((c, i) => doc.text(c.label, xs[i] + 2, y + 6));
    y += 9;

    const sorted = [...versements].sort((a, b) => new Date(a.dateVersement) - new Date(b.dateVersement));
    sorted.forEach((v, ri) => {
      if (y + 10 > H - 20) {
        doc.addPage();
        y = 20;
      }
      if (ri % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, totW, 8, "F");
      }
      ["", fDate(v.dateVersement), fDA(v.montant), mLabel(v.methode), v.remarque || "—"].forEach((val, i) => {
        doc.setFont("helvetica", i === 2 ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(i === 2 ? 22 : 31, i === 2 ? 101 : 41, i === 2 ? 52 : 55);
        doc.text(i === 0 ? String(ri + 1) : val, xs[i] + 2, y + 5.5);
      });
      doc.setDrawColor(229, 231, 235);
      doc.line(14, y + 8, 14 + totW, y + 8);
      y += 8;
    });
  }

  return doc;
}

const PaymentsMoniteur = ({ currentUser, getPermissions }) => {
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSeanceSup, setShowSeanceSup] = useState(false);
  const [rappelCand, setRappelCand] = useState(null);
  const [historiqueCand, setHistoriqueCand] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [sortConfig, setSortConfig] = useState({ key: "nom", dir: "asc" });
  const [expanded, setExpanded] = useState(new Set());
  const [toastMsg, setToastMsg] = useState(null);
  const [paymentsData, setPaymentsData] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);

  const permissions = getPermissions?.(currentUser?.idMoniteur) || {};
  const canViewAll = !!permissions.CAN_VIEW_ALL_CANDIDATES;
  const canAddPayment = !!permissions.CAN_ADD_PAYMENT;

  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [payments, candidates] = await Promise.all([window.electron.getPayments(), window.electron.getCandidats()]);
      setPaymentsData(payments || []);
      setAllCandidates(candidates || []);
    } catch (err) {
      console.error("Erreur fetchData:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPayment = async (paymentData) => {
    try {
      const result = await window.electron.addPayment(paymentData);
      if (result.success) {
        setShowModal(false);
        setSelected(null);
        await fetchData();
        showToast("Versement enregistré !");
      } else {
        alert("Erreur : " + (result.message || "Action impossible"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const candidatesVisibles = useMemo(() => {
    if (canViewAll) return allCandidates;
    return allCandidates.filter((c) => Number(c.idMoniteur) === Number(currentUser?.idMoniteur));
  }, [allCandidates, canViewAll, currentUser?.idMoniteur]);

  const fichesCandidats = useMemo(() => {
    return candidatesVisibles.map((c) => {
      const idCandidat = c.idCandidat || c.id;
      const versements = paymentsData.filter((p) => Number(p.idCandidat) === Number(idCandidat));
      const totalVerse = versements.reduce((s, v) => s + Number(v.montant || 0), 0);
      const montantRestant = Number(c.montantRestant ?? PRIX_PERMIS);
      const aVerse = versements.length > 0;
      const statut = statutCandidat(montantRestant, aVerse);
      const pct = Math.min(100, Math.round(((PRIX_PERMIS - montantRestant) / PRIX_PERMIS) * 100));
      return { ...c, idCandidat, versements, totalVerse, montantRestant, aVerse, statut, pct };
    });
  }, [candidatesVisibles, paymentsData]);

  const totalEncaisse = paymentsData.reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalRestant = fichesCandidats.reduce((s, f) => s + f.montantRestant, 0);
  const nbDebiteurs = fichesCandidats.filter((f) => f.montantRestant > 0).length;
  const mois = new Date().getMonth();
  const annee = new Date().getFullYear();
  const revenuMois = paymentsData
    .filter((p) => {
      const d = new Date(p.dateVersement);
      return d.getMonth() === mois && d.getFullYear() === annee;
    })
    .reduce((s, p) => s + Number(p.montant || 0), 0);

  const fichesFiltrees = fichesCandidats
    .filter((f) => {
      const nom = `${f.prenom || ""} ${f.nom || ""}`.toLowerCase();
      if (!nom.includes(searchTerm.toLowerCase())) return false;
      if (filtreStatut === "solde") return f.montantRestant <= 0 && f.aVerse;
      if (filtreStatut === "en_cours") return f.montantRestant > 0 && f.aVerse;
      if (filtreStatut === "jamais") return !f.aVerse;
      return true;
    })
    .sort((a, b) => {
      const dir = sortConfig.dir === "asc" ? 1 : -1;
      if (sortConfig.key === "nom") return dir * `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
      if (sortConfig.key === "totalVerse") return dir * (a.totalVerse - b.totalVerse);
      if (sortConfig.key === "montantRestant") return dir * (a.montantRestant - b.montantRestant);
      if (sortConfig.key === "pct") return dir * (a.pct - b.pct);
      if (sortConfig.key === "versements") return dir * (a.versements.length - b.versements.length);
      return 0;
    });

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  };

  const thStyle = (key) => ({
    padding: "11px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: sortConfig.key === key ? "#2b537e" : "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  });

  const btnAct = (bg, color, border) => ({
    padding: "5px 11px",
    borderRadius: 7,
    border: `1px solid ${border || color}`,
    background: bg,
    color,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  });

  return (
    <div className="container">
      <div className="main">
        {toastMsg && (
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 3000, background: toastMsg.type === "success" ? "#22c55e" : "#ef4444", color: "#fff", padding: "11px 22px", borderRadius: 10, fontWeight: 600, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
            {toastMsg.msg}
          </div>
        )}

        <div className="header">
          <img src={ConnexionImg} alt="" className="header-img" />
          <h1><img src={SmallCar} alt="" width={38} style={{ marginRight: 10 }} />Gestion des Encaissements</h1>
          <p>{canViewAll ? "Vue globale autorisée" : "Vue limitée à vos candidats"}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22, marginTop: 18 }}>
          {[
            { title: "Total encaissé", value: fDA(totalEncaisse), color: "#2b537e", icon: "💰" },
            { title: "Reste à recouvrer", value: fDA(totalRestant), color: totalRestant > 0 ? "#b91c1c" : "#166534", icon: "⏳" },
            { title: "Revenus ce mois", value: fDA(revenuMois), color: "#0369a1", icon: "📅" },
            { title: "Débiteurs", value: String(nbDebiteurs), color: nbDebiteurs > 0 ? "#b91c1c" : "#166534", icon: "👥" },
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

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍 Rechercher un candidat…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, outline: "none", fontSize: 13, background: "#fff" }}
          />
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
            {[
              ["tous", "Tous"],
              ["en_cours", "En cours"],
              ["jamais", "Jamais payé"],
              ["solde", "Soldés"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltreStatut(val)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  background: filtreStatut === val ? "#fff" : "transparent",
                  color: filtreStatut === val ? "#2b537e" : "#64748b",
                }}
              >
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
          <button
            onClick={() => {
              setSelected(null);
              setShowModal(true);
            }}
            disabled={!canAddPayment}
            style={{ padding: "10px 18px", borderRadius: 10, background: canAddPayment ? "#166534" : "#94a3b8", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: canAddPayment ? "pointer" : "not-allowed" }}
          >
            + Versement
          </button>
          <button onClick={() => setShowSeanceSup(true)} style={{ padding: "10px 18px", borderRadius: 10, background: "#d97706", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ➕ Séance Sup.
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500 }}>
          {fichesFiltrees.length} candidat{fichesFiltrees.length !== 1 ? "s" : ""} affiché{fichesFiltrees.length !== 1 ? "s" : ""}
        </div>

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
                    <th style={thStyle("nom")} onClick={() => handleSort("nom")}>Candidat</th>
                    <th style={thStyle("statut")}>Statut</th>
                    <th style={thStyle("totalVerse")} onClick={() => handleSort("totalVerse")}>Versé</th>
                    <th style={thStyle("montantRestant")} onClick={() => handleSort("montantRestant")}>Restant</th>
                    <th style={thStyle("pct")} onClick={() => handleSort("pct")}>Progression</th>
                    <th style={thStyle("versements")} onClick={() => handleSort("versements")}>Nb.</th>
                    <th style={{ ...thStyle("actions"), cursor: "default" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fichesFiltrees.map((f, ri) => (
                    <React.Fragment key={f.idCandidat}>
                      <tr style={{ background: expanded.has(f.idCandidat) ? "#f0f6ff" : ri % 2 === 1 ? "#fafafa" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0 6px 0 12px", verticalAlign: "middle" }}>
                          {f.versements.length > 0 && (
                            <button onClick={() => toggleExpand(f.idCandidat)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#94a3b8", padding: 4, lineHeight: 1 }}>
                              {expanded.has(f.idCandidat) ? "▼" : "▶"}
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{f.prenom} {f.nom}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {f.telephone && <span style={{ marginRight: 10 }}>📞 {f.telephone}</span>}
                            {f.email && <span>✉ {f.email}</span>}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: f.statut.bg, color: f.statut.color, whiteSpace: "nowrap" }}>
                            {f.statut.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", fontWeight: 700, color: "#166534", fontSize: 13 }}>{fDA(f.totalVerse)}</td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", fontWeight: 700, color: f.montantRestant > 0 ? "#b91c1c" : "#166534", fontSize: 13 }}>{fDA(f.montantRestant)}</td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", minWidth: 110 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ flex: 1, height: 7, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${f.pct}%`, background: f.pct >= 100 ? "#22c55e" : "#4e96e1", borderRadius: 6 }} />
                            </div>
                            <span style={{ fontSize: 11, color: "#64748b", minWidth: 30, textAlign: "right" }}>{f.pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle", textAlign: "center" }}>
                          <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{f.versements.length}</span>
                        </td>
                        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {f.versements.length > 0 && (
                              <>
                                <button onClick={() => { const d = genererRecuPDF(f.versements[0], f); d.save(`Recu_${f.nom}_${f.prenom}.pdf`); }} style={btnAct("#f0fdf4", "#166534", "#86efac")}>⬇ Reçu</button>
                                <button onClick={() => { const d = genererRecuPDF(f.versements[0], f); window.open(d.output("bloburl"), "_blank"); }} style={btnAct("#f0f4fa", "#2b537e", "#93c5fd")}>🖨 Imprimer</button>
                              </>
                            )}
                            <button onClick={() => setHistoriqueCand(f)} style={btnAct("#f5f3ff", "#6d28d9", "#c4b5fd")}>📋 Historique</button>
                            <button onClick={() => setRappelCand(f)} style={btnAct("#fff7ed", "#f97316", "#fed7aa")}>📧 Rappel</button>
                            {canAddPayment && f.montantRestant > 0 && (
                              <button onClick={() => { setSelected(f); setShowModal(true); }} style={btnAct("#ecfdf5", "#166534", "#6ee7b7")}>
                                + Versement
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expanded.has(f.idCandidat) && f.versements.length > 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: "#f0f6ff" }}>
                            <div style={{ padding: "10px 20px 14px 52px" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: "#e0eaff" }}>
                                    {["Date", "Montant", "Méthode", "Remarque", "Actions"].map((h) => (
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
                                          <button onClick={() => { const d = genererRecuPDF(v, f); d.save(`Recu_${f.nom}_${v.idVersement}.pdf`); }} style={{ ...btnAct("#f0fdf4", "#166534", "#86efac"), padding: "3px 9px" }}>⬇ Reçu</button>
                                          <button onClick={() => { const d = genererRecuPDF(v, f); window.open(d.output("bloburl"), "_blank"); }} style={{ ...btnAct("#f0f4fa", "#2b537e", "#93c5fd"), padding: "3px 9px" }}>🖨 Imprimer</button>
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

        {showModal && (
          <PaymentModal
            candidate={selected}
            allCandidates={candidatesVisibles}
            onClose={() => {
              setShowModal(false);
              setSelected(null);
            }}
            onAddPayment={handleAddPayment}
          />
        )}

        {showExport && <div />}
        {showSeanceSup && <SeanceSupModal onClose={() => setShowSeanceSup(false)} onAddPayment={handleAddPayment} />}
        {showInvoices && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1500, overflowY: "auto" }}>
            <div style={{ background: "#F0F4FA", minHeight: "100vh", maxWidth: 960, margin: "0 auto", position: "relative" }}>
              <button onClick={() => setShowInvoices(false)} style={{ position: "fixed", top: 20, right: "calc(50% - 460px)", background: "#2b537e", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 18, cursor: "pointer", zIndex: 1600, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
              <InvoiceGenerator />
            </div>
          </div>
        )}

        {rappelCand && <div />}
        {historiqueCand && <div />}
      </div>
    </div>
  );
};

export default PaymentsMoniteur;