import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarDay, FaCheckCircle, FaTimesCircle,
  FaClock, FaTrashAlt, FaExchangeAlt, FaUser,
  FaSync, FaInfoCircle, FaCalendarPlus, FaFilePdf, FaTimes,
} from "react-icons/fa";

import SelectFilter from "../components/SelectFilter";
import ExamenModal from "../components/Examenmodal";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/Examens.css";

import { useExamenCtx } from "../context/ExamenContext";
import { useExamenRulesCtx } from "../context/ExamenRulesContext";
import { usePermissionsCtx } from "../context/PermissionsContext";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const STATUS_LABELS = {
  Tous: "Tous",
  Scheduled: "Programmé",
  Passed: "Réussi",
  Failed: "Échoué",
};

const STATUS_CONFIG = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé" },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"    },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"    },
};

function formatDateAr(isoDate) {
  if (!isoDate) return "";
  const str = isoDate instanceof Date ? isoDate.toISOString() : String(isoDate);
  const d = new Date(str.includes("T") ? str : str + "T12:00:00");
  if (isNaN(d)) return str;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${j}`;
}

// ─────────────────────────────────────────────
// Alerte modale (remplace les alert() natifs)
// ─────────────────────────────────────────────
function AlertModal({ icon, title, message, color = "#ef4444", onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 18,
        width: 360, maxWidth: "90vw",
        boxShadow: "0 30px 70px rgba(0,0,0,0.22)",
        overflow: "hidden",
        animation: "alertPop .22s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <style>{`@keyframes alertPop{from{transform:translateY(18px) scale(.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
        <div style={{ padding: "26px 24px 18px", textAlign: "center" }}>
          <div style={{
            width: 54, height: 54, borderRadius: "50%", margin: "0 auto 14px",
            background: `${color}1A`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26,
          }}>
            {icon}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
            {title}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.55 }}>
            {message}
          </div>
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
              background: color, color: "#fff", fontSize: "0.88rem", fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant principal - Version Moniteur
// ─────────────────────────────────────────────
const ExamensMoniteur = () => {
  const {
    examensList, generateExamens, toggleExamenStatus,
    retirerCandidat, candidatsReportes, EXAM_THRESHOLDS,
  } = useExamenCtx();
  const { examRules } = useExamenRulesCtx();
  const { currentUser } = useAuth();
  const { getPermissions } = usePermissionsCtx();

  // Permissions dynamiques du moniteur
  const perms = getPermissions(currentUser?.id) || { CAN_REMOVE_CANDIDAT: false, CAN_TOGGLE_STATUS: false };

  // ── state ──
  const [selectedExamen, setSelectedExamen] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [showReportes, setShowReportes] = useState(false);
  const [candidatsMap, setCandidatsMap] = useState({});
  const [mesCandidatIds, setMesCandidatIds] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exportForm, setExportForm] = useState({
    nomEcole: "",
    wilaya: "",
    centreExamen: "",
    morkaba: "",
    dateDepot: "",
    dateExamen: "",
  });

  // Charge les valeurs mémorisées pour le PDF
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("export_pdf_defaults") || "{}");
      setExportForm(f => ({ ...f, ...saved }));
    } catch { /* pas de valeurs sauvegardées */ }
  }, []);

  // Chargement initial des séances et filtrage par moniteur connecté
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const [seances, candidats] = await Promise.all([
        window.electron.getSeances(),
        window.electron.getCandidats(),
      ]);

      // Filtrer les candidats affectés à ce moniteur spécifique
      if (currentUser?.id) {
        const ids = seances
          .filter(s => String(s.moniteurId) === String(currentUser.id))
          .map(s => String(s.candidatId));
        setMesCandidatIds([...new Set(ids)]);
      }

      const map = {};
      candidats.forEach(c => {
        map[String(c.idCandidat)] = {
          nom: c.nom ?? "",
          prenom: c.prenom ?? "",
          nom_ar: c.nom_ar ?? "",
          prenom_ar: c.prenom_ar ?? "",
          dateNaissance: c.date_naissance ?? "",
          categoriePermis: c.categoriePermis ?? "",
        };
      });
      setCandidatsMap(map);
      generateExamens(seances, candidats);
      setLastGenerated(new Date().toLocaleString("fr-FR"));
    } catch (e) {
      console.error("Erreur chargement examens moniteur:", e);
    }
    setLoading(false);
  };

  useEffect(() => { handleGenerate(); }, [currentUser?.id]);

  // ── actions sécurisées par permissions ──
  const handleRemove = (id, e) => {
    e.stopPropagation();
    if (!perms.CAN_REMOVE_CANDIDAT) return;
    if (window.confirm("Retirer ce candidat ? Il sera re-suggéré automatiquement à la prochaine date d'examen selon les règles configurées.")) {
      retirerCandidat(id);
    }
  };

  const handleToggle = (id, e) => {
    e.stopPropagation();
    if (!perms.CAN_TOGGLE_STATUS) return;

    const examen = examensList.find((x) => x.id === id);
    if (!examen) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const examDate = new Date((examen.date || "") + "T00:00:00");

    if (!isNaN(examDate) && examDate > today) {
      setAlertInfo({
        icon: "📅",
        title: "Examen pas encore passé",
        color: "#f97316",
        message: `Cet examen est programmé pour le ${examen.date}. Vous ne pouvez modifier le résultat qu'à partir de cette date.`,
      });
      return;
    }

    toggleExamenStatus(id);
  };

  // ── filtrage strict (Par Moniteur + Filtres de l'UI) ──
  const filtered = examensList.filter(e => {
    const appartientAuMoniteur = mesCandidatIds.includes(String(e.candidatId));
    const matchStatus = statusFilter === "Tous" || e.status === statusFilter;
    const matchType   = typeFilter   === "Tous" || e.type   === typeFilter;
    return appartientAuMoniteur && matchStatus && matchType;
  });

  // Filtrer également la liste des candidats reportés propres à ce moniteur
  const reportesEntries = Object.entries(candidatsReportes).filter(([cid]) => 
    mesCandidatIds.includes(String(cid))
  );

  const getCandidatName = (id) => {
    const c = candidatsMap[String(id)];
    if (!c) return `Candidat #${id}`;
    const full = [c.prenom, c.nom].filter(Boolean).join(" ");
    return full || `Candidat #${id}`;
  };

  // ── stats calculées dynamiquement sur le périmètre du moniteur ──
  const statsData = [
    { label: "Mes candidats", val: filtered.length,                                             color: "blue",   icon: <FaUser />,        trend: "Session"        },
    { label: "Réussites",     val: filtered.filter(e => e.status === "Passed").length,    color: "green",  icon: <FaCheckCircle />, trend: "Validés"        },
    { label: "Échecs",        val: filtered.filter(e => e.status === "Failed").length,    color: "red",    icon: <FaTimesCircle />, trend: "À reprogrammer" },
    { label: "En attente",    val: filtered.filter(e => e.status === "Scheduled").length, color: "orange", icon: <FaClock />,       trend: "À évaluer"      },
  ];

  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
  const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

  // ── export PDF ──
  const openExportModal = () => {
    if (filtered.length === 0) {
      alert("Aucun candidat dans votre liste actuelle à exporter. Ajustez vos filtres.");
      return;
    }
    setExportForm(f => ({
      ...f,
      centreExamen: f.centreExamen || "",
      dateExamen:   formatDateAr(filtered[0]?.date) || f.dateExamen || "",
    }));
    setShowExportModal(true);
  };

  const handleExportFormChange = (field, value) =>
    setExportForm(f => ({ ...f, [field]: value }));

  const handleConfirmExport = async () => {
    if (!exportForm.wilaya.trim() || !exportForm.centreExamen.trim()) {
      alert("Merci de renseigner au moins la wilaya et le centre d'examen.");
      return;
    }

    setPdfLoading(true);
    try {
      const candidatsPourPDF = filtered.map((examen, i) => {
        const info = candidatsMap[String(examen.candidatId)] || {};
        const nomAr    = info.nom_ar    || "";
        const prenomAr = info.prenom_ar || "";
        const nomPrenomAr = (nomAr || prenomAr) ? `${nomAr} ${prenomAr}`.trim() : "";

        return {
          rang:              i + 1,
          numDossier:        examen.candidatId,
          nomPrenom:         examen.candidat,
          nomPrenomAr,
          dateNaissance:     formatDateAr(examen.dateNaissance),
          categorie:         examen.categoriePermis || "",
          typeExamen:        examen.type || "",
          dateDepot:         formatDateAr(exportForm.dateDepot),
          dateExamenRapport: formatDateAr(examen.date),
          observations:      "",
        };
      });

      const savedPath = await window.electron.generateListeCandidatsPDF({
        nomEcole:     exportForm.nomEcole,
        wilaya:       exportForm.wilaya,
        centreExamen: exportForm.centreExamen,
        morkaba:      exportForm.morkaba,
        dateDepot:    formatDateAr(exportForm.dateDepot),
        dateExamen:   exportForm.dateExamen,
        candidats:    candidatsPourPDF,
      });

      localStorage.setItem("export_pdf_defaults", JSON.stringify({
        nomEcole: exportForm.nomEcole,
        wilaya:   exportForm.wilaya,
        morkaba:  exportForm.morkaba,
      }));

      if (savedPath) {
        alert(`Document enregistré :\n${savedPath}`);
        setShowExportModal(false);
      }
    } catch (e) {
      console.error("Erreur génération PDF liste candidats:", e);
      alert("Erreur lors de la génération du document.");
    }
    setPdfLoading(false);
  };

  return (
    <div className="main">
      <div className="header">
        <img src={ConnexionImg} alt="illustration" className="header-img" />
        <h1><img src={SmallCar} alt="" width={40} /> Espace Moniteur</h1>
        <p>Suivi et gestion de mes candidats aux examens</p>
      </div>

      <div className="examens-content">

        {/* ── Header + Bouton Export ── */}
        <div className="examens-page-header">
          <div>
            <h2 className="examens-page-title">Mes Sessions d'examens</h2>
            <p className="examens-page-sub">
              Seuils : Code ≥{EXAM_THRESHOLDS.Code} · Créneau ≥{EXAM_THRESHOLDS.Créneau} · Circulation ≥{EXAM_THRESHOLDS.Circulation}
              {lastGenerated && (
                <span style={{ color: "#94a3b8", marginLeft: 12, fontSize: 12 }}>
                  Actualisé le : {lastGenerated}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={openExportModal}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#2b537e", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              <FaFilePdf /> قائمة المترشحين
            </button>
          </div>
        </div>

        {/* ── Règles actives ── */}
        <div style={{ background: "#f0f4ff", border: "1px solid #c7d7f5", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#3b5bdb", display: "flex", alignItems: "center", gap: 10 }}>
          <FaInfoCircle />
          <span>
            Configuration requise — Délai après échec : <strong>{examRules.delaiApresEchec}j</strong> ·
            Tentatives max : <strong>{examRules.tentativesMax}</strong> ·
            Blocage impayé : <strong>{examRules.blocageImpaye ? "Oui" : "Non"}</strong>
          </span>
        </div>

        {/* ── Stats ── */}
        <div className="stats-grid">
          {statsData.map((item, i) => (
            <motion.div key={i} className="stat-card-modern" whileHover={{ y: -5 }}>
              <div className="stat-left">
                <span className="stat-label">{item.label}</span>
                <span className="stat-value">{item.val}</span>
                <span className={`stat-trend ${item.color}`}>{item.trend}</span>
              </div>
              <div className={`stat-icon ${item.color}`}>{item.icon}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Filtres ── */}
        <div className="examens-filters">
          <SelectFilter
            value={statusFilter} onChange={setStatusFilter}
            options={["Tous", "Scheduled", "Passed", "Failed"].map(v => ({ value: v, label: STATUS_LABELS[v] }))}
            label="Filtrer par Statut"
          />
          <SelectFilter
            value={typeFilter} onChange={setTypeFilter}
            options={["Tous", "Code", "Créneau", "Circulation"]}
            label="Type d'examen"
          />
        </div>

        {/* ── Tableau des Examens ── */}
        <div style={{ background: "#fff", borderRadius: 15, overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: "#2b537e" }}>
                  <th style={th}>Candidat(e)</th>
                  <th style={th}>Type</th>
                  <th style={th}>Date examen</th>
                  <th style={th}>Lieu</th>
                  <th style={th}>Séances</th>
                  <th style={th}>Résultat</th>
                  {perms.CAN_REMOVE_CANDIDAT && <th style={th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.length > 0 ? filtered.map((examen, i) => {
                    const st = STATUS_CONFIG[examen.status];
                    return (
                      <motion.tr
                        layout key={examen.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC", cursor: "pointer" }}
                        onClick={() => setSelectedExamen(examen)}
                      >
                        <td style={{ ...td, fontWeight: 600 }}>
                          {examen.candidat}
                          {examen.autoGenerated && (
                            <span style={{ marginLeft: 8, fontSize: 10, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>auto</span>
                          )}
                          {examen.suggested && (
                            <span style={{ marginLeft: 4, fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>re-suggéré</span>
                          )}
                        </td>
                        <td style={td}>{examen.type}</td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FaCalendarDay style={{ color: "#4E96E1", fontSize: 12 }} />
                            <div>{examen.date} <span style={{ color: "#64748b", fontSize: 12 }}>{examen.heure}</span></div>
                          </div>
                        </td>
                        <td style={td}>{examen.lieu}</td>
                        <td style={td}>
                          <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                            {examen.nbSeances || "—"} séances
                          </span>
                        </td>
                        <td style={td}>
                          <div
                            style={{ background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: perms.CAN_TOGGLE_STATUS ? "pointer" : "default" }}
                            onClick={e => handleToggle(examen.id, e)}
                          >
                            {perms.CAN_TOGGLE_STATUS && <FaExchangeAlt style={{ marginRight: 8, fontSize: 10 }} />}
                            {st.label}
                          </div>
                        </td>
                        {perms.CAN_REMOVE_CANDIDAT && (
                          <td style={td}>
                            <button
                              onClick={e => handleRemove(examen.id, e)}
                              title="Retirer"
                              style={{ background: "#FEF2F2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                            >
                              <FaTrashAlt />
                            </button>
                          </td>
                        )}
                      </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={perms.CAN_REMOVE_CANDIDAT ? 7 : 6} style={{ textAlign: "center", padding: 40, color: "#A0AEC0" }}>
                        Aucun examen trouvé pour vos candidats.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Candidats reportés du moniteur ── */}
        {reportesEntries.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowReportes(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#475569", marginBottom: 12 }}
            >
              <FaCalendarPlus /> {showReportes ? "Masquer" : "Voir"} vos candidats reportés ({reportesEntries.length})
            </button>

            {showReportes && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fef3c7" }}>
                      <th style={{ ...th, color: "#78350f", background: "transparent" }}>Candidat</th>
                      <th style={{ ...th, color: "#78350f", background: "transparent" }}>Type d'examen</th>
                      <th style={{ ...th, color: "#78350f", background: "transparent" }}>Prochaine suggestion</th>
                      <th style={{ ...th, color: "#78350f", background: "transparent" }}>Raison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesEntries.map(([cid, info]) => {
                      const nomComplet = getCandidatName(cid);
                      return (
                        <tr key={cid}>
                          <td style={{ ...td, fontWeight: 600 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fde68a", color: "#78350f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                {nomComplet.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#1f2937" }}>{nomComplet}</div>
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>ID #{cid}</div>
                              </div>
                            </div>
                          </td>
                          <td style={td}>{info.type}</td>
                          <td style={td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <FaCalendarDay style={{ color: "#f59e0b", fontSize: 12 }} />
                              {info.nextSuggestedDate}
                            </div>
                          </td>
                          <td style={td}>
                            <span style={{ background: info.reason === "echec" ? "#fee2e2" : "#f1f5f9", color: info.reason === "echec" ? "#991b1b" : "#475569", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
                              {info.reason === "echec" ? "Échec" : "Retiré"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales Annexes */}
      <ExamenModal examen={selectedExamen} onClose={() => setSelectedExamen(null)} />
      
      {alertInfo && (
        <AlertModal
          icon={alertInfo.icon}
          title={alertInfo.title}
          message={alertInfo.message}
          color={alertInfo.color}
          onClose={() => setAlertInfo(null)}
        />
      )}

      {/* Modale d'exportation PDF */}
      {showExportModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => !pdfLoading && setShowExportModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 14, padding: 24, width: 440, maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>قائمة المترشحين — Informations</h3>
              <button onClick={() => !pdfLoading && setShowExportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>
                <FaTimes />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              Renseignez les détails de la session pour l'impression de la liste.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <FormField label="Nom de l'auto-école"       value={exportForm.nomEcole}     onChange={v => handleExportFormChange("nomEcole", v)}     placeholder="Ex : Auto-École Essalem" />
              <FormField label="Wilaya"                    value={exportForm.wilaya}        onChange={v => handleExportFormChange("wilaya", v)}        placeholder="Ex : Béjaïa..." required />
              <FormField label="Centre d'examen"           value={exportForm.centreExamen}  onChange={v => handleExportFormChange("centreExamen", v)}  placeholder="Ex : El Kseur..." required />
              <FormField label="المركبة الأولى"            value={exportForm.morkaba}       onChange={v => handleExportFormChange("morkaba", v)}       placeholder="Ex : رونو كليو 03" />
              <FormField label="Date de dépôt des dossiers" value={exportForm.dateDepot}    onChange={v => handleExportFormChange("dateDepot", v)}    type="date" />
              <FormField label="Date de l'examen"          value={exportForm.dateExamen}    onChange={v => handleExportFormChange("dateExamen", v)}    placeholder="YYYY/MM/DD" />
            </div>
            <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
              <strong style={{ color: "#1f2937" }}>Aperçu :</strong> {filtered.length} candidat(s) exporté(s)
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowExportModal(false)} disabled={pdfLoading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
                Annuler
              </button>
              <button onClick={handleConfirmExport} disabled={pdfLoading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#2b537e", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13.5, opacity: pdfLoading ? 0.7 : 1 }}>
                {pdfLoading ? "Génération..." : "Générer le PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Champ formulaire réutilisable
const FormField = ({ label, value, onChange, placeholder, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, color: "#1F2937", outline: "none", boxSizing: "border-box" }}
    />
  </div>
);

export default ExamensMoniteur;