// src/renderer/pages/CoursCode.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermissionsCtx } from "../context/PermissionsContext";
import { useAuth } from "../context/AuthContext";
import { useExamenCtx } from "../context/ExamenContext";
import {
  GraduationCap, Plus, X, Check, Users, Calendar, Clock,
  ChevronLeft, ChevronRight, Trash2, PenLine, UserPlus,
  Search, RotateCcw, AlertCircle, CheckCircle2, XCircle,
  HelpCircle, CalendarDays, Repeat,
} from "lucide-react";

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES_PERMIS = ["A1","A","B","C1","C","D","F","BE","C1E","CE","DE"];
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

const candidatCategorie = (c) => normCat(c?.categoriePermis || c?.categorie || c?.categorie_permis || "B");

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
  // Garde-fou : évite une boucle infinie si les dates sont incohérentes
  let safety = 0;
  while (cur <= fin && safety < 5000) {
    if (idx.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
    safety++;
  }
  return count;
}

const STATUT_PRESENCE_META = {
  present:               { label: "Présent",            color: "#16a34a", bg: "#f0fdf4", border: "#86efac", Icon: CheckCircle2 },
  absent_justifie:       { label: "Absent justifié",     color: "#d97706", bg: "#fffbeb", border: "#fcd34d", Icon: AlertCircle   },
  absent_non_justifie:   { label: "Absent non justifié", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", Icon: XCircle        },
};

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

// ── CREATE / EDIT MODAL ───────────────────────────────────────────────────────
function CreateCoursCodeModal({ onClose, onSave, moniteurs, editing, saving, prefillCandidatId }) {
  const [mode, setMode] = useState("unique"); // "unique" | "serie"
  const [alertInfo, setAlertInfo] = useState(null);
  const [dureeCustom, setDureeCustom] = useState(false);

  const [form, setForm] = useState(editing ? {
    categoriePermis: editing.categoriePermis || "B",
    moniteur_id:     String(editing.moniteur_id || ""),
    date:            toLocalISO(editing.date),
    heure:           editing.heure?.slice(0,5) || "17:00",
    duree:           String(editing.duree || 1.5),
    notes:           editing.notes || "",
  } : {
    categoriePermis: "B",
    moniteur_id: "",
    date: toLocalISO(new Date()),
    heure: "17:00",
    duree: "1.5",
    notes: "",
  });

  // Si la durée initiale ne correspond à aucun preset, on ouvre direct le mode personnalisé
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

  const moniteursHabilites = moniteurs.filter(m => moniteurCategories(m).includes(form.categoriePermis));

  const inpS = {
    width:"100%", boxSizing:"border-box",
    background:"#fff", border:"1px solid #cbd5e1",
    borderRadius:8, padding:"9px 11px",
    color:"#1e293b", fontFamily:"'Poppins',sans-serif",
    fontSize:"0.85rem", outline:"none",
  };

  const labelS = { fontSize:"0.72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 };

  // ── Récap dynamique de la série ──────────────────────────────────────────
  const joursTries = DAYS_ORDER.filter(j => serie.jours.includes(j));
  const nbSeancesEstime = countSeancesSerie(serie.dateDebut, serie.dateFin, serie.jours);
  const recapSerie = joursTries.length > 0 && serie.dateDebut && serie.dateFin
    ? `Un cours sera créé chaque ${joursTries.map(j => JOURS_FULL[j]).join(", ")}, du ${new Date(serie.dateDebut+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long"})} au ${new Date(serie.dateFin+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}${nbSeancesEstime > 0 ? ` — soit environ ${nbSeancesEstime} cours` : ""}.`
    : null;

  const handleSubmit = () => {
    if (!form.moniteur_id) {
      setAlertInfo({ icon:"🧑‍🏫", title:"Moniteur manquant", message:"Veuillez sélectionner un moniteur habilité pour cette catégorie.", color:"#ef4444" });
      return;
    }
    if (mode === "unique") {
      if (!form.date || !form.heure) return;
      onSave({
        mode: "unique",
        data: {
          id: editing?.id,
          categoriePermis: form.categoriePermis,
          moniteur_id: parseInt(form.moniteur_id),
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
          moniteur_id: parseInt(form.moniteur_id),
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
              {editing ? "Modifier le cours de code" : "Nouveau cours de code"}
            </div>
            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:3 }}>Cours collectif — code de la route</div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#64748b", width:30, height:30, borderRadius:8, cursor:"pointer", fontSize:14, display:"grid", placeItems:"center" }}>✕</button>
        </div>

        <div style={{ padding:"18px 24px", overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── TOGGLE MODE (redesign avec description) ── */}
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
              <select style={inpS} value={form.categoriePermis} onChange={e => { set("categoriePermis", e.target.value); set("moniteur_id",""); }}>
                {CATEGORIES_PERMIS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={labelS}>Moniteur <span style={{ color:"#ef4444" }}>*</span></label>
              <select style={inpS} value={form.moniteur_id} onChange={e => set("moniteur_id", e.target.value)}>
                <option value="">Sélectionner...</option>
                {moniteursHabilites.map(m => <option key={m.id} value={m.id}>{m.nom} {m.prenom}</option>)}
              </select>
            </div>
          </div>

          {moniteursHabilites.length === 0 && (
            <div style={{ padding:"8px 12px", borderRadius:8, background:"#fef2f2", border:"1px solid #fca5a5", fontSize:"0.73rem", color:"#dc2626", fontWeight:600 }}>
              ⚠️ Aucun moniteur habilité pour la catégorie {form.categoriePermis}.
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

              {/* ── RÉCAP DYNAMIQUE DE LA SÉRIE ── */}
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

          {/* ── DURÉE FLEXIBLE (chips + personnalisé) ── */}
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

// ── MODAL GESTION (inscriptions + présence) ───────────────────────────────────
function ManageCoursModal({ seance, onClose, onRefreshList, canMarkPresence }) {
  const { currentUser } = useAuth();
  const { generateExamens } = useExamenCtx(); 
  const [inscrits, setInscrits] = useState([]);
  const [eligibles, setEligibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchAdd, setSearchAdd] = useState("");
  const [replanifId, setReplanifId] = useState(null); // idCandidat en cours de replanification
  const [seancesDispo, setSeancesDispo] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type="success") => setToast({ message, type });
  
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

  const handleInscrire = async (idCandidat) => {
    try {
      await window.electron.inscrireCandidatCode(idCandidat, seance.id);
      await Promise.all([loadInscrits(), loadEligibles()]);
      onRefreshList();
      showToast("Candidat inscrit.");
    } catch { showToast("Erreur lors de l'inscription.", "error"); }
  };

  const handleDesinscrire = async (idCandidat) => {
    try {
      await window.electron.desinscrireCandidatCode(idCandidat, seance.id);
      await Promise.all([loadInscrits(), loadEligibles()]);
      onRefreshList();
      showToast("Candidat désinscrit.");
    } catch { showToast("Erreur lors de la désinscription.", "error"); }
  };

  const handlePresence = async (idCandidat, statut) => {
    try {
      await window.electron.updatePresenceCode(idCandidat, seance.id, statut, currentUser?.id);
      await loadInscrits();
      showToast("Présence mise à jour.");
      // ✅ Recalcule immédiatement si ce candidat vient d'atteindre le seuil Code
      if (statut === "present") {
        generateExamens?.(); // sans arguments → il fetch lui-même seances + candidats
      }
    } catch { showToast("Erreur lors de la mise à jour.", "error"); }
  };

  const openReplanif = async (idCandidat) => {
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
            return (
              <div key={c.idCandidat} style={{ border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 14px", background: meta ? meta.bg : "#f8fafc" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"#EEEDFE", color:"#5B21B6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.78rem", fontWeight:700, flexShrink:0 }}>
                    {(c.prenom?.[0]||"")+(c.nom?.[0]||"")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"0.85rem", fontWeight:700, color:"#1e293b" }}>{cap(`${c.nom} ${c.prenom}`)}</div>
                    {meta && (
                      <div style={{ fontSize:"0.7rem", color: meta.color, fontWeight:600, marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                        <meta.Icon size={11}/> {meta.label}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDesinscrire(c.idCandidat)} title="Désinscrire" style={{ background:"none", border:"none", color:"#cbd5e1", cursor:"pointer", padding:4 }}>
                    <Trash2 size={15}/>
                  </button>
                </div>

                {canMarkPresence && (
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
                )}

                {canMarkPresence && c.statutPresence === "absent_justifie" && (
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

          {/* Ajout candidat */}
          <div style={{ marginTop:6 }}>
            {showAdd ? (
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
                <button onClick={() => setShowAdd(false)} style={{ marginTop:8, background:"none", border:"none", color:"#94a3b8", fontSize:"0.72rem", cursor:"pointer" }}>Fermer la recherche</button>
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
function CoursCard({ seance, onManage, onEdit, onDelete, canManage }) {
  const isPast = new Date(seance.date + "T" + (seance.heure || "00:00")) < new Date();
  return (
    <div style={{
      border:"1px solid #e2e8f0", borderLeft:"4px solid #7C3AED", borderRadius:12,
      padding:"14px 16px", background: isPast ? "#f8fafc" : "#fff",
      display:"flex", alignItems:"center", gap:16, opacity: isPast ? 0.75 : 1,
    }}>
      <div style={{ width:52, height:52, borderRadius:12, background:"#F3E8FF", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#7C3AED", textTransform:"uppercase" }}>
          {new Date(seance.date + "T12:00:00").toLocaleDateString("fr-FR", { month:"short" })}
        </div>
        <div style={{ fontSize:"1.1rem", fontWeight:800, color:"#5B21B6" }}>
          {new Date(seance.date + "T12:00:00").getDate()}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontSize:"0.9rem", fontWeight:700, color:"#1e293b" }}>Cours de Code</span>
          <span style={{ fontSize:"0.68rem", fontWeight:700, padding:"2px 9px", borderRadius:20, background:"#F3E8FF", color:"#5B21B6", border:"1px solid #C4B5FD" }}>
            Cat. {seance.categoriePermis}
          </span>
        </div>
        <div style={{ display:"flex", gap:14, fontSize:"0.75rem", color:"#64748b", flexWrap:"wrap" }}>
          <span>🕐 {seance.heure?.slice(0,5)} ({formatDureeLabel(seance.duree)})</span>
          <span>👤 {seance.moniteurNom}</span>
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

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CoursCode() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getPermissions } = usePermissionsCtx();
  const { currentUser } = useAuth(); // ← FIX : source de vérité unique (AuthContext), plus de lecture directe localStorage

  const isAdmin = currentUser?.type_utilisateur === "administrateur";
  const monPerms = (!isAdmin && currentUser) ? getPermissions(currentUser.id) : {};
  const canManage        = isAdmin || !!monPerms.CAN_MANAGE_COURS_CODE;
  const canMarkPresence  = isAdmin || !!monPerms.CAN_MARK_PRESENCE_CODE;

  const [seances, setSeances]   = useState([]);
  const [moniteurs, setMoniteurs] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [saving, setSaving]     = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [managing, setManaging]     = useState(null);

  const [search, setSearch]       = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterMon, setFilterMon] = useState("");

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

  useEffect(() => {
    loadSeances();
    window.electron?.getMoniteurs?.().then(m => setMoniteurs(Array.isArray(m) ? m : [])).catch(() => {});
  }, [loadSeances]);

  // Ouverture automatique si on vient de l'Agenda avec un candidat bloqué
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
    try {
      await window.electron.deleteSeanceCode(id);
      await loadSeances();
      showToast("Cours supprimé.");
    } catch { showToast("Erreur lors de la suppression.", "error"); }
  };

  const monitors = [...new Map(moniteurs.map(m => [m.id, `${m.nom} ${m.prenom}`])).entries()];

  const filtered = seances.filter(s => {
    return (!search || (s.moniteurNom || "").toLowerCase().includes(search.toLowerCase()))
      && (!filterCat || s.categoriePermis === filterCat)
      && (!filterMon || String(s.moniteur_id) === String(filterMon));
  }).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));

  const upcoming = filtered.filter(s => new Date(s.date + "T" + (s.heure||"23:59")) >= new Date());
  const past     = filtered.filter(s => new Date(s.date + "T" + (s.heure||"23:59")) < new Date());

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
              <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:"#4C1D95", margin:0, letterSpacing:-0.5 }}>Cours de Code</h1>
              <div style={{ fontSize:"0.78rem", color:"#7C3AED", marginTop:2 }}>Cours collectifs — jusqu'à une dizaine de candidats par session</div>
            </div>
            {canManage && (
              <button onClick={() => { setEditing(null); setShowCreate(true); }} style={{
                marginLeft:"auto", padding:"10px 18px", borderRadius:10, background:"#7C3AED", border:"none",
                color:"#fff", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", fontWeight:600, cursor:"pointer",
                display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 14px rgba(124,58,237,0.3)",
              }}>
                <Plus size={16}/> Nouveau cours
              </button>
            )}
          </div>
        </div>

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
            {CATEGORIES_PERMIS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ fontSize:"0.75rem", color:"#94a3b8", fontWeight:500 }}>Moniteur :</span>
          <select style={{ padding:"7px 10px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", cursor:"pointer" }}
            value={filterMon} onChange={e => setFilterMon(e.target.value)}>
            <option value="">Tous</option>
            {monitors.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
          </select>
          <div style={{ marginLeft:"auto", fontSize:"0.72rem", color:"#94a3b8", background:"#f8fafc", border:"1px solid #e2e8f0", padding:"3px 12px", borderRadius:20 }}>
            {filtered.length} cours
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

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"50px 0", color:"#94a3b8" }}>
              <GraduationCap size={40} style={{ opacity:0.3, marginBottom:10 }}/>
              <div style={{ fontSize:"0.9rem" }}>Aucun cours de code programmé.</div>
            </div>
          )}

          {!loading && upcoming.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>
                À venir ({upcoming.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {upcoming.map(s => (
                  <CoursCard key={s.id} seance={s} canManage={canManage}
                    onManage={setManaging}
                    onEdit={(s) => { setEditing(s); setShowCreate(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && past.length > 0 && (
            <div>
              <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>
                Passés ({past.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {past.map(s => (
                  <CoursCard key={s.id} seance={s} canManage={canManage}
                    onManage={setManaging}
                    onEdit={(s) => { setEditing(s); setShowCreate(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateCoursCodeModal
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSave={handleSave}
          moniteurs={moniteurs}
          editing={editing}
          saving={saving}
          prefillCandidatId={location.state?.prefillCandidatId}
        />
      )}

      {managing && (
        <ManageCoursModal
          seance={managing}
          onClose={() => setManaging(null)}
          onRefreshList={loadSeances}
          canMarkPresence={canMarkPresence}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}