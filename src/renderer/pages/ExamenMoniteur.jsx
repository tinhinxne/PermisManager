import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarDay, FaCheckCircle, FaTimesCircle,
  FaClock, FaTrashAlt, FaExchangeAlt, FaUser,
  FaInfoCircle, FaCalendarPlus, FaFilePdf, FaTimes,
  FaLock, FaUserSlash, FaHistory, FaFilter,
  FaBell, FaThumbsUp, FaThumbsDown, FaSync,
  FaChevronDown, FaChevronUp,
} from "react-icons/fa";

import SelectFilter from "../components/SelectFilter";
import ExamenModal from "../components/Examenmodal";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/Examens.css";

import { useExamenCtx } from "../context/ExamenContext";
import { useExamenRulesCtx } from "../context/ExamenRulesContext";
import { useMyPermissions } from "../context/PermissionsContext";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const STATUS_CONFIG = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé" },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"    },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"    },
  Absent:    { bg: "#fff7ed", color: "#c2410c", label: "Absent"    },
};

const HISTORY_TABS = [
  { key: "Passed", label: "Réussi", icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
  { key: "Failed", label: "Échoué", icon: "❌", color: "#c62828", bg: "#ffebee" },
  { key: "Absent", label: "Absent", icon: "🚫", color: "#c2410c", bg: "#fff7ed" },
];

const ABSENCE_CUTOFF_DAYS = 1;
const DAYS_OPTIONS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// ── AJOUT : normalisation de la catégorie de permis, utilisée pour ne
// comparer les examens réussis/programmés qu'au sein d'une même catégorie
// (voir AjouterCandidatsModal et ResultModal.onConfirm plus bas), et pour
// filtrer les candidats proposables selon la catégorie visée par une
// session d'examen (voir CreerSessionModal / AjouterCandidatsModal). ──
const normCat = v => (v || "").toString().trim().toUpperCase();

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

function parseExamDate(dateStr) {
  if (!dateStr) return null;
  const normalized = String(dateStr).replace(/\//g, "-").slice(0, 10);
  const d = new Date(normalized + "T00:00:00");
  return isNaN(d) ? null : d;
}
function formatWhatsAppUrl(telephone, message) {
  if (!telephone) return null;
  let numero = telephone.replace(/\D/g, "");
  if (numero.startsWith("0")) numero = "213" + numero.slice(1);
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────────
// Badge J-X
// ─────────────────────────────────────────────
function CountdownBadge({ dateStr }) {
  const diff = getDiffDays(dateStr);
  if (diff === null || diff < 0) return null;

  let bg, color, label, icon;
  if (diff === 0) {
    bg = "#f1f5f9"; color = "#64748b"; label = "Aujourd'hui"; icon = null;
  } else if (diff === 1) {
    bg = "#fee2e2"; color = "#b91c1c"; label = "Demain"; icon = <FaLock style={{ fontSize: 9 }} />;
  } else if (diff <= 3) {
    bg = "#fff7ed"; color = "#c2410c"; label = `J-${diff}`; icon = <FaUserSlash style={{ fontSize: 9 }} />;
  } else if (diff <= 7) {
    bg = "#fef9c3"; color = "#854d0e"; label = `J-${diff}`; icon = <FaUserSlash style={{ fontSize: 9 }} />;
  } else {
    bg = "#f0fdf4"; color = "#166534"; label = `J-${diff}`; icon = <FaUserSlash style={{ fontSize: 9 }} />;
  }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: bg, color, padding: "2px 7px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, marginLeft: 6, verticalAlign: "middle",
      border: `1px solid ${color}30`,
    }}>
      {icon}{label}
    </span>
  );
}

