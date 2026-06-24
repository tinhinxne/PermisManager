import React, { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import { useExamenCtx } from "../context/ExamenContext";
import { useCongeCtx } from "../context/CongeContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const HOURS      = [7,8,9,10,11,12,13,14,15,16,17,18];
const DAYS_SHORT = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const CELL_H     = 72;

const COLORS = {
  code:        { bg:"#3b82f6", light:"rgba(59,130,246,0.18)",  border:"rgba(59,130,246,0.4)",  text:"#1d4ed8" },
  creneau:     { bg:"#f59e0b", light:"rgba(245,158,11,0.18)",  border:"rgba(245,158,11,0.4)",  text:"#92400e" },
  circulation: { bg:"#10b981", light:"rgba(16,185,129,0.18)",  border:"rgba(16,185,129,0.4)",  text:"#065f46" },
};

const normCat = v => (v || "").toString().trim().toUpperCase();
const cap = s => s.split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");

function floatToHHMM(h) {
  const hours = Math.floor(h);
  const mins  = Math.round((h % 1) * 60);
  return `${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}`;
}

function toLocalISO(dateVal) {
  if (!dateVal) return "";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function dbRowToSession(row) {
  const rawDate   = toLocalISO(row.date);
  const dateObj   = new Date(rawDate + "T12:00:00");
  const parts     = (row.heure || "08:00").split(":");
  const startH    = parseInt(parts[0]) + parseInt(parts[1]||0)/60;
  const firstName = row.candidatsNoms ? row.candidatsNoms.split(", ")[0].trim() : "—";
  return {
    id:          row.idSeance,
    name:        firstName,
    monitor:     row.moniteurNom || "—",
    moniteur_id: row.moniteur_id,
    type: (() => {
      const raw = (row.type || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (raw.includes("circ")) return "circulation";
      if (raw.includes("cr"))   return "creneau";
      return "code";
    })(),
    day:         dateObj.getDay(),
    startH,
    dur:         parseFloat(row.duree) || 1,
    notes:       row.statut || "",
    categoriePermis: normCat(row.categoriePermis || row.categorie || row.categorie_permis),
    _raw:        row,
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
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type==="success" ? "#22c55e" : type==="error" ? "#ef4444" : "#3b82f6";
  return (
    <div style={{ position:"fixed", bottom:24, right:28, zIndex:500, background:bg, color:"#fff",
      padding:"11px 20px", borderRadius:10, fontFamily:"'Poppins',sans-serif",
      fontSize:"0.82rem", fontWeight:600, boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
      animation:"slideUp 0.25s ease" }}>
      {message}
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div style={{ position:"absolute", inset:0, zIndex:50, background:"rgba(248,250,252,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid #e2e8f0",
        borderTop:"3px solid #2563eb", animation:"spin 0.75s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── LOCKED TOOLTIP ────────────────────────────────────────────────────────────
function LockedTooltip({ children }) {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position:"absolute", bottom:"110%", left:"50%", transform:"translateX(-50%)",
          background:"#1e293b", color:"#fff", padding:"7px 13px", borderRadius:8,
          fontSize:"0.72rem", fontWeight:500, whiteSpace:"nowrap", zIndex:999,
          boxShadow:"0 8px 24px rgba(0,0,0,0.25)", pointerEvents:"none" }}>
          🔒 Permission requise par l'admin
          <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
            width:0, height:0, borderLeft:"6px solid transparent",
            borderRight:"6px solid transparent", borderTop:"6px solid #1e293b" }} />
        </div>
      )}
    </div>
  );
}

// ── MILESTONE MODAL ───────────────────────────────────────────────────────────
function MilestoneModal({ candidatName, onClose }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"rgba(15,23,42,0.6)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Poppins',sans-serif",
    }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff", borderRadius:20, width:420, maxWidth:"94vw",
        boxShadow:"0 30px 80px rgba(0,0,0,0.2)", overflow:"hidden",
        animation:"milestoneUp .25s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <style>{`@keyframes milestoneUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{
          background:"linear-gradient(135deg,#22c55e,#16a34a)",
          padding:"22px 24px 18px", textAlign:"center",
        }}>
          <div style={{ fontSize:44, marginBottom:4 }}>🎓</div>
          <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#fff" }}>Formation complète !</div>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <p style={{ fontSize:"0.9rem", color:"#1e293b", fontWeight:600, margin:"0 0 8px", textAlign:"center" }}>
            🎉 <strong>{candidatName}</strong> vient d'atteindre ses <strong>20 séances</strong> !
          </p>
          <p style={{ fontSize:"0.8rem", color:"#64748b", margin:"0 0 4px", textAlign:"center" }}>
            Il peut désormais se présenter à l'examen du permis de conduire.
          </p>
          <div style={{
            marginTop:14, padding:"10px 16px", borderRadius:10,
            background:"#f0fdf4", border:"1px solid #86efac",
            fontSize:"0.78rem", color:"#166534", fontWeight:600, textAlign:"center",
          }}>
            ✅ Formation théorique et pratique terminée
          </div>
        </div>
        <div style={{ padding:"0 24px 20px", display:"flex", justifyContent:"center" }}>
          <button onClick={onClose} style={{
            padding:"10px 36px", borderRadius:10, background:"#16a34a",
            border:"none", color:"#fff", fontFamily:"'Poppins',sans-serif",
            fontSize:"0.88rem", fontWeight:700, cursor:"pointer",
          }}>Compris</button>
        </div>
      </div>
    </div>
  );
}

