// src/renderer/pages/CoursCodeMoniteur.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import { useExamenCtx } from "../context/ExamenContext";
import {
  GraduationCap, Plus, Users, Clock,
  Trash2, PenLine, UserPlus,
  Search, RotateCcw, AlertCircle, CheckCircle2, XCircle,
  CalendarDays, Repeat, Lock, UserCog, BarChart3, ListVideo,
  Eye, EyeOff,
} from "lucide-react";

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES_PERMIS_ALL = ["A1","A","B","C1","C","D","F","BE","C1E","CE","DE"];
const DAYS_OPTIONS       = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const DAYS_ORDER         = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const JOURS_FULL = { Dim:"dimanche", Lun:"lundi", Mar:"mardi", Mer:"mercredi", Jeu:"jeudi", Ven:"vendredi", Sam:"samedi" };
const FONT_LINK = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`;

const DUREE_PRESETS = [
  { label: "30min", value: 0.5 },
  { label: "45min", value: 0.75 },
  { label: "1h",     value: 1 },
  { label: "1h15",   value: 1.25 },
  { label: "1h30",   value: 1.5 },
  { label: "1h45",   value: 1.75 },
  { label: "2h",     value: 2 },
  { label: "2h30",   value: 2.5 },
  { label: "3h",     value: 3 },
];

const normCat = v => (v || "").toString().trim().toUpperCase();

const moniteurCategories = (m) => {
  const raw = m?.categories_habilitees;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(",");
  return arr.map(normCat).filter(Boolean);
};

const cap = s => (s || "").split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");

function toLocalISO(dateVal) {
  if (!dateVal) return "";
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateFr(iso) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-DZ", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatDateCourt(iso) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-DZ", {
    day: "2-digit", month: "short",
  });
}

function formatDureeLabel(v) {
  const val = parseFloat(v) || 0;
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function countSeancesSerie(dateDebut, dateFin, jours) {
  if (!dateDebut || !dateFin || !jours?.length) return 0;
  const JOURS_MAP = { Dim:0, Lun:1, Mar:2, Mer:3, Jeu:4, Ven:5, Sam:6 };
  const idx = jours.map(j => JOURS_MAP[j]);
  let cur = new Date(dateDebut + "T12:00:00");
  const fin = new Date(dateFin + "T12:00:00");
  let count = 0;
  let safety = 0;
  while (cur <= fin && safety < 5000) {
    if (idx.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
    safety++;
  }
  return count;
}

// ── Plages de dates pour les filtres de période ─────────────────────────────
function getTodayISO() {
  return toLocalISO(new Date());
}

// Semaine calendaire lundi → dimanche (cohérent avec le reste de l'app)
function getWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0 = lundi
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toLocalISO(monday), toLocalISO(sunday)];
}

function getMonthRange() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last  = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return [toLocalISO(first), toLocalISO(last)];
}

const PERIOD_OPTIONS = [
  { key: "jour",    label: "Aujourd'hui" },
  { key: "semaine", label: "Cette semaine" },
  { key: "mois",    label: "Ce mois" },
  { key: "tous",    label: "Tous" },
];

function matchesPeriod(dateIso, period) {
  if (period === "tous") return true;
  if (period === "jour") return dateIso === getTodayISO();
  if (period === "semaine") {
    const [start, end] = getWeekRange();
    return dateIso >= start && dateIso <= end;
  }
  if (period === "mois") {
    const [start, end] = getMonthRange();
    return dateIso >= start && dateIso <= end;
  }
  return true;
}

const STATUT_PRESENCE_META = {
  present:               { label: "Présent",            color: "#16a34a", bg: "#f0fdf4", border: "#86efac", Icon: CheckCircle2 },
  absent_justifie:       { label: "Absent justifié",     color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: AlertCircle   },
  absent_non_justifie:   { label: "Absent non justifié", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", Icon: XCircle        },
};
const JOURS_FR = { 0:"dimanche",1:"lundi",2:"mardi",3:"mercredi",4:"jeudi",5:"vendredi",6:"samedi" };

function formatWhatsAppUrl(telephone, message) {
  if (!telephone) return null;
  let numero = telephone.replace(/\D/g, "");
  if (numero.startsWith("0")) numero = "213" + numero.slice(1);
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#3b82f6";
  return (
    <div style={{
      position:"fixed", bottom:24, right:28, zIndex:900,
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
        border:"3px solid #e2e8f0", borderTop:"3px solid #7C3AED",
        animation:"spin 0.75s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── LOCKED TOOLTIP ────────────────────────────────────────────────────────────
function LockedTooltip({ children }) {
  const [show, setShow] = useState(false);
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

// ── ALERTE MODALE ─────────────────────────────────────────────────────────────
function AlertModal({ icon, title, message, color = "#ef4444", onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,23,42,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins',sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, width:340, maxWidth:"88vw", boxShadow:"0 30px 70px rgba(0,0,0,0.22)", overflow:"hidden" }}>
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

// ── CREATE / EDIT MODAL (moniteur — pas de choix de moniteur) ────────────────
function CreateCoursCodeModal({ onClose, onSave, currentUser, editing, saving }) {
  const [mode, setMode] = useState("unique"); // "unique" | "serie"
  const [alertInfo, setAlertInfo] = useState(null);
  const [dureeCustom, setDureeCustom] = useState(false);

  const mesCategories = moniteurCategories(currentUser);
  const categoriesDisponibles = mesCategories.length > 0 ? mesCategories : CATEGORIES_PERMIS_ALL;

  const [form, setForm] = useState(editing ? {
    categoriePermis: editing.categoriePermis || categoriesDisponibles[0] || "B",
    date:            toLocalISO(editing.date),
    heure:           editing.heure?.slice(0,5) || "17:00",
    duree:           String(editing.duree || 1.5),
    notes:           editing.notes || "",
  } : {
    categoriePermis: categoriesDisponibles[0] || "B",
    date: toLocalISO(new Date()),
    heure: "17:00",
    duree: "1.5",
    notes: "",
  });

  useEffect(() => {
    const isPreset = DUREE_PRESETS.some(p => p.value === parseFloat(form.duree));
    if (!isPreset) setDureeCustom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [serie, setSerie] = useState({
    dateDebut: toLocalISO(new Date()),
    dateFin:   "",
    jours:     ["Lun","Mer"],
  });

  const set      = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSerieF = (k, v) => setSerie(p => ({ ...p, [k]: v }));

  const toggleJour = (j) => setSerie(p => ({
    ...p,
    jours: p.jours.includes(j) ? p.jours.filter(d => d !== j) : [...p.jours, j],
  }));

  const inpS = {
    width:"100%", boxSizing:"border-box",
    background:"#fff", border:"1px solid #cbd5e1",
    borderRadius:8, padding:"9px 11px",
    color:"#1e293b", fontFamily:"'Poppins',sans-serif",
    fontSize:"0.85rem", outline:"none",
  };

  const labelS = { fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 };

  const joursTries = DAYS_ORDER.filter(j => serie.jours.includes(j));
  const nbSeancesEstime = countSeancesSerie(serie.dateDebut, serie.dateFin, serie.jours);
  const recapSerie = joursTries.length > 0 && serie.dateDebut && serie.dateFin
    ? `Un cours sera créé chaque ${joursTries.map(j => JOURS_FULL[j]).join(", ")}, du ${new Date(serie.dateDebut+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long"})} au ${new Date(serie.dateFin+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}${nbSeancesEstime > 0 ? ` — soit environ ${nbSeancesEstime} cours` : ""}.`
    : null;

  const handleSubmit = () => {
    if (mode === "unique") {
      if (!form.date || !form.heure) return;
      onSave({
        mode: "unique",
        data: {
          id: editing?.id,
          categoriePermis: form.categoriePermis,
          moniteur_id: currentUser.id, // ← forcé, jamais choisi
          date: form.date,
          heure: form.heure,
          duree: parseFloat(form.duree) || 1.5,
          notes: form.notes || null,
        },
      });
    } else {
      if (!serie.dateDebut || !serie.dateFin || serie.jours.length === 0) {
        setAlertInfo({ icon:"📅", title:"Récurrence incomplète", message:"Veuillez renseigner une date de fin et sélectionner au moins un jour de la semaine.", color:"#ef4444" });
        return;
      }
      onSave({
        mode: "serie",
        data: {
          categoriePermis: form.categoriePermis,
          moniteur_id: currentUser.id, // ← forcé
          heure: form.heure,
          duree: parseFloat(form.duree) || 1.5,
          notes: form.notes || null,
          dateDebut: serie.dateDebut,
          dateFin: serie.dateFin,
          jours: serie.jours,
        },
      });
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:16, width:540, maxWidth:"96vw", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 25px 60px rgba(0,0,0,0.2)", overflow:"hidden", fontFamily:"'Poppins',sans-serif", position:"relative" }}>
        {saving && <LoadingOverlay />}

        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:"1.05rem", fontWeight:700, color:"#1e293b" }}>
              {editing ? "Modifier mon cours de code" : "Nouveau cours de code"}
            </div>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:3 }}>Cours collectif — code de la route</div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#64748b", width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:14, display:"grid", placeItems:"center" }}>✕</button>
        </div>

        <div style={{ padding:"18px 24px", overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── TOGGLE MODE ── */}
          {!editing && (
            <div style={{ display:"flex", gap:10 }}>
              {[
                { val:"unique", label:"Cours ponctuel", desc:"Une seule séance, à une date précise", Icon: CalendarDays },
                { val:"serie",  label:"Série récurrente", desc:"Plusieurs séances automatiques, chaque semaine", Icon: Repeat },
              ].map(({ val, label, desc, Icon }) => {
                const active = mode === val;
                return (
                  <button
                    key={val}
                    onClick={() => setMode(val)}
                    style={{
                      flex:1, textAlign:"left", padding:"12px 14px", borderRadius:12, cursor:"pointer",
                      border: active ? "1.5px solid #7C3AED" : "1.5px solid #e2e8f0",
                      background: active ? "#F5F3FF" : "#fff",
                      transition:"all 0.15s",
                      display:"flex", flexDirection:"column", gap:4,
                    }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{
                        width:26, height:26, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                        background: active ? "#7C3AED" : "#f1f5f9", color: active ? "#fff" : "#94a3b8", flexShrink:0,
                      }}>
                        <Icon size={13}/>
                      </div>
                      <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:700, color: active ? "#5B21B6" : "#334155" }}>
                        {label}
                      </span>
                    </div>
                    <span style={{ fontSize:"0.68rem", color: active ? "#7C3AED" : "#94a3b8", lineHeight:1.3 }}>{desc}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={labelS}>Catégorie <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.categoriePermis} onChange={e => set("categoriePermis", e.target.value)}>
                {categoriesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* ── Moniteur : lecture seule, pas de select ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={labelS}>Moniteur</label>
              <div style={{
                ...inpS, background:"#f8fafc", color:"#475569",
                display:"flex", alignItems:"center", gap:7, cursor:"default",
              }}>
                👤 {currentUser?.nom} {currentUser?.prenom}
              </div>
            </div>
          </div>

          {mesCategories.length === 0 && (
            <div style={{ padding:"8px 12px", borderRadius:8, background:"#fff7ed", border:"1px solid #fed7aa", fontSize:"0.73rem", color:"#c2410c", fontWeight:600 }}>
              ⚠️ Aucune catégorie habilitée trouvée sur votre profil — contactez l'administrateur.
            </div>
          )}

          {mode === "unique" ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={labelS}>Date <span style={{ color:"#ef4444" }}>*</span></label>
                <input type="date" style={inpS} value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={labelS}>Heure <span style={{ color:"#ef4444" }}>*</span></label>
                <input type="time" style={inpS} value={form.heure} onChange={e => set("heure", e.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={labelS}>Du <span style={{ color:"#ef4444" }}>*</span></label>
                  <input type="date" style={inpS} value={serie.dateDebut} onChange={e => setSerieF("dateDebut", e.target.value)} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={labelS}>Au <span style={{ color:"#ef4444" }}>*</span></label>
                  <input type="date" style={inpS} value={serie.dateFin} onChange={e => setSerieF("dateFin", e.target.value)} />
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={labelS}>Jours de la semaine <span style={{ color:"#ef4444" }}>*</span></label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {DAYS_OPTIONS.map(day => {
                    const isSel = serie.jours.includes(day);
                    return (
                      <button key={day} onClick={() => toggleJour(day)} style={{
                        padding:"6px 12px", borderRadius:15, fontSize:12, cursor:"pointer",
                        border:"1.5px solid", borderColor: isSel ? "#7C3AED" : "#e2e8f0",
                        background: isSel ? "#7C3AED" : "#fff",
                        color: isSel ? "#fff" : "#64748b",
                        fontFamily:"'Poppins',sans-serif", fontWeight:600, transition:"0.15s",
                      }}>{day}</button>
                    );
                  })}
                </div>
              </div>

              {recapSerie && (
                <div style={{
                  display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px",
                  borderRadius:10, background:"#F5F3FF", border:"1px solid #DDD6FE",
                }}>
                  <Repeat size={14} color="#7C3AED" style={{ marginTop:1, flexShrink:0 }}/>
                  <span style={{ fontSize:"0.75rem", color:"#5B21B6", lineHeight:1.5 }}>{recapSerie}</span>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={labelS}>Heure <span style={{ color:"#ef4444" }}>*</span></label>
                <input type="time" style={{ ...inpS, maxWidth:160 }} value={form.heure} onChange={e => set("heure", e.target.value)} />
              </div>
            </>
          )}

          {/* ── DURÉE FLEXIBLE ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={labelS}>Durée</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {DUREE_PRESETS.map(p => {
                const isSel = !dureeCustom && parseFloat(form.duree) === p.value;
                return (
                  <button key={p.value} onClick={() => { setDureeCustom(false); set("duree", String(p.value)); }} style={{
                    padding:"6px 11px", borderRadius:8, fontSize:"0.75rem", cursor:"pointer",
                    border:"1.5px solid", borderColor: isSel ? "#7C3AED" : "#e2e8f0",
                    background: isSel ? "#7C3AED" : "#fff",
                    color: isSel ? "#fff" : "#64748b",
                    fontFamily:"'Poppins',sans-serif", fontWeight:600, transition:"0.15s",
                  }}>{p.label}</button>
                );
              })}
              <button onClick={() => setDureeCustom(true)} style={{
                padding:"6px 11px", borderRadius:8, fontSize:"0.75rem", cursor:"pointer",
                border:"1.5px solid", borderColor: dureeCustom ? "#7C3AED" : "#e2e8f0",
                background: dureeCustom ? "#7C3AED" : "#fff",
                color: dureeCustom ? "#fff" : "#64748b",
                fontFamily:"'Poppins',sans-serif", fontWeight:600, transition:"0.15s",
              }}>✏️ Personnalisé</button>
            </div>

            {dureeCustom && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:2 }}>
                <input
                  type="number" min="0.25" max="6" step="0.25"
                  value={form.duree}
                  onChange={e => set("duree", e.target.value)}
                  style={{ ...inpS, maxWidth:110 }}
                />
                <span style={{ fontSize:"0.78rem", color:"#7C3AED", fontWeight:700 }}>
                  = {formatDureeLabel(form.duree)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={labelS}>Notes (optionnel)</label>
            <input type="text" style={inpS} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Ex: Salle 2, apporter le manuel..." />
          </div>
        </div>

        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding:"9px 20px", borderRadius:8, background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#64748b", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", cursor:"pointer", fontWeight:500 }}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding:"9px 22px", borderRadius:8, background: saving ? "#c4b5fd" : "#7C3AED",
            border:"none", color:"#fff", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600,
            cursor: saving ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:8,
          }}>
            {saving && <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.4)", borderTop:"2px solid #fff", animation:"spin 0.7s linear infinite" }} />}
            {editing ? "Enregistrer" : mode === "serie" ? "Créer la série" : "Créer le cours"}
          </button>
        </div>
      </div>
      {alertInfo && <AlertModal {...alertInfo} onClose={() => setAlertInfo(null)} />}
    </div>
  );
}

// ── GESTION DES INSCRITS (accessible en lecture pour cours d'un autre moniteur) ──
function ManageCoursModal({ seance, onClose, onRefreshList, canMarkPresence, isOwn }) {
  const { currentUser } = useAuth();
  const { generateExamens } = useExamenCtx();
  const [inscrits, setInscrits] = useState([]);
  const [eligibles, setEligibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchAdd, setSearchAdd] = useState("");
  const [replanifId, setReplanifId] = useState(null);
  const [seancesDispo, setSeancesDispo] = useState([]);
  const [toast, setToast] = useState(null);
  const [showAddLibre, setShowAddLibre] = useState(false);
  const [libreForm, setLibreForm] = useState({ nom: "", prenom: "", telephone: "", dateNaissance: "", sexe: "M" });
  const [savingLibre, setSavingLibre] = useState(false);
  const [errorLibre, setErrorLibre] = useState("");
  const showToast = (message, type="success") => setToast({ message, type });

  const envoyerWhatsAppInscription = async (candidat) => {
    if (!candidat.telephone) return;
    let message = `Bonjour ${candidat.prenom}, vous êtes inscrit(e) au cours de code du ${formatDateFr(seance.date)} à ${seance.heure?.slice(0,5)} avec ${seance.moniteurNom}.`;
    try {
      const autres = await window.electron.getSeancesCandidatCode(
        candidat.idCandidat, seance.categoriePermis, seance.moniteur_id
      );
      const futures = (autres || []).filter(s => s.date !== seance.date);
      if (futures.length > 0) {
        const jours = [...new Set(futures.map(s => JOURS_FR[new Date(s.date + "T12:00:00").getDay()]))];
        message += ` Ce cours fait partie d'une série récurrente : vous avez également des séances chaque ${jours.join(", ")}, la prochaine étant le ${formatDateCourt(futures[0].date)}.`;
      }
    } catch (e) {
      console.error("Erreur récupération séances série:", e);
    }
    const url = formatWhatsAppUrl(candidat.telephone, message);
    if (url) window.electron.openExternal(url);
  };

  const loadInscrits = useCallback(async () => {
    if (!window.electron?.getInscritsSeanceCode) return;
    try {
      const list = await window.electron.getInscritsSeanceCode(seance.id);
      setInscrits(Array.isArray(list) ? list : []);
    } catch (e) { console.error(e); }
  }, [seance.id]);

  const loadEligibles = useCallback(async () => {
    if (!window.electron?.getCandidatsEligiblesCode) return;
    try {
      const list = await window.electron.getCandidatsEligiblesCode(seance.categoriePermis, seance.id);
      setEligibles(Array.isArray(list) ? list : []);
    } catch (e) { console.error(e); }
  }, [seance.categoriePermis, seance.id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadInscrits(), loadEligibles()]).finally(() => setLoading(false));
  }, [loadInscrits, loadEligibles]);

  const isSeancePassee = new Date(`${seance.date}T${seance.heure || "23:59"}`) < new Date();

  const handleInscrire = async (idCandidat) => {
    if (!isOwn) return;
    if (isSeancePassee) {
      showToast("Impossible d'inscrire un candidat à une séance déjà passée.", "error");
      return;
    }
    try {
      const candidat = eligibles.find(c => c.idCandidat === idCandidat);
      await window.electron.inscrireCandidatCode(idCandidat, seance.id);
      await Promise.all([loadInscrits(), loadEligibles()]);
      onRefreshList();
      showToast("Candidat inscrit.");
      if (candidat) await envoyerWhatsAppInscription(candidat);
    } catch { showToast("Erreur lors de l'inscription.", "error"); }
  };

  const handleDesinscrire = async (idCandidat) => {
    if (!isOwn) return;
    try {
      await window.electron.desinscrireCandidatCode(idCandidat, seance.id);
      await Promise.all([loadInscrits(), loadEligibles()]);
      onRefreshList();
      showToast("Candidat désinscrit.");
    } catch { showToast("Erreur lors de la désinscription.", "error"); }
  };

  const resetLibreForm = () => {
    setShowAddLibre(false);
    setLibreForm({ nom: "", prenom: "", telephone: "", dateNaissance: "", sexe: "M" });
    setErrorLibre("");
  };

  const handleAjouterAuditeurLibre = async () => {
    if (!isOwn) return;
    if (isSeancePassee) {
      showToast("Impossible d'inscrire un candidat à une séance déjà passée.", "error");
      return;
    }
    if (!libreForm.nom.trim() || !libreForm.prenom.trim()) {
      setErrorLibre("Nom et prénom requis.");
      return;
    }
    if (!libreForm.dateNaissance) {
      setErrorLibre("Date de naissance requise.");
      return;
    }
    if (!libreForm.sexe) {
      setErrorLibre("Sexe requis.");
      return;
    }
    if (!window.electron?.addCandidatAuditeurLibre) {
      setErrorLibre("Fonctionnalité indisponible — IPC addCandidatAuditeurLibre manquant côté app.");
      return;
    }
    setSavingLibre(true);
    setErrorLibre("");
    try {
      const candidat = await window.electron.addCandidatAuditeurLibre({
        nom: libreForm.nom.trim(),
        prenom: libreForm.prenom.trim(),
        telephone: libreForm.telephone.trim() || null,
        dateNaissance: libreForm.dateNaissance,
        sexe: libreForm.sexe,
        categoriePermis: seance.categoriePermis,
      });
      if (!candidat?.idCandidat) {
        setErrorLibre("Erreur lors de l'enregistrement — vérifie la console de l'app.");
        return;
      }
      await window.electron.inscrireCandidatCode(candidat.idCandidat, seance.id);
      await Promise.all([loadInscrits(), loadEligibles()]);
      onRefreshList();
      showToast("Personne ajoutée et inscrite au cours.");
      if (candidat.telephone) await envoyerWhatsAppInscription(candidat);
      resetLibreForm();
    } catch (e) {
      console.error("Erreur ajout auditeur libre:", e);
      setErrorLibre("Erreur lors de l'enregistrement, réessayez.");
    } finally {
      setSavingLibre(false);
    }
  };

  const handlePresence = async (idCandidat, statut) => {
    if (!canMarkPresence) return;
    try {
      await window.electron.updatePresenceCode(idCandidat, seance.id, statut, currentUser?.id);
      await loadInscrits();
      onRefreshList();
      showToast("Présence mise à jour.");
      if (statut === "present") {
        generateExamens?.();
      }
    } catch { showToast("Erreur lors de la mise à jour.", "error"); }
  };

  const openReplanif = async (idCandidat) => {
    if (!isOwn) return;
    setReplanifId(idCandidat);
    try {
      const list = await window.electron.getSeancesCodeDisponibles(seance.categoriePermis, seance.id);
      setSeancesDispo(Array.isArray(list) ? list : []);
    } catch { setSeancesDispo([]); }
  };

  const confirmReplanif = async (nouvelleSeanceId) => {
    try {
      await window.electron.replanifierCandidatCode(replanifId, seance.id, nouvelleSeanceId);
      await loadInscrits();
      setReplanifId(null);
      showToast("Candidat replanifié sur le nouveau cours.");
    } catch { showToast("Erreur lors de la replanification.", "error"); }
  };

  const filteredEligibles = eligibles.filter(c =>
    `${c.nom} ${c.prenom}`.toLowerCase().includes(searchAdd.toLowerCase())
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(15,23,42,0.55)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Poppins',sans-serif" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, width:640, maxWidth:"95vw", maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 30px 80px rgba(0,0,0,0.2)", overflow:"hidden", position:"relative" }}>
        {loading && <LoadingOverlay />}

        <div style={{ padding:"20px 26px 16px", background:"#F3E8FF", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:"1rem", fontWeight:700, color:"#5B21B6" }}>
                Cours de Code — {formatDateFr(seance.date)}
              </div>
              <div style={{ fontSize:"0.75rem", color:"#7C3AED", marginTop:4 }}>
                {seance.heure?.slice(0,5)} · {seance.moniteurNom} · Catégorie {seance.categoriePermis} · {inscrits.length} inscrit{inscrits.length!==1?"s":""}
              </div>
              {!isOwn && (
                <div style={{ fontSize:"0.7rem", color:"#94a3b8", marginTop:4, fontStyle:"italic", display:"flex", alignItems:"center", gap:4 }}>
                  <Lock size={11}/> Cours d'un autre moniteur — vue lecture seule
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background:"rgba(124,58,237,0.1)", border:"none", color:"#7C3AED", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:14, display:"grid", placeItems:"center" }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY:"auto", padding:"16px 24px", display:"flex", flexDirection:"column", gap:10, flex:1 }}>

          {inscrits.length === 0 && !loading && (
            <div style={{ textAlign:"center", padding:"30px 0", color:"#94a3b8", fontSize:"0.85rem" }}>
              Aucun candidat inscrit pour l'instant.
            </div>
          )}

          {inscrits.map(c => {
            const meta = STATUT_PRESENCE_META[c.statutPresence];
            const estAuditeurLibre = !!c.estAuditeurLibre;
            return (
              <div key={c.idCandidat} style={{ border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 14px", background: meta ? meta.bg : "#f8fafc" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#EEEDFE", color:"#5B21B6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.78rem", fontWeight:700, flexShrink:0 }}>
                    {(c.prenom?.[0]||"")+(c.nom?.[0]||"")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                      <div style={{ fontSize:"0.85rem", fontWeight:700, color:"#1e293b" }}>{cap(`${c.nom} ${c.prenom}`)}</div>
                      {estAuditeurLibre && (
                        <span style={{
                          fontSize:"0.62rem", fontWeight:700, padding:"1px 8px", borderRadius:20,
                          background:"#FFF7ED", color:"#c2410c", border:"1px solid #fdba74",
                        }}>
                          Auditeur libre
                        </span>
                      )}
                    </div>
                    {meta && (
                      <div style={{ fontSize:"0.7rem", color: meta.color, fontWeight:600, marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                        <meta.Icon size={11}/> {meta.label}
                      </div>
                    )}
                  </div>
                  {isOwn && (
                    <button onClick={() => handleDesinscrire(c.idCandidat)} title="Désinscrire" style={{ background:"none", border:"none", color:"#cbd5e1", cursor:"pointer", padding:4 }}>
                      <Trash2 size={15}/>
                    </button>
                  )}
                </div>

                {canMarkPresence ? (
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    {Object.entries(STATUT_PRESENCE_META).map(([key, m]) => (
                      <button
                        key={key}
                        onClick={() => handlePresence(c.idCandidat, key)}
                        style={{
                          flex:1, padding:"6px 4px", borderRadius:7, cursor:"pointer",
                          border:`1.5px solid ${c.statutPresence===key ? m.color : "#e2e8f0"}`,
                          background: c.statutPresence===key ? m.bg : "#fff",
                          color: c.statutPresence===key ? m.color : "#94a3b8",
                          fontFamily:"'Poppins',sans-serif", fontSize:"0.65rem", fontWeight:600,
                          display:"flex", alignItems:"center", justifyContent:"center", gap:3,
                        }}
                      >
                        <m.Icon size={11}/> {m.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  !isOwn && (
                    <div style={{ marginTop:8, fontSize:"0.68rem", color:"#94a3b8", fontStyle:"italic", display:"flex", alignItems:"center", gap:4 }}>
                      <Lock size={10}/> Présence gérée par {seance.moniteurNom}
                    </div>
                  )
                )}

                {isOwn && canMarkPresence && c.statutPresence === "absent_justifie" && (
                  <div style={{ marginTop:8 }}>
                    {replanifId === c.idCandidat ? (
                      <div style={{ background:"#fff", border:"1px solid #fcd34d", borderRadius:8, padding:8 }}>
                        <div style={{ fontSize:"0.68rem", color:"#92400e", fontWeight:600, marginBottom:6 }}>Choisir le nouveau cours :</div>
                        {seancesDispo.length === 0 ? (
                          <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>Aucun autre cours disponible pour cette catégorie.</div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                            {seancesDispo.map(s => (
                              <button key={s.id} onClick={() => confirmReplanif(s.id)} style={{
                                textAlign:"left", padding:"6px 10px", borderRadius:6, border:"1px solid #e2e8f0",
                                background:"#f8fafc", cursor:"pointer", fontSize:"0.72rem", color:"#1e293b",
                                fontFamily:"'Poppins',sans-serif",
                              }}>
                                {formatDateCourt(s.date)} à {s.heure?.slice(0,5)} — {s.moniteurNom}
                              </button>
                            ))}
                          </div>
                        )}
                        <button onClick={() => setReplanifId(null)} style={{ marginTop:6, background:"none", border:"none", color:"#94a3b8", fontSize:"0.68rem", cursor:"pointer" }}>Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => openReplanif(c.idCandidat)} style={{
                        display:"flex", alignItems:"center", gap:5, background:"none", border:"none",
                        color:"#7C3AED", fontSize:"0.72rem", fontWeight:600, cursor:"pointer", padding:0,
                      }}>
                        <RotateCcw size={12}/> Replanifier sur un autre cours
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ajout candidat — uniquement si c'est mon cours */}
          <div style={{ marginTop:6 }}>
            {!isOwn ? (
              <div style={{
                display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                borderRadius:10, background:"#f1f5f9", border:"1px solid #e2e8f0",
              }}>
                <Lock size={14} color="#94a3b8"/>
                <span style={{ fontSize:"0.75rem", color:"#64748b" }}>
                  Vous ne pouvez pas inscrire de candidat sur le cours d'un autre moniteur.
                </span>
              </div>
            ) : isSeancePassee ? (
              <div style={{
                display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                borderRadius:10, background:"#f1f5f9", border:"1px solid #e2e8f0",
              }}>
                <AlertCircle size={14} color="#94a3b8"/>
                <span style={{ fontSize:"0.75rem", color:"#64748b" }}>
                  Cette séance est déjà passée — inscription impossible.
                </span>
              </div>
            ) : showAdd ? (
              <div style={{ border:"1px dashed #C4B5FD", borderRadius:12, padding:12, background:"#FAF5FF" }}>
                <div style={{ position:"relative", marginBottom:8 }}>
                  <Search size={13} color="#94a3b8" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
                  <input
                    autoFocus
                    type="text" value={searchAdd} onChange={e => setSearchAdd(e.target.value)}
                    placeholder="Rechercher un candidat..."
                    style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px 8px 30px", borderRadius:8, border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none" }}
                  />
                </div>
                <div style={{ maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                  {filteredEligibles.length === 0 ? (
                    <div style={{ fontSize:"0.75rem", color:"#94a3b8", padding:"8px 0", textAlign:"center" }}>
                      Aucun candidat éligible (catégorie {seance.categoriePermis}) trouvé.
                    </div>
                  ) : (
                    filteredEligibles.map(c => (
                      <button key={c.idCandidat} onClick={() => handleInscrire(c.idCandidat)} style={{
                        display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8,
                        background:"#fff", border:"1px solid #e2e8f0", cursor:"pointer", textAlign:"left",
                      }}>
                        <UserPlus size={13} color="#7C3AED"/>
                        <span style={{ fontSize:"0.78rem", color:"#1e293b" }}>{cap(`${c.nom} ${c.prenom}`)}</span>
                      </button>
                    ))
                  )}
                </div>

                {isOwn && (
                  <div style={{ borderTop:"1px solid #E9D5FF", marginTop:10, paddingTop:10 }}>
                    {showAddLibre ? (
                      <div style={{ background:"#fff", border:"1.5px solid #C4B5FD", borderRadius:10, padding:12 }}>
                        <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#5B21B6", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                          <UserCog size={13}/> Personne non inscrite (juste pour ce cours)
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                          <input
                            type="text" placeholder="Prénom *" value={libreForm.prenom}
                            onChange={e => setLibreForm(p => ({ ...p, prenom: e.target.value }))}
                            style={{ width:"100%", boxSizing:"border-box", padding:"7px 9px", borderRadius:7, border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", outline:"none" }}
                          />
                          <input
                            type="text" placeholder="Nom *" value={libreForm.nom}
                            onChange={e => setLibreForm(p => ({ ...p, nom: e.target.value }))}
                            style={{ width:"100%", boxSizing:"border-box", padding:"7px 9px", borderRadius:7, border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", outline:"none" }}
                          />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                          <div>
                            <label style={{ fontSize:"0.62rem", fontWeight:600, color:"#94a3b8", display:"block", marginBottom:3 }}>Date de naissance *</label>
                            <input
                              type="date" value={libreForm.dateNaissance}
                              onChange={e => setLibreForm(p => ({ ...p, dateNaissance: e.target.value }))}
                              style={{ width:"100%", boxSizing:"border-box", padding:"7px 9px", borderRadius:7, border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", outline:"none" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize:"0.62rem", fontWeight:600, color:"#94a3b8", display:"block", marginBottom:3 }}>Sexe *</label>
                            <select
                              value={libreForm.sexe}
                              onChange={e => setLibreForm(p => ({ ...p, sexe: e.target.value }))}
                              style={{ width:"100%", boxSizing:"border-box", padding:"7px 9px", borderRadius:7, border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", outline:"none" }}
                            >
                              <option value="M">Masculin</option>
                              <option value="F">Féminin</option>
                            </select>
                          </div>
                        </div>
                        <input
                          type="text" placeholder="Téléphone (optionnel)" value={libreForm.telephone}
                          onChange={e => setLibreForm(p => ({ ...p, telephone: e.target.value }))}
                          style={{ width:"100%", boxSizing:"border-box", padding:"7px 9px", borderRadius:7, border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", outline:"none", marginBottom:8 }}
                        />
                        {errorLibre && <div style={{ fontSize:"0.7rem", color:"#dc2626", fontWeight:600, marginBottom:8 }}>{errorLibre}</div>}
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={resetLibreForm} disabled={savingLibre} style={{
                            flex:1, padding:"8px 0", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff",
                            color:"#64748b", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer",
                          }}>Annuler</button>
                          <button onClick={handleAjouterAuditeurLibre} disabled={savingLibre} style={{
                            flex:2, padding:"8px 0", borderRadius:8, border:"none",
                            background: savingLibre ? "#c4b5fd" : "#7C3AED",
                            color:"#fff", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:700,
                            cursor: savingLibre ? "not-allowed" : "pointer",
                          }}>{savingLibre ? "Ajout..." : "Ajouter et inscrire"}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddLibre(true)} style={{
                        width:"100%", padding:"8px 0", borderRadius:8, border:"1px dashed #C4B5FD",
                        background:"#fff", color:"#7C3AED", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem",
                        fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                      }}>
                        <UserCog size={13}/> Ajouter une personne non inscrite (juste pour le code)
                      </button>
                    )}
                  </div>
                )}

                <button onClick={() => { setShowAdd(false); resetLibreForm(); }} style={{ marginTop:8, background:"none", border:"none", color:"#94a3b8", fontSize:"0.72rem", cursor:"pointer" }}>Fermer la recherche</button>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} style={{
                width:"100%", padding:"10px 0", borderRadius:10, border:"1.5px dashed #C4B5FD",
                background:"#FAF5FF", color:"#7C3AED", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem",
                fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
                <Plus size={14}/> Inscrire un candidat
              </button>
            )}
          </div>
        </div>

        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"9px 22px", borderRadius:8, background:"#1e293b", border:"none", color:"white", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600, cursor:"pointer" }}>Fermer</button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

// ── CARTE COURS ────────────────────────────────────────────────────────────────
function CoursCard({ seance, onManage, onEdit, onDelete, canManage, isOwn }) {
  const isPast = new Date(seance.date + "T" + (seance.heure || "00:00")) < new Date();
  return (
    <div style={{
      border:"1px solid #e2e8f0", borderLeft: isOwn ? "4px solid #7C3AED" : "4px solid #cbd5e1", borderRadius:12,
      padding:"14px 16px", background: isPast ? "#f8fafc" : "#fff",
      display:"flex", alignItems:"center", gap:16, opacity: isPast ? 0.75 : (isOwn ? 1 : 0.85),
    }}>
      <div style={{ width:52, height:52, borderRadius:12, background: isOwn ? "#F3E8FF" : "#f1f5f9", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <div style={{ fontSize:"0.65rem", fontWeight:700, color: isOwn ? "#7C3AED" : "#94a3b8", textTransform:"uppercase" }}>
          {new Date(seance.date + "T12:00:00").toLocaleDateString("fr-FR", { month:"short" })}
        </div>
        <div style={{ fontSize:"1.1rem", fontWeight:800, color: isOwn ? "#5B21B6" : "#64748b" }}>
          {new Date(seance.date + "T12:00:00").getDate()}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontSize:"0.9rem", fontWeight:700, color:"#1e293b" }}>Cours de Code</span>
          <span style={{ fontSize:"0.68rem", fontWeight:700, padding:"2px 9px", borderRadius:20, background: isOwn ? "#F3E8FF" : "#f1f5f9", color: isOwn ? "#5B21B6" : "#64748b", border: `1px solid ${isOwn ? "#C4B5FD" : "#e2e8f0"}` }}>
            Cat. {seance.categoriePermis}
          </span>
          {isOwn ? (
            <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"2px 9px", borderRadius:20, background:"#dcfce7", color:"#166534" }}>
              Mon cours
            </span>
          ) : (
            <span style={{ fontSize:"0.65rem", fontWeight:600, padding:"2px 9px", borderRadius:20, background:"#f1f5f9", color:"#94a3b8", display:"inline-flex", alignItems:"center", gap:3 }}>
              <Lock size={9}/> {seance.moniteurNom}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:14, fontSize:"0.75rem", color:"#64748b", flexWrap:"wrap" }}>
          <span>🕐 {seance.heure?.slice(0,5)} ({formatDureeLabel(seance.duree)})</span>
          <span>👥 {seance.nbInscrits ?? 0} inscrit{(seance.nbInscrits ?? 0) !== 1 ? "s" : ""}</span>
        </div>
        {seance.notes && <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:4 }}>📋 {seance.notes}</div>}
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={() => onManage(seance)} style={{ padding:"7px 14px", borderRadius:8, background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.25)", color:"#7C3AED", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:600, cursor:"pointer" }}>
          Gérer
        </button>
        {canManage && (
          <>
            <button onClick={() => onEdit(seance)} style={{ padding:"7px 10px", borderRadius:8, background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.25)", color:"#3b82f6", cursor:"pointer" }}>
              <PenLine size={13}/>
            </button>
            <button onClick={() => onDelete(seance.id)} style={{ padding:"7px 10px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444", cursor:"pointer" }}>
              <Trash2 size={13}/>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── LIGNE PROGRESSION CANDIDAT ────────────────────────────────────────────────
function ProgressionRow({ candidat }) {
  const {
    nom, prenom, telephone, categoriePermis, estAuditeurLibre,
    nbPresent, nbAbsentJustifie, nbAbsentNonJustifie, nbTotalInscrit, derniereSeance,
  } = candidat;

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14, padding:"12px 16px",
      border:"1px solid #e2e8f0", borderRadius:12, background:"#fff",
    }}>
      <div style={{ width:38, height:38, borderRadius:"50%", background:"#EEEDFE", color:"#5B21B6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.8rem", fontWeight:700, flexShrink:0 }}>
        {(prenom?.[0]||"")+(nom?.[0]||"")}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
          <span style={{ fontSize:"0.86rem", fontWeight:700, color:"#1e293b" }}>{cap(`${nom} ${prenom}`)}</span>
          <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"1px 8px", borderRadius:20, background:"#F3E8FF", color:"#5B21B6", border:"1px solid #C4B5FD" }}>
            {categoriePermis}
          </span>
          {!!estAuditeurLibre && (
            <span style={{ fontSize:"0.62rem", fontWeight:700, padding:"1px 8px", borderRadius:20, background:"#FFF7ED", color:"#c2410c", border:"1px solid #fdba74" }}>
              Auditeur libre
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:12, fontSize:"0.72rem", color:"#94a3b8", marginTop:3, flexWrap:"wrap" }}>
          {telephone && <span>📞 {telephone}</span>}
          <span>Dernier cours : {derniereSeance ? formatDateCourt(derniereSeance) : "—"}</span>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <div style={{ textAlign:"center", minWidth:56, padding:"6px 10px", borderRadius:9, background:"#f0fdf4", border:"1px solid #86efac" }}>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#16a34a", lineHeight:1 }}>{nbPresent}</div>
          <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#16a34a", textTransform:"uppercase", marginTop:2 }}>Présent</div>
        </div>
        <div style={{ textAlign:"center", minWidth:56, padding:"6px 10px", borderRadius:9, background:"#fffbeb", border:"1px solid #fcd34d" }}>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#d97706", lineHeight:1 }}>{nbAbsentJustifie}</div>
          <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#d97706", textTransform:"uppercase", marginTop:2 }}>Abs. just.</div>
        </div>
        <div style={{ textAlign:"center", minWidth:56, padding:"6px 10px", borderRadius:9, background:"#fef2f2", border:"1px solid #fca5a5" }}>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#dc2626", lineHeight:1 }}>{nbAbsentNonJustifie}</div>
          <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#dc2626", textTransform:"uppercase", marginTop:2 }}>Abs. non j.</div>
        </div>
        <div style={{ textAlign:"center", minWidth:56, padding:"6px 10px", borderRadius:9, background:"#f8fafc", border:"1px solid #e2e8f0" }}>
          <div style={{ fontSize:"1rem", fontWeight:800, color:"#64748b", lineHeight:1 }}>{nbTotalInscrit}</div>
          <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", marginTop:2 }}>Inscrit</div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CoursCodeMoniteur() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const {
    CAN_MANAGE_COURS_CODE,
    CAN_MARK_PRESENCE_CODE,
    CAN_VIEW_ALL_COURS_CODE,
  } = useMyPermissions();

  const currentUserId = currentUser?.id;

  const [seances, setSeances]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [saving, setSaving]     = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [managing, setManaging]     = useState(null);

  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");

  // ── Filtre de période pour les cours à venir ────────────────────────────
  const [periodFilter, setPeriodFilter] = useState("semaine");
  // ── Les cours passés restent masqués tant qu'on ne les demande pas ──────
  const [showPast, setShowPast] = useState(false);

  // ── Vue "Progression par candidat" ────────────────────────────────────────
  // Si CAN_VIEW_ALL_COURS_CODE est true → tous les candidats de l'auto-école
  // (comme côté admin). Sinon → uniquement les candidats de MES cours.
  const [activeView, setActiveView] = useState("cours"); // "cours" | "progression"
  const [progression, setProgression] = useState([]);
  const [loadingProgression, setLoadingProgression] = useState(false);
  const [searchProgression, setSearchProgression] = useState("");
  const [filterCatProgression, setFilterCatProgression] = useState("");

  const showToast = (message, type="success") => setToast({ message, type });

  const loadSeances = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electron?.getSeancesCode) {
        const rows = await window.electron.getSeancesCode({});
        setSeances(Array.isArray(rows) ? rows : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadProgression = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingProgression(true);
    try {
      if (CAN_VIEW_ALL_COURS_CODE) {
        // Permission globale → tous les candidats de l'auto-école
        if (window.electron?.getProgressionCode) {
          const rows = await window.electron.getProgressionCode();
          setProgression(Array.isArray(rows) ? rows : []);
        }
      } else {
        // Sinon → uniquement les candidats de mes propres cours
        if (window.electron?.getProgressionCodeMoniteur) {
          const rows = await window.electron.getProgressionCodeMoniteur(currentUserId);
          setProgression(Array.isArray(rows) ? rows : []);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoadingProgression(false); }
  }, [currentUserId, CAN_VIEW_ALL_COURS_CODE]);

  const refreshAll = useCallback(() => {
    loadSeances();
    loadProgression();
  }, [loadSeances, loadProgression]);

  useEffect(() => {
    loadSeances();
    loadProgression();
  }, [loadSeances, loadProgression]);

  useEffect(() => {
    if (location.state?.prefillCandidatId) {
      setShowCreate(true);
    }
  }, [location.state]);

  const handleSave = async ({ mode, data }) => {
    setSaving(true);
    try {
      if (mode === "unique") {
        if (editing) {
          await window.electron.updateSeanceCode(editing.id, data);
          showToast("Cours modifié avec succès.");
        } else {
          await window.electron.addSeanceCode(data);
          showToast("Cours de code créé avec succès.");
        }
      } else {
        const result = await window.electron.addSeanceCodeSerie(data);
        showToast(`Série créée : ${result?.count ?? "plusieurs"} cours ajoutés.`);
      }
      await loadSeances();
      setShowCreate(false);
      setEditing(null);
    } catch (e) {
      showToast("Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const s = seances.find(x => x.id === id);
    if (!s || String(s.moniteur_id) !== String(currentUserId)) {
      showToast("Vous ne pouvez supprimer que vos propres cours.", "error");
      return;
    }
    try {
      await window.electron.deleteSeanceCode(id);
      await loadSeances();
      await loadProgression();
      showToast("Cours supprimé.");
    } catch { showToast("Erreur lors de la suppression.", "error"); }
  };

  const handleEdit = (s) => {
    if (String(s.moniteur_id) !== String(currentUserId)) {
      showToast("Vous ne pouvez modifier que vos propres cours.", "error");
      return;
    }
    setEditing(s);
    setShowCreate(true);
  };

  const filtered = seances.filter(s => {
    return (!search || (s.moniteurNom || "").toLowerCase().includes(search.toLowerCase()))
      && (!filterCat || s.categoriePermis === filterCat);
  }).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));

  const mesCours = filtered.filter(s => String(s.moniteur_id) === String(currentUserId));
  const autresCours = CAN_VIEW_ALL_COURS_CODE
    ? filtered.filter(s => String(s.moniteur_id) !== String(currentUserId))
    : [];

  const mesUpcoming = mesCours.filter(s => new Date(s.date + "T" + (s.heure||"23:59")) >= new Date());
  const mesPast     = mesCours.filter(s => new Date(s.date + "T" + (s.heure||"23:59")) < new Date())
    .sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure)); // plus récent en premier

  const autresUpcoming = autresCours.filter(s => new Date(s.date + "T" + (s.heure||"23:59")) >= new Date());

  // ── Filtre de période appliqué aux cours à venir (mien + autres) ────────
  const mesUpcomingByPeriod = mesUpcoming.filter(s => matchesPeriod(s.date, periodFilter));
  const autresUpcomingByPeriod = autresUpcoming.filter(s => matchesPeriod(s.date, periodFilter));

  const categoriesFiltre = [...new Set(seances.map(s => s.categoriePermis).filter(Boolean))];

  const progressionFiltree = progression.filter(c => {
    const q = searchProgression.toLowerCase().trim();
    const matchesSearch = !q
      || `${c.nom} ${c.prenom}`.toLowerCase().includes(q)
      || (c.telephone || "").toLowerCase().includes(q);
    const matchesCat = !filterCatProgression || c.categoriePermis === filterCatProgression;
    return matchesSearch && matchesCat;
  });

  return (
    <>
      <style>{FONT_LINK}</style>
      <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:"#f1f5f9", fontFamily:"'Poppins',sans-serif", color:"#1e293b" }}>

        {/* HERO */}
        <div style={{ background:"linear-gradient(135deg,#F3E8FF 0%,#E9D5FF 50%,#F5F3FF 100%)", borderBottom:"1px solid #E9D5FF", padding:"20px 28px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:"#7C3AED", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <GraduationCap size={24} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:"#4C1D95", margin:0, letterSpacing:-0.5 }}>Mes Cours de Code</h1>
              <div style={{ fontSize:"0.78rem", color:"#7C3AED", marginTop:2 }}>
                {CAN_VIEW_ALL_COURS_CODE ? "Vos cours et ceux des autres moniteurs (lecture seule)" : "Vos cours collectifs de code"}
              </div>
            </div>
            {activeView === "cours" && (
              CAN_MANAGE_COURS_CODE ? (
                <button onClick={() => { setEditing(null); setShowCreate(true); }} style={{
                  marginLeft:"auto", padding:"10px 18px", borderRadius:10, background:"#7C3AED", border:"none",
                  color:"#fff", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 14px rgba(124,58,237,0.3)",
                }}>
                  <Plus size={16}/> Nouveau cours
                </button>
              ) : (
                <LockedTooltip>
                  <button disabled style={{
                    marginLeft:"auto", padding:"10px 18px", borderRadius:10, background:"#e2e8f0", border:"1px solid #cbd5e1",
                    color:"#94a3b8", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600, cursor:"not-allowed",
                    display:"flex", alignItems:"center", gap:8,
                  }}>
                    <Lock size={14}/> Nouveau cours
                  </button>
                </LockedTooltip>
              )
            )}
          </div>
        </div>

        {/* ── SEGMENTED CONTROL : Cours / Progression ── */}
        <div style={{ display:"flex", gap:6, padding:"12px 28px 0", background:"#fff", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
          {[
            { key:"cours",       label:"Cours planifiés", Icon: ListVideo, count: mesCours.length + autresCours.length },
            { key:"progression", label: CAN_VIEW_ALL_COURS_CODE ? "Progression par candidat" : "Mes candidats — progression", Icon: BarChart3, count: progression.length },
          ].map(({ key, label, Icon, count }) => {
            const active = activeView === key;
            return (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"10px 16px", borderRadius:"10px 10px 0 0", cursor:"pointer",
                  border:"none", borderBottom: active ? "2.5px solid #7C3AED" : "2.5px solid transparent",
                  background: active ? "#F5F3FF" : "transparent",
                  color: active ? "#5B21B6" : "#64748b",
                  fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:700,
                  transition:"all 0.15s",
                }}
              >
                <Icon size={14}/> {label}
                <span style={{
                  background: active ? "#7C3AED" : "#e2e8f0",
                  color: active ? "#fff" : "#64748b",
                  borderRadius:20, padding:"1px 8px", fontSize:"0.68rem", fontWeight:700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeView === "cours" ? (
          <>
            {/* FILTRES */}
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 28px", borderBottom:"1px solid #e2e8f0", background:"#fff", flexShrink:0, flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:1, minWidth:200, maxWidth:280 }}>
                <Search size={14} color="#94a3b8" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
                <input style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px 8px 32px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none" }}
                  type="text" placeholder="Rechercher un moniteur..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Catégorie :</span>
              <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", cursor:"pointer" }}
                value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">Toutes</option>
                {categoriesFiltre.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ marginLeft:"auto", fontSize:"0.72rem", color:"#94a3b8", background:"#f8fafc", border:"1px solid #e2e8f0", padding:"3px 12px", borderRadius:20 }}>
                {mesCours.length} de mes cours
              </div>
            </div>

            {/* ── FILTRE DE PÉRIODE (segmented control) ── */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 28px", background:"#fff", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
              {PERIOD_OPTIONS.map(opt => {
                const active = periodFilter === opt.key;
                return (
                  <button key={opt.key} onClick={() => setPeriodFilter(opt.key)} style={{
                    padding:"6px 14px", borderRadius:20, cursor:"pointer",
                    border:"1.5px solid", borderColor: active ? "#7C3AED" : "#e2e8f0",
                    background: active ? "#7C3AED" : "#fff",
                    color: active ? "#fff" : "#64748b",
                    fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", fontWeight:600,
                    transition:"all 0.15s",
                  }}>
                    {opt.label}
                  </button>
                );
              })}
              <div style={{ marginLeft:"auto", fontSize:"0.72rem", color:"#94a3b8" }}>
                {mesUpcomingByPeriod.length} de mes cours à venir
              </div>
            </div>

            {/* LISTE */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 28px", position:"relative" }}>
              {loading && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
                  <div style={{ width:32, height:32, margin:"0 auto 10px", borderRadius:"50%", border:"3px solid #e2e8f0", borderTop:"3px solid #7C3AED", animation:"spin 0.75s linear infinite" }}/>
                  Chargement des cours...
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}

              {!loading && mesCours.length === 0 && autresCours.length === 0 && (
                <div style={{ textAlign:"center", padding:"50px 0", color:"#94a3b8" }}>
                  <GraduationCap size={40} style={{ opacity:0.3, marginBottom:10 }}/>
                  <div style={{ fontSize:"0.9rem" }}>Aucun cours de code programmé.</div>
                </div>
              )}

              {!loading && mesCours.length > 0 && mesUpcomingByPeriod.length === 0 && (
                <div style={{ textAlign:"center", padding:"20px 0", color:"#94a3b8" }}>
                  <div style={{ fontSize:"0.85rem" }}>Aucun de mes cours à venir pour cette période.</div>
                </div>
              )}

              {!loading && mesUpcomingByPeriod.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>
                    Mes cours à venir ({mesUpcomingByPeriod.length})
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {mesUpcomingByPeriod.map(s => (
                      <CoursCard key={s.id} seance={s}
                        isOwn={true}
                        canManage={CAN_MANAGE_COURS_CODE}
                        onManage={setManaging}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Mes cours passés : masqués par défaut, un seul clic pour les voir ── */}
              {!loading && mesPast.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <button
                    onClick={() => setShowPast(v => !v)}
                    style={{
                      display:"flex", alignItems:"center", gap:7, background:"none", border:"none",
                      color:"#64748b", fontSize:"0.78rem", fontWeight:600, cursor:"pointer", padding:"6px 0",
                    }}
                  >
                    {showPast ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {showPast ? "Masquer" : "Afficher"} mes cours passés ({mesPast.length})
                  </button>

                  {showPast && (
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
                      {mesPast.map(s => (
                        <CoursCard key={s.id} seance={s}
                          isOwn={true}
                          canManage={CAN_MANAGE_COURS_CODE}
                          onManage={setManaging}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!loading && CAN_VIEW_ALL_COURS_CODE && autresUpcomingByPeriod.length > 0 && (
                <div>
                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                    <Lock size={11}/> Autres moniteurs ({autresUpcomingByPeriod.length})
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {autresUpcomingByPeriod.map(s => (
                      <CoursCard key={s.id} seance={s}
                        isOwn={false}
                        canManage={false}
                        onManage={setManaging}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* FILTRES — vue Progression */}
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 28px", borderBottom:"1px solid #e2e8f0", background:"#fff", flexShrink:0, flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:1, minWidth:200, maxWidth:280 }}>
                <Search size={14} color="#94a3b8" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
                <input style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px 8px 32px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", outline:"none" }}
                  type="text" placeholder="Rechercher un candidat (nom, téléphone)..." value={searchProgression} onChange={e => setSearchProgression(e.target.value)} />
              </div>
              <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Catégorie :</span>
              <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", cursor:"pointer" }}
                value={filterCatProgression} onChange={e => setFilterCatProgression(e.target.value)}>
                <option value="">Toutes</option>
                {CATEGORIES_PERMIS_ALL.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ marginLeft:"auto", fontSize:"0.72rem", color:"#94a3b8", background:"#f8fafc", border:"1px solid #e2e8f0", padding:"3px 12px", borderRadius:20 }}>
                {progressionFiltree.length} candidat{progressionFiltree.length !== 1 ? "s" : ""} · trié par nb. de présences
              </div>
            </div>

            {/* LISTE — vue Progression */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 28px" }}>
              {loadingProgression && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
                  <div style={{ width:32, height:32, margin:"0 auto 10px", borderRadius:"50%", border:"3px solid #e2e8f0", borderTop:"3px solid #7C3AED", animation:"spin 0.75s linear infinite" }}/>
                  Chargement de la progression...
                </div>
              )}

              {!loadingProgression && progressionFiltree.length === 0 && (
                <div style={{ textAlign:"center", padding:"50px 0", color:"#94a3b8" }}>
                  <BarChart3 size={40} style={{ opacity:0.3, marginBottom:10 }}/>
                  <div style={{ fontSize:"0.9rem" }}>
                    {CAN_VIEW_ALL_COURS_CODE
                      ? "Aucun candidat inscrit à un cours de code pour l'instant."
                      : "Aucun candidat inscrit à l'un de vos cours de code pour l'instant."}
                  </div>
                </div>
              )}

              {!loadingProgression && progressionFiltree.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {progressionFiltree.map(c => (
                    <ProgressionRow key={c.idCandidat} candidat={c} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateCoursCodeModal
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSave={handleSave}
          currentUser={currentUser}
          editing={editing}
          saving={saving}
        />
      )}

      {managing && (
        <ManageCoursModal
          seance={managing}
          onClose={() => setManaging(null)}
          onRefreshList={refreshAll}
          isOwn={String(managing.moniteur_id) === String(currentUserId)}
          canMarkPresence={CAN_MARK_PRESENCE_CODE && String(managing.moniteur_id) === String(currentUserId)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}