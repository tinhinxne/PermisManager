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

  // Formate une date ISO → YYYY/MM/DD
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
  function ResultModal({ examen, onClose, onConfirm }) {
  const [correctMode, setCorrectMode] = useState(false);
  if (!examen) return null;

  const dejaEvalue = examen.status === "Passed" || examen.status === "Failed";
  const st = STATUS_CONFIG[examen.status];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 380, maxWidth: "90vw", padding: 24, boxShadow: "0 30px 70px rgba(0,0,0,0.22)" }}>
        <h3 style={{ margin: 0, marginBottom: 4, fontSize: 16, color: "#1e293b" }}>{examen.candidat}</h3>
        <p style={{ margin: 0, marginBottom: 18, fontSize: 12.5, color: "#64748b" }}>
          {examen.type} · {examen.date}
        </p>

        {dejaEvalue && !correctMode ? (
          <>
            <div style={{ background: st.bg, color: st.color, padding: "10px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, marginBottom: 14, textAlign: "center" }}>
              Résultat enregistré : {st.label}
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
              Pour éviter les erreurs, ce résultat n'est pas modifiable en un clic. Si tu t'es trompé(e), tu peux le corriger ci-dessous.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={btnSecondary}>Fermer</button>
              <button onClick={() => setCorrectMode(true)} style={btnWarning}>Corriger</button>
            </div>
          </>
        ) : (
          <>
            {dejaEvalue && (
              <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, fontWeight: 600 }}>
                ⚠️ Tu vas changer un résultat déjà enregistré ({st.label}).
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button onClick={() => onConfirm(examen.id, "Passed")} style={btnGreen}>✅ Réussi</button>
              <button onClick={() => onConfirm(examen.id, "Failed")} style={btnRed}>❌ Échoué</button>
            </div>
            <button onClick={onClose} style={{ ...btnSecondary, width: "100%" }}>Annuler</button>
          </>
        )}
      </div>
    </div>
  );
}
function PermisObtenuModal({ candidatName, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 20, width: 420, maxWidth: "92vw", boxShadow: "0 30px 80px rgba(0,0,0,0.22)", overflow: "hidden", animation: "alertPop .22s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", padding: "26px 24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 46, marginBottom: 6 }}>🎓</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>Permis obtenu !</div>
        </div>
        <div style={{ padding: "22px 24px" }}>
          <p style={{ fontSize: "0.92rem", color: "#1e293b", fontWeight: 600, textAlign: "center", margin: "0 0 8px" }}>
            🎉 <strong>{candidatName}</strong> a réussi ses 3 examens (Code, Créneau, Circulation).
          </p>
          <p style={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", margin: 0 }}>
            Son dossier est marqué comme « obtenu ». Il peut désormais bénéficier de séances supplémentaires si besoin.
          </p>
        </div>
        <div style={{ padding: "0 24px 22px", display: "flex", justifyContent: "center" }}>
          <button onClick={onClose} style={{ padding: "10px 36px", borderRadius: 10, background: "#16a34a", border: "none", color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}

const btnBase = { flex: 1, padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5 };
const btnSecondary = { ...btnBase, border: "1px solid #e2e8f0", background: "#fff", color: "#475569" };
const btnWarning   = { ...btnBase, background: "#fef3c7", color: "#92400e" };
const btnGreen     = { ...btnBase, background: "#dcfce7", color: "#166534" };
const btnRed       = { ...btnBase, background: "#fee2e2", color: "#991b1b" };
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
  // Composant principal
  // ─────────────────────────────────────────────
  const Examens = () => {
   const {
  examensList, generateExamens, setExamenResult,
  retirerCandidat, candidatsReportes, EXAM_THRESHOLDS,
} = useExamenCtx();
    const { examRules }    = useExamenRulesCtx();
    const { currentUser }  = useAuth();
    const { getPermissions } = usePermissionsCtx();

    const isAdmin = currentUser?.type_utilisateur === "administrateur";
    const perms   = isAdmin
      ? { CAN_REMOVE_CANDIDAT: true, CAN_TOGGLE_STATUS: true }
      : getPermissions(currentUser?.id);

    // ── state ──
    const [selectedExamen, setSelectedExamen] = useState(null);
    const [statusFilter,   setStatusFilter]   = useState("Tous");
    const [typeFilter,     setTypeFilter]     = useState("Tous");
    const [loading,        setLoading]        = useState(false);
    const [lastGenerated,  setLastGenerated]  = useState(null);
    const [showReportes,   setShowReportes]   = useState(false);
    const [candidatsMap,   setCandidatsMap]   = useState({});
    const [permisObtenuInfo, setPermisObtenuInfo] = useState(null);
    const [alertInfo, setAlertInfo] = useState(null);
    const [resultModalExamen, setResultModalExamen] = useState(null);

    const [showExportModal, setShowExportModal] = useState(false);
    const [pdfLoading,      setPdfLoading]      = useState(false);
    const [exportForm, setExportForm] = useState({
      nomEcole:     "",
      wilaya:       "",
      centreExamen: "",
      morkaba:      "",
      dateDepot:    "",
      dateExamen:   "",
    });

    // Charge les valeurs mémorisées
    useEffect(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("export_pdf_defaults") || "{}");
        setExportForm(f => ({ ...f, ...saved }));
      } catch { /* pas de valeurs sauvegardées */ }
    }, []);

    // ── génération des examens ──
    const handleGenerate = async () => {
      setLoading(true);
      try {
        const [seances, candidats] = await Promise.all([
          window.electron.getSeances(),
          window.electron.getCandidats(),
        ]);
        const map = {};
        candidats.forEach(c => {
          map[String(c.idCandidat)] = {
            nom:             c.nom             ?? "",
            prenom:          c.prenom          ?? "",
            nom_ar:          c.nom_ar          ?? "",
            prenom_ar:       c.prenom_ar       ?? "",
            dateNaissance:   c.date_naissance  ?? "",
            categoriePermis: c.categoriePermis ?? "",
          };
        });
        setCandidatsMap(map);
        generateExamens(seances, candidats);
        setLastGenerated(new Date().toLocaleString("fr-FR"));
      } catch (e) {
        console.error("Erreur génération examens:", e);
      }
      setLoading(false);
    };

    useEffect(() => { handleGenerate(); }, []);

    // ── actions ──
    const handleRemove = (id, e) => {
      e.stopPropagation();
      if (!perms.CAN_REMOVE_CANDIDAT) return;
      if (window.confirm("Retirer ce candidat ? Il sera re-suggéré automatiquement à la prochaine date d'examen selon les règles configurées.")) {
        retirerCandidat(id);
      }
    };

 const handleOpenResultModal = (id, e) => {
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

  setResultModalExamen(examen);
};
    // ── filtres ──
    const filtered = examensList.filter(e => {
      const matchStatus = statusFilter === "Tous" || e.status === statusFilter;
      const matchType   = typeFilter   === "Tous" || e.type   === typeFilter;
      return matchStatus && matchType;
    });

    const reportesEntries = Object.entries(candidatsReportes);

    const getCandidatName = (id) => {
      const c = candidatsMap[String(id)];
      if (!c) return `Candidat #${id}`;
      const full = [c.prenom, c.nom].filter(Boolean).join(" ");
      return full || `Candidat #${id}`;
    };

    // ── stats ──
    const statsData = [
      { label: "Total session", val: examensList.length,                                       color: "blue",   icon: <FaUser />,        trend: "Candidats"      },
      { label: "Réussites",     val: examensList.filter(e => e.status === "Passed").length,    color: "green",  icon: <FaCheckCircle />, trend: "Validés"        },
      { label: "Échecs",        val: examensList.filter(e => e.status === "Failed").length,    color: "red",    icon: <FaTimesCircle />, trend: "À reprogrammer" },
      { label: "En attente",    val: examensList.filter(e => e.status === "Scheduled").length, color: "orange", icon: <FaClock />,       trend: "À évaluer"      },
    ];

    // ── styles inline réutilisables ──
    const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
    const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

    // ── export PDF (قائمة المترشحين) ──
    const openExportModal = () => {
      if (filtered.length === 0) {
        alert("Aucun candidat dans la liste actuelle à exporter. Ajustez les filtres ci-dessus.");
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
          const nomPrenomAr = (nomAr || prenomAr)
            ? `${nomAr} ${prenomAr}`.trim()
            : "";

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

    // ─────────────────────────────────────────────
    // Rendu
    // ─────────────────────────────────────────────
    return (
      <div className="main">
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1><img src={SmallCar} alt="" width={40} /> Panneau de contrôle</h1>
          <p>Suivi des sessions d'examens générées automatiquement</p>
        </div>

        <div className="examens-content">

          {/* ── Header + boutons d'action ── */}
          <div className="examens-page-header">
            <div>
              <h2 className="examens-page-title">Sessions d'examens</h2>
              <p className="examens-page-sub">
                Générées selon les seuils : Code ≥{EXAM_THRESHOLDS.Code} séances · Créneau ≥{EXAM_THRESHOLDS.Créneau} · Circulation ≥{EXAM_THRESHOLDS.Circulation}
                {lastGenerated && (
                  <span style={{ color: "#94a3b8", marginLeft: 12, fontSize: 12 }}>
                    Dernière mise à jour : {lastGenerated}
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>

              {/* ── Bouton قائمة المترشحين ── */}
              <button
                onClick={openExportModal}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#2b537e", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                <FaFilePdf /> قائمة المترشحين
              </button>

              {isAdmin && (
                <button
                  onClick={handleGenerate} disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#4E96E1", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}
                >
                  <FaSync style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                  {loading ? "Génération..." : "Regénérer"}
                </button>
              )}
            </div>
          </div>

          {/* ── Règles actives ── */}
          <div style={{ background: "#f0f4ff", border: "1px solid #c7d7f5", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#3b5bdb", display: "flex", alignItems: "center", gap: 10 }}>
            <FaInfoCircle />
            <span>
              Règles actives — Délai après échec : <strong>{examRules.delaiApresEchec}j</strong> ·
              Max tentatives : <strong>{examRules.tentativesMax}</strong> ·
              Blocage impayé : <strong>{examRules.blocageImpaye ? "Oui" : "Non"}</strong> ·
              Jours : <strong>{examRules.joursAutorises?.join(", ")}</strong>
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

          {/* ── Tableau ── */}
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
                    {(isAdmin || perms.CAN_REMOVE_CANDIDAT) && <th style={th}>Actions</th>}
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
                              style={{ background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: (isAdmin || perms.CAN_TOGGLE_STATUS) ? "pointer" : "default" }}
                              onClick={e => handleOpenResultModal(examen.id, e)}
                            >
                              {(isAdmin || perms.CAN_TOGGLE_STATUS) && <FaExchangeAlt style={{ marginRight: 8, fontSize: 10 }} />}
                              {st.label}
                            </div>
                          </td>
                          {(isAdmin || perms.CAN_REMOVE_CANDIDAT) && (
                            <td style={td}>
                              <button
                                onClick={e => handleRemove(examen.id, e)}
                                title="Retirer (sera re-suggéré à la prochaine date)"
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
                        <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#A0AEC0" }}>
                          Aucun examen trouvé. Cliquez sur "Regénérer" pour actualiser.
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Candidats reportés ── */}
          {reportesEntries.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setShowReportes(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#475569", marginBottom: 12 }}
              >
                <FaCalendarPlus /> {showReportes ? "Masquer" : "Voir"} les candidats reportés ({reportesEntries.length})
              </button>

              {showReportes && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 13, color: "#78350f", marginBottom: 12, fontWeight: 600 }}>
                    Ces candidats seront re-suggérés automatiquement à leur prochaine date d'examen :
                  </p>
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
                                {info.reason === "echec" ? "Échec" : "Retiré par admin"}
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

        {/* ── Modal détail examen ── */}
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

<ResultModal
  examen={resultModalExamen}
  onClose={() => setResultModalExamen(null)}
  onConfirm={(id, status) => {
    setExamenResult(id, status);

    if (status === "Passed") {
      const examen = examensList.find((e) => e.id === id);
      if (examen) {
        const cid = examen.candidatId;
        // type === examen.type : on traite l'examen qu'on vient de valider
        // comme déjà "Passed", car examensList n'est pas encore mis à jour ici
        const passe = (type) =>
          type === examen.type ||
          examensList.some((e) => e.candidatId === cid && e.type === type && e.status === "Passed");

        if (passe("Code") && passe("Créneau") && passe("Circulation")) {
          setPermisObtenuInfo({ candidat: examen.candidat });
        }
      }
    }

    setResultModalExamen(null);
  }}
/>

{permisObtenuInfo && (
  <PermisObtenuModal
    candidatName={permisObtenuInfo.candidat}
    onClose={() => setPermisObtenuInfo(null)}
  />
)}

        {/* ══════════════════════════════════════════════
            Modal export قائمة المترشحين
        ══════════════════════════════════════════════ */}
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
                L'école, la wilaya et la morkaba sont mémorisés. Le centre et les dates sont à vérifier à chaque session.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <FormField label="Nom de l'auto-école"      value={exportForm.nomEcole}     onChange={v => handleExportFormChange("nomEcole", v)}     placeholder="Ex : Auto-École Essalem" />
                <FormField label="Wilaya"                   value={exportForm.wilaya}        onChange={v => handleExportFormChange("wilaya", v)}        placeholder="Ex : Béjaïa, Sétif..." required />
                <FormField label="Centre d'examen"          value={exportForm.centreExamen}  onChange={v => handleExportFormChange("centreExamen", v)}  placeholder="Ex : Le Châlet, El Kseur..." required />
                <FormField label="المركبة الأولى"           value={exportForm.morkaba}       onChange={v => handleExportFormChange("morkaba", v)}       placeholder="Ex : رونو كليو 03" />
                <FormField label="Date de dépôt des dossiers" value={exportForm.dateDepot}  onChange={v => handleExportFormChange("dateDepot", v)}     type="date" />
                <FormField label="Date de l'examen"         value={exportForm.dateExamen}    onChange={v => handleExportFormChange("dateExamen", v)}    placeholder="YYYY/MM/DD" />
              </div>
              <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
                <strong style={{ color: "#1f2937" }}>Aperçu :</strong> {filtered.length} candidat(s) exporté(s)
                {typeFilter !== "Tous" && <> · Type : <strong>{typeFilter}</strong></>}
                {statusFilter !== "Tous" && <> · Statut : <strong>{STATUS_LABELS[statusFilter]}</strong></>}
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

  // ─────────────────────────────────────────────
  // Sous-composant champ formulaire
  // ─────────────────────────────────────────────
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

  export default Examens;