// ── SÉANCE SUPPLÉMENTAIRE MODAL ───────────────────────────────────────────────
function SeanceSupplementaireModal({ candidat, onClose, onConfirm }) {
  if (!candidat) return null;
  const nomComplet = `${candidat.prenom || ""} ${candidat.nom || ""}`.trim();

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:600,
      background:"rgba(15,23,42,0.6)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Poppins',sans-serif",
    }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff", borderRadius:20, width:440, maxWidth:"94vw",
        boxShadow:"0 30px 80px rgba(0,0,0,0.2)", overflow:"hidden",
        animation:"milestoneUp .25s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <div style={{
          background:"linear-gradient(135deg,#6366f1,#4f46e5)",
          padding:"22px 24px 18px", textAlign:"center",
        }}>
          <div style={{ fontSize:40, marginBottom:4 }}>🚗➕</div>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#fff" }}>Séance supplémentaire</div>
          <div style={{ fontSize:"0.75rem", color:"#c7d2fe", marginTop:4 }}>Candidat ayant obtenu son permis</div>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
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
          <div style={{ display:"flex", gap:8 }}>
            {["Code","Créneau","Circulation"].map(t => (
              <div key={t} style={{
                flex:1, padding:"8px 0", borderRadius:8, textAlign:"center",
                background:"#f0fdf4", border:"1px solid #86efac",
                fontSize:"0.72rem", color:"#166534", fontWeight:600,
              }}>✅ {t}</div>
            ))}
          </div>
        </div>
        <div style={{ padding:"0 24px 20px", display:"flex", gap:10, justifyContent:"space-between" }}>
          <button onClick={onClose} style={{
            padding:"10px 20px", borderRadius:10,
            background:"#f1f5f9", border:"none", color:"#64748b",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:600, cursor:"pointer",
          }}>Annuler</button>
          <button onClick={onConfirm} style={{
            padding:"10px 26px", borderRadius:10,
            background:"linear-gradient(135deg,#6366f1,#4f46e5)",
            border:"none", color:"#fff",
            fontFamily:"'Poppins',sans-serif", fontSize:"0.84rem",
            fontWeight:700, cursor:"pointer",
            boxShadow:"0 4px 14px rgba(99,102,241,0.35)",
          }}>📅 Planifier la séance</button>
        </div>
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

