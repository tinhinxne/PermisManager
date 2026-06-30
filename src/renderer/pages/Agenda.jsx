import React, { useState, useRef, useCallback, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";
import { useCongeCtx } from "../context/CongeContext";
import { useNavigate } from "react-router-dom";
import { useExamenCtx } from "../context/ExamenContext";

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const HOURS      = [7,8,9,10,11,12,13,14,15,16,17,18];
const DAYS_SHORT = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const CELL_H = 72;

const COLORS = {
  code:        { bg:"#3b82f6", light:"rgba(59,130,246,0.18)",  border:"rgba(59,130,246,0.4)",  text:"#1d4ed8" },
  creneau:     { bg:"#f59e0b", light:"rgba(245,158,11,0.18)",  border:"rgba(245,158,11,0.4)",  text:"#92400e" },
  circulation: { bg:"#10b981", light:"rgba(16,185,129,0.18)",  border:"rgba(16,185,129,0.4)",  text:"#065f46" },
};

const CATEGORIES_PERMIS = ["A1","A","B","C1","C","D","F","BE","C1E","CE","DE"];

const normCat = v => (v || "").toString().trim().toUpperCase();

const moniteurCategories = (m) => {
  const raw = m?.categories_habilitees;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(",");
  return arr.map(normCat).filter(Boolean);
};

const candidatCategorie = (c) => normCat(c?.categoriePermis || c?.categorie || c?.categorie_permis || "B");

const cap = s => s.split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");

function floatToHHMM(h) {
  const hours   = Math.floor(h);
  const minutes = Math.round((h % 1) * 60);
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;
}

function toLocalISO(dateVal) {
  if (!dateVal) return "";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
// ── Crédit de séances supplémentaires (post-permis) ───────────────────────────
const SEANCE_SUP_CREDIT_KEY = "seance_sup_credit";

function getSeanceSupCredits() {
  try { return JSON.parse(localStorage.getItem(SEANCE_SUP_CREDIT_KEY) || "{}"); }
  catch { return {}; }
}

function getCredit(candidatId) {
  const credits = getSeanceSupCredits();
  return Number(credits[String(candidatId)] || 0);
}

function setCredit(candidatId, value) {
  const credits = getSeanceSupCredits();
  credits[String(candidatId)] = Math.max(0, Math.floor(value));
  localStorage.setItem(SEANCE_SUP_CREDIT_KEY, JSON.stringify(credits));
}

function consumeCredit(candidatId) {
  const current = getCredit(candidatId);
  setCredit(candidatId, current - 1);
  return current - 1;
}

function formatDateFr(iso) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-DZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function dbRowToSession(row) {
  const rawDate   = toLocalISO(row.date);
  const dateObj   = new Date(rawDate + "T12:00:00");
  const dayOfWeek = dateObj.getDay();
  const parts  = (row.heure || "08:00").split(":");
  const startH = parseInt(parts[0]) + (parseInt(parts[1] || 0) / 60);
  const firstName = row.candidatsNoms
    ? row.candidatsNoms.split(", ")[0].trim()
    : "—";
  return {
    id:      row.idSeance,
    name:    firstName,
    monitor: row.moniteurNom || "—",
    moniteur_id: row.moniteur_id,
    type: (() => {
      const raw = (row.type || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (raw.includes("circ")) return "circulation";
      if (raw.includes("cr"))   return "creneau";
      return "code";
    })(),
    day:     dayOfWeek,
    startH,
    dur:     parseFloat(row.duree) || 1,
    notes:   row.statut || "",
    categoriePermis: normCat(row.categoriePermis || row.categorie || row.categorie_permis),
    _raw:    row,
  };
}

function getMondayOfWeek(date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function getWeekDates(monday) {
  const sun = new Date(monday); sun.setDate(sun.getDate()-1);
  return Array.from({length:7}, (_,i) => {
    const d = new Date(sun); d.setDate(sun.getDate()+i); return d;
  });
}

function formatWeekLabel(dates) {
  const s = dates[0].toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
  const e = dates[6].toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  return `${s} – ${e}`;
}

const FONT_LINK = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`;

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#3b82f6";
  return (
    <div style={{
      position:"fixed", bottom:24, right:28, zIndex:500,
      background: bg, color:"#fff",
      padding:"11px 20px", borderRadius:10,
      fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:600,
      boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
      animation:"slideUp 0.25s ease",
      maxWidth: 420,
    }}>
      {message}
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div style={{
      position:"absolute", inset:0, zIndex:50,
      background:"rgba(248,250,252,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:"3px solid #e2e8f0", borderTop:"3px solid #2563eb",
        animation:"spin 0.75s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}


// ── SÉANCE SUPPLÉMENTAIRE MODAL (candidat permis obtenu) ──────────────────────
function SeanceSupplementaireModal({ candidat, onClose, onConfirm }) {
  if (!candidat) return null;
  const nomComplet = `${candidat.prenom || ""} ${candidat.nom || ""}`.trim();

  return (
    <div
      style={{
        position:"fixed", inset:0, zIndex:600,
        background:"rgba(15,23,42,0.6)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Poppins',sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:"#fff", borderRadius:20, width:440, maxWidth:"94vw",
        boxShadow:"0 30px 80px rgba(0,0,0,0.2)", overflow:"hidden",
        animation:"milestoneUp .25s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {/* Header */}
        <div style={{
          background:"linear-gradient(135deg,#6366f1,#4f46e5)",
          padding:"22px 24px 18px", textAlign:"center",
        }}>
          <div style={{ fontSize:40, marginBottom:4 }}>🚗➕</div>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#fff" }}>
            Séance supplémentaire
          </div>
          <div style={{ fontSize:"0.75rem", color:"#c7d2fe", marginTop:4 }}>
            Candidat ayant obtenu son permis
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Infos candidat */}
          <div style={{
            padding:"14px 16px", borderRadius:12,
            background:"#eef2ff", border:"1px solid #c7d2fe",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:44, height:44, borderRadius:"50%",
              background:"#6366f1", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1rem", fontWeight:800, flexShrink:0,
            }}>
              {nomComplet.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:"0.9rem", fontWeight:700, color:"#1e293b" }}>{nomComplet}</div>
              <div style={{ fontSize:"0.72rem", color:"#6366f1", fontWeight:600, marginTop:2 }}>
                🎓 Permis obtenu — Catégorie {candidat.categoriePermis || "B"}
              </div>
            </div>
          </div>

          {/* Explication */}
          <div style={{
            padding:"12px 14px", borderRadius:10,
            background:"#f8fafc", border:"1px solid #e2e8f0",
            fontSize:"0.8rem", color:"#475569", lineHeight:1.6,
          }}>
            <strong style={{ color:"#1e293b" }}>📋 Séance hors forfait</strong><br />
            Ce candidat a déjà complété sa formation initiale. Vous pouvez lui planifier
            des séances supplémentaires (perfectionnement, accompagnement post-permis, etc.).<br />
            <span style={{ color:"#6366f1", fontWeight:600 }}>
              Le paiement de ces séances se gère depuis le module Paiements.
            </span>
          </div>

          {/* Badges examens réussis */}
          <div style={{ display:"flex", gap:8 }}>
            {["Code","Créneau","Circulation"].map(t => (
              <div key={t} style={{
                flex:1, padding:"8px 0", borderRadius:8, textAlign:"center",
                background:"#f0fdf4", border:"1px solid #86efac",
                fontSize:"0.72rem", color:"#166534", fontWeight:600,
              }}>
                ✅ {t}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"0 24px 20px", display:"flex", gap:10, justifyContent:"space-between" }}>
          <button onClick={onClose} style={{
            padding:"10px 20px", borderRadius:10,
            background:"#f1f5f9", border:"none", color:"#64748b",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:600, cursor:"pointer",
          }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{
            padding:"10px 26px", borderRadius:10,
            background:"linear-gradient(135deg,#6366f1,#4f46e5)",
            border:"none", color:"#fff",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:700, cursor:"pointer",
            boxShadow:"0 4px 14px rgba(99,102,241,0.35)",
          }}>
            📅 Planifier la séance
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODALE GROUPE DE SÉANCES ──────────────────────────────────────────────────
function GroupModal({ sessions, onClose, onDelete, onEdit }) {
  if (!sessions || sessions.length === 0) return null;
  const first = sessions[0];
  const endH  = first.startH + first.dur;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins',sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, width:640, maxWidth:"95vw", maxHeight:"82vh", display:"flex", flexDirection:"column", boxShadow:"0 30px 80px rgba(0,0,0,0.2)", overflow:"hidden" }}>
        <div style={{ padding:"20px 26px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"1rem", fontWeight:700, color:"#1e293b" }}>Séances du {DAYS_SHORT[first.day]} — {floatToHHMM(first.startH)} → {floatToHHMM(endH)}</div>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:4 }}>{sessions.length} séance{sessions.length > 1 ? "s" : ""} sur ce créneau</div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#64748b", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14, display:"grid", placeItems:"center" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:12 }}>
          {sessions.map((s) => {
            const col = COLORS[s.type] || COLORS.code;
            const sEnd = s.startH + s.dur;
            return (
              <div key={s.id} style={{ border:`1px solid ${col.border}`, borderLeft:`4px solid ${col.bg}`, borderRadius:12, padding:"14px 16px", background:col.light, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:"white", border:`1px solid ${col.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:14, height:14, borderRadius:3, background:col.bg }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:"0.88rem", fontWeight:700, color:"#1e293b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cap(s.name)}</span>
                    <span style={{ fontSize:"0.68rem", fontWeight:600, padding:"2px 9px", borderRadius:20, background:"white", color:col.text, border:`1px solid ${col.border}`, textTransform:"capitalize", flexShrink:0 }}>{s.type}</span>
                  </div>
                  <div style={{ display:"flex", gap:16, fontSize:"0.75rem", color:"#64748b" }}>
                    <span>👤 <strong style={{ color:"#334155" }}>{s.monitor}</strong></span>
                    <span>🕐 {floatToHHMM(s.startH)} – {floatToHHMM(sEnd)}</span>
                    {s.notes && <span>📋 {s.notes}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button onClick={() => { onEdit(s); onClose(); }} style={{ padding:"7px 14px", borderRadius:8, background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.25)", color:"#3b82f6", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>Modifier</button>
                  <button onClick={() => onDelete(s.id)} style={{ padding:"7px 14px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", background:"#f8fafc", display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"9px 22px", borderRadius:8, background:"#1e293b", border:"none", color:"white", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600, cursor:"pointer" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ── POPUP simple (1 seule séance) ─────────────────────────────────────────────
function SessionPopup({ session, anchor, onClose, onDelete, onEdit }) {
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  if (!session || !anchor) return null;
  const top  = Math.min(anchor.bottom + 8, window.innerHeight - 320);
  const left = Math.min(anchor.left, window.innerWidth - 270);
  const col  = COLORS[session.type] || COLORS.code;

  return (
    <div ref={ref} style={{ position:"fixed", zIndex:200, top, left, background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, width:250, boxShadow:"0 20px 60px rgba(0,0,0,0.15)", overflow:"hidden", fontFamily:"'Poppins',sans-serif" }}>
      <div style={{ padding:"13px 15px 10px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:"0.88rem", fontWeight:700, color:"#1e293b" }}>{cap(session.name)}</div>
          <div style={{ fontSize:"0.68rem", color:"#94a3b8", marginTop:2 }}>
            {(() => { const endH = session.startH + session.dur; return `${DAYS_SHORT[session.day]} • ${floatToHHMM(session.startH)} – ${floatToHHMM(endH)}`; })()}
          </div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>✕</button>
      </div>
      <div style={{ padding:"12px 15px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Type :</span>
          <span style={{ fontWeight:700, padding:"3px 10px", borderRadius:20, background:col.light, color:col.text, border:`1px solid ${col.border}`, textTransform:"capitalize", fontSize:"0.72rem" }}>{session.type}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Moniteur :</span>
          <span style={{ fontWeight:500, color:"#1e293b" }}>{session.monitor}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Candidat :</span>
          <span style={{ fontWeight:500, color:"#1e293b" }}>{cap(session.name)}</span>
        </div>
        {session.notes && (
          <div style={{ fontSize:"0.73rem", color:"#64748b", background:"#f8fafc", padding:"6px 9px", borderRadius:7, marginTop:2 }}>{session.notes}</div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, padding:"10px 13px", borderTop:"1px solid #e2e8f0", background:"#f8fafc" }}>
        <button onClick={() => { onDelete(session.id); onClose(); }} style={{ flex:1, padding:"7px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>Supprimer</button>
        <button onClick={() => { onEdit(session); onClose(); }} style={{ flex:1, padding:"7px", borderRadius:8, background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.25)", color:"#3b82f6", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>Modifier</button>
      </div>
    </div>
  );
}

// ── ALERTE MODALE ─────────────────────────────────────────────────────────────
function AlertModal({ icon, title, message, color = "#ef4444", onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:700, background:"rgba(15,23,42,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins',sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, width:340, maxWidth:"88vw", boxShadow:"0 30px 70px rgba(0,0,0,0.22)", overflow:"hidden", animation:"alertPop .22s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes alertPop{from{transform:translateY(18px) scale(.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
        <div style={{ padding:"24px 22px 18px", textAlign:"center" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", margin:"0 auto 14px", background:`${color}1A`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{icon}</div>
          <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#1e293b", marginBottom:7 }}>{title}</div>
          <div style={{ fontSize:"0.8rem", color:"#64748b", lineHeight:1.55 }}>{message}</div>
        </div>
        <div style={{ padding:"0 22px 22px" }}>
          <button onClick={onClose} style={{ width:"100%", padding:"10px 0", borderRadius:10, border:"none", background:color, color:"#fff", fontFamily:"'Poppins',sans-serif", fontSize:"0.86rem", fontWeight:700, cursor:"pointer" }}>Compris</button>
        </div>
      </div>
    </div>
  );
}

// ── BANNIÈRE CONGÉ ANNUEL ─────────────────────────────────────────────────────
function CongeAnnuelBanner({ congeAnnuel }) {
  if (!congeAnnuel?.actif || !congeAnnuel?.dateDebut || !congeAnnuel?.dateFin) return null;
  const now   = new Date();
  const debut = new Date(congeAnnuel.dateDebut + "T00:00:00");
  const fin   = new Date(congeAnnuel.dateFin   + "T23:59:59");
  if (now < debut || now > fin) return null;

  return (
    <div style={{
      margin:"0 0 12px 0", padding:"12px 18px", borderRadius:12,
      background:"linear-gradient(135deg, #fff7ed, #ffedd5)",
      border:"1.5px solid #fed7aa",
      display:"flex", alignItems:"center", gap:12,
      fontFamily:"'Poppins',sans-serif",
    }}>
      <div style={{ fontSize:24, flexShrink:0 }}>🏖️</div>
      <div>
        <div style={{ fontSize:"0.85rem", fontWeight:700, color:"#c2410c" }}>
          {congeAnnuel.label || "Congé annuel"} — Auto-école fermée
        </div>
        <div style={{ fontSize:"0.75rem", color:"#ea580c", marginTop:2 }}>
          Du {formatDateFr(congeAnnuel.dateDebut)} au {formatDateFr(congeAnnuel.dateFin)} · Aucune séance ne peut être créée durant cette période.
        </div>
      </div>
    </div>
  );
}

// ── CREATE / EDIT MODAL ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate, weekDates, editing, saving, sessions, prefillCandidatId }) {
  const [candidats, setCandidats] = useState([]);
  const [moniteurs, setMoniteurs] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);
  const { isMoniteurEnConge, isCongeAnnuel, congeAnnuel } = useCongeCtx();
  const { examensList } = useExamenCtx();

  useEffect(() => {
    async function loadData() {
      try {
        if (window.electron) {
          const c = await window.electron.getCandidats();
          const m = await window.electron.getMoniteurs();
          setCandidats(Array.isArray(c) ? c : []);
          setMoniteurs(Array.isArray(m) ? m : []);
        }
      } catch (err) { console.error("Erreur loadData:", err); }
    }
    loadData();
  }, []);

  const [form, setForm] = React.useState(editing ? {
    candidat:    editing.name,
    candidatId:  editing._raw?.candidatsIds ? String(editing._raw.candidatsIds.split(",")[0].trim()) : "",
    moniteur:    editing.monitor,
    moniteur_id: editing._raw?.moniteur_id ? String(editing._raw.moniteur_id) : "",
    type:        editing.type,
    date:        toLocalISO(editing._raw?.date),
    heure:       floatToHHMM(editing.startH),
    statut:      editing._raw?.statut || "planifiée",
    dur:         String(editing.dur || 1),
    notes:       "",
  } : {
    candidat:"", candidatId: prefillCandidatId ? String(prefillCandidatId) : "",
    moniteur:"", moniteur_id:"",
    type:"code", date:toLocalISO(new Date()),
    heure:"08:00", statut:"planifiée", dur:"1", notes:"",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

 // ── Examens du candidat ────────────────────────────────────────────────────
  // RÈGLE STRICTE : on ne passe au stade suivant QUE quand l'examen précédent
  // a le statut "Passed" (réussi). Le nombre de séances ou le fait qu'un
  // examen soit simplement "Scheduled" (programmé) ne donne AUCUN accès.
  const examsCandidat = (examensList || []).filter(
    e => String(e.candidatId) === String(form.candidatId)
  );
  const aReussiCode    = examsCandidat.some(e => e.type === "Code"        && e.status === "Passed");
  const aReussiCreneau = examsCandidat.some(e => e.type === "Créneau"     && e.status === "Passed");
  const aReussiCirc    = examsCandidat.some(e => e.type === "Circulation" && e.status === "Passed");

  // Permis complètement obtenu → tous les types sont libres
  const permisObtenu = aReussiCode && aReussiCreneau && aReussiCirc;

  // Stade actuel pour les candidats en cours de formation :
  // - "code"        : par défaut, ou si Code pas encore réussi
  // - "creneau"     : accessible UNIQUEMENT si Code est "Passed"
  // - "circulation" : accessible UNIQUEMENT si Créneau est "Passed" (donc Code aussi)
  const currentStage = !aReussiCode ? "code" : !aReussiCreneau ? "creneau" : "circulation";

  // Force le type au bon stade (sauf si permis obtenu).
  // Recalculé aussi quand form.type change pour rattraper le cas où le type
  // resterait bloqué sur une valeur devenue invalide (ex: chargement async
  // des examens qui fait reculer currentStage après le premier rendu).
  useEffect(() => {
    if (!form.candidatId) return;
    if (permisObtenu) return;
    if (form.type !== currentStage) set("type", currentStage);
  }, [form.candidatId, currentStage, permisObtenu, form.type]);

  // Si prefill candidat, charger le nom dès que la liste est prête
  useEffect(() => {
    if (!prefillCandidatId || candidats.length === 0) return;
    const c = candidats.find(c => String(c.idCandidat) === String(prefillCandidatId));
    if (c) set("candidat", `${c.nom} ${c.prenom}`);
  }, [prefillCandidatId, candidats]);

  const selectedCandidatObj = candidats.find(c => String(c.idCandidat) === String(form.candidatId));
  const candidatCat  = selectedCandidatObj ? candidatCategorie(selectedCandidatObj) : "";
  const seanceDateObj = form.date ? new Date(form.date + "T12:00:00") : null;

  const dateEnCongeAnnuel = !!(seanceDateObj && isCongeAnnuel(seanceDateObj));
  const today = new Date(); today.setHours(0,0,0,0);
  const dateEstPassee = !!(seanceDateObj && seanceDateObj < today);

  const isMoniteurAbsent = (m) => !!(seanceDateObj && isMoniteurEnConge(m.id, seanceDateObj));

  const moniteursDisponibles = moniteurs.filter(m => {
    if (String(m.id) === String(form.moniteur_id)) return true;
    const matchCategorie = !candidatCat || moniteurCategories(m).includes(candidatCat);
    return matchCategorie && !isMoniteurAbsent(m);
  });

  const moniteurActuelEnConge = (() => {
    if (!form.moniteur_id || !seanceDateObj) return false;
    const m = moniteurs.find(mm => String(mm.id) === String(form.moniteur_id));
    return m ? isMoniteurAbsent(m) : false;
  })();

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    set("date", newDate);
    if (form.moniteur_id && newDate) {
      const currentMon = moniteurs.find(m => String(m.id) === String(form.moniteur_id));
      if (currentMon && isMoniteurEnConge(currentMon.id, new Date(newDate + "T12:00:00"))) {
        set("moniteur_id", "");
        set("moniteur", "");
      }
    }
  };

  const handleCandidatChange = (e) => {
    const id = e.target.value;
    const s  = candidats.find(c => String(c.idCandidat) === String(id));
    set("candidatId", id);
    set("candidat", s ? `${s.nom} ${s.prenom}` : "");
    if (s && form.moniteur_id) {
      const newCat = candidatCategorie(s);
      const currentMon = moniteurs.find(m => String(m.id) === String(form.moniteur_id));
      if (currentMon && !moniteurCategories(currentMon).includes(newCat)) {
        set("moniteur_id", "");
        set("moniteur", "");
      }
    }
  };

  const handleMoniteurChange = (e) => {
    const id = e.target.value;
    const s  = moniteurs.find(m => String(m.id) === String(id));
    set("moniteur_id", id);
    set("moniteur", s ? `${s.nom} ${s.prenom}` : "");
  };

  const inpS = {
    width:"100%", boxSizing:"border-box",
    background:"#fff", border:"1px solid #cbd5e1",
    borderRadius:8, padding:"9px 11px",
    color:"#1e293b", fontFamily:"'Poppins',sans-serif",
    fontSize:"0.85rem", outline:"none",
  };

  const handleSubmit = () => {
    if (!form.date || !form.heure || !form.type) return;

    if (dateEstPassee) {
      setAlertInfo({ icon:"📅", title:"Date dans le passé", message:"Vous ne pouvez pas planifier une séance à une date déjà passée. Veuillez choisir une date à partir d'aujourd'hui.", color:"#ef4444" });
      return;
    }

    if (dateEnCongeAnnuel) {
      setAlertInfo({
        icon:"🏖️", title:"Auto-école fermée", color:"#f97316",
        message:`L'auto-école est fermée du ${formatDateFr(congeAnnuel.dateDebut)} au ${formatDateFr(congeAnnuel.dateFin)}${congeAnnuel.label ? ` (${congeAnnuel.label})` : ""}. Aucune séance ne peut être créée durant cette période.`,
      });
      return;
    }
    // après la vérification "moniteur en congé"
const candidatConflict = (sessions || []).find(s => {
  if (editing && String(s.id) === String(editing.id)) return false;
  if (toLocalISO(s._raw?.date) !== form.date) return false;

  const sCandidatIds = s._raw?.candidatsIds
    ? String(s._raw.candidatsIds).split(",").map(x => x.trim())
    : [];
  if (!sCandidatIds.includes(String(form.candidatId))) return false;

  const startH = parseInt(form.heure.split(":")[0]) + parseInt(form.heure.split(":")[1] || 0) / 60;
  const dur    = parseFloat(form.dur) || 1;
  return startH < s.startH + s.dur && (startH + dur) > s.startH;
});

if (candidatConflict) {
  setAlertInfo({
    icon: "🚫", title: "Candidat déjà occupé", color: "#ef4444",
    message: `${form.candidat || "Ce candidat"} a déjà une séance prévue de ${floatToHHMM(candidatConflict.startH)} à ${floatToHHMM(candidatConflict.startH + candidatConflict.dur)} ce jour-là. Choisissez un autre créneau.`,
  });
  return;
}

    if (!form.candidatId) { setAlertInfo({ icon:"🧑", title:"Candidat manquant", message:"Veuillez sélectionner un candidat avant d'enregistrer la séance.", color:"#ef4444" }); return; }
    if (!form.moniteur_id) { setAlertInfo({ icon:"🧑‍🏫", title:"Moniteur manquant", message:"Veuillez sélectionner un moniteur avant d'enregistrer la séance.", color:"#ef4444" }); return; }

    // Progression obligatoire uniquement pour candidats en cours (pas permis obtenu).
    // Vérification stricte et redondante : même si le <select> a été contourné
    // (devtools, état React incohérent, etc.), on rebloque ici sur les mêmes
    // règles de statut "Passed".
    if (form.candidatId && !permisObtenu) {
      if (form.type === "creneau" && !aReussiCode) {
        setAlertInfo({
          icon:"🚫", title:"Examen Code non réussi", color:"#ef4444",
          message:`${form.candidat || "Ce candidat"} doit d'abord réussir l'examen de Code avant qu'une séance de type "Créneau" puisse être planifiée.`,
        });
        return;
      }
      if (form.type === "circulation" && !aReussiCreneau) {
        setAlertInfo({
          icon:"🚫", title:"Examen Créneau non réussi", color:"#ef4444",
          message:`${form.candidat || "Ce candidat"} doit d'abord réussir l'examen de Créneau avant qu'une séance de type "Circulation" puisse être planifiée.`,
        });
        return;
      }
      if (form.type !== currentStage) {
        setAlertInfo({
          icon:"🚫", title:"Type de séance non autorisé", color:"#ef4444",
          message:`${form.candidat || "Ce candidat"} est actuellement au stade "${currentStage}". Seules les séances de ce type peuvent être créées pour lui.`,
        });
        return;
      }
    }

    const moniteurSel = moniteurs.find(m => String(m.id) === String(form.moniteur_id));
    if (selectedCandidatObj && moniteurSel && !moniteurCategories(moniteurSel).includes(candidatCat)) {
      setAlertInfo({ icon:"🎓", title:"Catégorie incompatible", color:"#3b82f6", message:`Ce moniteur n'est pas habilité pour la catégorie ${candidatCat}.` });
      return;
    }
    if (moniteurSel && seanceDateObj && isMoniteurEnConge(moniteurSel.id, seanceDateObj)) {
      setAlertInfo({ icon:"🌴", title:"Moniteur en congé", color:"#f97316", message:`${form.moniteur} est en congé le ${form.date.split("-").reverse().join("/")}. Choisissez un autre moniteur ou une autre date.` });
      return;
    }

    onCreate({
      id:      editing ? editing.id : Date.now(),
      name:    form.candidat || "Nouveau Candidat",
      monitor: form.moniteur || "Moniteur 1",
      type:    form.type || "code",
      day:     new Date(form.date + "T12:00:00").getDay(),
      startH:  parseInt(form.heure.split(":")[0]) + parseInt(form.heure.split(":")[1] || 0) / 60,
      dur:     parseFloat(form.dur) || 1,
      notes:   form.statut,
      _formData: {
        date:        form.date,
        heure:       form.heure,
        type:        form.type,
        statut:      form.statut,
        moniteur_id: form.moniteur_id ? parseInt(form.moniteur_id) : null,
        candidatIds: form.candidatId ? [parseInt(form.candidatId)] : [],
        duree:       parseFloat(form.dur) || 1,
        categoriePermis: candidatCat || null,
      },
    });
  };

  const renderHeureOptions = () => {
    const duree = parseFloat(form.dur) || 1;
    const allSlots = [];
    for (let h = 7; h < 19; h++) {
      allSlots.push(h); allSlots.push(h+0.25); allSlots.push(h+0.5); allSlots.push(h+0.75);
    }
    const occupiedIntervals = (sessions || [])
  .filter(s => {
    if (!form.date) return false;
    const sDate = toLocalISO(s._raw?.date);
    if (sDate !== form.date) return false;
    const isOther = editing ? String(s.id) !== String(editing.id) : true;
    if (!isOther) return false;

    const sameMoniteur = !!form.moniteur_id && String(s._raw?.moniteur_id) === String(form.moniteur_id);

    const sCandidatIds = s._raw?.candidatsIds
      ? String(s._raw.candidatsIds).split(",").map(x => x.trim())
      : [];
    const sameCandidat = !!form.candidatId && sCandidatIds.includes(String(form.candidatId));

    return sameMoniteur || sameCandidat;
  })
  .map(s => ({ start: s.startH, end: s.startH + s.dur }));

    const formatSlot = slot => {
      const h = Math.floor(slot); const m = Math.round((slot % 1) * 60);
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    };

   return allSlots.map(slot => {
  const slotEnd = slot + duree;
  if (slotEnd > 19) return null;
  const minutes = Math.round((slot % 1) * 60);
  const isValid = duree === 0.75 ? [0,15,30,45].includes(minutes) : [0,30].includes(minutes);
  if (!isValid) return null;
  const conflict = occupiedIntervals.find(i => slot < i.end && slotEnd > i.start);
  const startStr = formatSlot(slot); const endStr = formatSlot(slotEnd);
  return (
    <option key={slot} value={startStr} disabled={!!conflict} style={{ color: conflict ? "#cbd5e1" : "#1e293b" }}>
      {conflict ? `${startStr} – ${endStr}  ✗` : `${startStr} – ${endStr}  ✓`}
    </option>
  );
});
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:16, width:520, maxWidth:"96vw", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 25px 60px rgba(0,0,0,0.2)", overflow:"hidden", fontFamily:"'Poppins',sans-serif", position:"relative" }}>
        {saving && <LoadingOverlay />}

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:"1.05rem", fontWeight:700, color:"#1e293b" }}>
              {editing ? "Modifier la séance" : permisObtenu ? "🚗➕ Séance supplémentaire" : "Créer une séance"}
            </div>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:3 }}>
              {permisObtenu
                ? "Séance hors forfait — candidat ayant obtenu son permis"
                : "Planifier une nouvelle séance de conduite ou d'examen"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#64748b", width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:14, display:"grid", placeItems:"center" }}>✕</button>
        </div>

        <div style={{ padding:"18px 24px", overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>

         {/* Bannière permis obtenu */}
          {permisObtenu && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"#eef2ff", border:"1.5px solid #c7d2fe", fontSize:"0.78rem", color:"#4338ca", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>🎓</span>
              <div>
                <div>Permis obtenu — séance hors forfait</div>
                <div style={{ fontWeight:400, marginTop:2, fontSize:"0.72rem" }}>
                  Tous les types de séance sont disponibles.
                </div>
                {form.candidatId && (() => {
                  const credit = getCredit(form.candidatId);
                  return credit > 0 ? (
                    <div style={{ marginTop:6, fontWeight:700, color:"#16a34a", fontSize:"0.72rem" }}>
                      ✅ Crédit disponible : {credit} séance(s) déjà payée(s) — aucun paiement requis pour celle-ci.
                    </div>
                  ) : (
                    <div style={{ marginTop:6, fontWeight:700, color:"#ea580c", fontSize:"0.72rem" }}>
                      ⚠️ Aucun crédit restant — un paiement (par lot) sera demandé après la création.
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Avertissement congé annuel */}
          {dateEnCongeAnnuel && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"#fff7ed", border:"1.5px solid #fed7aa", fontSize:"0.78rem", color:"#c2410c", fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>🏖️</span>
              <div>
                <div>Auto-école fermée ce jour-là</div>
                <div style={{ fontWeight:400, marginTop:2, fontSize:"0.72rem" }}>
                  {congeAnnuel?.label || "Congé annuel"} : {formatDateFr(congeAnnuel?.dateDebut)} → {formatDateFr(congeAnnuel?.dateFin)}
                </div>
              </div>
            </div>
          )}

          {/* Avertissement date passée */}
          {dateEstPassee && !dateEnCongeAnnuel && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"#fef2f2", border:"1.5px solid #fca5a5", fontSize:"0.78rem", color:"#dc2626", fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>📅</span>
              <div>
                <div>Date dans le passé</div>
                <div style={{ fontWeight:400, marginTop:2, fontSize:"0.72rem" }}>Vous ne pouvez pas créer une séance à une date déjà passée.</div>
              </div>
            </div>
          )}

          {/* Candidat / Moniteur */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Candidat <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.candidatId} onChange={handleCandidatChange}>
                <option value="">Sélectionner candidat...</option>
                {candidats.map(c => <option key={c.idCandidat} value={c.idCandidat}>{c.nom} {c.prenom} — {candidatCategorie(c)}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Moniteur <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.moniteur_id} disabled={!form.candidatId || dateEnCongeAnnuel} onChange={handleMoniteurChange}>
                <option value="">{form.candidatId ? "Sélectionner moniteur..." : "Choisissez d'abord un candidat"}</option>
                {moniteursDisponibles.map(m => <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>)}
              </select>
            </div>
          </div>

          {form.candidatId && !dateEnCongeAnnuel && (
            moniteursDisponibles.length > 0 ? (
              <div style={{ padding:"8px 12px", borderRadius:8, background:"#eff6ff", border:"1px solid #bfdbfe", fontSize:"0.73rem", color:"#1d4ed8", fontWeight:600 }}>
                🎓 Catégorie {candidatCat} — seuls les moniteurs habilités et disponibles (non en congé) à cette date sont proposés.
              </div>
            ) : (
              <div style={{ padding:"8px 12px", borderRadius:8, background:"#fef2f2", border:"1px solid #fca5a5", fontSize:"0.73rem", color:"#dc2626", fontWeight:600 }}>
                ⚠️ Aucun moniteur n'est habilité ou disponible pour la catégorie {candidatCat} à cette date.
              </div>
            )
          )}

          {moniteurActuelEnConge && (
            <div style={{ padding:"8px 12px", borderRadius:8, background:"#fff7ed", border:"1px solid #fed7aa", fontSize:"0.73rem", color:"#ea580c", fontWeight:600 }}>
              🌴 {form.moniteur} est en congé à cette date — choisissez un autre moniteur ou une autre date.
            </div>
          )}

          {/* Type / Date */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Type <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.type} disabled={!form.candidatId} onChange={e => set("type", e.target.value)}>
                {permisObtenu ? (
                  // Permis obtenu → tous les types libres
                  <>
                    <option value="code">Code</option>
                    <option value="creneau">Créneau</option>
                    <option value="circulation">Circulation</option>
                  </>
                ) : (
                  // Progression normale
                  <>
                    <option value="code" disabled={currentStage !== "code"}>
                      Code {currentStage !== "code" ? "(non disponible)" : ""}
                    </option>
                    <option value="creneau" disabled={currentStage !== "creneau"}>
                      Créneau {currentStage !== "creneau" ? (!aReussiCode ? "(Code requis)" : "(non disponible)") : ""}
                    </option>
                    <option value="circulation" disabled={currentStage !== "circulation"}>
                      Circulation {currentStage !== "circulation" ? "(Créneau requis)" : ""}
                    </option>
                  </>
                )}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Date <span style={{ color:"#ef4444" }}>*</span></label>
              <input
                style={{ ...inpS, borderColor: dateEstPassee ? "#fca5a5" : dateEnCongeAnnuel ? "#fed7aa" : "#cbd5e1", background: dateEstPassee ? "#fef2f2" : dateEnCongeAnnuel ? "#fff7ed" : "#fff" }}
                type="date" value={form.date} onChange={handleDateChange}
              />
            </div>
          </div>

          {/* Durée / Heure */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Durée <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.dur} onChange={e => set("dur", e.target.value)}>
                <option value="0.5">30 min</option>
                <option value="0.75">45 min</option>
                <option value="1">1h</option>
                <option value="1.5">1h30</option>
                <option value="2">2h</option>
                <option value="3">3h</option>
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Heure <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.heure} onChange={e => set("heure", e.target.value)} disabled={dateEnCongeAnnuel}>
                <option value="">Choisir un créneau...</option>
                {renderHeureOptions()}
              </select>
            </div>
          </div>

          {/* Statut */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Statut</label>
              <select style={inpS} value={form.statut} onChange={e => set("statut", e.target.value)}>
                <option value="planifiée">Planifiée</option>
                <option value="confirmée">Confirmée</option>
                <option value="annulée">Annulée</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding:"9px 20px", borderRadius:8, background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#64748b", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", cursor:"pointer", fontWeight:500 }}>Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={saving || dateEnCongeAnnuel || dateEstPassee}
            style={{
              padding:"9px 22px", borderRadius:8,
              background: dateEnCongeAnnuel || dateEstPassee ? "#94a3b8" : saving ? "#93c5fd" : permisObtenu ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "#2563eb",
              border:"none", color:"#fff",
              fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600,
              cursor: saving || dateEnCongeAnnuel || dateEstPassee ? "not-allowed" : "pointer",
              boxShadow: dateEnCongeAnnuel || dateEstPassee ? "none" : permisObtenu ? "0 4px 14px rgba(99,102,241,0.35)" : "0 4px 14px rgba(37,99,235,0.35)",
              display:"flex", alignItems:"center", gap:8,
            }}
          >
            {saving && <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.4)", borderTop:"2px solid #fff", animation:"spin 0.7s linear infinite" }} />}
            {dateEnCongeAnnuel ? "🏖️ Période fermée" : dateEstPassee ? "📅 Date passée" : editing ? "Enregistrer" : permisObtenu ? "📅 Planifier la séance" : "Créer la séance"}
          </button>
        </div>
      </div>
      {alertInfo && <AlertModal icon={alertInfo.icon} title={alertInfo.title} message={alertInfo.message} color={alertInfo.color} onClose={() => setAlertInfo(null)} />}
    </div>
  );
}
// ── MILESTONE MODAL — Fin de formation (20 séances) ──────────────────────────
function MilestoneModal({ candidatName, onClose, onPayer }) {
  return (
    <div
      style={{
        position:"fixed", inset:0, zIndex:800,
        background:"rgba(15,23,42,0.65)", backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Poppins',sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:"#fff", borderRadius:22, width:460, maxWidth:"94vw",
        boxShadow:"0 40px 100px rgba(0,0,0,0.25)", overflow:"hidden",
        animation:"milestoneUp .3s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <style>{`
          @keyframes milestoneUp {
            from { transform: translateY(24px) scale(.95); opacity:0 }
            to   { transform: translateY(0)    scale(1);   opacity:1 }
          }
          @keyframes confettiFall {
            0%   { transform: translateY(-10px) rotate(0deg);   opacity:1 }
            100% { transform: translateY(60px)  rotate(360deg); opacity:0 }
          }
        `}</style>

        {/* Header dégradé */}
        <div style={{
          background:"linear-gradient(135deg,#1d4ed8,#3b82f6,#06b6d4)",
          padding:"28px 24px 22px", textAlign:"center", position:"relative", overflow:"hidden",
        }}>
          {/* Confettis décoratifs */}
          {["#fbbf24","#f87171","#34d399","#a78bfa","#fb923c"].map((c,i) => (
            <div key={i} style={{
              position:"absolute",
              top: -8, left: `${15 + i*18}%`,
              width:8, height:8, borderRadius:2,
              background:c,
              animation:`confettiFall ${1.2+i*0.2}s ease-in ${i*0.1}s forwards`,
            }} />
          ))}
          <div style={{ fontSize:52, marginBottom:8 }}>🏁</div>
          <div style={{ fontSize:"1.15rem", fontWeight:800, color:"#fff", letterSpacing:-0.3 }}>
            Formation terminée !
          </div>
          <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.75)", marginTop:4 }}>
            20 séances complétées
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding:"22px 24px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Candidat */}
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"12px 16px", borderRadius:12,
            background:"#eff6ff", border:"1px solid #bfdbfe",
          }}>
            <div style={{
              width:42, height:42, borderRadius:"50%",
              background:"#2563eb", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1rem", fontWeight:800, flexShrink:0,
            }}>
              {candidatName?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:"0.92rem", fontWeight:700, color:"#1e293b" }}>
                {candidatName}
              </div>
              <div style={{ fontSize:"0.72rem", color:"#2563eb", fontWeight:600, marginTop:2 }}>
                🎓 20 séances de formation complétées
              </div>
            </div>
          </div>

          {/* Barre de progression complète */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:"#64748b", marginBottom:6 }}>
              <span>Progression formation</span>
              <span style={{ fontWeight:700, color:"#22c55e" }}>20 / 20 ✓</span>
            </div>
            <div style={{ height:10, borderRadius:10, background:"#e2e8f0", overflow:"hidden" }}>
              <div style={{
                height:"100%", width:"100%", borderRadius:10,
                background:"linear-gradient(90deg,#22c55e,#16a34a)",
                boxShadow:"0 0 8px rgba(34,197,94,0.4)",
              }} />
            </div>
          </div>

          {/* Info séances sup */}
          <div style={{
            padding:"12px 14px", borderRadius:10,
            background:"#f8fafc", border:"1px solid #e2e8f0",
            fontSize:"0.8rem", color:"#475569", lineHeight:1.6,
          }}>
            <strong style={{ color:"#1e293b" }}>📋 Séances suivantes = hors forfait</strong><br />
            Toute nouvelle séance planifiée pour ce candidat sera une{" "}
            <strong style={{ color:"#6366f1" }}>séance supplémentaire payante</strong>.
            Le tarif est à définir avec le candidat.
          </div>

          {/* Badges étapes */}
          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"Code", icon:"📚", color:"#3b82f6" },
              { label:"Créneau", icon:"🚗", color:"#f59e0b" },
              { label:"Circulation", icon:"🛣️", color:"#10b981" },
            ].map(({ label, icon, color }) => (
              <div key={label} style={{
                flex:1, padding:"8px 4px", borderRadius:8,
                textAlign:"center", border:`1px solid ${color}30`,
                background:`${color}10`,
              }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ fontSize:"0.68rem", fontWeight:700, color, marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"0 24px 22px",
          display:"flex", gap:10,
        }}>
          <button onClick={onClose} style={{
            flex:1, padding:"10px 0", borderRadius:10,
            background:"#f1f5f9", border:"none", color:"#64748b",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:600, cursor:"pointer",
          }}>
            Fermer
          </button>
          <button onClick={onPayer} style={{
            flex:2, padding:"10px 0", borderRadius:10,
            background:"linear-gradient(135deg,#6366f1,#4f46e5)",
            border:"none", color:"#fff",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:700, cursor:"pointer",
            boxShadow:"0 4px 14px rgba(99,102,241,0.35)",
          }}>
            💳 Enregistrer paiement séance sup.
          </button>
        </div>
      </div>
    </div>
  );
}
// ── SÉANCE SUP PAIEMENT MODAL ─────────────────────────────────────────────────
function SeanceSupPaiementModal({ candidatName, candidatId, allCandidates, onClose, onConfirm }) {
  const [montant,  setMontant]  = useState("");
  const [methode,  setMethode]  = useState("especes");
  const [remarque, setRemarque] = useState("Séance supplémentaire");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const inpS = {
    width:"100%", boxSizing:"border-box",
    padding:"10px 12px", borderRadius:8,
    border:"1.5px solid #e2e8f0",
    fontFamily:"'Poppins',sans-serif",
    fontSize:"0.85rem", color:"#1e293b",
    background:"#fff", outline:"none",
  };

  const handleSubmit = async () => {
    const montantNum = parseFloat(montant);
    if (!montant || isNaN(montantNum) || montantNum <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm({
        idCandidat:      candidatId,
        montant:         montantNum,
        methode,
        remarque:        remarque || "Séance supplémentaire",
        dateVersement:   new Date().toISOString().slice(0, 10),
        estSeanceSup:    true,
      });
    } catch (e) {
      setError("Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position:"fixed", inset:0, zIndex:900,
        background:"rgba(15,23,42,0.65)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Poppins',sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:"#fff", borderRadius:18, width:420, maxWidth:"94vw",
        boxShadow:"0 30px 80px rgba(0,0,0,0.22)", overflow:"hidden",
        animation:"milestoneUp .25s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {/* Header */}
        <div style={{
          background:"linear-gradient(135deg,#6366f1,#4f46e5)",
          padding:"20px 24px 16px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div>
            <div style={{ fontSize:"1rem", fontWeight:800, color:"#fff" }}>
              💳 Paiement — Séance supplémentaire
            </div>
            <div style={{ fontSize:"0.72rem", color:"#c7d2fe", marginTop:3 }}>
              {candidatName} · Hors forfait
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,0.15)", border:"none",
            borderRadius:8, width:30, height:30,
            color:"#fff", cursor:"pointer", fontSize:14,
            display:"grid", placeItems:"center",
          }}>✕</button>
        </div>

        {/* Corps */}
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Montant */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{
              fontSize:"0.72rem", fontWeight:700, color:"#64748b",
              textTransform:"uppercase", letterSpacing:0.5,
            }}>
              Montant (DA) <span style={{ color:"#ef4444" }}>*</span>
            </label>
            <div style={{ position:"relative" }}>
              <input
                type="number"
                min="0"
                placeholder="Ex : 1500"
                value={montant}
                onChange={e => { setMontant(e.target.value); setError(""); }}
                style={{ ...inpS, paddingRight:40 }}
                autoFocus
              />
              <span style={{
                position:"absolute", right:12, top:"50%",
                transform:"translateY(-50%)",
                fontSize:"0.75rem", color:"#94a3b8", fontWeight:600,
              }}>DA</span>
            </div>
          </div>

          {/* Méthode */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{
              fontSize:"0.72rem", fontWeight:700, color:"#64748b",
              textTransform:"uppercase", letterSpacing:0.5,
            }}>
              Méthode de paiement
            </label>
            <div style={{ display:"flex", gap:8 }}>
              {[
                { val:"especes", label:"💵 Espèces" },
                { val:"ccp",     label:"🏦 CCP" },
                { val:"carte",   label:"💳 Carte" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setMethode(val)}
                  style={{
                    flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer",
                    fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600,
                    border:`2px solid ${methode===val ? "#6366f1" : "#e2e8f0"}`,
                    background: methode===val ? "#eef2ff" : "#f8fafc",
                    color: methode===val ? "#4338ca" : "#64748b",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Remarque */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{
              fontSize:"0.72rem", fontWeight:700, color:"#64748b",
              textTransform:"uppercase", letterSpacing:0.5,
            }}>
              Remarque
            </label>
            <input
              type="text"
              value={remarque}
              onChange={e => setRemarque(e.target.value)}
              style={inpS}
              placeholder="Séance supplémentaire"
            />
          </div>

          {/* Résumé */}
          {montant && !isNaN(parseFloat(montant)) && parseFloat(montant) > 0 && (
            <div style={{
              padding:"10px 14px", borderRadius:10,
              background:"#f0fdf4", border:"1px solid #86efac",
              fontSize:"0.8rem", color:"#166534",
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <span>✅ Versement à enregistrer</span>
              <strong style={{ fontSize:"1rem" }}>
                {parseInt(montant).toLocaleString("fr-DZ")} DA
              </strong>
            </div>
          )}

          {error && (
            <div style={{
              padding:"8px 12px", borderRadius:8,
              background:"#fef2f2", border:"1px solid #fca5a5",
              fontSize:"0.78rem", color:"#dc2626", fontWeight:600,
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:"0 24px 22px",
          display:"flex", gap:10,
        }}>
          <button onClick={onClose} disabled={saving} style={{
            flex:1, padding:"10px 0", borderRadius:10,
            background:"#f1f5f9", border:"none", color:"#64748b",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:600, cursor:"pointer",
          }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex:2, padding:"10px 0", borderRadius:10,
            background: saving ? "#a5b4fc" : "linear-gradient(135deg,#6366f1,#4f46e5)",
            border:"none", color:"#fff",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:700, cursor: saving ? "not-allowed" : "pointer",
            boxShadow:"0 4px 14px rgba(99,102,241,0.35)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
            {saving && (
              <div style={{
                width:13, height:13, borderRadius:"50%",
                border:"2px solid rgba(255,255,255,0.4)",
                borderTop:"2px solid #fff",
                animation:"spin 0.7s linear infinite",
              }} />
            )}
            {saving ? "Enregistrement…" : "💾 Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CALENDAR GRID ─────────────────────────────────────────────────────────────
function CalendarGrid({ sessions, weekDates, todayIdx, onSessionClick, onGroupClick, onDrop, isMoniteurEnConge, isCongeAnnuel, onCandidatPermisClick, aObtenuPermis }) {
  const [dragging, setDragging] = React.useState(null);
  const [dragOver, setDragOver] = React.useState(null);
// AJOUTER dans AgendaPage avec les autres useState :

  const dragRef = useRef(null);

  const handleDragStart = (e, session) => { dragRef.current = session; setDragging(session.id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragEnd   = () => { setDragging(null); setDragOver(null); dragRef.current = null; };
  const handleDragOver  = (e, day, hour) => { e.preventDefault(); e.dataTransfer.dropEffect="move"; setDragOver({day,hour}); };
  const handleDrop      = (e, day, hour) => { e.preventDefault(); if (dragRef.current) onDrop(dragRef.current.id, day, hour); setDragging(null); setDragOver(null); dragRef.current = null; };

  function findOverlapping(daySessions, targetSession) {
    return daySessions.filter(s =>
      s.id !== targetSession.id &&
      s.startH < targetSession.startH + targetSession.dur &&
      s.startH + s.dur > targetSession.startH
    );
  }

  function assignColumns(daySessions) {
    const sorted = [...daySessions].sort((a, b) => a.startH - b.startH);
    const columns = [];
    const withCol = sorted.map(s => {
      const endH = s.startH + s.dur;
      let colIdx = columns.findIndex(colEnd => colEnd <= s.startH);
      if (colIdx === -1) { columns.push(endH); colIdx = columns.length - 1; }
      else { columns[colIdx] = endH; }
      return { session: s, colIdx };
    });
    const items = withCol.map(({ session: s, colIdx }) => {
      const overlappingCount = withCol.filter(({ session: other }) =>
        other.id !== s.id &&
        other.startH < s.startH + s.dur &&
        other.startH + other.dur > s.startH
      ).length;
      return { session: s, colIdx, localCols: overlappingCount + 1 };
    });
    return { items };
  }

  return (
    <div style={{ border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", background:"#fff", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* En-têtes jours */}
      <div style={{ display:"grid", gridTemplateColumns:"52px repeat(7,1fr)", background:"#f8fafc", borderBottom:"2px solid #e2e8f0", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ borderRight:"1px solid #e2e8f0", fontSize:"0.65rem", color:"#94a3b8", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600 }}>Heure</div>
        {weekDates.map((date,i) => {
          const isToday  = i === todayIdx;
          const isClosed = isCongeAnnuel ? isCongeAnnuel(date) : false;
          return (
            <div key={i} style={{ padding:"10px 6px", textAlign:"center", borderRight:"1px solid #e2e8f0", background: isClosed ? "rgba(249,115,22,0.06)" : isToday ? "rgba(37,99,235,0.06)" : "transparent" }}>
              <div style={{ fontSize:"0.6rem", fontWeight:600, textTransform:"uppercase", letterSpacing:1, color: isClosed ? "#f97316" : isToday ? "#2563eb" : "#94a3b8" }}>{DAYS_SHORT[date.getDay()]}</div>
              <div style={{ fontSize:"0.92rem", fontWeight:700, color: isToday ? "#fff" : isClosed ? "#f97316" : "#334155", marginTop:3, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {isToday
                  ? <div style={{ width:26, height:26, borderRadius:"50%", background:"#2563eb", display:"grid", placeItems:"center", fontSize:"0.88rem" }}>{date.getDate()}</div>
                  : date.getDate()
                }
              </div>
              <div style={{ fontSize:"0.6rem", color: isClosed ? "#f97316" : "#94a3b8", marginTop:1 }}>
                {isClosed ? "🏖️ Fermé" : date.toLocaleDateString("fr-FR",{month:"short"})}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grille heures */}
      <div style={{ display:"grid", gridTemplateColumns:"52px repeat(7,1fr)" }}>
        <div style={{ borderRight:"1px solid #e2e8f0" }}>
          {HOURS.map(h => (
            <div key={h} style={{ height:CELL_H, borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"flex-start", padding:"5px 8px 0", fontSize:"0.62rem", fontWeight:600, color:"#94a3b8" }}>{h}:00</div>
          ))}
        </div>
        {weekDates.map((dateOfDay, dayIdx) => {
          const isToday  = dayIdx === todayIdx;
          const isClosed = isCongeAnnuel ? isCongeAnnuel(dateOfDay) : false;
          const daySessions = sessions.filter(s => s.day === dayIdx);
          const { items: columnedSessions } = assignColumns(daySessions);
          return (
            <div key={dayIdx} style={{ position:"relative", borderRight:"1px solid #e2e8f0", background: isClosed ? "repeating-linear-gradient(45deg, rgba(249,115,22,0.04), rgba(249,115,22,0.04) 10px, transparent 10px, transparent 20px)" : isToday ? "rgba(37,99,235,0.015)" : "transparent" }}>
              {/* Overlay "fermé" */}
              {isClosed && (
                <div style={{ position:"absolute", inset:0, zIndex:3, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <div style={{ background:"rgba(249,115,22,0.1)", border:"1px dashed #fed7aa", borderRadius:10, padding:"6px 12px", fontSize:"0.7rem", fontWeight:700, color:"#ea580c", transform:"rotate(-3deg)" }}>
                    🏖️ Fermé
                  </div>
                </div>
              )}

              {HOURS.map((h, hIdx) => {
                const isTarget = !isClosed && dragOver && dragOver.day===dayIdx && dragOver.hour===h;
                return (
                  <div key={h} style={{ height:CELL_H, borderBottom: hIdx < HOURS.length-1 ? "1px solid #f1f5f9" : "none", background: isTarget ? "rgba(37,99,235,0.07)" : "transparent", position:"relative", transition:"background 0.1s" }}
                    onDragOver={isClosed ? undefined : e => handleDragOver(e, dayIdx, h)}
                    onDrop={isClosed ? undefined : e => handleDrop(e, dayIdx, h)}>
                    {isTarget && <div style={{ position:"absolute", inset:2, border:"2px dashed rgba(37,99,235,0.4)", borderRadius:6, pointerEvents:"none" }} />}
                  </div>
                );
              })}

              {columnedSessions.map(({ session: s, colIdx, localCols }) => {
                const firstHour = HOURS[0];
                const topPx = (s.startH - firstHour) * CELL_H;
                if (s.startH < firstHour || s.startH >= firstHour + HOURS.length) return null;
                const colData    = COLORS[s.type] || COLORS.code;
                const isDragging = dragging === s.id;
                const overlapping = findOverlapping(daySessions, s);
                const hasOverlap  = overlapping.length > 0;
                const groupSessions = hasOverlap
                  ? [s, ...overlapping].filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
                  : [s];
                const widthPct = 100 / localCols;
                const leftPct  = colIdx * widthPct;
                const congeConflict = !!(isMoniteurEnConge && s._raw?.moniteur_id && isMoniteurEnConge(s._raw.moniteur_id, dateOfDay));

                // Vérification permis obtenu pour ce candidat
                const candidatId = s._raw?.candidatsIds
                  ? String(s._raw.candidatsIds).split(",")[0].trim()
                  : null;
                const candidatAPermis = candidatId && aObtenuPermis ? aObtenuPermis(candidatId) : false;

                return (
                  <div key={s.id}
                    draggable={!isClosed}
                    onDragStart={isClosed ? undefined : e => handleDragStart(e, s)}
                    onDragEnd={handleDragEnd}
                    onClick={e => {
                      e.stopPropagation();
                      hasOverlap ? onGroupClick(groupSessions) : onSessionClick(s, e.currentTarget.getBoundingClientRect());
                    }}
                    title={congeConflict ? `⚠️ ${s.monitor} est en congé ce jour-là` : candidatAPermis ? "🎓 Cliquer sur le nom pour séance supp." : undefined}
                    style={{
                      position:"absolute", left:`calc(${leftPct}% + 2px)`, width:`calc(${widthPct}% - 4px)`,
                      top:topPx + 2, height:s.dur * CELL_H - 4, borderRadius:8, padding:"5px 8px",
                      cursor:isDragging ? "grabbing" : "pointer", userSelect:"none",
                      background:colData.light, borderLeft:`3px solid ${congeConflict ? "#f97316" : colData.bg}`,
                      outline: congeConflict ? "1.5px dashed #f97316" : "none", outlineOffset: congeConflict ? -1 : 0,
                      boxShadow:hasOverlap ? `0 0 0 2px ${colData.bg}, 0 2px 8px ${colData.bg}50` : `0 1px 4px ${colData.bg}30`,
                      opacity:isDragging ? 0.4 : 1, transition:"transform 0.15s, box-shadow 0.15s",
                      overflow:"hidden", zIndex:isDragging ? 1 : 2,
                    }}
                    onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.zIndex=5; }}}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.zIndex=2; }}
                  >
                    {/* Nom candidat — cliquable si permis obtenu */}
                    <div
                      style={{
                        fontSize:"0.72rem", fontWeight:700,
                        color: candidatAPermis ? "#6366f1" : colData.text,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                        textDecoration: candidatAPermis ? "underline dotted" : "none",
                        cursor: candidatAPermis ? "pointer" : "inherit",
                      }}
                      onClick={candidatAPermis ? (e) => {
                        e.stopPropagation();
                        onCandidatPermisClick?.({
                          id:              candidatId,
                          nom:             s.name.split(" ").slice(-1)[0] || s.name,
                          prenom:          s.name.split(" ").slice(0, -1).join(" ") || "",
                          categoriePermis: s.categoriePermis || "B",
                        });
                      } : undefined}
                      title={candidatAPermis ? "🎓 Permis obtenu — cliquer pour séance supplémentaire" : undefined}
                    >
                      {candidatAPermis && <span style={{ marginRight:3 }}>🎓</span>}
                      {cap(s.name)}
                    </div>

                    <div style={{ fontSize:"0.62rem", color:"#64748b", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.monitor}</div>
                    {hasOverlap && (
                      <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:colData.bg, color:"white", fontSize:"0.6rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {groupSessions.length}
                      </div>
                    )}
                    {congeConflict && (
                      <div style={{ position:"absolute", top:4, left:4, width:16, height:16, borderRadius:"50%", background:"#f97316", color:"white", fontSize:"0.58rem", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        🌴
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const navigate = useNavigate();
  const [sessions,        setSessions]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [toast,           setToast]           = useState(null);
  const [weekBase,        setWeekBase]        = useState(() => getMondayOfWeek(new Date()));
  const [showModal,       setShowModal]       = useState(false);
  const [editing,         setEditing]         = useState(null);
  const [popup,           setPopup]           = useState({ session:null, anchor:null });
  const [groupModal,      setGroupModal]      = useState(null);
  const [search,          setSearch]          = useState("");
  const [filterType,      setFilterType]      = useState("");
  const [filterMon,       setFilterMon]       = useState("");
  const [filterCat,       setFilterCat]       = useState("");
  const [seanceSupModal,  setSeanceSupModal]  = useState(null); // { candidat }
 const [prefillCandidatId,  setPrefillCandidatId]  = useState(null);

const [seanceSupPaiement,  setSeanceSupPaiement]   = useState(null); // { candidatId, candidatName }

  const { isMoniteurEnConge, isCongeAnnuel, congeAnnuel } = useCongeCtx();
  const { examensList } = useExamenCtx();

  const weekDates = getWeekDates(weekBase);
  const weekLabel = formatWeekLabel(weekDates);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = weekDates.findIndex(d => { const c=new Date(d); c.setHours(0,0,0,0); return c.getTime()===today.getTime(); });

  const api = window.electron || null;
  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Helper : candidat a obtenu son permis ? ──────────────────────────────
  const aObtenuPermis = useCallback((candidatId) => {
    const exams = (examensList || []).filter(e => String(e.candidatId) === String(candidatId));
    return (
      exams.some(e => e.type === "Code"        && e.status === "Passed") &&
      exams.some(e => e.type === "Créneau"     && e.status === "Passed") &&
      exams.some(e => e.type === "Circulation" && e.status === "Passed")
    );
  }, [examensList]);

  useEffect(() => { loadSeances(); }, []);

  async function loadSeances() {
    setLoading(true);
    try {
      if (api?.getSeances) {
        const rows = await api.getSeances();
        if (Array.isArray(rows) && rows.length > 0) setSessions(rows.map(dbRowToSession));
      }
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const prevWeek = () => setWeekBase(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n; });
  const nextWeek = () => setWeekBase(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n; });
  const goToday  = () => setWeekBase(getMondayOfWeek(new Date()));

  const hasFilters = search || filterType || filterMon || filterCat;
  const resetFilters = () => { setSearch(""); setFilterType(""); setFilterMon(""); setFilterCat(""); };

  const filtered = sessions.filter(s => {
    const sessionISO   = toLocalISO(s._raw?.date);
    const weekStartISO = toLocalISO(weekDates[0]);
    const weekEndISO   = toLocalISO(weekDates[6]);
    const inWeek = sessionISO >= weekStartISO && sessionISO <= weekEndISO;
    return inWeek &&
      (!search     || s.name.toLowerCase().includes(search.toLowerCase()) || s.monitor.toLowerCase().includes(search.toLowerCase())) &&
      (!filterType || s.type    === filterType) &&
      (!filterMon  || String(s.moniteur_id) === String(filterMon)) &&
      (!filterCat  || s.categoriePermis === filterCat);
  });

  const handleDrop = useCallback(async (id, day, hour) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    const targetDateObj = new Date(toLocalISO(weekDates[day]) + "T12:00:00");

    if (isCongeAnnuel(targetDateObj)) {
      showToast(`🏖️ L'auto-école est fermée ce jour-là — déplacement annulé.`, "error");
      return;
    }
    if (session._raw?.moniteur_id && isMoniteurEnConge(session._raw.moniteur_id, targetDateObj)) {
      showToast(`⚠️ ${session.monitor} est en congé ce jour-là — déplacement annulé.`, "error");
      return;
    }

    setSessions(p => p.map(s => s.id === id ? { ...s, day, startH: hour } : s));
    const newDate  = toLocalISO(weekDates[day]);
    const newHeure = floatToHHMM(hour);
    if (api?.updateSeance) {
      try {
        await api.updateSeance({ id: session.id, date: newDate, heure: newHeure, type: session.type, statut: session._raw?.statut || "planifiée", moniteur_id: session._raw?.moniteur_id, duree: session.dur });
        await loadSeances();
        showToast("Séance déplacée avec succès.");
      } catch (err) {
        showToast("Erreur lors du déplacement.", "error");
        await loadSeances();
      }
    }
  }, [sessions, weekDates, api, isMoniteurEnConge, isCongeAnnuel]);

  const handleDelete = async (id) => {
    setSessions(p => p.filter(s => s.id !== id));
    if (groupModal) {
      const updated = groupModal.filter(s => s.id !== id);
      updated.length > 0 ? setGroupModal(updated) : setGroupModal(null);
    }
    if (api?.deleteSeance) {
      try { await api.deleteSeance(id); showToast("Séance supprimée.", "success"); }
      catch (err) { showToast("Erreur lors de la suppression.", "error"); }
    } else { showToast("Séance supprimée (mode démo).", "info"); }
  };

  const handleSave = async (sessionObj) => {
    const { _formData } = sessionObj;
    const [startHH, startMM] = _formData.heure.split(":").map(Number);
    const newStart = startHH + startMM / 60;
    const newEnd   = newStart + parseFloat(_formData.duree);

    const seanceDate = new Date(_formData.date + "T12:00:00");
    if (isCongeAnnuel(seanceDate)) {
      showToast(
        `🏖️ L'auto-école est fermée du ${formatDateFr(congeAnnuel.dateDebut)} au ${formatDateFr(congeAnnuel.dateFin)}. Aucune séance ne peut être créée durant cette période.`,
        "error"
      );
      return;
    }

 const conflict = sessions.find(s => {
  if (editing && String(s.id) === String(editing.id)) return false;
  if (toLocalISO(s._raw?.date) !== _formData.date) return false;

  const sameMoniteur = !!_formData.moniteur_id && !!s._raw?.moniteur_id
    && String(s._raw?.moniteur_id) === String(_formData.moniteur_id);

  const sCandidatIds = s._raw?.candidatsIds
    ? String(s._raw.candidatsIds).split(",").map(x => x.trim())
    : [];
  const sameCandidat = !!_formData.candidatIds?.[0]
    && sCandidatIds.includes(String(_formData.candidatIds[0]));

  if (!sameMoniteur && !sameCandidat) return false;
  return newStart < s.startH + s.dur && newEnd > s.startH;
});

if (conflict) {
  const conflictCandidatIds = conflict._raw?.candidatsIds
    ? String(conflict._raw.candidatsIds).split(",").map(x => x.trim())
    : [];
  const estCandidat = conflictCandidatIds.includes(String(_formData.candidatIds?.[0]));
  showToast(
    estCandidat
      ? `⚠️ Ce candidat a déjà une séance de ${floatToHHMM(conflict.startH)} à ${floatToHHMM(conflict.startH + conflict.dur)} ce jour-là.`
      : `⚠️ Ce moniteur est déjà occupé de ${floatToHHMM(conflict.startH)} à ${floatToHHMM(conflict.startH + conflict.dur)} ce jour-là.`,
    "error"
  );
  return;
}

    setSaving(true);
    try {
      if (api?.updateSeance && editing) {
        await api.updateSeance({
          id: editing.id, date: _formData.date, heure: _formData.heure,
          type: _formData.type, statut: _formData.statut,
          moniteur_id: _formData.moniteur_id, duree: _formData.duree,
          candidatId: _formData.candidatIds?.[0] || null,
        });
        await loadSeances();
        showToast("Séance modifiée avec succès.");

      } else if (api?.addSeance && !editing) {
        const result = await api.addSeance(_formData);
        if (result?.success) {
          await loadSeances();
          showToast("Séance créée avec succès.");

        const candidatId = _formData.candidatIds?.[0];
          if (candidatId) {
            const nomCandidat = sessionObj.name || "Ce candidat";
            if (aObtenuPermis(candidatId)) {
              const credit = getCredit(candidatId);
              if (credit > 0) {
                // Crédit déjà payé disponible → on consomme une unité, pas de paiement
                const resteApres = consumeCredit(candidatId);
                showToast(`🎓 Séance supplémentaire créée — crédit restant : ${resteApres}.`, "info");
              } else {
                // Plus de crédit → proposer l'achat d'un nouveau lot de séances
                setSeanceSupPaiement({ candidatId, candidatName: nomCandidat });
              }
            }
          }
        } else {
          throw new Error(result?.message || "Erreur lors de la création.");
        }
      } else {
        const { _formData: _fd, ...calendarFields } = sessionObj;
        if (editing) setSessions(p => p.map(e => e.id === calendarFields.id ? calendarFields : e));
        else setSessions(p => [...p, { ...calendarFields, id: Date.now() }]);
        showToast(editing ? "Séance modifiée (mode démo)." : "Séance créée (mode démo).", "info");
      }
    } catch (err) {
      showToast(err.message || "Une erreur est survenue.", "error");
    } finally {
      setSaving(false);
      setShowModal(false);
      setEditing(null);
      setPrefillCandidatId(null);
    }
  };
  const handleSeanceSupPaiement = async (paymentData) => {
  try {
    if (api?.addPayment) {
      const result = await api.addPayment(paymentData);
      if (result?.success) {
        showToast(`💳 Paiement séance supplémentaire enregistré — ${parseInt(paymentData.montant).toLocaleString("fr-DZ")} DA`, "success");
      } else {
        showToast("Erreur lors de l'enregistrement du paiement.", "error");
      }
    } else {
      showToast("Paiement enregistré (mode démo).", "info");
    }
  } catch (e) {
    showToast("Erreur lors de l'enregistrement du paiement.", "error");
  } finally {
    setSeanceSupPaiement(null);
  }
};

 const monitors = [...new Map(
  sessions
    .filter(s => s.moniteur_id)
    .map(s => [s.moniteur_id, s.monitor])
).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const semaineClosed = congeAnnuel?.actif && weekDates.some(d => isCongeAnnuel(d));

  // ── Ouverture CreateModal depuis SeanceSupplementaireModal ────────────────
 const handleConfirmSeanceSup = () => {
    const cid = seanceSupModal?.candidat?.id;
    const candidat = seanceSupModal?.candidat;
    setSeanceSupModal(null);
    // S'il n'a pas encore de crédit, on l'envoie payer d'abord plutôt que
    // de le laisser ouvrir CreateModal sans rien à programmer.
    navigate("/payments", {
      state: {
        openSeanceSup: true,
        candidatId:   cid,
        candidatName: `${candidat?.prenom || ""} ${candidat?.nom || ""}`.trim(),
      },
    });
  };

  return (
    <>
      <style>{FONT_LINK}</style>
      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:"#f1f5f9", fontFamily:"'Poppins',sans-serif", color:"#1e293b" }}>

        {/* HERO */}
        <div style={{ position:"relative", background:"linear-gradient(135deg,#dbeafe 0%,#bfdbfe 50%,#e0f2fe 100%)", borderBottom:"1px solid #bfdbfe", padding:"0 28px", flexShrink:0, overflow:"hidden", minHeight:110 }}>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:6, background:"repeating-linear-gradient(90deg,#fbbf24 0,#fbbf24 30px,transparent 30px,transparent 60px)", opacity:0.6 }} />
          <div style={{ position:"absolute", right:120, bottom:8, opacity:0.9 }}>
            <svg width="160" height="80" viewBox="0 0 320 160" fill="none">
              <ellipse cx="160" cy="148" rx="148" ry="10" fill="rgba(0,0,0,0.08)" />
              <rect x="30" y="90" width="260" height="60" rx="10" fill="#3b82f6" />
              <rect x="55" y="65" width="210" height="55" rx="12" fill="#2563eb" />
              <rect x="72" y="75" width="65" height="36" rx="4" fill="#bfdbfe" opacity=".95" />
              <rect x="183" y="75" width="65" height="36" rx="4" fill="#bfdbfe" opacity=".95" />
              <circle cx="95" cy="153" r="20" fill="#1e293b" />
              <circle cx="225" cy="153" r="20" fill="#1e293b" />
              <circle cx="95" cy="153" r="9" fill="#3b82f6" />
              <circle cx="225" cy="153" r="9" fill="#3b82f6" />
              <rect x="270" y="98" width="22" height="8" rx="3" fill="#fcd34d" />
              <rect x="28" y="98" width="16" height="8" rx="2" fill="#f87171" />
            </svg>
          </div>
          <div style={{ position:"absolute", right:40, bottom:0, opacity:0.85 }}>
            <svg width="36" height="100" viewBox="0 0 50 160" fill="none">
              <rect x="15" y="0" width="20" height="130" rx="10" fill="#334155" />
              <rect x="5" y="8" width="40" height="112" rx="10" fill="#1e293b" />
              <circle cx="25" cy="30" r="11" fill="#ef4444" />
              <circle cx="25" cy="63" r="11" fill="#fbbf24" />
              <circle cx="25" cy="96" r="11" fill="#22c55e" />
            </svg>
          </div>
          <div style={{ position:"absolute", right:280, bottom:10, opacity:0.7 }}>
            <svg width="40" height="40" viewBox="0 0 80 80" fill="none">
              <polygon points="40,5 75,70 5,70" fill="#fbbf24" stroke="#f59e0b" strokeWidth="3"/>
              <text x="40" y="58" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#1e293b">!</text>
            </svg>
          </div>
          <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:20, padding:"18px 0" }}>
            <div>
              <h1 style={{ fontSize:"1.9rem", fontWeight:800, color:"#1e3a8a", margin:0, letterSpacing:-0.5 }}>Agenda</h1>
              <div style={{ fontSize:"0.75rem", color:"#3b82f6", marginTop:2, fontWeight:500 }}>Planification et suivi des séances</div>
            </div>
            <div style={{ fontSize:"1.05rem", fontWeight:700, color:"#1e3a8a", marginLeft:"auto" }}>
              {weekDates[0] && `${weekDates[0].getDate()} – ${weekDates[6].getDate()} ${weekDates[6].toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}`}
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 28px", borderBottom:"1px solid #e2e8f0", background:"#fff", flexShrink:0, gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={prevWeek} style={{ width:30, height:30, borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#64748b", cursor:"pointer", display:"grid", placeItems:"center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize:"0.85rem", fontWeight:600, color:"#334155", minWidth:220, textAlign:"center" }}>{weekLabel}</span>
            <button onClick={nextWeek} style={{ width:30, height:30, borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#64748b", cursor:"pointer", display:"grid", placeItems:"center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button onClick={goToday} style={{ padding:"7px 14px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#3b82f6", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", fontWeight:600, cursor:"pointer" }}>Aujourd'hui</button>
            <button onClick={loadSeances} disabled={loading} title="Rafraîchir"
              style={{ width:30, height:30, borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#64748b", cursor: loading ? "not-allowed" : "pointer", display:"grid", placeItems:"center", opacity: loading ? 0.5 : 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
          <Button text="+ Ajouter Séance" onClick={() => { setPrefillCandidatId(null); setEditing(null); setShowModal(true); }} />
        </div>

        {/* FILTRES */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 28px", borderBottom:"1px solid #e2e8f0", background:"#fff", flexShrink:0, flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:200, maxWidth:320 }}>
            <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px 8px 32px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, color:"#1e293b", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none" }}
              type="text" placeholder="Rechercher candidat ou moniteur..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Type :</span>
          <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#334155", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none", cursor:"pointer" }}
            value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">Tous</option>
            <option value="code">Code</option>
            <option value="circulation">Circulation</option>
            <option value="creneau">Créneau</option>
          </select>
          <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Moniteur :</span>
          <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#334155", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none", cursor:"pointer" }}
            value={filterMon} onChange={e=>setFilterMon(e.target.value)}>
            <option value="">Tous</option>
           {monitors.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
          </select>
          <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Catégorie :</span>
          <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#334155", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none", cursor:"pointer" }}
            value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">Toutes</option>
            {CATEGORIES_PERMIS.map(cat=><option key={cat} value={cat}>{cat}</option>)}
          </select>
          {hasFilters && (
            <button onClick={resetFilters} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>✕ Réinitialiser</button>
          )}
          <div style={{ marginLeft:"auto", fontSize:"0.72rem", color:"#94a3b8", background:"#f8fafc", border:"1px solid #e2e8f0", padding:"3px 12px", borderRadius:20 }}>
            {filtered.length} séance{filtered.length!==1?"s":""}
          </div>
        </div>

        {/* CALENDRIER */}
        <div style={{ flex:1, overflowY:"auto", overflowX:"auto", padding:"16px 28px 20px", position:"relative" }}>
          {loading && (
            <div style={{ position:"absolute", inset:0, zIndex:20, background:"rgba(241,245,249,0.7)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #e2e8f0", borderTop:"3px solid #2563eb", animation:"spin 0.75s linear infinite" }} />
              <span style={{ fontSize:"0.8rem", color:"#64748b", fontWeight:500 }}>Chargement des séances…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {semaineClosed && <CongeAnnuelBanner congeAnnuel={congeAnnuel} />}

          <CalendarGrid
            sessions={filtered}
            weekDates={weekDates}
            todayIdx={todayIdx}
            onSessionClick={(s, rect) => setPopup({ session:s, anchor:rect })}
            onGroupClick={(group) => setGroupModal(group)}
            onDrop={handleDrop}
            isMoniteurEnConge={isMoniteurEnConge}
            isCongeAnnuel={isCongeAnnuel}
            aObtenuPermis={aObtenuPermis}
            onCandidatPermisClick={(candidat) => setSeanceSupModal({ candidat })}
          />
        </div>

        {/* LÉGENDE */}
        <div style={{ display:"flex", alignItems:"center", gap:24, padding:"10px 28px 14px", background:"#fff", borderTop:"1px solid #e2e8f0", flexShrink:0 }}>
          {Object.entries(COLORS).map(([type, col]) => (
            <div key={type} style={{ display:"flex", alignItems:"center", gap:7, fontSize:"0.76rem", color:"#64748b" }}>
              <div style={{ width:12, height:12, borderRadius:3, background:col.bg }} />{cap(type)}
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.72rem", color:"#6366f1", background:"#eef2ff", border:"1px solid #c7d2fe", padding:"3px 10px", borderRadius:20 }}>
            🎓 Permis obtenu (clic sur nom → séance supp.)
          </div>
          {congeAnnuel?.actif && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.72rem", color:"#ea580c", background:"#fff7ed", border:"1px solid #fed7aa", padding:"3px 10px", borderRadius:20 }}>
              🏖️ Congé annuel actif
            </div>
          )}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, fontSize:"0.7rem", color:"#94a3b8" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background: window.electron ? "#22c55e" : "#f59e0b" }} />
            {window.electron ? "Connecté à la base de données" : "Mode démo (hors connexion)"}
          </div>
        </div>
      </div>

      {/* ── POPUPS & MODALES ── */}
      {popup.session && (
        <SessionPopup
          session={popup.session}
          anchor={popup.anchor}
          onClose={() => setPopup({session:null, anchor:null})}
          onDelete={handleDelete}
          onEdit={s => { setEditing(s); setPrefillCandidatId(null); setShowModal(true); setPopup({session:null,anchor:null}); }}
        />
      )}
      {groupModal && (
        <GroupModal
          sessions={groupModal}
          onClose={() => setGroupModal(null)}
          onDelete={handleDelete}
          onEdit={s => { setEditing(s); setPrefillCandidatId(null); setShowModal(true); setGroupModal(null); }}
        />
      )}
      {showModal && (
        <CreateModal
          onClose={() => { setShowModal(false); setEditing(null); setPrefillCandidatId(null); }}
          onCreate={handleSave}
          weekDates={weekDates}
          editing={editing}
          saving={saving}
          sessions={sessions}
          prefillCandidatId={prefillCandidatId}
        />
      )}

   
     

      {/* Séance supplémentaire : candidat permis obtenu */}
      {seanceSupModal && (
        <SeanceSupplementaireModal
          candidat={seanceSupModal.candidat}
          onClose={() => setSeanceSupModal(null)}
          onConfirm={handleConfirmSeanceSup}
        />
      )}
      {seanceSupPaiement && (
  <SeanceSupPaiementModal
    candidatName={seanceSupPaiement.candidatName}
    candidatId={seanceSupPaiement.candidatId}
    onClose={() => setSeanceSupPaiement(null)}
    onConfirm={handleSeanceSupPaiement}
  />
)}


      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}