// ─────────────────────────────────────────────
// ResultModal
// ─────────────────────────────────────────────
function ResultModal({ examen, onClose, onConfirm }) {
  const [correctMode, setCorrectMode] = useState(false);
  if (!examen) return null;

  const dejaEvalue = ["Passed", "Failed", "Absent"].includes(examen.status);
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

// ─────────────────────────────────────────────
// Modal absence anticipée
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: diff > ABSENCE_CUTOFF_DAYS ? "#f0fdf4" : "#fef2f2", border: `1px solid ${diff > ABSENCE_CUTOFF_DAYS ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
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
            <button onClick={() => onConfirm(examen.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#ea580c", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <FaUserSlash /> Confirmer l'absence
            </button>
          )}
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
// PropositionsSection — propositions générées automatiquement,
// affichées directement dans la page (Valider / Rejeter ligne par ligne).
// ─────────────────────────────────────────────
function PropositionsSection({ propositions, canReview, onValider, onRejeter, onValiderTout, onRejeterTout }) {
  const [busyId, setBusyId]   = useState(null);
  const [busyAll, setBusyAll] = useState(false);

  if (!propositions || propositions.length === 0) return null;

  const handleValider = async (id) => {
    setBusyId(id);
    try { await onValider(id); } finally { setBusyId(null); }
  };

  const handleValiderTout = async () => {
    if (!window.confirm(`Valider les ${propositions.length} proposition(s) ? Elles rejoindront la liste des examens programmés et les candidats seront notifiés.`)) return;
    setBusyAll(true);
    try { await onValiderTout(); } finally { setBusyAll(false); }
  };

  const handleRejeterTout = () => {
    if (!window.confirm(`Rejeter les ${propositions.length} proposition(s) ? Elles seront re-proposées automatiquement après le délai configuré.`)) return;
    onRejeterTout();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#fff7ed", color: "#c2410c", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaBell />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Propositions à valider</h3>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{propositions.length} candidat(s) éligible(s) — accepte ou refuse directement ici</p>
          </div>
        </div>

        {canReview && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleRejeterTout} disabled={busyAll} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}>
              Tout rejeter
            </button>
            <button onClick={handleValiderTout} disabled={busyAll} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12.5, opacity: busyAll ? 0.7 : 1 }}>
              {busyAll ? "Validation..." : "Tout valider"}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)", border: "1px solid #fed7aa" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#c2410c" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 13 }}>Candidat(e)</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 13 }}>Type</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 13 }}>Date proposée</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 13 }}>Lieu</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 13 }}>Séances</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: "#fff", fontWeight: 600, fontSize: 13 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {propositions.map((p, i) => (
                <motion.tr
                  layout
                  key={p.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.25 } }}
                  style={{ background: i % 2 === 0 ? "#fff" : "#FFFBF5" }}
                >
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid #fed7aa55", fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{p.candidat}</td>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid #fed7aa55", fontSize: 13, color: "#1F2937" }}>{p.type}</td>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid #fed7aa55", fontSize: 13, color: "#1F2937" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FaCalendarDay style={{ color: "#c2410c", fontSize: 12 }} />
                      {p.date} <span style={{ color: "#64748b", fontSize: 12 }}>{p.heure}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid #fed7aa55", fontSize: 13, color: "#1F2937" }}>{p.lieu}</td>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid #fed7aa55", fontSize: 13, color: "#1F2937" }}>
                    <span style={{ background: "#fff7ed", color: "#c2410c", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                      {p.nbSeances ?? "—"} séances
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", borderBottom: "1px solid #fed7aa55" }}>
                    {canReview ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleValider(p.id)}
                          disabled={busyId === p.id || busyAll}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >
                          <FaThumbsUp style={{ fontSize: 11 }} /> Valider
                        </button>
                        <button
                          onClick={() => onRejeter(p.id)}
                          disabled={busyId === p.id || busyAll}
                          style={{ display: "flex", alignItems: "center", gap: 6, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >
                          <FaThumbsDown style={{ fontSize: 11 }} /> Rejeter
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: "#94a3b8", fontStyle: "italic" }}>Lecture seule</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CreerSessionModal — date/heure/lieu/catégorie, création immédiate d'un jour d'examen
// ─────────────────────────────────────────────
function CreerSessionModal({ onClose, onConfirm, categoriesOptions = [] }) {
  const [date, setDate]   = useState("");
  const [heure, setHeure] = useState("08:00");
  const [lieu, setLieu]   = useState("");
  // ── AJOUT : catégorie de permis visée par cette session.
  // "Tous" = ouverte à toutes les catégories (comportement précédent).
  const [categoriePermis, setCategoriePermis] = useState("Tous");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!date)        { setError("Veuillez choisir une date.");  return; }
    if (!heure)       { setError("Veuillez choisir une heure."); return; }
    if (!lieu.trim()) { setError("Veuillez indiquer un lieu.");  return; }
    onConfirm({ date, heure, lieu: lieu.trim(), categoriePermis });
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}
    >
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>Créer un jour d'examen</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}><FaTimes /></button>
        </div>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
          Cette session apparaîtra dans la liste ci-dessous. Vous pourrez y ajouter des candidats à tout moment.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <FormField label="Date"  value={date}  onChange={setDate}  type="date" required />
          <FormField label="Heure" value={heure} onChange={setHeure} type="time" required />
          <FormField label="Lieu"  value={lieu}  onChange={setLieu}  placeholder="Ex : Centre d'examen" required />

          {/* ── AJOUT : sélection de la catégorie de permis ── */}
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Catégorie de permis
            </label>
            <select
              value={categoriePermis}
              onChange={e => setCategoriePermis(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, color: "#1F2937", outline: "none", background: "#fff", boxSizing: "border-box" }}
            >
              <option value="Tous">Toutes catégories</option>
              {categoriesOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>
              Seuls les candidats de cette catégorie pourront être ajoutés à cette session. Choisissez « Toutes catégories » pour ne pas restreindre.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "9px 13px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
            Annuler
          </button>
          <button onClick={handleConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
            Créer la session
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SessionsExamenList — liste des sessions créées, avec bouton par ligne
// ─────────────────────────────────────────────
function SessionsExamenList({ sessions, examensList, onAjouterCandidats, onSupprimer, canManage }) {
  if (!sessions || sessions.length === 0) return null;

  const sorted = [...sessions].sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));

  const isSessionPast = (dateStr) => {
    const d = parseExamDate(dateStr);
    if (!d) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ background: "#dbeafe", color: "#1d4ed8", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FaCalendarPlus />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Jours d'examen créés</h3>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{sessions.length} session(s) — ajoutez des candidats quand vous voulez</p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
        {sorted.map(s => {
          const nb = examensList.filter(e => e.sessionId === s.id).length;
          const passee = isSessionPast(s.date);
          const categorieRestreinte = s.categoriePermis && s.categoriePermis !== "Tous";
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", opacity: passee ? 0.75 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <FaCalendarDay style={{ color: passee ? "#94a3b8" : "#4E96E1", fontSize: 13 }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>
                    {s.date} <span style={{ color: "#64748b", fontWeight: 500 }}>à {s.heure}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{s.lieu}</div>
                </div>
                <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 9px", borderRadius: 10, fontSize: 12, fontWeight: 600, marginLeft: 6 }}>
                  {nb} candidat{nb > 1 ? "s" : ""}
                </span>
                {/* ── AJOUT : badge catégorie de permis de la session ── */}
                <span style={{
                  background: categorieRestreinte ? "#ede9fe" : "#f1f5f9",
                  color: categorieRestreinte ? "#6d28d9" : "#64748b",
                  padding: "2px 9px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                }}>
                  {categorieRestreinte ? `Cat. ${s.categoriePermis}` : "Toutes catégories"}
                </span>
                {passee && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f1f5f9", color: "#94a3b8", padding: "2px 9px", borderRadius: 10, fontSize: 11.5, fontWeight: 600 }}>
                    <FaLock style={{ fontSize: 9 }} /> Session passée
                  </span>
                )}
              </div>

              {canManage && (
                <div style={{ display: "flex", gap: 8 }}>
                  {passee ? (
                    <span
                      title="Impossible d'ajouter des candidats — la date de cette session est déjà passée"
                      style={{ display: "flex", alignItems: "center", gap: 7, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0", padding: "7px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "not-allowed" }}
                    >
                      <FaLock style={{ fontSize: 11 }} /> Ajouter des candidats
                    </span>
                  ) : (
                    <button
                      onClick={() => onAjouterCandidats(s)}
                      style={{ display: "flex", alignItems: "center", gap: 7, background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd", padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}
                    >
                      <FaCalendarPlus style={{ fontSize: 11 }} /> Ajouter des candidats
                    </button>
                  )}
                  <button
                    onClick={() => onSupprimer(s.id)}
                    title="Supprimer cette session (les examens déjà créés restent)"
                    style={{ background: "#FEF2F2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "7px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AjouterCandidatsModal — sélection candidats + type, pour UNE session donnée
// ─────────────────────────────────────────────
function AjouterCandidatsModal({ session, candidats, examensList = [], onClose, onConfirm }) {
  const [selectedMap, setSelectedMap] = useState({}); // { [candidatId]: type }
  const [search, setSearch]           = useState("");
  const [saving, setSaving]           = useState(false);
  const [progress, setProgress]       = useState({ done: 0, total: 0 });
  const [error, setError]             = useState("");

  const TOUS_TYPES = ["Code", "Créneau", "Circulation"];

  // ── AJOUT : catégorie visée par la session (badge affiché + filtre) ──
  const sessionCategorieRestreinte = session.categoriePermis && session.categoriePermis !== "Tous";

  // ── AJOUT : ne proposer, dans cette session, que les candidats dont la
  // catégorie de permis correspond à celle choisie à la création du jour
  // d'examen. Si la session est ouverte à "Tous", aucun filtrage ici. ──
  const candidatsDeLaCategorie = candidats.filter(c => {
    if (!sessionCategorieRestreinte) return true;
    return normCat(c.categoriePermis) === normCat(session.categoriePermis);
  });

  // ── ne retenir, pour un candidat donné, que les examens de la MÊME
  // catégorie de permis que celle visée (categoriePermis). Sans ce filtre,
  // un candidat réinscrit dans une nouvelle catégorie (ex. B → A) hériterait
  // à tort des réussites/programmations de son ancienne catégorie et se
  // verrait bloqué ou faussement dispensé de Code/Créneau. Les examens sans
  // catégorie enregistrée (anciennes données) restent bloquants par défaut,
  // pour ne pas changer le comportement sur l'historique existant. ──
  const examensDuCandidatPourCategorie = (cid, categoriePermis) => {
    const catCible = normCat(categoriePermis);
    return examensList.filter(e => {
      if (String(e.candidatId) !== String(cid)) return false;
      const examCat = normCat(e.categoriePermis);
      return !examCat || !catCible || examCat === catCible;
    });
  };

  const getTypesDisponibles = (cid, categoriePermis) => {
    const examsPertinents = examensDuCandidatPourCategorie(cid, categoriePermis);
    const reussis    = examsPertinents.filter(e => e.status === "Passed").map(e => e.type);
    const programmes = examsPertinents.filter(e => e.status === "Scheduled").map(e => e.type);

    const aReussiCode    = reussis.includes("Code");
    const aReussiCreneau = reussis.includes("Créneau");

    let dispo = TOUS_TYPES.filter(t => !reussis.includes(t) && !programmes.includes(t));

    // ── Ordre obligatoire : Code → Créneau → Circulation ──
    // On ne peut pas passer Créneau sans avoir réussi Code,
    // ni Circulation sans avoir réussi Code ET Créneau.
    if (!aReussiCode) {
      dispo = dispo.filter(t => t === "Code");
    } else if (!aReussiCreneau) {
      dispo = dispo.filter(t => t !== "Circulation");
    }

    return dispo;
  };

  // Explique pourquoi un candidat n'a aucun type disponible
  const getRaisonIndisponible = (cid, categoriePermis) => {
    const examsPertinents = examensDuCandidatPourCategorie(cid, categoriePermis);
    const reussis    = examsPertinents.filter(e => e.status === "Passed").map(e => e.type);
    const programmes = examsPertinents.filter(e => e.status === "Scheduled").map(e => e.type);

    if (["Code", "Créneau", "Circulation"].every(t => reussis.includes(t))) {
      return "Les 3 examens sont déjà réussis 🎓";
    }
    if (programmes.length > 0 && TOUS_TYPES.every(t => reussis.includes(t) || programmes.includes(t))) {
      return "Déjà programmé pour tous les types restants";
    }
    return "Aucun type disponible pour le moment";
  };

  const candidatsFiltres = candidatsDeLaCategorie.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.prenom} ${c.nom}`.toLowerCase().includes(q);
  });

  const eligibles    = candidatsFiltres.filter(c => getTypesDisponibles(c.id, c.categoriePermis).length > 0);
  const nonEligibles = candidatsFiltres.filter(c => getTypesDisponibles(c.id, c.categoriePermis).length === 0);

  const toggleCandidat = (c) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[c.id]) delete next[c.id];
      else next[c.id] = getTypesDisponibles(c.id, c.categoriePermis)[0];
      return next;
    });
  };
  const changerType = (cid, type) => setSelectedMap(prev => ({ ...prev, [cid]: type }));
  const nbSelectionnes = Object.keys(selectedMap).length;

  const handleConfirm = async () => {
    if (nbSelectionnes === 0) { setError("Sélectionnez au moins un candidat."); return; }
    setSaving(true);
    setError("");
    const entries = Object.entries(selectedMap);
    setProgress({ done: 0, total: entries.length });

    for (const [cid, type] of entries) {
      const c = candidats.find(x => String(x.id) === String(cid));
      if (!c) continue;
      try {
        await onConfirm({
          candidatId: cid,
          candidat: `${c.prenom} ${c.nom}`,
          email: c.email,
          type, date: session.date, heure: session.heure, lieu: session.lieu,
          dateNaissance: c.dateNaissance,
          categoriePermis: c.categoriePermis,
          sessionId: session.id,
        });

        if (c.telephone) {
          const dateFormatee = new Date(session.date + "T12:00:00").toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          });
          const message =
            `Bonjour ${c.prenom}, votre examen de ${type} a été programmé ` +
            `le ${dateFormatee} à ${session.heure}, au lieu suivant : ${session.lieu}. ` +
            `Merci de vous présenter 15 minutes avant l'heure indiquée avec votre pièce d'identité.`;
          const url = formatWhatsAppUrl(c.telephone, message);
          if (url) window.electron?.openExternal?.(url);
        }
      } catch (e) {
        console.error("Erreur ajout candidat à la session", cid, e);
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setSaving(false);
    onClose();
  };

  const closeIfPossible = () => { if (!saving) onClose(); };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={closeIfPossible}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, padding: 24, width: 540, maxWidth: "92vw", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>Ajouter des candidats</h3>
          <button onClick={closeIfPossible} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}><FaTimes /></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12.5, color: "#166534", flexWrap: "wrap" }}>
          <FaCalendarDay style={{ fontSize: 12 }} />
          {session.date} à {session.heure} · {session.lieu}
          {/* ── AJOUT : badge catégorie visible dans la modale ── */}
          {sessionCategorieRestreinte && (
            <span style={{ marginLeft: "auto", background: "#ede9fe", color: "#6d28d9", padding: "2px 9px", borderRadius: 10, fontWeight: 700 }}>
              Cat. {session.categoriePermis} uniquement
            </span>
          )}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un candidat..."
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, outline: "none", marginBottom: 8 }}
        />

        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          {nbSelectionnes} candidat(s) sélectionné(s) — choisissez le type pour chacun
        </div>

        <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, minHeight: 220, maxHeight: 340 }}>
          {eligibles.length === 0 && nonEligibles.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              {sessionCategorieRestreinte
                ? `Aucun candidat trouvé pour la catégorie ${session.categoriePermis}.`
                : "Aucun candidat trouvé."}
            </div>
          )}

          {eligibles.map(c => {
            const dispo = getTypesDisponibles(c.id, c.categoriePermis);
            const checked = !!selectedMap[c.id];
            return (
              <div
                key={c.id}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid #f1f5f9", background: checked ? "#f0fdf4" : "#fff" }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCandidat(c)}
                  style={{ width: 15, height: 15, cursor: "pointer" }}
                />
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleCandidat(c)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{c.prenom} {c.nom}</div>
                  {c.categoriePermis && <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.categoriePermis}</div>}
                </div>
                <select
                  value={selectedMap[c.id] || dispo[0]}
                  onChange={e => changerType(c.id, e.target.value)}
                  disabled={!checked}
                  style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 12.5, color: "#1F2937", background: checked ? "#fff" : "#f1f5f9", outline: "none" }}
                >
                  {dispo.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            );
          })}

          {nonEligibles.length > 0 && (
            <>
              <div style={{ padding: "6px 14px", fontSize: 11, fontWeight: 700, color: "#94a3b8", background: "#f8fafc" }}>
                Aucun type disponible
              </div>
              {nonEligibles.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid #f1f5f9", opacity: 0.55 }}>
                  <input type="checkbox" disabled style={{ width: 15, height: 15 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{c.prenom} {c.nom}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{getRaisonIndisponible(c.id, c.categoriePermis)}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "9px 13px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={closeIfPossible} disabled={saving} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13.5 }}>
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || nbSelectionnes === 0}
            style={{ flex: 1.4, padding: "10px 0", borderRadius: 8, border: "none", background: (saving || nbSelectionnes === 0) ? "#94a3b8" : "#16a34a", color: "#fff", cursor: (saving || nbSelectionnes === 0) ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13.5 }}
          >
            {saving ? `Ajout... (${progress.done}/${progress.total})` : `Ajouter ${nbSelectionnes || ""} candidat(s)`}
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
// ExamenTableMoniteur — table partagée
// ─────────────────────────────────────────────
function ExamenTableMoniteur({
  rows,
  CAN_REMOVE_CANDIDAT,
  CAN_TOGGLE_STATUS,
  CAN_VIEW_ALL_CANDIDATES,
  mesCandidatIds,
  onRowClick,
  onResultClick,
  onOpenAbsence,
  onRemove,
  showEvaluer = false,
  showStatusBadge = true,
  showRemove = true,
}) {
  const th = { padding: "13px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
  const td = { padding: "11px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

  const hasActionsCol = showEvaluer || showRemove;
  const colSpan = 5 + (showStatusBadge ? 1 : 0) + (hasActionsCol ? 1 : 0);

  return (
    <div style={{ maxHeight: 420, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <tr style={{ background: "#2b537e" }}>
            <th style={th}>Candidat(e)</th>
            <th style={th}>Type</th>
            <th style={th}>Date examen</th>
            <th style={th}>Lieu</th>
            <th style={th}>Séances</th>
            {showStatusBadge && <th style={th}>Statut</th>}
            {hasActionsCol && <th style={th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {rows.length > 0 ? rows.map((examen, i) => {
              const st = STATUS_CONFIG[examen.status] || STATUS_CONFIG.Scheduled;
              const diff = getDiffDays(examen.date);
              const canDeclareAbsence =
                examen.status === "Scheduled" && diff !== null && diff > ABSENCE_CUTOFF_DAYS;
              const absenceTooLate =
                examen.status === "Scheduled" && diff !== null && diff <= ABSENCE_CUTOFF_DAYS && diff >= 0;

              const today = new Date(); today.setHours(0, 0, 0, 0);
              const examDate = new Date((examen.date || "") + "T00:00:00");
              const isPast = !isNaN(examDate) && examDate <= today;

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
                  {/* Candidat */}
                  <td style={{ ...td, fontWeight: 600 }}>
                    {examen.candidat}
                    {CAN_VIEW_ALL_CANDIDATES && (
                      mesCandidatIds.includes(String(examen.candidatId)) ? (
                        <span style={{ marginLeft: 8, fontSize: 10, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>Mon candidat</span>
                      ) : (
                        <span style={{ marginLeft: 8, fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>Autre moniteur</span>
                      )
                    )}
                    {examen.autoGenerated && <span style={{ marginLeft: 4, fontSize: 10, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>auto</span>}
                    {examen.suggested    && <span style={{ marginLeft: 4, fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 10, fontWeight: 500 }}>re-suggéré</span>}
                  </td>

                  {/* Type */}
                  <td style={td}>{examen.type}</td>

                  {/* Date + badge J-X */}
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FaCalendarDay style={{ color: isPast ? "#f97316" : "#4E96E1", fontSize: 12 }} />
                      <div>
                        {examen.date}
                        <span style={{ color: "#64748b", fontSize: 12, marginLeft: 4 }}>{examen.heure}</span>
                        {!showEvaluer && isPast && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: "#fff7ed", color: "#c2410c", padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>passé</span>
                        )}
                        {showEvaluer && examen.status === "Scheduled" && diff !== null && diff >= 0 && (
                          <CountdownBadge dateStr={examen.date} />
                        )}
                      </div>
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

                  {/* Statut (historique) */}
                  {showStatusBadge && (
                    <td style={td}>
                      <div
                        style={{ background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: CAN_TOGGLE_STATUS ? "pointer" : "default", whiteSpace: "nowrap" }}
                        onClick={e => { e.stopPropagation(); onResultClick(examen.id, e); }}
                      >
                        {CAN_TOGGLE_STATUS && <FaExchangeAlt style={{ marginRight: 8, fontSize: 10 }} />}
                        {examen.status === "Absent" && !CAN_TOGGLE_STATUS && <FaUserSlash style={{ marginRight: 8, fontSize: 10 }} />}
                        {st.label}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  {hasActionsCol && (
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>

                        {showEvaluer && CAN_TOGGLE_STATUS && (
                          <button
                            onClick={e => { e.stopPropagation(); onResultClick(examen.id, e); }}
                            title={isPast ? "Saisir le résultat" : "L'examen n'est pas encore passé"}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              background: isPast ? "#dbeafe" : "#f1f5f9",
                              color: isPast ? "#1d4ed8" : "#94a3b8",
                              border: `1px solid ${isPast ? "#93c5fd" : "#e2e8f0"}`,
                              padding: "6px 11px", borderRadius: 6,
                              cursor: isPast ? "pointer" : "not-allowed",
                              fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                            }}
                          >
                            <FaExchangeAlt style={{ fontSize: 11 }} />
                            Évaluer
                          </button>
                        )}

                        {showEvaluer && CAN_TOGGLE_STATUS && canDeclareAbsence && (
                          <button
                            onClick={e => { e.stopPropagation(); onOpenAbsence(examen.id, e); }}
                            title={`Déclarer une absence anticipée — J-${diff} jours`}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              background: "#fff7ed", color: "#ea580c",
                              border: "1px solid #fed7aa",
                              padding: "6px 11px", borderRadius: 6,
                              cursor: "pointer", fontSize: 12, fontWeight: 600,
                              transition: "all 0.15s", whiteSpace: "nowrap",
                            }}
                          >
                            <FaUserSlash style={{ fontSize: 11 }} /> Absent
                          </button>
                        )}

                        {showEvaluer && CAN_TOGGLE_STATUS && absenceTooLate && (
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

                        {showRemove && CAN_REMOVE_CANDIDAT && (
                          <button
                            onClick={e => { e.stopPropagation(); onRemove(examen.id, e); }}
                            title="Retirer (sera re-suggéré à la prochaine date)"
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
                <td colSpan={colSpan} style={{ textAlign: "center", padding: 40, color: "#A0AEC0" }}>
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
// FiltresBar — barre de filtres repliable, réutilisée par les onglets
// "Programmés" et "Historique"
// ─────────────────────────────────────────────
function FiltresBar({
  typeFilter, setTypeFilter,
  categorieFilter, setCategorieFilter, categoriesDisponibles,
  dateDebut, setDateDebut, dateFin, setDateFin,
  hasDateFilter, hasCategorieFilter, hasAnyFilter,
  resetDateFilter, resultCount,
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 12,
      background: "#f8fafc", border: "1px solid #e2e8f0",
      borderRadius: 12, padding: "14px 16px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Type d'examen</label>
        <SelectFilter
          value={typeFilter} onChange={setTypeFilter}
          options={["Tous", "Code", "Créneau", "Circulation"]}
          label="Type d'examen"
        />
      </div>

      <div style={{ width: 1, height: 36, background: "#e2e8f0", alignSelf: "center" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Catégorie de permis</label>
        <SelectFilter
          value={categorieFilter} onChange={setCategorieFilter}
          options={["Tous", ...categoriesDisponibles]}
          label="Catégorie de permis"
        />
      </div>

      <div style={{ width: 1, height: 36, background: "#e2e8f0", alignSelf: "center" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Du</label>
        <input
          type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} max={dateFin || undefined}
          style={{ padding: "8px 12px", borderRadius: 8, border: dateDebut ? "1.5px solid #2b537e" : "1px solid #d1d5db", fontSize: 13, color: "#1f2937", background: "#fff", outline: "none", cursor: "pointer" }}
        />
      </div>

      <div style={{ color: "#94a3b8", fontSize: 16, paddingBottom: 4 }}>→</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>Au</label>
        <input
          type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} min={dateDebut || undefined}
          style={{ padding: "8px 12px", borderRadius: 8, border: dateFin ? "1.5px solid #2b537e" : "1px solid #d1d5db", fontSize: 13, color: "#1f2937", background: "#fff", outline: "none", cursor: "pointer" }}
        />
      </div>

      {hasDateFilter && (
        <button
          onClick={resetDateFilter}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: 12.5, fontWeight: 600, alignSelf: "flex-end" }}
        >
          <FaTimes style={{ fontSize: 11 }} /> Effacer dates
        </button>
      )}

      {hasCategorieFilter && (
        <button
          onClick={() => setCategorieFilter("Tous")}
          title="Effacer le filtre de catégorie"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: 12.5, fontWeight: 600, alignSelf: "flex-end" }}
        >
          <FaTimes style={{ fontSize: 11 }} /> Effacer catégorie
        </button>
      )}

      {hasAnyFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#1d4ed8", fontWeight: 600, alignSelf: "flex-end", flexWrap: "wrap" }}>
          <FaFilter style={{ fontSize: 10 }} />
          {hasDateFilter && (
            dateDebut && dateFin ? `${dateDebut} → ${dateFin}` : dateDebut ? `À partir du ${dateDebut}` : `Jusqu'au ${dateFin}`
          )}
          {hasDateFilter && hasCategorieFilter && <span style={{ opacity: 0.5 }}>·</span>}
          {hasCategorieFilter && <>Catégorie : <strong>{categorieFilter}</strong></>}
          <span style={{ background: "#dbeafe", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
            {resultCount} résultat{resultCount > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant principal - Version Moniteur
// ─────────────────────────────────────────────
const ExamensMoniteur = () => {
const {
    examensList, generateExamens, setExamenResult,
    retirerCandidat, candidatsReportes, EXAM_THRESHOLDS,
    ajouterExamenManuel,
    propositions, validerProposition, rejeterProposition,
    validerToutesPropositions, rejeterToutesPropositions,
    sessionsExamens, creerSessionExamen, supprimerSessionExamen,
  } = useExamenCtx();
  const { examRules, saveExamRules } = useExamenRulesCtx();
  const { currentUser }  = useAuth();
  const { CAN_VIEW_ALL_CANDIDATES, CAN_REMOVE_CANDIDAT, CAN_TOGGLE_STATUS, CAN_EXPORT_LISTE_CANDIDATS } = useMyPermissions();

  // Seuls les moniteurs avec CAN_TOGGLE_STATUS gèrent les résultats / propositions / sessions
  const canManageExamens = CAN_TOGGLE_STATUS;

  // ── state ──
  const [selectedExamen,      setSelectedExamen]      = useState(null);
  const [typeFilter,          setTypeFilter]          = useState("Tous");
  const [categorieFilter,     setCategorieFilter]     = useState("Tous");
  const [dateDebut,           setDateDebut]           = useState("");
  const [dateFin,             setDateFin]             = useState("");
  const [loading,             setLoading]             = useState(false);
  const [lastGenerated,       setLastGenerated]       = useState(null);
  const [searchReportes,      setSearchReportes]      = useState("");
  const [candidatsMap,        setCandidatsMap]        = useState({});
  const [mesCandidatIds,      setMesCandidatIds]      = useState([]);
  const [alertInfo,           setAlertInfo]           = useState(null);
  const [absenceModalExamen,  setAbsenceModalExamen]  = useState(null);
  const [resultModalExamen,   setResultModalExamen]   = useState(null);
  const [permisObtenuInfo,    setPermisObtenuInfo]    = useState(null);
  const [activeHistoryTab,    setActiveHistoryTab]    = useState("Passed");

  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfLoading,      setPdfLoading]      = useState(false);

  // ── sessions d'examen (visibles seulement avec la permission) ──
  const [showCreerSessionModal, setShowCreerSessionModal] = useState(false);
  const [sessionPourAjout,      setSessionPourAjout]      = useState(null);

  const [candidatsFullList,  setCandidatsFullList]  = useState([]);
  const [exportForm, setExportForm] = useState({
    nomEcole: "", wilaya: "", centreExamen: "", morkaba: "", dateDepot: "", dateExamen: "",
  });

  // ── AJOUT : navigation par onglets pour désencombrer la page.
  // "sessions"  → jours d'examen créés + propositions à valider (permission requise)
  // "planifies" → examens programmés
  // "historique"→ historique des résultats
  // "reportes"  → candidats reportés
  const [activeTab,   setActiveTab]   = useState(canManageExamens ? "sessions" : "planifies");
  // ── AJOUT : règles, légende et filtres repliés par défaut ──
  const [showRules,   setShowRules]   = useState(false);
  const [showLegend,  setShowLegend]  = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("export_pdf_defaults") || "{}");
      setExportForm(f => ({ ...f, ...saved }));
    } catch { /* rien */ }
  }, []);

  // ── chargement ──
  // userTriggered = true quand le moniteur clique lui-même sur "Regénérer"
  const handleGenerate = async (userTriggered = false) => {
    setLoading(true);
    try {
      const [seances, candidats] = await Promise.all([
        window.electron.getSeances(),
        window.electron.getCandidats(),
      ]);

 // ── Exclure les candidats externes (déjà titulaires du permis, séances supp uniquement) ──
      const candidatsInternes = candidats.filter(c => Number(c.externe) !== 1);

      const map = {};
      candidatsInternes.forEach(c => {
        map[String(c.idCandidat)] = {
          nom: c.nom ?? "", prenom: c.prenom ?? "",
          nom_ar: c.nom_ar ?? "", prenom_ar: c.prenom_ar ?? "",
          dateNaissance: c.date_naissance ?? "",
          categoriePermis: c.categoriePermis ?? "",
        };
      });
      setCandidatsMap(map);

      setCandidatsFullList(candidatsInternes.map(c => ({
        id: c.idCandidat,
        nom: c.nom ?? "",
        prenom: c.prenom ?? "",
        email: c.email ?? "",
        telephone: c.telephone ?? "",
        categoriePermis: c.categoriePermis ?? "",
        dateNaissance: c.date_naissance ?? "",
      })));

      if (currentUser?.id) {
        const mesSeances = seances.filter(
          s => String(s.moniteur_id ?? s.moniteurId) === String(currentUser.id)
        );
        const ids = new Set();
        mesSeances.forEach(s => {
          const rawIds = s.candidatsIds ?? s.candidats_ids ?? s.candidatId ?? s.candidat_id ?? null;
          if (rawIds == null) return;
          const str = String(rawIds).trim();
          let parsed = [];
          if (str.startsWith("[")) {
            try { parsed = JSON.parse(str).map(x => String(x).trim()).filter(Boolean); }
            catch { parsed = str.replace(/[\[\]]/g, "").split(",").map(x => x.trim()).filter(Boolean); }
          } else {
            parsed = str.split(",").map(x => x.trim()).filter(Boolean);
          }
          parsed.forEach(id => ids.add(id));
        });
        setMesCandidatIds([...ids]);
      }

      const nouvellesPropositions = await generateExamens(seances, candidatsInternes);
      setLastGenerated(new Date().toLocaleString("fr-FR"));

      if (userTriggered && nouvellesPropositions && nouvellesPropositions.length > 0) {
        setActiveTab("sessions");
        setTimeout(() => {
          document.getElementById("propositions-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (e) {
      console.error("Erreur chargement examens moniteur:", e);
    }
    setLoading(false);
  };

  useEffect(() => { handleGenerate(false); }, [currentUser?.id, CAN_VIEW_ALL_CANDIDATES]);

  // ── filteredBase avec useMemo ──
  const filteredBase = useMemo(() =>
    examensList.filter(e =>
      CAN_VIEW_ALL_CANDIDATES ? true : mesCandidatIds.includes(String(e.candidatId))
    ),
    [examensList, mesCandidatIds, CAN_VIEW_ALL_CANDIDATES]
  );

  // ── filtres : type + catégorie de permis + plage de dates ──
  const byType = (list) => typeFilter === "Tous" ? list : list.filter(e => e.type === typeFilter);

  // ── Catégories de permis disponibles, déduites des examens existants ──
  const categoriesDisponibles = Array.from(
    new Set(examensList.map(e => (e.categoriePermis || "").trim()).filter(Boolean))
  ).sort();

  // ── AJOUT : catégories de permis déduites des candidats eux-mêmes (utile
  // dès la création d'une session, avant même qu'un examen existe pour
  // cette catégorie) — sert d'options pour CreerSessionModal. ──
  const categoriesCandidats = Array.from(
    new Set(candidatsFullList.map(c => (c.categoriePermis || "").trim()).filter(Boolean))
  ).sort();

  const byCategorie = (list) =>
    categorieFilter === "Tous" ? list : list.filter(e => (e.categoriePermis || "").trim() === categorieFilter);

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

  const hasDateFilter      = !!(dateDebut || dateFin);
  const hasCategorieFilter = categorieFilter !== "Tous";
  const hasAnyFilter       = hasDateFilter || hasCategorieFilter;
  const resetDateFilter    = () => { setDateDebut(""); setDateFin(""); };
  const resetAllFilters    = () => { setTypeFilter("Tous"); setCategorieFilter("Tous"); resetDateFilter(); };

  const applyFilters = (list) => filterByDate(byType(byCategorie(list)));

  // ── Jours d'examen autorisés (éditable directement sur cette page) ──
  const toggleJourAutorise = (day) => {
    if (!canManageExamens) return;
    const current = examRules.joursAutorises || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    saveExamRules({ ...examRules, joursAutorises: updated });
  };

  // ── segmentation ──
  const scheduled    = applyFilters(filteredBase.filter(e => e.status === "Scheduled"));
  const history      = applyFilters(filteredBase.filter(e => ["Passed", "Failed", "Absent", "Reported"].includes(e.status)));
  const historyByTab = history.filter(e => e.status === activeHistoryTab);
  const allFiltered  = applyFilters(filteredBase);

  // ── stats ──
  const statsData = [
    { label: CAN_VIEW_ALL_CANDIDATES ? "Total session" : "Mes candidats", val: allFiltered.length,                                            color: "blue",   icon: <FaUser />,        trend: "Session"        },
    { label: "Réussites",  val: allFiltered.filter(e => e.status === "Passed").length,  color: "green",  icon: <FaCheckCircle />, trend: "Validés"        },
    { label: "Échecs",     val: allFiltered.filter(e => e.status === "Failed").length,  color: "red",    icon: <FaTimesCircle />, trend: "À reprogrammer" },
    { label: "En attente", val: scheduled.length,                                        color: "orange", icon: <FaClock />,       trend: "À évaluer"      },
    { label: "Absents",    val: allFiltered.filter(e => e.status === "Absent").length,  color: "orange", icon: <FaUserSlash />,   trend: "Re-planifiés"   },
  ];

  // ── actions ──
  const handleOpenResultModal = (id, e) => {
    e.stopPropagation();
    if (!CAN_TOGGLE_STATUS) return;
    const examen = examensList.find((x) => x.id === id);
    if (!examen) return;
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const examDate = new Date((examen.date || "") + "T00:00:00");
    if (!isNaN(examDate) && examDate > today) {
      setAlertInfo({
        icon: "📅", title: "Examen pas encore passé", color: "#f97316",
        message: `Cet examen est programmé pour le ${examen.date}. Vous ne pouvez modifier le résultat qu'à partir de cette date.`,
      });
      return;
    }
    setResultModalExamen(examen);
  };

  const handleOpenAbsenceModal = (id, e) => {
    e.stopPropagation();
    if (!CAN_TOGGLE_STATUS) return;
    const examen = examensList.find((x) => x.id === id);
    if (!examen || examen.status !== "Scheduled") return;
    setAbsenceModalExamen(examen);
  };

  const handleConfirmAbsence = (id) => {
    setExamenResult(id, "Absent");
    retirerCandidat(id, "absence");
    setAbsenceModalExamen(null);
    setActiveHistoryTab("Absent");
  };

  const handleRemove = (id, e) => {
    e.stopPropagation();
    if (!CAN_REMOVE_CANDIDAT) return;
    if (window.confirm("Retirer ce candidat ? Il sera re-suggéré automatiquement à la prochaine date d'examen selon les règles configurées.")) {
      retirerCandidat(id);
    }
  };

  const reportesEntries = Object.entries(candidatsReportes).filter(([cid]) =>
    CAN_VIEW_ALL_CANDIDATES ? true : mesCandidatIds.includes(String(cid))
  );

  const getCandidatName = (id) => {
    const c = candidatsMap[String(id)];
    if (!c) return `Candidat #${id}`;
    const full = [c.prenom, c.nom].filter(Boolean).join(" ");
    return full || `Candidat #${id}`;
  };

  // ── propositions visibles uniquement pour ceux qui ont la permission ──
  const propositionsVisibles = canManageExamens
    ? propositions.filter(p =>
        CAN_VIEW_ALL_CANDIDATES ? true : mesCandidatIds.includes(String(p.candidatId))
      )
    : [];

  // ── export PDF ──
  const openExportModal = () => {
    if (!CAN_EXPORT_LISTE_CANDIDATS) return;
    if (allFiltered.length === 0) { alert("Aucun candidat dans votre liste actuelle."); return; }
    setExportForm(f => ({ ...f, dateExamen: formatDateAr(allFiltered[0]?.date) || f.dateExamen || "" }));
    setShowExportModal(true);
  };

  const handleExportFormChange = (field, value) => setExportForm(f => ({ ...f, [field]: value }));

  const handleConfirmExport = async () => {
    if (!exportForm.wilaya.trim() || !exportForm.centreExamen.trim()) {
      alert("Merci de renseigner au moins la wilaya et le centre d'examen.");
      return;
    }
    setPdfLoading(true);
    try {
      const candidatsPourPDF = allFiltered.map((examen, i) => {
        const info = candidatsMap[String(examen.candidatId)] || {};
        return {
          rang: i + 1, numDossier: examen.candidatId, nomPrenom: examen.candidat,
          nomPrenomAr: [info.nom_ar, info.prenom_ar].filter(Boolean).join(" "),
          dateNaissance: formatDateAr(examen.dateNaissance),
          categorie: examen.categoriePermis || "", typeExamen: examen.type || "",
          dateDepot: formatDateAr(exportForm.dateDepot),
          dateExamenRapport: formatDateAr(examen.date), observations: "",
        };
      });
      const savedPath = await window.electron.generateListeCandidatsPDF({
        nomEcole: exportForm.nomEcole, wilaya: exportForm.wilaya,
        centreExamen: exportForm.centreExamen, morkaba: exportForm.morkaba,
        dateDepot: formatDateAr(exportForm.dateDepot), dateExamen: exportForm.dateExamen,
        candidats: candidatsPourPDF,
      });
      localStorage.setItem("export_pdf_defaults", JSON.stringify({
        nomEcole: exportForm.nomEcole, wilaya: exportForm.wilaya, morkaba: exportForm.morkaba,
      }));
      if (savedPath) { alert(`Document enregistré :\n${savedPath}`); setShowExportModal(false); }
    } catch (e) { console.error("Erreur PDF:", e); alert("Erreur lors de la génération."); }
    setPdfLoading(false);
  };

  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "13px" };
  const td = { padding: "12px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "13px", color: "#1F2937" };

  const tableSharedProps = {
    CAN_REMOVE_CANDIDAT,
    CAN_TOGGLE_STATUS,
    CAN_VIEW_ALL_CANDIDATES,
    mesCandidatIds,
    onRowClick: setSelectedExamen,
    onResultClick: handleOpenResultModal,
    onOpenAbsence: handleOpenAbsenceModal,
    onRemove: handleRemove,
  };

  // ── AJOUT : onglets principaux, avec leurs compteurs. L'onglet
  // "Sessions & propositions" n'existe que pour ceux qui gèrent les examens. ──
  const TABS = [
    ...(canManageExamens
      ? [{ key: "sessions", label: "Sessions & propositions", icon: <FaCalendarPlus />, count: propositionsVisibles.length, countColor: "#ea580c" }]
      : []),
    { key: "planifies",  label: "Programmés",  icon: <FaClock />,   count: scheduled.length,        countColor: "#1565c0" },
    { key: "historique", label: "Historique",  icon: <FaHistory />, count: history.length,          countColor: "#6b21a8" },
    { key: "reportes",   label: "Reportés",    icon: <FaSync />,    count: reportesEntries.length,   countColor: "#a16207" },
  ];

  const filteredReportesEntries = (() => {
    const q = searchReportes.trim().toLowerCase();
    if (!q) return reportesEntries;
    return reportesEntries.filter(([cid, info]) => {
      const nom = getCandidatName(cid).toLowerCase();
      return (
        nom.includes(q) ||
        String(cid).includes(q) ||
        (info.type || "").toLowerCase().includes(q) ||
        (info.reason || "").toLowerCase().includes(q)
      );
    });
  })();

  const filtresApplicables = activeTab === "planifies" || activeTab === "historique";

  // ─────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────
  return (
    <div className="main">
      <div className="header">
        <img src={ConnexionImg} alt="illustration" className="header-img" />
        <h1><img src={SmallCar} alt="" width={40} /> Espace Moniteur</h1>
        <p>{CAN_VIEW_ALL_CANDIDATES ? "Suivi et gestion de tous les candidats aux examens" : "Suivi et gestion de mes candidats aux examens"}</p>
      </div>

      <div className="examens-content">

        {/* Badge mode accès */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: CAN_VIEW_ALL_CANDIDATES ? "rgba(22,101,52,0.08)" : "rgba(148,163,184,0.12)",
          border: `1px solid ${CAN_VIEW_ALL_CANDIDATES ? "rgba(22,101,52,0.25)" : "#e2e8f0"}`,
          borderRadius: 10, padding: "6px 14px", fontSize: "0.75rem",
          color: CAN_VIEW_ALL_CANDIDATES ? "#166534" : "#64748b",
          fontWeight: 600, marginBottom: 14,
        }}>
          {CAN_VIEW_ALL_CANDIDATES ? "👥 Accès complet — vous voyez tous les candidats aux examens" : "🔒 Vue restreinte — vos candidats uniquement"}
        </div>

        {/* ── Header + boutons ── */}
        <div className="examens-page-header">
          <div>
            <h2 className="examens-page-title">{CAN_VIEW_ALL_CANDIDATES ? "Sessions d'examens" : "Mes Sessions d'examens"}</h2>
            <p className="examens-page-sub">
              {lastGenerated && <span style={{ color: "#94a3b8", fontSize: 12 }}>Actualisé le : {lastGenerated}</span>}
            </p>
          </div>
         <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={openExportModal}
              disabled={!CAN_EXPORT_LISTE_CANDIDATS}
              title={CAN_EXPORT_LISTE_CANDIDATS ? "" : "Permission requise — contactez l'admin"}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: CAN_EXPORT_LISTE_CANDIDATS ? "#2b537e" : "#cbd5e1",
                color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10,
                cursor: CAN_EXPORT_LISTE_CANDIDATS ? "pointer" : "not-allowed",
                fontSize: 14, fontWeight: 600, opacity: CAN_EXPORT_LISTE_CANDIDATS ? 1 : 0.7,
              }}
            >
              {CAN_EXPORT_LISTE_CANDIDATS ? <FaFilePdf /> : <FaLock size={12} />} قائمة المترشحين
            </button>

            {/* Créer un jour d'examen — seulement avec la permission */}
            {canManageExamens && (
              <button
                onClick={() => setShowCreerSessionModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#16a34a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                <FaCalendarPlus /> Ajouter un examen
              </button>
            )}

            {/* Regénérer — seulement avec la permission de gérer les examens */}
            {canManageExamens && (
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#4E96E1", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}
              >
                <FaSync style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                {loading ? "Génération..." : "Regénérer"}
              </button>
            )}
          </div>
        </div>

        {/* ── Règles actives — repliées par défaut ── */}
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowRules(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#3b5bdb", fontSize: 12.5, fontWeight: 600, padding: "4px 0" }}
          >
            <FaInfoCircle />
            Seuils : Code ≥{EXAM_THRESHOLDS.Code} · Créneau ≥{EXAM_THRESHOLDS.Créneau} · Circulation ≥{EXAM_THRESHOLDS.Circulation}
            {showRules ? <FaChevronUp style={{ fontSize: 10 }} /> : <FaChevronDown style={{ fontSize: 10 }} />}
          </button>

          {showRules && (
            <div style={{ background: "#f0f4ff", border: "1px solid #c7d7f5", borderRadius: 10, padding: "10px 16px", marginTop: 8, fontSize: 13, color: "#3b5bdb", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span>
                Délai après échec : <strong>{examRules.delaiApresEchec}j</strong> ·
                Tentatives max : <strong>{examRules.tentativesMax}</strong>
              </span>

              <span style={{ width: 1, height: 16, background: "#c7d7f5" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>Jours autorisés :</span>
                {DAYS_OPTIONS.map(day => {
                  const isSel = (examRules.joursAutorises || []).includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleJourAutorise(day)}
                      disabled={!canManageExamens}
                      title={canManageExamens ? (isSel ? `Retirer ${day}` : `Ajouter ${day}`) : "Permission requise"}
                      style={{
                        padding: "3px 10px", borderRadius: 14, fontSize: 11.5, fontWeight: 600,
                        cursor: canManageExamens ? "pointer" : "not-allowed", transition: "all 0.15s",
                        border: `1px solid ${isSel ? "#3b5bdb" : "#c7d7f5"}`,
                        background: isSel ? "#3b5bdb" : "#fff",
                        color: isSel ? "#fff" : "#3b5bdb",
                        opacity: canManageExamens ? 1 : 0.6,
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Légende badge J-X — repliée par défaut ── */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowLegend(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 12.5, fontWeight: 600, padding: "4px 0" }}
          >
            <FaUserSlash style={{ color: "#ea580c" }} />
            Légende des badges d'absence anticipée
            {showLegend ? <FaChevronUp style={{ fontSize: 10 }} /> : <FaChevronDown style={{ fontSize: 10 }} />}
          </button>

          {showLegend && (
            <div style={{ background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 16px", marginTop: 8, fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <span>Badge <strong style={{ color: "#166534" }}>J-X vert</strong> = déclaration possible</span>
              <span>Badge <strong style={{ color: "#c2410c" }}>J-X orange</strong> = urgent (≤ 3 jours)</span>
              <span>Badge <strong style={{ color: "#b91c1c" }}>Demain 🔒</strong> = délai dépassé</span>
            </div>
          )}
        </div>

        {/* ── Stats — version compacte ── */}
        <div
          className="stats-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}
        >
          {statsData.map((item, i) => (
            <motion.div
              key={i}
              className="stat-card-modern"
              whileHover={{ y: -3 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 10, minHeight: 0,
              }}
            >
              <div className="stat-left" style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.15 }}>
                <span className="stat-label" style={{ fontSize: 10.5 }}>{item.label}</span>
                <span className="stat-value" style={{ fontSize: 18 }}>{item.val}</span>
                <span className={`stat-trend ${item.color}`} style={{ fontSize: 9.5 }}>{item.trend}</span>
              </div>
              <div
                className={`stat-icon ${item.color}`}
                style={{ width: 28, height: 28, minWidth: 28, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}
              >
                {item.icon}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            NAVIGATION PAR ONGLETS
        ══════════════════════════════════════════════ */}
        <div style={{ display: "flex", gap: 8, marginTop: 24, marginBottom: 4, flexWrap: "wrap", borderBottom: "2px solid #e2e8f0" }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "11px 18px", borderRadius: "10px 10px 0 0",
                  border: "none",
                  borderBottom: isActive ? "3px solid #2b537e" : "3px solid transparent",
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? "#1e293b" : "#64748b",
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 14, cursor: "pointer",
                  boxShadow: isActive ? "0 -4px 10px rgba(0,0,0,0.03)" : "none",
                  position: "relative", bottom: -2,
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    background: isActive ? tab.countColor : "#e2e8f0",
                    color: isActive ? "#fff" : "#64748b",
                    borderRadius: 20, minWidth: 20, height: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, padding: "0 6px",
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 14px 14px", padding: 20, boxShadow: "0 5px 15px rgba(0,0,0,0.03)" }}>

          {/* ── Barre de filtres — visible seulement pour Programmés / Historique ── */}
          {filtresApplicables && (
            <div>
              <button
                onClick={() => setShowFilters(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: hasAnyFilter ? "#eff6ff" : "#f1f5f9", border: `1px solid ${hasAnyFilter ? "#bfdbfe" : "#e2e8f0"}`, color: hasAnyFilter ? "#1d4ed8" : "#475569", cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, marginBottom: 12 }}
              >
                <FaFilter style={{ fontSize: 11 }} />
                Filtres {hasAnyFilter && `(${[hasDateFilter, hasCategorieFilter].filter(Boolean).length} actif${[hasDateFilter, hasCategorieFilter].filter(Boolean).length > 1 ? "s" : ""})`}
                {showFilters ? <FaChevronUp style={{ fontSize: 10 }} /> : <FaChevronDown style={{ fontSize: 10 }} />}
                {hasAnyFilter && !showFilters && (
                  <span
                    onClick={e => { e.stopPropagation(); resetAllFilters(); }}
                    title="Tout effacer"
                    style={{ marginLeft: 4, color: "#b91c1c", fontWeight: 700 }}
                  >
                    ✕
                  </span>
                )}
              </button>

              {showFilters && (
                <FiltresBar
                  typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                  categorieFilter={categorieFilter} setCategorieFilter={setCategorieFilter}
                  categoriesDisponibles={categoriesDisponibles}
                  dateDebut={dateDebut} setDateDebut={setDateDebut}
                  dateFin={dateFin} setDateFin={setDateFin}
                  hasDateFilter={hasDateFilter} hasCategorieFilter={hasCategorieFilter}
                  hasAnyFilter={hasAnyFilter}
                  resetDateFilter={resetDateFilter}
                  resultCount={allFiltered.length}
                />
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              ONGLET — Sessions & propositions (permission requise)
          ══════════════════════════════════════════════ */}
          {activeTab === "sessions" && canManageExamens && (
            <div>
              {sessionsExamens.length === 0 && propositionsVisibles.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13.5 }}>
                  Aucun jour d'examen créé et aucune proposition en attente. Cliquez sur « Ajouter un examen » pour créer une session.
                </div>
              ) : (
                <>
                  <SessionsExamenList
                    sessions={sessionsExamens}
                    examensList={examensList}
                    onAjouterCandidats={(s) => {
                      const d = parseExamDate(s.date);
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      if (d && d < today) return; // session déjà passée — ne rien ouvrir
                      setSessionPourAjout(s);
                    }}
                    onSupprimer={supprimerSessionExamen}
                    canManage={canManageExamens}
                  />

                  <div id="propositions-section">
                    <PropositionsSection
                      propositions={propositionsVisibles}
                      canReview={canManageExamens}
                      onValider={validerProposition}
                      onRejeter={rejeterProposition}
                      onValiderTout={validerToutesPropositions}
                      onRejeterTout={rejeterToutesPropositions}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              ONGLET — Programmés
          ══════════════════════════════════════════════ */}
          {activeTab === "planifies" && (
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{scheduled.length} candidat(s) en attente d'évaluation</p>
              <div style={{ borderRadius: 15, overflow: "hidden", border: "1px solid #f1f5f9" }}>
                <ExamenTableMoniteur {...tableSharedProps} rows={scheduled} showEvaluer={true} showStatusBadge={false} showRemove={true} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              ONGLET — Historique
          ══════════════════════════════════════════════ */}
          {activeTab === "historique" && (
            <div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{history.length} examen(s) évalué(s)</p>

              <div style={{ display: "flex", gap: 8, marginBottom: 0, flexWrap: "wrap" }}>
                {HISTORY_TABS.map(tab => {
                  const count = applyFilters(filteredBase.filter(e => e.status === tab.key)).length;
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
                        fontSize: 13.5, cursor: "pointer", transition: "all 0.15s",
                        position: "relative", bottom: isActive ? -2 : 0,
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span style={{ background: isActive ? tab.bg : "#f1f5f9", color: isActive ? tab.color : "#94a3b8", padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ borderRadius: "0 12px 12px 12px", overflow: "hidden", border: "2px solid #e2e8f0", borderTop: "none" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeHistoryTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                    <ExamenTableMoniteur {...tableSharedProps} rows={historyByTab} showEvaluer={false} showStatusBadge={true} showRemove={false} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              ONGLET — Candidats reportés
          ══════════════════════════════════════════════ */}
          {activeTab === "reportes" && (
            reportesEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13.5 }}>
                Aucun candidat reporté pour le moment.
              </div>
            ) : (
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
                      style={{
                        paddingLeft: 32, paddingRight: searchReportes ? 30 : 12,
                        paddingTop: 7, paddingBottom: 7,
                        borderRadius: 8, border: "1px solid #fde68a",
                        background: "#fff", fontSize: 13, color: "#1f2937",
                        outline: "none", width: "100%", boxSizing: "border-box",
                      }}
                    />
                    {searchReportes && (
                      <button
                        onClick={() => setSearchReportes("")}
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#a16207", fontSize: 14, padding: 0, lineHeight: 1 }}
                      >✕</button>
                    )}
                  </div>
                </div>

                {searchReportes.trim() && (
                  <p style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                    {filteredReportesEntries.length} résultat(s) pour <strong>« {searchReportes} »</strong>
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
                    {filteredReportesEntries.length > 0 ? filteredReportesEntries.map(([cid, info]) => {
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
                              {info.reason === "echec" ? "Échec" : info.reason === "absence" ? "Absence déclarée" : "Retiré"}
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
            )
          )}

        </div>
      </div>

      {/* ── Modales ── */}
      <ExamenModal examen={selectedExamen} onClose={() => setSelectedExamen(null)} />

      {alertInfo && (
        <AlertModal icon={alertInfo.icon} title={alertInfo.title} message={alertInfo.message} color={alertInfo.color} onClose={() => setAlertInfo(null)} />
      )}

      <AbsenceModal examen={absenceModalExamen} onClose={() => setAbsenceModalExamen(null)} onConfirm={handleConfirmAbsence} />

      <ResultModal
        examen={resultModalExamen}
        onClose={() => setResultModalExamen(null)}
        onConfirm={(id, status) => {
          setExamenResult(id, status);
          if (status === "Passed") {
            const examen = examensList.find((e) => e.id === id);
            if (examen) {
              const cid = examen.candidatId;
              // ── AJOUT : on ne considère "réussi" que les examens de la MÊME
              // catégorie de permis que celui qu'on vient de valider (catCible).
              // Sans ce filtre, un candidat réinscrit dans une nouvelle
              // catégorie serait déclaré "permis obtenu" dès que 3 types
              // d'examens sont validés au total, même répartis sur d'anciennes
              // catégories différentes. Les examens sans catégorie enregistrée
              // (anciennes données) restent acceptés par défaut. ──
              const catCible = normCat(examen.categoriePermis);
              const passe = (type) =>
                type === examen.type ||
                examensList.some((e) => {
                  if (e.candidatId !== cid || e.type !== type || e.status !== "Passed") return false;
                  const examCat = normCat(e.categoriePermis);
                  return !examCat || !catCible || examCat === catCible;
                });
              if (passe("Code") && passe("Créneau") && passe("Circulation")) {
                window.electron.updateStatutCandidat({ candidatId: cid, statut: "obtenu" })
                  .then((res) => {
                    if (!res?.success) console.error("Échec update-statut-candidat:", res);
                  })
                  .catch((err) => console.error("Erreur updateStatutCandidat:", err));

                setPermisObtenuInfo({ candidat: examen.candidat });
              }
            }
          }
          if (["Passed", "Failed", "Absent"].includes(status)) {
            setActiveHistoryTab(status);
          }
          setResultModalExamen(null);
        }}
      />

   {permisObtenuInfo && (
        <PermisObtenuModal candidatName={permisObtenuInfo.candidat} onClose={() => setPermisObtenuInfo(null)} />
      )}

      {/* ── Créer une session (date/heure/lieu/catégorie) — seulement avec la permission ── */}
      {canManageExamens && showCreerSessionModal && (
        <CreerSessionModal
          onClose={() => setShowCreerSessionModal(false)}
          onConfirm={creerSessionExamen}
          categoriesOptions={categoriesCandidats}
        />
      )}

      {/* ── Ajouter des candidats à une session existante — seulement avec la permission ── */}
      {canManageExamens && sessionPourAjout && (
        <AjouterCandidatsModal
          session={sessionPourAjout}
          candidats={candidatsFullList}
          examensList={examensList}
          onClose={() => setSessionPourAjout(null)}
          onConfirm={ajouterExamenManuel}
        />
      )}

      {/* ── Modal export PDF ── */}
      {showExportModal && CAN_EXPORT_LISTE_CANDIDATS && (
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
              <FormField label="Nom de l'auto-école"        value={exportForm.nomEcole}    onChange={v => handleExportFormChange("nomEcole", v)}    placeholder="Ex : Auto-École Essalem" />
              <FormField label="Wilaya"                     value={exportForm.wilaya}       onChange={v => handleExportFormChange("wilaya", v)}       placeholder="Ex : Béjaïa, Sétif..." required />
              <FormField label="Centre d'examen"            value={exportForm.centreExamen} onChange={v => handleExportFormChange("centreExamen", v)} placeholder="Ex : Le Châlet..." required />
              <FormField label="المركبة الأولى"             value={exportForm.morkaba}      onChange={v => handleExportFormChange("morkaba", v)}      placeholder="Ex : رونو كليو 03" />
              <FormField label="Date de dépôt des dossiers" value={exportForm.dateDepot}    onChange={v => handleExportFormChange("dateDepot", v)}    type="date" />
              <FormField label="Date de l'examen"           value={exportForm.dateExamen}   onChange={v => handleExportFormChange("dateExamen", v)}   placeholder="YYYY/MM/DD" />
            </div>
            <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
              <strong style={{ color: "#1f2937" }}>Aperçu :</strong> {allFiltered.length} candidat(s) exporté(s)
              {typeFilter !== "Tous" && <> · Type : <strong>{typeFilter}</strong></>}
              {hasCategorieFilter && <> · Catégorie : <strong>{categorieFilter}</strong></>}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowExportModal(false)} disabled={pdfLoading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>Annuler</button>
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

export default ExamensMoniteur;