// ── GROUP MODAL ───────────────────────────────────────────────────────────────
function GroupModal({ sessions, onClose }) {
  if (!sessions || sessions.length === 0) return null;
  const first = sessions[0];
  const endH  = first.startH + first.dur;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(15,23,42,0.55)",
      display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins',sans-serif" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, width:640, maxWidth:"95vw",
        maxHeight:"82vh", display:"flex", flexDirection:"column",
        boxShadow:"0 30px 80px rgba(0,0,0,0.2)", overflow:"hidden" }}>
        <div style={{ padding:"20px 26px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"1rem", fontWeight:700, color:"#1e293b" }}>
              Séances du {DAYS_SHORT[first.day]} — {floatToHHMM(first.startH)} → {floatToHHMM(endH)}
            </div>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:4 }}>
              {sessions.length} séance{sessions.length>1?"s":""} sur ce créneau
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#64748b",
            width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14, display:"grid", placeItems:"center" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:12 }}>
          {sessions.map(s => {
            const col  = COLORS[s.type] || COLORS.code;
            const sEnd = s.startH + s.dur;
            return (
              <div key={s.id} style={{ border:`1px solid ${col.border}`, borderLeft:`4px solid ${col.bg}`,
                borderRadius:12, padding:"14px 16px", background:col.light,
                display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:"white",
                  border:`1px solid ${col.border}`, display:"flex", alignItems:"center",
                  justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:14, height:14, borderRadius:3, background:col.bg }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:"0.88rem", fontWeight:700, color:"#1e293b" }}>{cap(s.name)}</span>
                    <span style={{ fontSize:"0.68rem", fontWeight:600, padding:"2px 9px", borderRadius:20,
                      background:"white", color:col.text, border:`1px solid ${col.border}`,
                      textTransform:"capitalize", flexShrink:0 }}>{s.type}</span>
                  </div>
                  <div style={{ display:"flex", gap:16, fontSize:"0.75rem", color:"#64748b" }}>
                    <span>👤 <strong style={{ color:"#334155" }}>{s.monitor}</strong></span>
                    <span>🕐 {floatToHHMM(s.startH)} – {floatToHHMM(sEnd)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", background:"#f8fafc",
          display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:"0.7rem", color:"#94a3b8", fontStyle:"italic" }}>
            🔒 Vue lecture seule — contactez l'admin pour modifier
          </span>
          <button onClick={onClose} style={{ padding:"9px 22px", borderRadius:8, background:"#1e293b",
            border:"none", color:"white", fontFamily:"'Poppins',sans-serif",
            fontSize:"0.85rem", fontWeight:600, cursor:"pointer" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ── SESSION POPUP ─────────────────────────────────────────────────────────────
function SessionPopup({ session, anchor, onClose, isOwn, canEdit, onEdit, onDelete }) {
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
  const endH = session.startH + session.dur;

  return (
    <div ref={ref} style={{ position:"fixed", zIndex:200, top, left, background:"#fff",
      border:"1px solid #e2e8f0", borderRadius:14, width:250,
      boxShadow:"0 20px 60px rgba(0,0,0,0.15)", overflow:"hidden", fontFamily:"'Poppins',sans-serif" }}>
      <div style={{ padding:"13px 15px 10px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:"0.88rem", fontWeight:700, color:"#1e293b" }}>{cap(session.name)}</div>
          <div style={{ fontSize:"0.68rem", color:"#94a3b8", marginTop:2 }}>
            {DAYS_SHORT[session.day]} • {floatToHHMM(session.startH)} – {floatToHHMM(endH)}
          </div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16, padding:0 }}>✕</button>
      </div>
      <div style={{ padding:"12px 15px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Type :</span>
          <span style={{ fontWeight:700, padding:"3px 10px", borderRadius:20, background:col.light,
            color:col.text, border:`1px solid ${col.border}`, textTransform:"capitalize", fontSize:"0.72rem" }}>{session.type}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Candidat :</span>
          <span style={{ fontWeight:500, color:"#1e293b" }}>{cap(session.name)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Moniteur :</span>
          <span style={{ fontWeight:500, color:"#1e293b" }}>{session.monitor}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.78rem" }}>
          <span style={{ color:"#64748b" }}>Statut :</span>
          <span style={{ fontWeight:600, fontSize:"0.72rem", padding:"3px 10px", borderRadius:20,
            background: isOwn ? "rgba(16,185,129,0.12)" : "rgba(148,163,184,0.15)",
            color: isOwn ? "#065f46" : "#64748b",
            border: isOwn ? "1px solid rgba(16,185,129,0.3)" : "1px solid #e2e8f0" }}>
            {isOwn ? "✓ Ma séance" : "Autre moniteur"}
          </span>
        </div>
      </div>
      {isOwn && canEdit ? (
        <div style={{ display:"flex", gap:8, padding:"10px 13px", borderTop:"1px solid #e2e8f0", background:"#f8fafc" }}>
          <button onClick={() => { onDelete(session.id); onClose(); }}
            style={{ flex:1, padding:"7px", borderRadius:8, background:"rgba(239,68,68,0.08)",
              border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444",
              fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
            Supprimer
          </button>
          <button onClick={() => { onEdit(session); onClose(); }}
            style={{ flex:1, padding:"7px", borderRadius:8, background:"rgba(59,130,246,0.08)",
              border:"1px solid rgba(59,130,246,0.25)", color:"#3b82f6",
              fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
            Modifier
          </button>
        </div>
      ) : (
        <div style={{ padding:"10px 13px", borderTop:"1px solid #e2e8f0", background:"#f8fafc", textAlign:"center" }}>
          <span style={{ fontSize:"0.7rem", color:"#94a3b8", fontStyle:"italic" }}>
            {isOwn ? "🔒 Permission requise pour modifier" : "🔒 Vue lecture seule"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── CREATE / EDIT MODAL ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate, editing, saving, sessions, currentUserId, prefillCandidatId, isDateBloquee }) {
  const [candidats, setCandidats] = useState([]);
  const [alertInfo, setAlertInfo] = useState(null);
  const { examensList } = useExamenCtx();

  useEffect(() => {
    async function load() {
      try {
        if (window.electron) {
          const c = await window.electron.getCandidats();
          setCandidats(Array.isArray(c) ? c : []);
        }
      } catch(e) { console.error(e); }
    }
    load();
  }, []);

  const [form, setForm] = useState(editing ? {
    candidatId:  editing._raw?.candidatsIds ? String(editing._raw.candidatsIds.split(",")[0].trim()) : "",
    candidat:    editing.name,
    type:        editing.type,
    date:        toLocalISO(editing._raw?.date),
    heure:       floatToHHMM(editing.startH),
    statut:      editing._raw?.statut || "planifiée",
    dur:         String(editing.dur || 1),
  } : {
    candidatId: prefillCandidatId ? String(prefillCandidatId) : "",
    candidat:"",
    type:"code", date:toLocalISO(new Date()),
    heure:"08:00", statut:"planifiée", dur:"1",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const seanceDateObj  = form.date ? new Date(form.date + "T12:00:00") : null;
  const todayMidnight  = new Date(); todayMidnight.setHours(0,0,0,0);
  const dateEstPassee  = !!(seanceDateObj && seanceDateObj < todayMidnight);

  // ── Vérification congé sur la date choisie ─────────────────────────────────
  const congeBloquant = isDateBloquee ? isDateBloquee(form.date) : null;

  // ── Examens du candidat ────────────────────────────────────────────────────
  const examsCandidat  = (examensList || []).filter(e => String(e.candidatId) === String(form.candidatId));
  const aReussiCode    = examsCandidat.some(e => e.type === "Code"        && e.status === "Passed");
  const aReussiCreneau = examsCandidat.some(e => e.type === "Créneau"     && e.status === "Passed");
  const aReussiCirc    = examsCandidat.some(e => e.type === "Circulation" && e.status === "Passed");

  const permisObtenu   = aReussiCode && aReussiCreneau && aReussiCirc;
  const currentStage   = !aReussiCode ? "code" : !aReussiCreneau ? "creneau" : "circulation";

  useEffect(() => {
    if (!form.candidatId) return;
    if (permisObtenu) return;
    if (form.type !== currentStage) set("type", currentStage);
  }, [form.candidatId, currentStage, permisObtenu]);

  useEffect(() => {
    if (!prefillCandidatId || candidats.length === 0) return;
    const c = candidats.find(c => String(c.idCandidat) === String(prefillCandidatId));
    if (c) set("candidat", `${c.nom} ${c.prenom}`);
  }, [prefillCandidatId, candidats]);

  const inpS = {
    width:"100%", boxSizing:"border-box", background:"#fff",
    border:"1px solid #cbd5e1", borderRadius:8, padding:"9px 11px",
    color:"#1e293b", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", outline:"none",
  };

  const renderHeureOptions = () => {
    const duree = parseFloat(form.dur) || 1;
    const allSlots = [];
    for (let h = 7; h < 19; h++) {
      allSlots.push(h); allSlots.push(h+0.25); allSlots.push(h+0.5); allSlots.push(h+0.75);
    }
    const occupiedIntervals = (sessions || [])
      .filter(s => {
        const sDate = toLocalISO(s._raw?.date);
        const isOther = editing ? s.id !== editing.id : true;
        const sameMon = String(s.moniteur_id) === String(currentUserId);
        return sDate === form.date && isOther && sameMon;
      })
      .map(s => ({ start: s.startH, end: s.startH + s.dur }));

    const fmt = slot => {
      const h = Math.floor(slot); const m = Math.round((slot%1)*60);
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    };

    return allSlots.map(slot => {
      const slotEnd = slot + duree;
      if (slotEnd > 19) return null;
      const minutes = Math.round((slot%1)*60);
      const isValid = duree===0.75 ? [0,15,30,45].includes(minutes) : [0,30].includes(minutes);
      if (!isValid) return null;
      const conflict = occupiedIntervals.find(i => slot < i.end && slotEnd > i.start);
      const s = fmt(slot); const e = fmt(slotEnd);
      return (
        <option key={slot} value={s} disabled={!!conflict} style={{ color: conflict?"#cbd5e1":"#1e293b" }}>
          {conflict ? `${s} – ${e}  ✗` : `${s} – ${e}  ✓`}
        </option>
      );
    });
  };

  const isBlocked = dateEstPassee || !!congeBloquant;

  const handleSubmit = () => {
    if (!form.date || !form.heure || !form.type) return;

    if (dateEstPassee) {
      setAlertInfo({ icon:"📅", title:"Date dans le passé", message:"Vous ne pouvez pas planifier une séance à une date déjà passée. Veuillez choisir une date à partir d'aujourd'hui.", color:"#ef4444" });
      return;
    }
    if (congeBloquant) {
      setAlertInfo({
        icon:"🌴", title:"Congé actif sur cette période", color:"#f97316",
        message:`Vous êtes en congé du ${new Date(congeBloquant.dateDebut + "T12:00:00").toLocaleDateString("fr-FR")} au ${new Date(congeBloquant.dateFin + "T12:00:00").toLocaleDateString("fr-FR")}. Impossible de planifier une séance durant cette période.`,
      });
      return;
    }
    if (!form.candidatId) {
      setAlertInfo({ icon:"🧑", title:"Candidat manquant", message:"Veuillez sélectionner un candidat avant d'enregistrer la séance.", color:"#ef4444" });
      return;
    }
    if (!permisObtenu && form.type !== currentStage) {
      setAlertInfo({
        icon:"🚫", title:"Type de séance non autorisé", color:"#ef4444",
        message:`${form.candidat || "Ce candidat"} est actuellement au stade "${currentStage}". Seules les séances de ce type peuvent être créées pour lui.`,
      });
      return;
    }

    onCreate({
      id:          editing ? editing.id : Date.now(),
      name:        form.candidat,
      monitor:     editing?.monitor || "",
      moniteur_id: currentUserId,
      type:        form.type,
      day:         new Date(form.date+"T12:00:00").getDay(),
      startH:      parseInt(form.heure.split(":")[0]) + parseInt(form.heure.split(":")[1]||0)/60,
      dur:         parseFloat(form.dur) || 1,
      notes:       form.statut,
      _formData: {
        date:        form.date,
        heure:       form.heure,
        type:        form.type,
        statut:      form.statut,
        moniteur_id: currentUserId,
        candidatIds: form.candidatId ? [parseInt(form.candidatId)] : [],
        duree:       parseFloat(form.dur) || 1,
      },
    });
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(15,23,42,0.5)",
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:16, width:480, maxWidth:"96vw", maxHeight:"90vh",
        display:"flex", flexDirection:"column", boxShadow:"0 25px 60px rgba(0,0,0,0.2)",
        overflow:"hidden", fontFamily:"'Poppins',sans-serif", position:"relative" }}>
        {saving && <LoadingOverlay />}

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e2e8f0",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:"1.05rem", fontWeight:700, color:"#1e293b" }}>
              {editing ? "Modifier ma séance" : permisObtenu ? "🚗➕ Séance supplémentaire" : "Créer ma séance"}
            </div>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:3 }}>
              {permisObtenu
                ? "Séance hors forfait — candidat ayant obtenu son permis"
                : "La séance sera assignée à votre compte"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#64748b",
            width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:14,
            display:"grid", placeItems:"center" }}>✕</button>
        </div>

        <div style={{ padding:"18px 24px", overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Bannière permis obtenu */}
          {permisObtenu && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"#eef2ff", border:"1.5px solid #c7d2fe", fontSize:"0.78rem", color:"#4338ca", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>🎓</span>
              <div>
                <div>Permis obtenu — séance hors forfait</div>
                <div style={{ fontWeight:400, marginTop:2, fontSize:"0.72rem" }}>
                  Tous les types de séance sont disponibles. Le paiement se gère dans le module Paiements.
                </div>
              </div>
            </div>
          )}

          {/* Avertissement date passée */}
          {dateEstPassee && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"#fef2f2", border:"1.5px solid #fca5a5", fontSize:"0.78rem", color:"#dc2626", fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>📅</span>
              <div>
                <div>Date dans le passé</div>
                <div style={{ fontWeight:400, marginTop:2, fontSize:"0.72rem" }}>Vous ne pouvez pas créer une séance à une date déjà passée.</div>
              </div>
            </div>
          )}

          {/* ── Avertissement congé actif ────────────────────────────────────── */}
          {congeBloquant && !dateEstPassee && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:"#fff7ed", border:"1.5px solid #fed7aa", fontSize:"0.78rem", color:"#c2410c", fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>🌴</span>
              <div>
                <div>Congé actif sur cette période</div>
                <div style={{ fontWeight:400, marginTop:2, fontSize:"0.72rem" }}>
                  Du {new Date(congeBloquant.dateDebut + "T12:00:00").toLocaleDateString("fr-FR")} au{" "}
                  {new Date(congeBloquant.dateFin + "T12:00:00").toLocaleDateString("fr-FR")} — séance impossible.
                </div>
              </div>
            </div>
          )}

          {/* Candidat */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>
              Candidat <span style={{ color:"#ef4444" }}>*</span>
            </label>
            <select style={inpS} value={form.candidatId}
              onChange={e => {
                const c = candidats.find(x => String(x.idCandidat) === String(e.target.value));
                set("candidatId", e.target.value);
                set("candidat", c ? `${c.nom} ${c.prenom}` : "");
              }}>
              <option value="">Sélectionner candidat...</option>
              {candidats.map(c => <option key={c.idCandidat} value={c.idCandidat}>{c.nom} {c.prenom}</option>)}
            </select>
          </div>

          {/* Type / Date */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Type <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.type} disabled={!form.candidatId} onChange={e => set("type", e.target.value)}>
                {permisObtenu ? (
                  <>
                    <option value="code">Code</option>
                    <option value="creneau">Créneau</option>
                    <option value="circulation">Circulation</option>
                  </>
                ) : (
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
                style={{
                  ...inpS,
                  borderColor: dateEstPassee ? "#fca5a5" : congeBloquant ? "#fed7aa" : "#cbd5e1",
                  background:  dateEstPassee ? "#fef2f2" : congeBloquant ? "#fff7ed" : "#fff",
                }}
                type="date" value={form.date} onChange={e => set("date", e.target.value)}
              />
              {dateEstPassee && (
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#dc2626", fontWeight:600 }}>
                  <span>📅</span> Date dans le passé
                </div>
              )}
              {congeBloquant && !dateEstPassee && (
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#c2410c", fontWeight:600 }}>
                  <span>🌴</span> Congé actif
                </div>
              )}
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
              <select style={inpS} value={form.heure} onChange={e => set("heure", e.target.value)}>
                <option value="">Choisir un créneau...</option>
                {renderHeureOptions()}
              </select>
            </div>
          </div>

          {/* Statut */}
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Statut</label>
            <select style={inpS} value={form.statut} onChange={e => set("statut", e.target.value)}>
              <option value="planifiée">Planifiée</option>
              <option value="confirmée">Confirmée</option>
              <option value="annulée">Annulée</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:"9px 20px", borderRadius:8, background:"#f1f5f9", border:"1px solid #e2e8f0",
              color:"#64748b", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", cursor:"pointer", fontWeight:500 }}>
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || isBlocked}
            style={{
              padding:"9px 22px", borderRadius:8,
              background: isBlocked
                ? "#94a3b8"
                : saving ? "#93c5fd"
                : permisObtenu ? "linear-gradient(135deg,#6366f1,#4f46e5)"
                : "#2563eb",
              border:"none", color:"#fff", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem",
              fontWeight:600, cursor: saving || isBlocked ? "not-allowed" : "pointer",
              boxShadow: isBlocked ? "none" : permisObtenu ? "0 4px 14px rgba(99,102,241,0.35)" : "0 4px 14px rgba(37,99,235,0.35)",
              display:"flex", alignItems:"center", gap:8,
            }}
          >
            {saving && <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.4)", borderTop:"2px solid #fff", animation:"spin 0.7s linear infinite" }} />}
            {dateEstPassee ? "📅 Date passée"
              : congeBloquant ? "🌴 Congé actif"
              : editing ? "Enregistrer"
              : permisObtenu ? "📅 Planifier la séance"
              : "Créer la séance"}
          </button>
        </div>
      </div>
      {alertInfo && <AlertModal icon={alertInfo.icon} title={alertInfo.title} message={alertInfo.message} color={alertInfo.color} onClose={() => setAlertInfo(null)} />}
    </div>
  );
}

// ── CALENDAR GRID ─────────────────────────────────────────────────────────────
function CalendarGrid({ sessions, weekDates, todayIdx, onSessionClick, onGroupClick, currentUserId, onCandidatPermisClick, aObtenuPermis }) {

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
        other.startH + s.dur > s.startH
      ).length;
      return { session: s, colIdx, localCols: overlappingCount + 1 };
    });
    return { items };
  }

  function findOverlapping(daySessions, targetSession) {
    return daySessions.filter(s =>
      s.id !== targetSession.id &&
      s.startH < targetSession.startH + targetSession.dur &&
      s.startH + s.dur > targetSession.startH
    );
  }

  return (
    <div style={{ border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", background:"#fff", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Header jours */}
      <div style={{ display:"grid", gridTemplateColumns:"52px repeat(7,1fr)", background:"#f8fafc", borderBottom:"2px solid #e2e8f0", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ borderRight:"1px solid #e2e8f0", fontSize:"0.65rem", color:"#94a3b8", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600 }}>Heure</div>
        {weekDates.map((date,i) => {
          const isToday = i===todayIdx;
          return (
            <div key={i} style={{ padding:"10px 6px", textAlign:"center", borderRight:"1px solid #e2e8f0", background: isToday?"rgba(37,99,235,0.06)":"transparent" }}>
              <div style={{ fontSize:"0.6rem", fontWeight:600, textTransform:"uppercase", letterSpacing:1, color: isToday?"#2563eb":"#94a3b8" }}>{DAYS_SHORT[date.getDay()]}</div>
              <div style={{ fontSize:"0.92rem", fontWeight:700, color: isToday?"#fff":"#334155", marginTop:3, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {isToday ? <div style={{ width:26, height:26, borderRadius:"50%", background:"#2563eb", display:"grid", placeItems:"center", fontSize:"0.88rem" }}>{date.getDate()}</div> : date.getDate()}
              </div>
              <div style={{ fontSize:"0.6rem", color:"#94a3b8", marginTop:1 }}>{date.toLocaleDateString("fr-FR",{month:"short"})}</div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ display:"grid", gridTemplateColumns:"52px repeat(7,1fr)" }}>
        <div style={{ borderRight:"1px solid #e2e8f0" }}>
          {HOURS.map(h => (
            <div key={h} style={{ height:CELL_H, borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"flex-start", padding:"5px 8px 0", fontSize:"0.62rem", fontWeight:600, color:"#94a3b8" }}>{h}:00</div>
          ))}
        </div>

        {weekDates.map((_,dayIdx) => {
          const isToday = dayIdx===todayIdx;
          const daySessions = sessions.filter(s => s.day===dayIdx);
          const { items: columnedSessions } = assignColumns(daySessions);

          return (
            <div key={dayIdx} style={{ position:"relative", borderRight:"1px solid #e2e8f0", background: isToday?"rgba(37,99,235,0.015)":"transparent" }}>
              {HOURS.map((h,hIdx) => (
                <div key={h} style={{ height:CELL_H, borderBottom: hIdx<HOURS.length-1?"1px solid #f1f5f9":"none" }} />
              ))}

              {columnedSessions.map(({ session: s, colIdx, localCols }) => {
                const firstHour = HOURS[0];
                const topPx = (s.startH - firstHour) * CELL_H;
                if (s.startH < firstHour || s.startH >= firstHour + HOURS.length) return null;

                const isOwn    = String(s.moniteur_id) === String(currentUserId);
                const col      = COLORS[s.type] || COLORS.code;
                const candidatId = s._raw?.candidatsIds ? String(s._raw.candidatsIds.split(",")[0].trim()) : null;
                const hasPermis  = candidatId && aObtenuPermis ? aObtenuPermis(candidatId) : false;

                const overlapping   = findOverlapping(daySessions, s);
                const hasOverlap    = overlapping.length > 0;
                const groupSessions = hasOverlap
                  ? [s,...overlapping].filter((v,i,arr)=>arr.findIndex(x=>x.id===v.id)===i)
                  : [s];

                const widthPct = 100 / localCols;
                const leftPct  = colIdx * widthPct;

                return (
                  <div key={s.id}
                    onClick={e => { e.stopPropagation(); hasOverlap ? onGroupClick(groupSessions) : onSessionClick(s, e.currentTarget.getBoundingClientRect()); }}
                    style={{
                      position:   "absolute",
                      left:       `calc(${leftPct}% + 2px)`,
                      width:      `calc(${widthPct}% - 4px)`,
                      top:        topPx + 2,
                      height:     s.dur * CELL_H - 4,
                      borderRadius: 8,
                      padding:    "5px 8px",
                      cursor:     "pointer",
                      userSelect: "none",
                      background:   isOwn ? col.light : "rgba(148,163,184,0.10)",
                      borderLeft:   isOwn ? `3px solid ${col.bg}` : "3px solid #cbd5e1",
                      boxShadow:    hasOverlap
                        ? `0 0 0 2px ${col.bg},0 2px 8px ${col.bg}50`
                        : isOwn ? `0 1px 4px ${col.bg}30` : "none",
                      opacity:    isOwn ? 1 : 0.6,
                      transition: "transform 0.15s",
                      overflow:   "hidden",
                      zIndex:     2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.zIndex=5; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.zIndex=2; }}
                  >
                    <div
                      style={{ fontSize:"0.72rem", fontWeight:700, color: isOwn?col.text:"#94a3b8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                        cursor: hasPermis && onCandidatPermisClick ? "pointer" : "inherit",
                        textDecoration: hasPermis ? "underline dotted" : "none",
                      }}
                      onClick={e => {
                        if (hasPermis && onCandidatPermisClick) {
                          e.stopPropagation();
                          onCandidatPermisClick(s._raw);
                        }
                      }}
                    >
                      {hasPermis ? "🎓 " : ""}{cap(s.name)}
                    </div>
                    <div style={{ fontSize:"0.6rem", color: isOwn?"#64748b":"#b0bec5", marginTop:2, display:"flex", alignItems:"center", gap:3 }}>
                      {isOwn
                        ? <><span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block", flexShrink:0 }}/>Ma séance</>
                        : s.monitor}
                    </div>
                    {hasOverlap && (
                      <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%",
                        background:col.bg, color:"white", fontSize:"0.6rem", fontWeight:700,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {groupSessions.length}
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
export default function AgendaMoniteur() {
  const { currentUser }  = useAuth();
  const { CAN_ADD_SESSION } = useMyPermissions();
  const { examensList }  = useExamenCtx();
  const { isMoniteurEnConge, getCongeActifMoniteur, refreshMoniteur } = useCongeCtx();

  const currentUserId   = currentUser?.id;
  const CURRENT_MONITOR = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : "";

  const [sessions,      setSessions]     = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [saving,        setSaving]       = useState(false);
  const [toast,         setToast]        = useState(null);
  const [weekBase,      setWeekBase]     = useState(() => getMondayOfWeek(new Date()));
  const [popup,         setPopup]        = useState({ session:null, anchor:null });
  const [groupModal,    setGroupModal]   = useState(null);
  const [showModal,     setShowModal]    = useState(false);
  const [editing,       setEditing]      = useState(null);
  const [search,        setSearch]       = useState("");
  const [filterType,    setFilterType]   = useState("");
  const [showLocked,    setShowLocked]   = useState(false);

  const [seanceSupModal,    setSeanceSupModal]    = useState(null);
  const [milestoneModal,    setMilestoneModal]    = useState(null);
  const [prefillCandidatId, setPrefillCandidatId] = useState(null);

  const weekDates = getWeekDates(weekBase);
  const weekLabel = formatWeekLabel(weekDates);
  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = weekDates.findIndex(d => { const c=new Date(d); c.setHours(0,0,0,0); return c.getTime()===today.getTime(); });

  const api = window.electron || null;
  const showToast = (msg, type="success") => setToast({ message:msg, type });

  // ── Congé actif du moniteur connecté AUJOURD'HUI ──────────────────────────
  const congeAujourdhui = currentUserId ? getCongeActifMoniteur(currentUserId) : null;

  useEffect(() => {
    loadSeances();
    if (currentUserId) refreshMoniteur(currentUserId);
  }, [currentUserId]);

  async function loadSeances() {
    setLoading(true);
    try {
      if (api?.getSeances) {
        const rows = await api.getSeances();
        if (Array.isArray(rows)) setSessions(rows.map(dbRowToSession));
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ── Helper : un candidat a-t-il obtenu son permis ? ───────────────────────
  const aObtenuPermis = useCallback((candidatId) => {
    if (!candidatId || !examensList) return false;
    const exams = examensList.filter(e => String(e.candidatId) === String(candidatId));
    return (
      exams.some(e => e.type === "Code"        && e.status === "Passed") &&
      exams.some(e => e.type === "Créneau"     && e.status === "Passed") &&
      exams.some(e => e.type === "Circulation" && e.status === "Passed")
    );
  }, [examensList]);

  // ── isDateBloquee : retourne le congé si la date est bloquée ─────────────
  const isDateBloquee = useCallback((date) => {
    if (!date || !currentUserId) return null;
    const d = new Date(date + "T12:00:00");
    return getCongeActifMoniteur(currentUserId, d) || null;
  }, [currentUserId, getCongeActifMoniteur]);

  const handleCandidatPermisClick = (rawRow) => {
    const candidatId = rawRow?.candidatsIds ? String(rawRow.candidatsIds.split(",")[0].trim()) : null;
    const nom    = rawRow?.candidatsNoms ? rawRow.candidatsNoms.split(", ")[0].trim() : "—";
    setSeanceSupModal({
      idCandidat:     candidatId,
      nom:            nom.split(" ").slice(0,1).join(" "),
      prenom:         nom.split(" ").slice(1).join(" "),
      categoriePermis: normCat(rawRow?.categoriePermis || "B"),
    });
  };

  const prevWeek = () => setWeekBase(d => { const n=new Date(d); n.setDate(n.getDate()-7); return n; });
  const nextWeek = () => setWeekBase(d => { const n=new Date(d); n.setDate(n.getDate()+7); return n; });
  const goToday  = () => setWeekBase(getMondayOfWeek(new Date()));

  const filtered = sessions.filter(s => {
    const sessionISO   = toLocalISO(s._raw?.date);
    const weekStartISO = toLocalISO(weekDates[0]);
    const weekEndISO   = toLocalISO(weekDates[6]);
    const inWeek = sessionISO >= weekStartISO && sessionISO <= weekEndISO;
    return inWeek &&
      (!search     || s.name.toLowerCase().includes(search.toLowerCase())) &&
      (!filterType || s.type === filterType);
  });

  const totalMySessions = filtered.filter(s => String(s.moniteur_id)===String(currentUserId)).length;

  const handleDelete = async (id) => {
    const s = sessions.find(x => x.id===id);
    if (!s || String(s.moniteur_id) !== String(currentUserId)) {
      showToast("Vous ne pouvez supprimer que vos propres séances.", "error");
      return;
    }
    setSessions(p => p.filter(x => x.id!==id));
    if (groupModal) {
      const updated = groupModal.filter(x => x.id!==id);
      updated.length > 0 ? setGroupModal(updated) : setGroupModal(null);
    }
    if (api?.deleteSeance) {
      try { await api.deleteSeance(id); showToast("Séance supprimée."); }
      catch { showToast("Erreur lors de la suppression.", "error"); }
    }
  };

  const handleSave = async (sessionObj) => {
    const { _formData } = sessionObj;
    _formData.moniteur_id = currentUserId;

    // ── Blocage congé (double vérification côté parent) ──────────────────────
    const seanceDate   = new Date(_formData.date + "T12:00:00");
    const congeActif   = getCongeActifMoniteur(currentUserId, seanceDate);
    if (congeActif) {
      showToast(
        `🌴 Congé du ${new Date(congeActif.dateDebut + "T12:00:00").toLocaleDateString("fr-FR")} au ${new Date(congeActif.dateFin + "T12:00:00").toLocaleDateString("fr-FR")} — séance impossible.`,
        "error"
      );
      return;
    }

    const [startHH, startMM] = _formData.heure.split(":").map(Number);
    const newStart = startHH + startMM/60;
    const newEnd   = newStart + parseFloat(_formData.duree);

    const conflict = sessions.find(s => {
      if (editing && s.id===editing.id) return false;
      if (toLocalISO(s._raw?.date) !== _formData.date) return false;
      if (String(s.moniteur_id) !== String(currentUserId)) return false;
      return newStart < s.startH+s.dur && newEnd > s.startH;
    });

    if (conflict) {
      showToast(`⚠️ Vous êtes déjà occupé de ${floatToHHMM(conflict.startH)} à ${floatToHHMM(conflict.startH+conflict.dur)}.`, "error");
      return;
    }

    setSaving(true);
    try {
      if (api?.updateSeance && editing) {
        await api.updateSeance({ id:editing.id, ..._formData, candidatId:_formData.candidatIds?.[0]||null });
        await loadSeances(); showToast("Séance modifiée.");
      } else if (api?.addSeance && !editing) {
        const result = await api.addSeance(_formData);
        if (result?.success) {
          await loadSeances();
          showToast("Séance créée.");

          const candidatId = _formData.candidatIds?.[0];
          if (candidatId) {
            const seancesCandidat = sessions.filter(s => {
              const ids = s._raw?.candidatsIds ? s._raw.candidatsIds.split(",").map(x => parseInt(x.trim())) : [];
              return ids.includes(candidatId);
            });
            if (seancesCandidat.length + 1 >= 20) {
              const nom = sessionObj.name || "";
              setMilestoneModal(nom);
            }
          }
        } else throw new Error(result?.message || "Erreur.");
      }
    } catch(e) { showToast(e.message || "Erreur.", "error"); }
    finally {
      setSaving(false);
      setShowModal(false);
      setEditing(null);
      setPrefillCandidatId(null);
    }
  };

  return (
    <>
      <style>{FONT_LINK}</style>
      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:"#f1f5f9", fontFamily:"'Poppins',sans-serif", color:"#1e293b" }}>

        {/* ── BANDEAU CONGÉ ACTIF AUJOURD'HUI ────────────────────────────────── */}
        {congeAujourdhui && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 28px",
            background:"linear-gradient(90deg,#fff7ed,#ffedd5)",
            borderBottom:"1px solid #fed7aa",
            flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:"0.82rem", color:"#c2410c", fontWeight:600 }}>
              <span style={{ fontSize:20 }}>🌴</span>
              <div>
                <strong>Vous êtes en congé</strong> du{" "}
                {new Date(congeAujourdhui.dateDebut + "T12:00:00").toLocaleDateString("fr-FR")} au{" "}
                {new Date(congeAujourdhui.dateFin + "T12:00:00").toLocaleDateString("fr-FR")} — la création de séances est bloquée durant cette période.
              </div>
            </div>
          </div>
        )}

        {/* HERO */}
        <div style={{ position:"relative", background:"linear-gradient(135deg,#dbeafe 0%,#bfdbfe 50%,#e0f2fe 100%)", borderBottom:"1px solid #bfdbfe", padding:"0 28px", flexShrink:0, overflow:"hidden", minHeight:110 }}>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:6, background:"repeating-linear-gradient(90deg,#fbbf24 0,#fbbf24 30px,transparent 30px,transparent 60px)", opacity:0.6 }} />
          <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:20, padding:"18px 0" }}>
            <div>
              <h1 style={{ fontSize:"1.9rem", fontWeight:800, color:"#1e3a8a", margin:0 }}>Mon Agenda</h1>
              <div style={{ fontSize:"0.75rem", color:"#3b82f6", marginTop:2, fontWeight:500 }}>
                Vue moniteur — {CURRENT_MONITOR}
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.7)", borderRadius:10, padding:"8px 16px", border:"1px solid rgba(255,255,255,0.9)" }}>
              <div style={{ fontSize:"0.65rem", color:"#64748b", fontWeight:600, textTransform:"uppercase" }}>Mes séances cette semaine</div>
              <div style={{ fontSize:"1.4rem", fontWeight:800, color:"#2563eb", lineHeight:1.1 }}>
                {totalMySessions}<span style={{ fontSize:"0.7rem", color:"#94a3b8", fontWeight:500, marginLeft:4 }}>séances</span>
              </div>
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
            <button onClick={goToday} style={{ padding:"7px 14px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#3b82f6", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", fontWeight:600, cursor:"pointer" }}>
              Aujourd'hui
            </button>
            <button onClick={loadSeances} disabled={loading} title="Rafraîchir"
              style={{ width:30, height:30, borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#64748b", cursor: loading?"not-allowed":"pointer", display:"grid", placeItems:"center", opacity: loading?0.5:1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: loading?"spin 0.8s linear infinite":"none" }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>

          {CAN_ADD_SESSION ? (
            <button onClick={() => setShowModal(true)}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:8,
                background:"#2563eb", border:"none", color:"#fff", fontFamily:"'Poppins',sans-serif",
                fontSize:"0.83rem", fontWeight:600, cursor:"pointer", boxShadow:"0 4px 14px rgba(37,99,235,0.35)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter Séance
            </button>
          ) : (
            <LockedTooltip>
              <button onClick={() => setShowLocked(true)}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 18px", borderRadius:8,
                  background:"#e2e8f0", border:"1px solid #cbd5e1", color:"#94a3b8",
                  fontFamily:"'Poppins',sans-serif", fontSize:"0.83rem", fontWeight:600,
                  cursor:"not-allowed", filter:"grayscale(1)", userSelect:"none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                + Ajouter Séance
              </button>
            </LockedTooltip>
          )}
        </div>

        {showLocked && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 28px",
            background:"linear-gradient(90deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))",
            borderBottom:"1px solid rgba(239,68,68,0.15)", flexShrink:0 }}>
            <div style={{ fontSize:"0.8rem", color:"#b91c1c" }}>
              <strong>Action non autorisée</strong> — La création de séances est réservée aux administrateurs.
            </div>
            <button onClick={() => setShowLocked(false)} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
        )}

        {/* FILTERS */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 28px", borderBottom:"1px solid #e2e8f0", background:"#fff", flexShrink:0, flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:200, maxWidth:320 }}>
            <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px 8px 32px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, color:"#1e293b", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none" }}
              type="text" placeholder="Rechercher candidat..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Type :</span>
          <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", color:"#334155", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none", cursor:"pointer" }}
            value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">Tous</option>
            <option value="code">Code</option>
            <option value="circulation">Circulation</option>
            <option value="creneau">Créneau</option>
          </select>
          {(search||filterType) && (
            <button onClick={() => { setSearch(""); setFilterType(""); }}
              style={{ padding:"6px 12px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
              ✕ Réinitialiser
            </button>
          )}
          <div style={{ display:"flex", gap:12, marginLeft:"auto", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#64748b" }}>
              <div style={{ width:10, height:10, borderRadius:2, background:"#3b82f6" }} />Mes séances ({totalMySessions})
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#94a3b8" }}>
              <div style={{ width:10, height:10, borderRadius:2, background:"#cbd5e1" }} />Autres moniteurs
            </div>
          </div>
        </div>

        {/* CALENDRIER */}
        <div style={{ flex:1, overflowY:"auto", overflowX:"auto", padding:"16px 28px 20px", position:"relative" }}>
          {loading && (
            <div style={{ position:"absolute", inset:0, zIndex:20, background:"rgba(241,245,249,0.7)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #e2e8f0", borderTop:"3px solid #2563eb", animation:"spin 0.75s linear infinite" }} />
              <span style={{ fontSize:"0.8rem", color:"#64748b", fontWeight:500 }}>Chargement…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          <CalendarGrid
            sessions={filtered}
            weekDates={weekDates}
            todayIdx={todayIdx}
            currentUserId={currentUserId}
            aObtenuPermis={aObtenuPermis}
            onCandidatPermisClick={handleCandidatPermisClick}
            onSessionClick={(s, rect) => setPopup({ session:s, anchor:rect })}
            onGroupClick={(group) => setGroupModal(group)}
          />
        </div>

        {/* LÉGENDE */}
        <div style={{ display:"flex", alignItems:"center", gap:24, padding:"10px 28px 14px", background:"#fff", borderTop:"1px solid #e2e8f0", flexShrink:0 }}>
          {Object.entries(COLORS).map(([type, col]) => (
            <div key={type} style={{ display:"flex", alignItems:"center", gap:7, fontSize:"0.76rem", color:"#64748b" }}>
              <div style={{ width:12, height:12, borderRadius:3, background:col.bg }} />{cap(type)}
            </div>
          ))}
          <div style={{ marginLeft:"auto", fontSize:"0.7rem", color:"#94a3b8", fontStyle:"italic" }}>
            🎓 = Candidat permis obtenu (clic pour séance supplémentaire)
          </div>
        </div>
      </div>

      {/* Popup simple */}
      {popup.session && (
        <SessionPopup
          session={popup.session}
          anchor={popup.anchor}
          isOwn={String(popup.session.moniteur_id)===String(currentUserId)}
          canEdit={CAN_ADD_SESSION}
          onClose={() => setPopup({session:null,anchor:null})}
          onDelete={handleDelete}
          onEdit={s => { setEditing(s); setShowModal(true); setPopup({session:null,anchor:null}); }}
        />
      )}

      {groupModal && (
        <GroupModal sessions={groupModal} onClose={() => setGroupModal(null)} />
      )}

      {/* Modal création/édition */}
      {showModal && (
        <CreateModal
          onClose={() => { setShowModal(false); setEditing(null); setPrefillCandidatId(null); }}
          onCreate={handleSave}
          editing={editing}
          saving={saving}
          sessions={sessions}
          currentUserId={currentUserId}
          prefillCandidatId={prefillCandidatId}
          isDateBloquee={isDateBloquee}
        />
      )}

      {/* Modal séance supplémentaire */}
      {seanceSupModal && (
        <SeanceSupplementaireModal
          candidat={seanceSupModal}
          onClose={() => setSeanceSupModal(null)}
          onConfirm={() => {
            setPrefillCandidatId(seanceSupModal.idCandidat);
            setSeanceSupModal(null);
            setShowModal(true);
          }}
        />
      )}

      {/* Modal milestone 20 séances */}
      {milestoneModal && (
        <MilestoneModal
          candidatName={milestoneModal}
          onClose={() => setMilestoneModal(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}