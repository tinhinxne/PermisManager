import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarDay, FaCheckCircle, FaTimesCircle,
  FaClock, FaTrashAlt, FaExchangeAlt, FaUser,
  FaSync, FaInfoCircle, FaCalendarPlus,
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

const Examens = () => {
  const {
    examensList, generateExamens, toggleExamenStatus,
    retirerCandidat, candidatsReportes, EXAM_THRESHOLDS,
  } = useExamenCtx();
  const { examRules } = useExamenRulesCtx();
  const { currentUser } = useAuth();
  const { getPermissions } = usePermissionsCtx();

  const isAdmin = currentUser?.type_utilisateur === "administrateur";
  const perms   = isAdmin
    ? { CAN_REMOVE_CANDIDAT: true, CAN_TOGGLE_STATUS: true }
    : getPermissions(currentUser?.id);

  const [selectedExamen, setSelectedExamen] = useState(null);
  const [statusFilter,   setStatusFilter]   = useState("Tous");
  const [typeFilter,     setTypeFilter]     = useState("Tous");
  const [loading,        setLoading]        = useState(false);
  const [lastGenerated,  setLastGenerated]  = useState(null);
  const [showReportes,   setShowReportes]   = useState(false);
  const [candidatsMap,   setCandidatsMap]   = useState({});

  const STATUS_CONFIG = {
    Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé" },
    Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"    },
    Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"    },
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const [seances, candidats] = await Promise.all([
        window.electron.getSeances(),
        window.electron.getCandidats(),
      ]);
      const map = {};
      candidats.forEach(c => { map[String(c.idCandidat)] = { nom: c.nom ?? "", prenom: c.prenom ?? "" }; });
      setCandidatsMap(map);
      generateExamens(seances, candidats);
      setLastGenerated(new Date().toLocaleString("fr-FR"));
    } catch (e) {
      console.error("Erreur génération examens:", e);
    }
    setLoading(false);
  };

  useEffect(() => { handleGenerate(); }, []);

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
    toggleExamenStatus(id);
  };

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

  const statsData = [
    { label: "Total session", val: examensList.length,                                       color: "blue",   icon: <FaUser />,        trend: "Candidats"      },
    { label: "Réussites",     val: examensList.filter(e => e.status === "Passed").length,    color: "green",  icon: <FaCheckCircle />, trend: "Validés"        },
    { label: "Échecs",        val: examensList.filter(e => e.status === "Failed").length,    color: "red",    icon: <FaTimesCircle />, trend: "À reprogrammer" },
    { label: "En attente",    val: examensList.filter(e => e.status === "Scheduled").length, color: "orange", icon: <FaClock />,       trend: "À évaluer"      },
  ];

  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
  const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

  return (
    <div className="main">
      <div className="header">
        <img src={ConnexionImg} alt="illustration" className="header-img" />
        <h1><img src={SmallCar} alt="" width={40} /> Panneau de contrôle</h1>
        <p>Suivi des sessions d'examens générées automatiquement</p>
      </div>

      <div className="examens-content">

        {/* Header + bouton génération */}
        <div className="examens-page-header">
          <div>
            <h2 className="examens-page-title">Sessions d'examens</h2>
            <p className="examens-page-sub">
              Générées selon les seuils : Code ≥{EXAM_THRESHOLDS.Code} séances · Créneau ≥{EXAM_THRESHOLDS.Créneau} · Circulation ≥{EXAM_THRESHOLDS.Circulation}
              {lastGenerated && <span style={{ color: "#94a3b8", marginLeft: 12, fontSize: 12 }}>Dernière mise à jour : {lastGenerated}</span>}
            </p>
          </div>
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

        {/* Règles actives */}
        <div style={{ background: "#f0f4ff", border: "1px solid #c7d7f5", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#3b5bdb", display: "flex", alignItems: "center", gap: 10 }}>
          <FaInfoCircle />
          <span>
            Règles actives — Délai après échec : <strong>{examRules.delaiApresEchec}j</strong> ·
            Max tentatives : <strong>{examRules.tentativesMax}</strong> ·
            Blocage impayé : <strong>{examRules.blocageImpaye ? "Oui" : "Non"}</strong> ·
            Jours : <strong>{examRules.joursAutorises?.join(", ")}</strong>
          </span>
        </div>

        {/* Stats */}
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

        {/* Filtres */}
        <div className="examens-filters">
          <SelectFilter value={statusFilter} onChange={setStatusFilter} options={["Tous", "Scheduled", "Passed", "Failed"]} label="Filtrer par Statut" />
          <SelectFilter value={typeFilter}   onChange={setTypeFilter}   options={["Tous", "Code", "Créneau", "Circulation"]} label="Type d'examen" />
        </div>

        {/* Tableau — sans colonne "Base de calcul" */}
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
                        {/* Candidat */}
                        <td style={{ ...td, fontWeight: 600 }}>
                          {examen.candidat}
                          {examen.autoGenerated && <span style={{ marginLeft: 8, fontSize: 10, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>auto</span>}
                          {examen.suggested     && <span style={{ marginLeft: 4,  fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>re-suggéré</span>}
                        </td>

                        {/* Type */}
                        <td style={td}>{examen.type}</td>

                        {/* Date */}
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FaCalendarDay style={{ color: "#4E96E1", fontSize: 12 }} />
                            <div>{examen.date} <span style={{ color: "#64748b", fontSize: 12 }}>{examen.heure}</span></div>
                          </div>
                        </td>

                        {/* Lieu */}
                        <td style={td}>{examen.lieu}</td>

                        {/* Séances */}
                        <td style={td}>
                          <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                            {examen.nbSeances || "—"} séances
                          </span>
                        </td>

                        {/* Résultat */}
                        <td style={td}>
                          <div
                            style={{ background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: (isAdmin || perms.CAN_TOGGLE_STATUS) ? "pointer" : "default" }}
                            onClick={e => handleToggle(examen.id, e)}
                          >
                            {(isAdmin || perms.CAN_TOGGLE_STATUS) && <FaExchangeAlt style={{ marginRight: 8, fontSize: 10 }} />}
                            {st.label}
                          </div>
                        </td>

                        {/* Actions */}
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

        {/* Candidats reportés */}
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

      <ExamenModal examen={selectedExamen} onClose={() => setSelectedExamen(null)} />
    </div>
  );
};

export default Examens;