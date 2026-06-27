import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarDay, FaCheckCircle, FaTimesCircle,
  FaClock, FaTrashAlt, FaExchangeAlt, FaUser,
  FaSync, FaInfoCircle, FaCalendarPlus, FaFilePdf, FaTimes,
  FaUserSlash, FaHistory, FaLock, FaFilter,
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
const STATUS_CONFIG = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé"  },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"     },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"     },
  Absent:    { bg: "#fff7ed", color: "#c2410c", label: "Absent"     },
};

const HISTORY_TABS = [
  { key: "Passed", label: "Réussi", icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
  { key: "Failed", label: "Échoué", icon: "❌", color: "#c62828", bg: "#ffebee" },
  { key: "Absent", label: "Absent", icon: "🚫", color: "#c2410c", bg: "#fff7ed" },
];

const ABSENCE_CUTOFF_DAYS = 1;

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

function getDiffDays(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const normalized = String(dateStr).replace(/\//g, "-").slice(0, 10);
  const examDate = new Date(normalized + "T00:00:00");
  if (isNaN(examDate)) return null;
  return Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
}

// Parse une date examen (format YYYY-MM-DD ou YYYY/MM/DD) en timestamp
function parseExamDate(dateStr) {
  if (!dateStr) return null;
  const normalized = String(dateStr).replace(/\//g, "-").slice(0, 10);
  const d = new Date(normalized + "T00:00:00");
  return isNaN(d) ? null : d;
}

// ─────────────────────────────────────────────
// AbsenceModal
// ─────────────────────────────────────────────
function AbsenceModal({ examen, onClose, onConfirm }) {
  if (!examen) return null;
  const diff = getDiffDays(examen.date);
  const canDeclare = diff !== null && diff > ABSENCE_CUTOFF_DAYS;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: 420, maxWidth: "90vw", padding: 26, boxShadow: "0 30px 70px rgba(0,0,0,0.22)", animation: "absencePop .22s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes absencePop{from{transform:translateY(18px) scale(.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#fff7ed", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: "2px solid #fed7aa" }}>
            <FaUserSlash style={{ color: "#ea580c" }} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, color: "#1e293b" }}>Absence anticipée</h3>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "#64748b" }}>
            {examen.candidat} · {examen.type} · {examen.date}
          </p>
        </div>

        {diff !== null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: diff > ABSENCE_CUTOFF_DAYS ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${diff > ABSENCE_CUTOFF_DAYS ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13,
          }}>
            <span style={{ fontSize: 18 }}>{diff > ABSENCE_CUTOFF_DAYS ? "✅" : "🔒"}</span>
            <div>
              {diff > ABSENCE_CUTOFF_DAYS ? (
                <>
                  <strong style={{ color: "#166534" }}>Déclaration possible</strong>
                  <div style={{ color: "#15803d", fontSize: 12 }}>Il reste <strong>{diff} jour(s)</strong> avant l'examen — délai suffisant.</div>
                </>
              ) : diff === 1 ? (
                <>
                  <strong style={{ color: "#b91c1c" }}>Délai dépassé — veille de l'examen</strong>
                  <div style={{ color: "#dc2626", fontSize: 12 }}>Il n'est plus possible de déclarer une absence anticipée la veille.</div>
                </>
              ) : (
                <>
                  <strong style={{ color: "#b91c1c" }}>Délai dépassé</strong>
                  <div style={{ color: "#dc2626", fontSize: 12 }}>L'examen est aujourd'hui ou déjà passé.</div>
                </>
              )}
            </div>
          </div>
        )}

        {canDeclare && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "11px 14px", marginBottom: 18, fontSize: 13, color: "#92400e", lineHeight: 1.55 }}>
            ⚠️ Ce candidat sera <strong>retiré de cette session</strong> et automatiquement re-planifié pour la <strong>prochaine date d'examen disponible</strong>. La raison sera enregistrée comme <em>absence déclarée</em>.
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
            Annuler
          </button>
          {canDeclare && (
            <button
              onClick={() => onConfirm(examen.id)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <FaUserSlash /> Confirmer l'absence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ResultModal
// ─────────────────────────────────────────────
function ResultModal({ examen, onClose, onConfirm }) {
  const [correctMode, setCorrectMode] = useState(false);
  if (!examen) return null;

  const dejaEvalue = ["Passed", "Failed", "Absent", "Reported"].includes(examen.status);
  const st = STATUS_CONFIG[examen.status];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 400, maxWidth: "90vw", padding: 24, boxShadow: "0 30px 70px rgba(0,0,0,0.22)" }}>
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
              Ce résultat est déjà enregistré. Si tu t'es trompé(e), tu peux le corriger ci-dessous.
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              <button onClick={() => onConfirm(examen.id, "Passed")} style={btnGreen}>
                ✅<br /><span style={{ fontSize: 11 }}>Réussi</span>
              </button>
              <button onClick={() => onConfirm(examen.id, "Failed")} style={btnRed}>
                ❌<br /><span style={{ fontSize: 11 }}>Échoué</span>
              </button>
              <button onClick={() => onConfirm(examen.id, "Absent")} style={btnOrange}>
                🚫<br /><span style={{ fontSize: 11 }}>Absent</span>
              </button>
            </div>
            <button onClick={onClose} style={{ ...btnSecondary, width: "100%" }}>Annuler</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PermisObtenuModal
// ─────────────────────────────────────────────
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
            Son dossier est marqué comme « obtenu ».
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

// ─────────────────────────────────────────────
// AlertModal
// ─────────────────────────────────────────────
function AlertModal({ icon, title, message, color = "#ef4444", onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: 360, maxWidth: "90vw", boxShadow: "0 30px 70px rgba(0,0,0,0.22)", overflow: "hidden", animation: "alertPop .22s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes alertPop{from{transform:translateY(18px) scale(.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
        <div style={{ padding: "26px 24px 18px", textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", margin: "0 auto 14px", background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
            {icon}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.55 }}>{message}</div>
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: color, color: "#fff", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Boutons styles
// ─────────────────────────────────────────────
const btnBase      = { flex: 1, padding: "12px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5, textAlign: "center" };
const btnSecondary = { ...btnBase, border: "1px solid #e2e8f0", background: "#fff", color: "#475569" };
const btnWarning   = { ...btnBase, background: "#fef3c7", color: "#92400e" };
const btnGreen     = { ...btnBase, background: "#dcfce7", color: "#166534" };
const btnRed       = { ...btnBase, background: "#fee2e2", color: "#991b1b" };
const btnOrange    = { ...btnBase, background: "#fef3c7", color: "#92400e" };

// ─────────────────────────────────────────────
// Table partagée
// ─────────────────────────────────────────────
function ExamenTable({ rows, isAdmin, perms, onRowClick, onResultClick, onRemove, onAbsent, showEvaluer = false, showStatusBadge = true, showRemove = true }) {
  const th = { padding: "13px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
  const td = { padding: "11px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

  const hasActionsCol = showEvaluer || showRemove;

  return (
    <div style={{ maxHeight: 420, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <tr style={{ background: "#2b537e" }}>
            <th style={th}>Candidat(e)</th>
            <th style={th}>Type</th>
            <th style={th}>Date</th>
            <th style={th}>Lieu</th>
            <th style={th}>Séances</th>
            {showStatusBadge && <th style={th}>Statut</th>}
            {hasActionsCol && <th style={th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {rows.length > 0 ? rows.map((examen, i) => {
              const st = STATUS_CONFIG[examen.status];
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const examDate = new Date((examen.date || "") + "T00:00:00");
              const isPast = !isNaN(examDate) && examDate <= today;
              const diff = getDiffDays(examen.date);
              const canDeclareAbsence = examen.status === "Scheduled" && diff !== null && diff > ABSENCE_CUTOFF_DAYS;
              const absenceTooLate    = examen.status === "Scheduled" && diff !== null && diff <= ABSENCE_CUTOFF_DAYS && diff >= 0;

              return (
                <motion.tr
                  layout
                  key={examen.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.25 } }}
                  style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC", cursor: "pointer" }}
                  onClick={() => onRowClick(examen)}
                >
                  <td style={{ ...td, fontWeight: 600 }}>{examen.candidat}</td>
                  <td style={td}>{examen.type}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FaCalendarDay style={{ color: isPast ? "#f97316" : "#4E96E1", fontSize: 12 }} />
                      <div>
                        {examen.date}
                        <span style={{ color: "#64748b", fontSize: 12 }}> {examen.heure}</span>
                        {isPast && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: "#fff7ed", color: "#c2410c", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>
                            passé
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={td}>{examen.lieu}</td>
                  <td style={td}>
                    <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {examen.nbSeances || "—"} séances
                    </span>
                  </td>
                  {showStatusBadge && (
                    <td style={td}>
                      <div
                        style={{ background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: (isAdmin || perms.CAN_TOGGLE_STATUS) ? "pointer" : "default", whiteSpace: "nowrap" }}
                        onClick={e => { e.stopPropagation(); onResultClick(examen.id, e); }}
                      >
                        {(isAdmin || perms.CAN_TOGGLE_STATUS) && <FaExchangeAlt style={{ marginRight: 8, fontSize: 10 }} />}
                        {st.label}
                      </div>
                    </td>
                  )}
                  {hasActionsCol && (
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>

                        {showEvaluer && (isAdmin || perms.CAN_TOGGLE_STATUS) && (
                          <button
                            onClick={e => { e.stopPropagation(); onResultClick(examen.id, e); }}
                            title={isPast ? "Saisir le résultat" : "L'examen n'est pas encore passé"}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              background: isPast ? "#dbeafe" : "#f1f5f9",
                              color: isPast ? "#1d4ed8" : "#94a3b8",
                              border: `1px solid ${isPast ? "#93c5fd" : "#e2e8f0"}`,
                              padding: "6px 12px", borderRadius: 6,
                              cursor: isPast ? "pointer" : "not-allowed",
                              fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                            }}
                          >
                            <FaExchangeAlt style={{ fontSize: 11 }} />
                            Évaluer
                          </button>
                        )}

                        {showEvaluer && (isAdmin || perms.CAN_TOGGLE_STATUS) && canDeclareAbsence && (
                          <button
                            onClick={e => { e.stopPropagation(); onAbsent(examen.id, e); }}
                            title={`Déclarer une absence anticipée — J-${diff} jours`}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              background: "#fff7ed", color: "#ea580c",
                              border: "1px solid #fed7aa",
                              padding: "6px 12px", borderRadius: 6,
                              cursor: "pointer", fontSize: 12, fontWeight: 600,
                              transition: "all 0.15s",
                            }}
                          >
                            <FaUserSlash style={{ fontSize: 11 }} />
                            Absent
                          </button>
                        )}

                        {showEvaluer && (isAdmin || perms.CAN_TOGGLE_STATUS) && absenceTooLate && (
                          <span
                            title={diff === 1 ? "Trop tard — veille de l'examen" : "Trop tard — examen aujourd'hui"}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              background: "#f8fafc", color: "#94a3b8",
                              border: "1px solid #e2e8f0",
                              padding: "6px 11px", borderRadius: 6,
                              fontSize: 12, cursor: "not-allowed", fontWeight: 600,
                            }}
                          >
                            <FaLock style={{ fontSize: 10 }} />
                            {diff === 1 ? "Veille 🔒" : "Aujourd'hui 🔒"}
                          </span>
                        )}

                        {showRemove && (isAdmin || perms.CAN_REMOVE_CANDIDAT) && (
                          <button
                            onClick={e => { e.stopPropagation(); onRemove(examen.id, e); }}
                            title="Retirer"
                            style={{ background: "#FEF2F2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                          >
                            <FaTrashAlt />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              );
            }) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#A0AEC0" }}>
                  Aucun examen dans cette catégorie.
                </td>
              </tr>
            )}
          </AnimatePresence>
        </tbody>
      </table>
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
  const { examRules }      = useExamenRulesCtx();
  const { currentUser }    = useAuth();
  const { getPermissions } = usePermissionsCtx();

  const isAdmin = currentUser?.type_utilisateur === "administrateur";
  const perms   = isAdmin
    ? { CAN_ADD_SESSION: true, CAN_ADD_PAYMENT: true, CAN_TOGGLE_STATUS: true, CAN_REMOVE_CANDIDAT: true, CAN_VIEW_ALL_CANDIDATES: true, CAN_ADD_CANDIDAT: true, CAN_EXPORT_LISTE_CANDIDATS: true }
    : getPermissions(currentUser?.id);

  // ── state ──
  const [selectedExamen,    setSelectedExamen]    = useState(null);
  const [typeFilter,        setTypeFilter]        = useState("Tous");
  const [dateDebut,         setDateDebut]         = useState("");
  const [dateFin,           setDateFin]           = useState("");
  const [loading,           setLoading]           = useState(false);
  const [lastGenerated,     setLastGenerated]     = useState(null);
  const [showReportes,      setShowReportes]      = useState(false);
  const [candidatsMap,      setCandidatsMap]      = useState({});
  const [permisObtenuInfo,  setPermisObtenuInfo]  = useState(null);
  const [alertInfo,         setAlertInfo]         = useState(null);
  const [resultModalExamen, setResultModalExamen] = useState(null);
  const [absenceModalExamen,setAbsenceModalExamen]= useState(null);
  const [activeHistoryTab,  setActiveHistoryTab]  = useState("Passed");
  const [searchReportes,    setSearchReportes]    = useState("");

  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfLoading,      setPdfLoading]      = useState(false);
  const [exportForm, setExportForm] = useState({ nomEcole: "", wilaya: "", centreExamen: "", morkaba: "", dateDepot: "", dateExamen: "" });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("export_pdf_defaults") || "{}");
      setExportForm(f => ({ ...f, ...saved }));
    } catch { /* ok */ }
  }, []);

  // ── génération ──
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
          nom: c.nom ?? "", prenom: c.prenom ?? "",
          nom_ar: c.nom_ar ?? "", prenom_ar: c.prenom_ar ?? "",
          dateNaissance: c.date_naissance ?? "",
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

  // ── filtre par plage de dates ──
  const filterByDate = (list) => {
    if (!dateDebut && !dateFin) return list;
    return list.filter(e => {
      const d = parseExamDate(e.date);
      if (!d) return true;
      const from = dateDebut ? new Date(dateDebut + "T00:00:00") : null;
      const to   = dateFin   ? new Date(dateFin   + "T23:59:59") : null;
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  };

  const hasDateFilter = !!(dateDebut || dateFin);

  const resetDateFilter = () => { setDateDebut(""); setDateFin(""); };

  // ── actions ──
  const handleAbsent = (id, e) => {
    e.stopPropagation();
    if (!perms.CAN_TOGGLE_STATUS) return;
    const examen = examensList.find((x) => x.id === id);
    if (!examen) return;
    setAbsenceModalExamen(examen);
  };

  const handleRemove = (id, e) => {
    e.stopPropagation();
    if (!perms.CAN_REMOVE_CANDIDAT) return;
    if (window.confirm("Retirer ce candidat ? Il sera re-suggéré automatiquement.")) {
      retirerCandidat(id);
    }
  };

  const handleOpenResultModal = (id, e) => {
    e.stopPropagation();
    if (!perms.CAN_TOGGLE_STATUS) return;
    const examen = examensList.find((x) => x.id === id);
    if (!examen) return;
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const examDate = new Date((examen.date || "") + "T00:00:00");
    if (!isNaN(examDate) && examDate > today) {
      setAlertInfo({ icon: "📅", title: "Examen pas encore passé", color: "#f97316", message: `Cet examen est programmé pour le ${examen.date}. Vous ne pouvez modifier le résultat qu'à partir de cette date.` });
      return;
    }
    setResultModalExamen(examen);
  };

  // ── segmentation de la liste (type + date) ──
  const byType = (list) => typeFilter === "Tous" ? list : list.filter(e => e.type === typeFilter);
  const byDate = (list) => filterByDate(list);
  const applyFilters = (list) => byDate(byType(list));

  const scheduled    = applyFilters(examensList.filter(e => e.status === "Scheduled"));
  const history      = applyFilters(examensList.filter(e => ["Passed", "Failed", "Absent", "Reported"].includes(e.status)));
  const historyByTab = history.filter(e => e.status === activeHistoryTab);

  // ── stats (basées sur filtres actifs) ──
  const allFiltered = applyFilters(examensList);
 const statsData = [
    { label: "Total session", val: allFiltered.length,                                        color: "blue",   icon: <FaUser />,        trend: "Candidats"      },
    { label: "Réussites",     val: allFiltered.filter(e => e.status === "Passed").length,    color: "green",  icon: <FaCheckCircle />, trend: "Validés"        },
    { label: "Échecs",        val: allFiltered.filter(e => e.status === "Failed").length,    color: "red",    icon: <FaTimesCircle />, trend: "À reprogrammer" },
    { label: "En attente",    val: scheduled.length,                                          color: "orange", icon: <FaClock />,       trend: "À évaluer"      },
    { label: "Absents",       val: allFiltered.filter(e => e.status === "Absent").length,    color: "orange", icon: <FaUserSlash />,   trend: "Re-planifiés"   },
  ];

  const getCandidatName = (id) => {
    const c = candidatsMap[String(id)];
    if (!c) return `Candidat #${id}`;
    const full = [c.prenom, c.nom].filter(Boolean).join(" ");
    return full || `Candidat #${id}`;
  };

  const reportesEntries = Object.entries(candidatsReportes);
  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
  const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

  // ── export ──
  const openExportModal = () => {
    if (allFiltered.length === 0) { alert("Aucun candidat à exporter."); return; }
    setExportForm(f => ({ ...f, dateExamen: formatDateAr(allFiltered[0]?.date) || f.dateExamen }));
    setShowExportModal(true);
  };
  const handleExportFormChange = (field, value) => setExportForm(f => ({ ...f, [field]: value }));

  const handleConfirmExport = async () => {
    if (!exportForm.wilaya.trim() || !exportForm.centreExamen.trim()) { alert("Merci de renseigner la wilaya et le centre d'examen."); return; }
    setPdfLoading(true);
    try {
      const candidatsPourPDF = allFiltered.map((examen, i) => {
        const info = candidatsMap[String(examen.candidatId)] || {};
        return { rang: i + 1, numDossier: examen.candidatId, nomPrenom: examen.candidat, nomPrenomAr: [info.nom_ar, info.prenom_ar].filter(Boolean).join(" "), dateNaissance: formatDateAr(examen.dateNaissance), categorie: examen.categoriePermis || "", typeExamen: examen.type || "", dateDepot: formatDateAr(exportForm.dateDepot), dateExamenRapport: formatDateAr(examen.date), observations: "" };
      });
      const savedPath = await window.electron.generateListeCandidatsPDF({ ...exportForm, dateDepot: formatDateAr(exportForm.dateDepot), candidats: candidatsPourPDF });
      localStorage.setItem("export_pdf_defaults", JSON.stringify({ nomEcole: exportForm.nomEcole, wilaya: exportForm.wilaya, morkaba: exportForm.morkaba }));
      if (savedPath) { alert(`Document enregistré :\n${savedPath}`); setShowExportModal(false); }
    } catch (e) { console.error(e); alert("Erreur lors de la génération du document."); }
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

        {/* ── Header + boutons ── */}
        <div className="examens-page-header">
          <div>
            <h2 className="examens-page-title">Sessions d'examens</h2>
            <p className="examens-page-sub">
              Seuils : Code ≥{EXAM_THRESHOLDS.Code} · Créneau ≥{EXAM_THRESHOLDS.Créneau} · Circulation ≥{EXAM_THRESHOLDS.Circulation}
              {lastGenerated && <span style={{ color: "#94a3b8", marginLeft: 12, fontSize: 12 }}>Mise à jour : {lastGenerated}</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={openExportModal} style={{ display: "flex", alignItems: "center", gap: 8, background: "#2b537e", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <FaFilePdf /> قائمة المترشحين
            </button>
            {isAdmin && (
              <button onClick={handleGenerate} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8, background: "#4E96E1", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
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
            Délai après échec : <strong>{examRules.delaiApresEchec}j</strong> ·
            Max tentatives : <strong>{examRules.tentativesMax}</strong> ·
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

        {/* ══════════════════════════════════════════════
            FILTRES — Type + Plage de dates
        ══════════════════════════════════════════════ */}
        <div style={{
          display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 12,
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 12, padding: "14px 16px", marginBottom: 4,
        }}>
          {/* Filtre type */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Type d'examen</label>
            <SelectFilter
              value={typeFilter} onChange={setTypeFilter}
              options={["Tous", "Code", "Créneau", "Circulation"]}
              label="Type d'examen"
            />
          </div>

          {/* Séparateur */}
          <div style={{ width: 1, height: 36, background: "#e2e8f0", alignSelf: "center" }} />

          {/* Filtre date début */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Du</label>
            <input
              type="date"
              value={dateDebut}
              onChange={e => setDateDebut(e.target.value)}
              max={dateFin || undefined}
              style={{
                padding: "8px 12px", borderRadius: 8,
                border: dateDebut ? "1.5px solid #2b537e" : "1px solid #d1d5db",
                fontSize: 13, color: "#1f2937", background: "#fff",
                outline: "none", cursor: "pointer",
              }}
            />
          </div>

          {/* Flèche */}
          <div style={{ color: "#94a3b8", fontSize: 16, paddingBottom: 4 }}>→</div>

          {/* Filtre date fin */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Au</label>
            <input
              type="date"
              value={dateFin}
              onChange={e => setDateFin(e.target.value)}
              min={dateDebut || undefined}
              style={{
                padding: "8px 12px", borderRadius: 8,
                border: dateFin ? "1.5px solid #2b537e" : "1px solid #d1d5db",
                fontSize: 13, color: "#1f2937", background: "#fff",
                outline: "none", cursor: "pointer",
              }}
            />
          </div>

          {/* Bouton reset dates */}
          {hasDateFilter && (
            <button
              onClick={resetDateFilter}
              title="Effacer le filtre de dates"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid #fca5a5", background: "#fef2f2",
                color: "#b91c1c", cursor: "pointer", fontSize: 12.5,
                fontWeight: 600, alignSelf: "flex-end",
              }}
            >
              <FaTimes style={{ fontSize: 11 }} /> Effacer dates
            </button>
          )}

          {/* Badge résumé filtre actif */}
          {hasDateFilter && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: 8, padding: "7px 12px", fontSize: 12,
              color: "#1d4ed8", fontWeight: 600, alignSelf: "flex-end",
            }}>
              <FaFilter style={{ fontSize: 10 }} />
              {dateDebut && dateFin
                ? `${dateDebut} → ${dateFin}`
                : dateDebut
                ? `À partir du ${dateDebut}`
                : `Jusqu'au ${dateFin}`}
              <span style={{ background: "#dbeafe", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
                {allFiltered.length} résultat{allFiltered.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            TABLE 1 — PROGRAMMÉS
        ══════════════════════════════════════════════ */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ background: "#e3f2fd", color: "#1565c0", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaClock />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Examens programmés</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{scheduled.length} candidat(s) en attente d'évaluation</p>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 15, overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <ExamenTable
              rows={scheduled}
              isAdmin={isAdmin}
              perms={perms}
              onRowClick={setSelectedExamen}
              onResultClick={handleOpenResultModal}
              onRemove={handleRemove}
              onAbsent={handleAbsent}
              showEvaluer={true}
              showStatusBadge={false}
              showRemove={true}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            TABLE 2 — HISTORIQUE avec TABS
        ══════════════════════════════════════════════ */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "#f3e8ff", color: "#6b21a8", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaHistory />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Historique des résultats</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{history.length} examen(s) évalué(s)</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 0, flexWrap: "wrap" }}>
            {HISTORY_TABS.map(tab => {
              const count = applyFilters(examensList.filter(e => e.status === tab.key)).length;
              const isActive = activeHistoryTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveHistoryTab(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "9px 16px", borderRadius: "10px 10px 0 0",
                    border: isActive ? `2px solid ${tab.color}` : "2px solid #e2e8f0",
                    borderBottom: isActive ? `2px solid #fff` : "2px solid #e2e8f0",
                    background: isActive ? "#fff" : "#f8fafc",
                    color: isActive ? tab.color : "#94a3b8",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13.5, cursor: "pointer",
                    transition: "all 0.15s",
                    position: "relative",
                    bottom: isActive ? -2 : 0,
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span style={{
                    background: isActive ? tab.bg : "#f1f5f9",
                    color: isActive ? tab.color : "#94a3b8",
                    padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ background: "#fff", borderRadius: "0 12px 12px 12px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)", border: "2px solid #e2e8f0", borderTop: "none" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHistoryTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <ExamenTable
                  rows={historyByTab}
                  isAdmin={isAdmin}
                  perms={perms}
                  onRowClick={setSelectedExamen}
                  onResultClick={handleOpenResultModal}
                  onRemove={handleRemove}
                  onAbsent={handleAbsent}
                  showEvaluer={false}
                  showStatusBadge={true}
                  showRemove={false}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Candidats reportés ── */}
        {reportesEntries.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => { setShowReportes(v => !v); setSearchReportes(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#475569", marginBottom: 12 }}
            >
              <FaCalendarPlus /> {showReportes ? "Masquer" : "Voir"} les candidats reportés ({reportesEntries.length})
            </button>

            {showReportes && (() => {
              const q = searchReportes.trim().toLowerCase();
              const filtered = reportesEntries.filter(([cid, info]) => {
                const nom = getCandidatName(cid).toLowerCase();
                return (
                  nom.includes(q) ||
                  String(cid).includes(q) ||
                  (info.type || "").toLowerCase().includes(q) ||
                  (info.reason || "").toLowerCase().includes(q)
                );
              });

              return (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                    <p style={{ fontSize: 13, color: "#78350f", fontWeight: 600, margin: 0 }}>
                      Ces candidats seront re-suggérés automatiquement à leur prochaine date d'examen :
                    </p>
                    <div style={{ position: "relative", minWidth: 220 }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a16207", fontSize: 13, pointerEvents: "none" }}>🔍</span>
                      <input
                        type="text"
                        value={searchReportes}
                        onChange={e => setSearchReportes(e.target.value)}
                        placeholder="Rechercher un candidat..."
                        style={{ paddingLeft: 32, paddingRight: searchReportes ? 30 : 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: "1px solid #fde68a", background: "#fff", fontSize: 13, color: "#1f2937", outline: "none", width: "100%", boxSizing: "border-box" }}
                      />
                      {searchReportes && (
                        <button onClick={() => setSearchReportes("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#a16207", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  </div>

                  {q && (
                    <p style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                      {filtered.length} résultat(s) pour <strong>« {searchReportes} »</strong>
                    </p>
                  )}

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
                      {filtered.length > 0 ? filtered.map(([cid, info]) => {
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
                              <span style={{
                                background: info.reason === "echec" ? "#fee2e2" : info.reason === "absence" ? "#fff7ed" : "#f1f5f9",
                                color:      info.reason === "echec" ? "#991b1b" : info.reason === "absence" ? "#c2410c" : "#475569",
                                padding: "2px 8px", borderRadius: 10, fontSize: 12,
                                display: "inline-flex", alignItems: "center", gap: 5,
                              }}>
                                {info.reason === "absence" && <FaUserSlash style={{ fontSize: 10 }} />}
                                {info.reason === "echec" ? "Échec" : info.reason === "absence" ? "Absence déclarée" : "Retiré par admin"}
                              </span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: 30, color: "#a16207", fontSize: 13 }}>
                            Aucun résultat pour « {searchReportes} »
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════ */}
      <ExamenModal examen={selectedExamen} onClose={() => setSelectedExamen(null)} />

      {alertInfo && (
        <AlertModal icon={alertInfo.icon} title={alertInfo.title} message={alertInfo.message} color={alertInfo.color} onClose={() => setAlertInfo(null)} />
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
              const passe = (type) =>
                type === examen.type ||
                examensList.some((e) => e.candidatId === cid && e.type === type && e.status === "Passed");
              if (passe("Code") && passe("Créneau") && passe("Circulation")) {
                setPermisObtenuInfo({ candidat: examen.candidat });
              }
            }
          }
          if (["Passed", "Failed", "Absent"].includes(status)) setActiveHistoryTab(status);
          setResultModalExamen(null);
        }}
      />

      <AbsenceModal
        examen={absenceModalExamen}
        onClose={() => setAbsenceModalExamen(null)}
        onConfirm={(id) => {
          setExamenResult(id, "Absent");
          setAbsenceModalExamen(null);
          setActiveHistoryTab("Absent");
        }}
      />

      {permisObtenuInfo && (
        <PermisObtenuModal candidatName={permisObtenuInfo.candidat} onClose={() => setPermisObtenuInfo(null)} />
      )}

      {/* ── Modal export PDF ── */}
      {showExportModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => !pdfLoading && setShowExportModal(false)}
        >
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 440, maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>قائمة المترشحين — Informations</h3>
              <button onClick={() => !pdfLoading && setShowExportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}><FaTimes /></button>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              L'école, la wilaya et la morkaba sont mémorisés. Le centre et les dates sont à vérifier à chaque session.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <FormField label="Nom de l'auto-école"         value={exportForm.nomEcole}    onChange={v => handleExportFormChange("nomEcole", v)}    placeholder="Ex : Auto-École Essalem" />
              <FormField label="Wilaya"                      value={exportForm.wilaya}       onChange={v => handleExportFormChange("wilaya", v)}       placeholder="Ex : Béjaïa, Sétif..." required />
              <FormField label="Centre d'examen"             value={exportForm.centreExamen} onChange={v => handleExportFormChange("centreExamen", v)} placeholder="Ex : Le Châlet..." required />
              <FormField label="المركبة الأولى"              value={exportForm.morkaba}      onChange={v => handleExportFormChange("morkaba", v)}      placeholder="Ex : رونو كليو 03" />
              <FormField label="Date de dépôt des dossiers" value={exportForm.dateDepot}    onChange={v => handleExportFormChange("dateDepot", v)}    type="date" />
              <FormField label="Date de l'examen"            value={exportForm.dateExamen}   onChange={v => handleExportFormChange("dateExamen", v)}   placeholder="YYYY/MM/DD" />
            </div>
            <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
              <strong style={{ color: "#1f2937" }}>Aperçu :</strong> {allFiltered.length} candidat(s) exporté(s)
              {typeFilter !== "Tous" && <> · Type : <strong>{typeFilter}</strong></>}
              {hasDateFilter && <> · Période filtrée</>}
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
// FormField
// ─────────────────────────────────────────────
const FormField = ({ label, value, onChange, placeholder, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, color: "#1F2937", outline: "none", boxSizing: "border-box" }}
    />
  </div>
);

export default Examens;