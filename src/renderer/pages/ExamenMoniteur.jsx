import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarDay, FaCheckCircle, FaTimesCircle,
  FaClock, FaUser, FaLock, FaInfoCircle
} from "react-icons/fa";

import SelectFilter from "../components/SelectFilter";
import ExamenModal from "../components/Examenmodal";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/Examens.css";

import { useExamenCtx } from "../context/ExamenContext";
import { useExamenRulesCtx } from "../context/ExamenRulesContext";
import { useAuth } from "../context/AuthContext";

function LockedTooltip({ children, message = "Permission requise par l'admin" }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: "absolute", bottom: "110%", left: "50%",
          transform: "translateX(-50%)", background: "#1e293b", color: "#fff",
          padding: "7px 13px", borderRadius: 8, fontSize: "0.72rem",
          fontWeight: 500, whiteSpace: "nowrap", zIndex: 999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", pointerEvents: "none",
        }}>
          🔒 {message}
          <div style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)", width: 0, height: 0,
            borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
            borderTop: "6px solid #1e293b",
          }} />
        </div>
      )}
    </div>
  );
}

const ExamensMoniteur = () => {
  const { examensList, generateExamens, EXAM_THRESHOLDS } = useExamenCtx();
  const { examRules } = useExamenRulesCtx();
  const { currentUser } = useAuth();

  const [statusFilter, setStatusFilter] = useState("Tous");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [selectedExamen, setSelectedExamen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [mesCandidatIds, setMesCandidatIds] = useState([]);



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

  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "14px" };
  const td = { padding: "14px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "14px", color: "#1F2937" };

  // 1️⃣ Charge les candidats du moniteur connecté depuis les séances
  useEffect(() => {
    async function loadMesCandidats() {
      if (!currentUser?.id || !window.electron?.getSeances) return;
      try {
        const seances = await window.electron.getSeances();
        // Filtre les séances du moniteur connecté
        const mesSeances = seances.filter(
          s => String(s.moniteur_id) === String(currentUser.id)
        );
        // Extrait les IDs uniques de candidats
        const ids = new Set();
        mesSeances.forEach(s => {
          if (s.candidatsIds) {
            s.candidatsIds.split(",").forEach(id => {
              const trimmed = id.trim();
              if (trimmed) ids.add(trimmed);
            });
          }
        });
        setMesCandidatIds([...ids]);
      } catch (err) {
        console.error("Erreur chargement candidats moniteur:", err);
      }
    }
    loadMesCandidats();
  }, [currentUser]);

  // 2️⃣ Génère les examens (contexte global) et filtre pour ce moniteur
  const handleGenerate = async () => {
    if (!window.electron?.getSeances || !window.electron?.getCandidats) return;
    setLoading(true);
    try {
      const [seances, candidats] = await Promise.all([
        window.electron.getSeances(),
        window.electron.getCandidats(),
      ]);
      generateExamens(seances, candidats);
      setLastGenerated(new Date().toLocaleString("fr-FR"));
    } catch (e) {
      console.error("Erreur génération examens:", e);
    }
    setLoading(false);
  };

  useEffect(() => { handleGenerate(); }, []);

  // 3️⃣ Filtre les examens : uniquement les candidats du moniteur
  const mesExamens = examensList.filter(e =>
    mesCandidatIds.includes(String(e.candidatId))
  );

  const filtered = mesExamens.filter(e => {
    const matchStatus = statusFilter === "Tous" || e.status === statusFilter;
    const matchType   = typeFilter   === "Tous" || e.type   === typeFilter;
    return matchStatus && matchType;
  });

  const statsData = [
    { label: "Mes Sessions",  val: mesExamens.length,                                         color: "blue",   icon: <FaUser />,        trend: "Candidats" },
    { label: "Réussites",     val: mesExamens.filter(e => e.status === "Passed").length,       color: "green",  icon: <FaCheckCircle />, trend: "Validés" },
    { label: "Échecs",        val: mesExamens.filter(e => e.status === "Failed").length,       color: "red",    icon: <FaTimesCircle />, trend: "À reprogrammer" },
    { label: "En attente",    val: mesExamens.filter(e => e.status === "Scheduled").length,    color: "orange", icon: <FaClock />,       trend: "À évaluer" },
  ];

  const nomMoniteur = currentUser
    ? `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim()
    : "Moniteur";

  return (
    <div className="main">
      <div className="header">
        <img src={ConnexionImg} alt="illustration" className="header-img" />
        <h1><img src={SmallCar} alt="" width={40} /> Mes Examens</h1>
        <p>Suivi des examens de mes candidats — {nomMoniteur}</p>
      </div>

      <div className="examens-content">

        {/* Header */}
        <div className="examens-page-header">
          <div>
            <h2 className="examens-page-title">Mes Sessions d'Examen</h2>
            <p className="examens-page-sub">
              Seuils : Code ≥{EXAM_THRESHOLDS.Code} séances · Créneau ≥{EXAM_THRESHOLDS.Créneau} · Circulation ≥{EXAM_THRESHOLDS.Circulation}
              {lastGenerated && (
                <span style={{ color: "#94a3b8", marginLeft: 12, fontSize: 12 }}>
                  Mise à jour : {lastGenerated}
                </span>
              )}
            </p>
          </div>
          {/* Badge lecture seule */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(148,163,184,0.12)", border: "1px solid #e2e8f0",
            borderRadius: 10, padding: "8px 16px", fontSize: "0.78rem",
            color: "#64748b", fontWeight: 600,
          }}>
            <FaLock style={{ fontSize: 12 }} /> Vue lecture seule
          </div>
        </div>

        {/* Info règles */}
        <div style={{
          background: "#f0f4ff", border: "1px solid #c7d7f5",
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          fontSize: 13, color: "#3b5bdb", display: "flex", alignItems: "center", gap: 10,
        }}>
          <FaInfoCircle />
          <span>
            Délai après échec : <strong>{examRules.delaiApresEchec}j</strong> ·
            Max tentatives : <strong>{examRules.tentativesMax}</strong> ·
            Jours autorisés : <strong>{examRules.joursAutorises?.join(", ")}</strong>
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

        {/* Tableau */}
        <div style={{ background: "#fff", borderRadius: 15, overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: "#2b537e" }}>
                  <th style={th}>Candidat(e)</th>
                  <th style={th}>Type</th>
                  <th style={th}>Date / Heure</th>
                  <th style={th}>Lieu</th>
                  <th style={th}>Séances</th>
                  <th style={th}>Résultat</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.length > 0 ? filtered.map((examen, i) => {
                    const st = STATUS_CONFIG[examen.status];
                    return (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={examen.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : "#F8FAFC",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedExamen(examen)}
                      >
                        <td style={{ ...td, fontWeight: 600 }}>
                          {examen.candidat}
                          {examen.autoGenerated && (
                            <span style={{
                              marginLeft: 8, fontSize: 10, background: "#e0f2fe",
                              color: "#0369a1", padding: "2px 6px", borderRadius: 10, fontWeight: 500,
                            }}>auto</span>
                          )}
                        </td>
                        <td style={td}>{examen.type}</td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FaCalendarDay style={{ color: "#4E96E1", fontSize: 12 }} />
                            <div>
                              {examen.date}{" "}
                              <span style={{ color: "#64748b", fontSize: 12 }}>{examen.heure}</span>
                            </div>
                          </div>
                        </td>
                        <td style={td}>{examen.lieu}</td>
                        <td style={td}>
                          <span style={{
                            background: "#f1f5f9", color: "#475569",
                            padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                          }}>
                            {examen.nbSeances || "—"} séances
                          </span>
                        </td>
                        <td style={td}>
                          {/* Lecture seule — pas de toggle */}
                          <LockedTooltip message="Modification réservée à l'administrateur">
                            <div style={{
                              background: st.bg, color: st.color,
                              display: "inline-flex", alignItems: "center",
                              padding: "4px 10px", borderRadius: 20,
                              fontWeight: 600, fontSize: 13,
                              cursor: "not-allowed", opacity: 0.9,
                            }}>
                              <FaLock style={{ marginRight: 6, fontSize: 9, opacity: 0.5 }} />
                              {st.label}
                            </div>
                          </LockedTooltip>
                        </td>
                      </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#A0AEC0" }}>
                        {loading
                          ? "Chargement en cours..."
                          : mesCandidatIds.length === 0
                            ? "Aucun candidat trouvé pour votre compte."
                            : "Aucun examen programmé pour vos candidats."}
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <ExamenModal
        examen={selectedExamen}
        onClose={() => setSelectedExamen(null)}
        readOnly
      />
    </div>
  );
};

export default ExamensMoniteur;