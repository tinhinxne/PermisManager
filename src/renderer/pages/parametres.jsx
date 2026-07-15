// src/renderer/pages/Parametres.jsx
import React, { useState, useEffect } from "react";
import '../../styles/parametres.css';
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import {
  ChevronRight, ChevronDown, UserCog, ClipboardList,
  BookOpen, Check, X, Save, CalendarOff, Eye, EyeOff,
  Users, Calendar, CreditCard, ClipboardCheck, Umbrella,
  Eye as EyeIcon, UserPlus, Trash2, CalendarPlus,
  Receipt, PenLine, CalendarX, Lock, LockOpen, FileSpreadsheet,
  Wallet, Search,
} from "lucide-react";
import { useRulesCtx }       from "../context/RulesContext";
import { usePermissionsCtx } from "../context/PermissionsContext";
import { useExamenRulesCtx } from "../context/ExamenRulesContext";
import ModalConges           from "../components/ModalConges";
import { useLocation }       from "react-router-dom";

/* ─── Toggle ─────────────────────────────────────────────────────────────── */
const Toggle = ({ value, onChange, color = "#534AB7" }) => (
  <div
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    style={{
      width: 36, height: 20, borderRadius: 10,
      background: value ? color : "#CBD5E1",
      cursor: "pointer", position: "relative",
      transition: "background 0.2s", flexShrink: 0,
    }}
  >
    <div style={{
      position: "absolute", top: 3,
      left: value ? 19 : 3, width: 14, height: 14,
      borderRadius: "50%", background: "#fff",
      transition: "left 0.18s",
    }} />
  </div>
);

/* ─── Groupes de permissions ─────────────────────────────────────────────── */
const PERM_GROUPS = [
  {
    id: "candidats",
    Icon: Users,
    label: "Candidats",
    desc: "Accès et gestion des candidats",
    color: "#534AB7", bg: "#EEEDFE", textColor: "#3C3489", border: "#AFA9EC",
    perms: [
      { key: "CAN_VIEW_ALL_CANDIDATES", Icon: EyeIcon,   label: "Voir tous les candidats" },
      { key: "CAN_ADD_CANDIDAT",        Icon: UserPlus,  label: "Ajouter un candidat"      },
      { key: "CAN_REMOVE_CANDIDAT",     Icon: Trash2,    label: "Supprimer un candidat"    },
      { key: "CAN_EXPORT_LISTE_ENVOI",  Icon: FileSpreadsheet, label: "Générer لائحة الإرسال (PDF)" },
    ],
  },
  {
    id: "seances",
    Icon: Calendar,
    label: "Séances",
    desc: "Planification des séances de conduite",
    color: "#0F6E56", bg: "#E1F5EE", textColor: "#085041", border: "#5DCAA5",
    perms: [
      { key: "CAN_ADD_SESSION", Icon: CalendarPlus, label: "Ajouter / modifier des séances" },
    ],
  },
  {
    id: "paiements",
    Icon: CreditCard,
    label: "Paiements",
    desc: "Enregistrement des règlements",
    color: "#185FA5", bg: "#E6F1FB", textColor: "#0C447C", border: "#85B7EB",
    perms: [
      { key: "CAN_ADD_PAYMENT", Icon: Receipt, label: "Enregistrer un paiement" },
    ],
  },
  {
  id: "examens",
  Icon: ClipboardCheck,
  label: "Examens",
  desc: "Résultats des sessions d'examen",
  color: "#854F0B", bg: "#FAEEDA", textColor: "#633806", border: "#EF9F27",
  perms: [
    { key: "CAN_TOGGLE_STATUS",          Icon: PenLine,   label: "Modifier le résultat d'un examen" },
    { key: "CAN_EXPORT_LISTE_CANDIDATS", Icon: FileSpreadsheet, label: "Générer قائمة المترشحين (PDF)" },
  ],
},
  {
    id: "rh",
    Icon: Umbrella,
    label: "RH & Congés",
    desc: "Gestion des absences et congés",
    color: "#993C1D", bg: "#FAECE7", textColor: "#712B13", border: "#F0997B",
    perms: [
      { key: "CAN_REQUEST_CONGE", Icon: CalendarX, label: "Demander un congé" },
    ],
  },
];

/* ─── Modal Permissions Moniteurs ───────────────────────────────────────── */
const ModalMoniteurs = ({ onClose }) => {
  const { getPermissions, updatePermissions } = usePermissionsCtx();

  const [moniteurs,  setMoniteurs]  = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [localPerms, setLocalPerms] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [saved,      setSaved]      = useState(false);
  const [openGroups, setOpenGroups] = useState({ candidats: true });

  // ── Recherche moniteur ──
  const [searchTerm, setSearchTerm]     = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = React.useRef(null);

  useEffect(() => {
    window.electron.getMoniteurs()
      .then(list => {
        setMoniteurs(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          setLocalPerms(getPermissions(list[0].id));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSelect = (id) => {
    const n = Number(id);
    setSelectedId(n);
    setLocalPerms(getPermissions(n));
    setSaved(false);
  };

  const togglePerm  = (key) => { setSaved(false); setLocalPerms(p => ({ ...p, [key]: !p[key] })); };
  const toggleGroup = (id)  => setOpenGroups(p => ({ ...p, [id]: !p[id] }));

  const handleSave = () => {
    updatePermissions(selectedId, localPerms);
    setSaved(true);
    setTimeout(() => onClose(), 900);
  };

  const totalActive = Object.values(localPerms).filter(Boolean).length;
  const selected    = moniteurs.find(m => m.id === selectedId);
  const initials    = (m) => m ? `${m.prenom?.[0] ?? ""}${m.nom?.[0] ?? ""}`.toUpperCase() : "";

  const filteredMoniteurs = moniteurs.filter(m =>
    `${m.prenom} ${m.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const S = {
    overlay: {
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    },
    modal: {
      background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500,
      border: "0.5px solid #e2e8f0",
      display: "flex", flexDirection: "column",
      height: "90vh", maxHeight: 700,          // ← hauteur fixe pour que flex fonctionne
    },
    head: {
      padding: "20px 22px 16px",
      borderBottom: "0.5px solid #f1f5f9",
      display: "flex", flexDirection: "column", gap: 12,
      flexShrink: 0,                            // ← ne pas rétrécir
    },
    monRow: {
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", background: "#f8fafc",
      borderRadius: 12, border: "0.5px solid #e2e8f0",
    },
    avatar: {
      width: 36, height: 36, borderRadius: "50%", background: "#EEEDFE",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 600, color: "#3C3489", flexShrink: 0,
    },
    body: {
      padding: "14px 22px",
      display: "flex", flexDirection: "column", gap: 6,
      overflowY: "auto",
      flex: 1,
      minHeight: 0,                             // ← clé du fix scroll
    },
    foot: {
      padding: "14px 22px",
      borderTop: "0.5px solid #f1f5f9",
      display: "flex", gap: 8,
      background: "#fff",
      flexShrink: 0,                            // ← ne pas rétrécir
    },
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* ── Header ── */}
        <div style={S.head}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>Permissions moniteurs</span>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "0.5px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
              <X size={14}/>
            </button>
          </div>

          {/* Sélecteur moniteur avec recherche */}
          <div style={{ position: "relative" }}>
            <div
              style={{ ...S.monRow, cursor: "text" }}
              onClick={() => searchInputRef.current?.focus()}
            >
              <div style={S.avatar}>{loading ? "…" : initials(selected)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder={selected ? `${selected.prenom} ${selected.nom}` : "Rechercher un moniteur…"}
                  style={{
                    width: "100%", fontSize: 13, fontWeight: 600, color: "#0f172a",
                    background: "transparent", border: "none", outline: "none",
                    fontFamily: "inherit", cursor: "text",
                  }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>Moniteur</div>
              </div>
              <Search size={13} color="#94a3b8" style={{ flexShrink: 0 }}/>
              <ChevronDown
                size={13} color="#94a3b8"
                style={{ flexShrink: 0, cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setShowDropdown(v => !v); searchInputRef.current?.focus(); }}
              />
            </div>

            {showDropdown && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 20,
                maxHeight: 220, overflowY: "auto",
              }}>
                {filteredMoniteurs.length === 0 ? (
                  <div style={{ padding: "12px 14px", fontSize: 12, color: "#94a3b8" }}>Aucun moniteur trouvé</div>
                ) : (
                  filteredMoniteurs.map(m => (
                    <div
                      key={m.id}
                      onMouseDown={() => { handleSelect(m.id); setSearchTerm(""); setShowDropdown(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                        cursor: "pointer",
                        background: m.id === selectedId ? "#EEEDFE" : "#fff",
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#3C3489", flexShrink: 0 }}>
                        {initials(m)}
                      </div>
                      <span style={{ fontSize: 13, color: "#0f172a" }}>{m.prenom} {m.nom}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Badge global */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start",
            fontSize: 12, fontWeight: 500, padding: "4px 11px", borderRadius: 20,
            background: totalActive > 0 ? "#EEEDFE" : "#f1f5f9",
            color:      totalActive > 0 ? "#3C3489"  : "#64748b",
            border:     `0.5px solid ${totalActive > 0 ? "#AFA9EC" : "#e2e8f0"}`,
          }}>
            {totalActive > 0 ? <LockOpen size={12}/> : <Lock size={12}/>}
            {totalActive === 0 ? "Accès restreint" : `${totalActive} permission${totalActive > 1 ? "s" : ""} active${totalActive > 1 ? "s" : ""}`}
          </div>
        </div>

        {/* ── Corps : groupes accordéon ── */}
        <div style={S.body}>
          {PERM_GROUPS.map(g => {
            const activeCount = g.perms.filter(p => !!localPerms[p.key]).length;
            const isOpen      = !!openGroups[g.id];

            return (
              <div key={g.id} style={{
                border: `0.5px solid ${isOpen ? g.border + "88" : "#e2e8f0"}`,
                borderRadius: 12,
                // ← PAS de overflow:hidden ici, c'est lui qui causait le chevauchement
                transition: "border-color 0.18s",
              }}>
                {/* Header groupe */}
                <div
                  role="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleGroup(g.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                    cursor: "pointer",
                    background: isOpen ? g.bg + "44" : "#fff",
                    transition: "background 0.15s",
                    // border-radius seulement en haut quand ouvert, tout autour quand fermé
                    borderRadius: isOpen ? "12px 12px 0 0" : 12,
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: g.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <g.Icon size={16} color={g.color}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.desc}</div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
                    background: activeCount > 0 ? g.bg       : "#f1f5f9",
                    color:      activeCount > 0 ? g.textColor : "#94a3b8",
                    border:     `0.5px solid ${activeCount > 0 ? g.border : "#e2e8f0"}`,
                  }}>
                    {activeCount}/{g.perms.length}
                  </span>
                  <ChevronDown size={14} color="#94a3b8" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none", flexShrink: 0 }}/>
                </div>

                {/* Permissions déroulées */}
                {isOpen && (
                  <div style={{
                    borderTop: `0.5px solid ${g.border}44`,
                    borderRadius: "0 0 12px 12px", // ← coins arrondis en bas uniquement
                    overflow: "hidden",             // ← overflow ici uniquement pour les coins
                  }}>
                    {g.perms.map((p, i) => {
                      const val = !!localPerms[p.key];
                      return (
                        <div key={p.key} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px",
                          borderBottom: i < g.perms.length - 1 ? `0.5px solid ${g.bg}` : "none",
                          background: val ? g.bg + "55" : "#fff",
                          transition: "background 0.15s",
                        }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: val ? g.bg : "#f1f5f9" }}>
                            <p.Icon size={14} color={val ? g.color : "#94a3b8"}/>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "#0f172a" }}>{p.label}</div>
                            <div style={{ fontSize: 11, marginTop: 2, color: val ? g.textColor : "#94a3b8" }}>
                              {val ? "Autorisé" : "Bloqué"}
                            </div>
                          </div>
                          <Toggle value={val} onChange={() => togglePerm(p.key)} color={g.color}/>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div style={S.foot}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "0.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <X size={13}/> Annuler
          </button>
          <button
            onClick={handleSave}
            style={{ flex: 2, padding: "9px 0", borderRadius: 10, border: "none", background: saved ? "#0F6E56" : "#534AB7", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.25s" }}
          >
            {saved ? <><Check size={13}/> Sauvegardé !</> : <><Save size={13}/> Sauvegarder</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal Examens ──────────────────────────────────────────────────────── */
const ModalExamens = ({ onClose }) => {
  const { examRules, saveExamRules } = useExamenRulesCtx();
  const [rules, setRules] = useState([
    { id:1, icon:"🕐", label:"Délai après échec",        value:String(examRules.delaiApresEchec), unit:"Jours", color:"#a78bfa", type:"select", rulesKey:"delaiApresEchec" },
    { id:2, icon:"🔴", label:"Tentatives max",           value:String(examRules.tentativesMax),   unit:null,    color:"#f87171", type:"select", rulesKey:"tentativesMax"   },
    { id:4, icon:"📅", label:"Jours d'examen autorisés", selectedDays:examRules.joursAutorises,   color:"#60a5fa", type:"days", rulesKey:"joursAutorises"  },
  ]);
  const daysOptions = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const updateRule  = (id, key, val) => setRules(p => p.map(r => r.id===id ? {...r,[key]:val} : r));
  const toggleDay   = (ruleId, day)  => setRules(p => p.map(r => {
    if(r.id!==ruleId) return r;
    const nd = r.selectedDays.includes(day) ? r.selectedDays.filter(d=>d!==day) : [...r.selectedDays,day];
    return {...r, selectedDays:nd};
  }));
  const handleSave = () => {
    saveExamRules({
      delaiApresEchec: Number(rules.find(r=>r.rulesKey==="delaiApresEchec")?.value||14),
      tentativesMax:   Number(rules.find(r=>r.rulesKey==="tentativesMax")?.value||3),
      blocageImpaye:   examRules.blocageImpaye??true,
      joursAutorises:  rules.find(r=>r.rulesKey==="joursAutorises")?.selectedDays||["Lun","Mer","Ven"],
      congeActif:     examRules.congeActif,
      congeMoisDebut: examRules.congeMoisDebut,
      congeMoisFin:   examRules.congeMoisFin,
    });
    onClose();
  };
  return (
    <div className="modal-overlay">
      <div className="modal new-modal">
        <div className="new-modal-header"><h2>Règles des examens</h2><span className="close" onClick={onClose}><X size={16}/></span></div>
        <hr/>
        <div className="new-rules-list">
          {rules.map(r => (
            <div className="new-rule-row" key={r.id} style={{ background:r.color+"15", borderLeft:`4px solid ${r.color}`, flexDirection:r.type==="days"?"column":"row", alignItems:r.type==="days"?"flex-start":"center", padding:12, marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", width:"100%" }}>
                <span className="rule-icon" style={{ marginRight:10 }}>{r.icon}</span>
                <span className="rule-label" style={{ fontWeight:600, flex:1 }}>{r.label}</span>
                <div style={{ marginLeft:"auto" }}>
                  {r.type==="select" && (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <select value={r.value} onChange={e=>updateRule(r.id,"value",e.target.value)} style={{ padding:"4px 8px", borderRadius:8, border:"1px solid #ccc", fontSize:13, background:"#f8faff", cursor:"pointer" }}>
                        {["1","2","3","5","7","14","30"].map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                      {r.unit && <span style={{ fontSize:12, color:"#666" }}>{r.unit}</span>}
                    </div>
                  )}
                </div>
              </div>
              {r.type==="days" && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", width:"100%", marginTop:8 }}>
                  {daysOptions.map(day => {
                    const isSel=r.selectedDays.includes(day);
                    return <button key={day} onClick={()=>toggleDay(r.id,day)} style={{ padding:"4px 10px", borderRadius:15, fontSize:11, cursor:"pointer", border:"1px solid", borderColor:isSel?r.color:"#ccc", background:isSel?r.color:"white", color:isSel?"white":"#666", transition:"0.2s" }}>{day}</button>;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="new-modal-footer">
          <button className="btn cancel" onClick={onClose}><X size={13}/> Fermer</button>
          <button className="btn primary" onClick={handleSave}><Save size={13}/> Sauvegarder</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal Inscription ──────────────────────────────────────────────────── */
const ModalInscription = ({ onClose }) => {
  const { inscriptionRules, saveInscriptionRules } = useRulesCtx();
  const [rules, setRules] = useState(() => inscriptionRules.map(r => ({...r})));
  const toggle = (id) => setRules(p => p.map(r => r.id===id ? {...r,enabled:!r.enabled} : r));
  const handleSave = () => { saveInscriptionRules(rules); onClose(); };
  return (
    <div className="modal-overlay">
      <div className="modal new-modal">
        <div className="new-modal-header"><h2>Règles d'inscription</h2><span className="close" onClick={onClose}><X size={16}/></span></div>
        <hr/>
        <div className="new-rules-list" style={{ marginTop:12 }}>
          {rules.map(r => (
            <div key={r.id} style={{ marginBottom:12 }}>
              <p style={{ fontSize:12, color:"#64748b", marginBottom:5, fontWeight:600 }}>{r.ageLabel}</p>
              <div className="new-rule-row" style={{ background:r.color+"15", borderLeft:`4px solid ${r.color}`, opacity:r.enabled?1:0.45, transition:"opacity 0.2s" }}>
                <span className="rule-icon">{r.icon}</span>
                <span className="rule-label" style={{ flex:1 }}>{r.rule}</span>
                <Toggle value={r.enabled} onChange={()=>toggle(r.id)}/>
              </div>
            </div>
          ))}
        </div>
        <div className="new-modal-footer">
          <button className="btn cancel" onClick={onClose}><X size={13}/> Annuler</button>
          <button className="btn primary" onClick={handleSave}><Save size={13}/> Sauvegarder</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal Chargily ─────────────────────────────────────────────────────── */
const ModalChargily = ({ onClose }) => {
  const [key,setKey]=useState(""); const [mode,setMode]=useState("test");
  const [showKey,setShowKey]=useState(false); const [testing,setTesting]=useState(false);
  const [saving,setSaving]=useState(false); const [testResult,setTestResult]=useState(null);
  const [saved,setSaved]=useState(false);
  useEffect(()=>{ window.electron.getChargilyConfig().then(c=>{ if(c.key)setKey(c.key); if(c.mode)setMode(c.mode); }); },[]);
  const handleTest=async()=>{ if(!key.trim())return; setTesting(true);setTestResult(null); const r=await window.electron.testChargilyConfig({key:key.trim(),mode}); setTestResult(r);setTesting(false); };
  const handleSave=async()=>{ if(!key.trim())return; setSaving(true); const r=await window.electron.setChargilyConfig({key:key.trim(),mode}); setSaving(false); if(r.success){setSaved(true);setTimeout(()=>onClose(),1000);} };
  return (
    <div className="modal-overlay">
      <div className="modal new-modal" style={{ maxWidth:500, borderRadius:18, overflow:"hidden", boxShadow:"0 24px 60px rgba(30,41,59,0.22)" }}>
        <div className="new-modal-header" style={{ background:"linear-gradient(135deg,#4F46E5,#4338CA)", padding:"20px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"rgba(255,255,255,0.16)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <CreditCard size={19} color="#fff"/>
            </div>
            <div>
              <h2 style={{ color:"#fff", margin:0, fontSize:15.5, fontWeight:700 }}>Paiement en ligne — Chargily</h2>
              <p style={{ color:"rgba(255,255,255,0.72)", margin:0, fontSize:12, marginTop:2 }}>Configuration CIB / EDAHABIA</p>
            </div>
          </div>
          <span className="close" onClick={onClose} style={{ color:"#fff" }}><X size={16}/></span>
        </div>
        <div style={{ padding:"22px 24px 6px", display:"flex", flexDirection:"column", gap:20 }}>

          <div>
            <label style={{ fontSize:11.5, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:10 }}>Mode</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["test","🧪 Test","Pour tester sans argent réel","#4F46E5","#EEF2FF","#C7D2FE"],["live","🚀 Production","Paiements réels","#16A34A","#F0FDF4","#BBF7D0"]].map(([val,label,desc,color,bg,border])=>(
                <div
                  key={val}
                  onClick={()=>{setMode(val);setTestResult(null);}}
                  style={{
                    flex:1, padding:"14px 16px", borderRadius:12, cursor:"pointer",
                    border:`1.5px solid ${mode===val?color:"#e2e8f0"}`,
                    background:mode===val?bg:"#fff",
                    boxShadow:mode===val?`0 4px 14px ${color}22`:"none",
                    transition:"all 0.18s",
                  }}
                >
                  <div style={{ fontWeight:700, fontSize:13.5, color:mode===val?color:"#64748b" }}>{label}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:4, lineHeight:1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize:11.5, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>
              Clé secrète {mode==="test"?"(test_sk_...)":"(live_sk_...)"}
            </label>
            <div style={{ position:"relative" }}>
              <input
                type={showKey?"text":"password"}
                value={key}
                onChange={e=>{setKey(e.target.value);setTestResult(null);setSaved(false);}}
                placeholder={mode==="test"?"test_sk_xxxxxxxxxxxxxxxx":"live_sk_xxxxxxxxxxxxxxxx"}
                style={{
                  width:"100%", padding:"12px 44px 12px 14px",
                  border:`1.5px solid ${testResult?.success?"#86efac":testResult?.success===false?"#fca5a5":"#e2e8f0"}`,
                  borderRadius:11, fontSize:13, outline:"none", background:"#f8fafc",
                  boxSizing:"border-box", fontFamily:"monospace",
                  transition:"border-color 0.15s",
                }}
              />
              <button onClick={()=>setShowKey(!showKey)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}>
                {showKey?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            <p style={{ fontSize:11, color:"#94a3b8", marginTop:7 }}>
              Disponible dans <strong style={{ color:"#64748b" }}>pay.chargily.com → Coin des développeurs</strong>
            </p>
          </div>

          {testResult && (
            <div style={{
              padding:"11px 15px", borderRadius:11,
              background:testResult.success?"#f0fdf4":"#fef2f2",
              border:`1px solid ${testResult.success?"#86efac":"#fca5a5"}`,
              fontSize:13, fontWeight:600,
              color:testResult.success?"#166534":"#dc2626",
              display:"flex", alignItems:"center", gap:8,
            }}>
              {testResult.success ? <Check size={15}/> : <X size={15}/>}
              {testResult.success ? "Connexion réussie !" : (testResult.message||"Clé invalide")}
            </div>
          )}

          <div style={{ background:"#F5F6FF", border:"1px solid #E0E3FA", borderRadius:12, padding:"14px 16px", fontSize:12.5, color:"#475569", lineHeight:1.65 }}>
            <strong style={{ color:"#4338CA" }}>Comment ça marche ?</strong><br/>
            Le candidat paie avec sa carte <strong>CIB ou EDAHABIA</strong> directement depuis l'app.
          </div>
        </div>
        <div className="new-modal-footer">
          <button className="btn cancel" onClick={onClose}><X size={13}/> Annuler</button>
          <button
            onClick={handleTest} disabled={!key.trim()||testing}
            style={{
              background:"#EEF2FF", color:"#4338CA", border:"1px solid #C7D2FE",
              borderRadius:9, padding:"9px 16px",
              cursor:key.trim()?"pointer":"not-allowed", fontSize:13, fontWeight:600,
              display:"flex", alignItems:"center", gap:6, transition:"background 0.15s",
            }}
          >
            {testing?"⏳ Test...":"🔌 Tester"}
          </button>
          <button
            className="btn primary" onClick={handleSave} disabled={!key.trim()||saving}
            style={{ background:saved?"#22c55e":"#4F46E5", transition:"background 0.3s" }}
          >
            {saved?<><Check size={13}/> Sauvegardé !</>:saving?"⏳...":<><Save size={13}/> Sauvegarder</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Modal Prix de la formation ─────────────────────────────────────────── */
const ModalPrixFormation = ({ onClose }) => {
  const [prix, setPrix]       = useState(30000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");

  useEffect(() => {
    window.electron.getPrixFormation()
      .then(p => { setPrix(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

  const handleChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setPrix(num);
    setSaved(false);
    setError(null);
  };

  const step = (delta) => handleChange(Number(prix || 0) + delta);

  const startEdit = () => { setDraft(String(prix)); setEditing(true); };
  const commitEdit = () => {
    const num = parseFloat(String(draft).replace(",", "."));
    if (!isNaN(num)) handleChange(num);
    setEditing(false);
  };

  const handleSave = async () => {
    const val = parseFloat(prix);
    if (isNaN(val) || val <= 0) {
      setError("Veuillez saisir un montant valide.");
      return;
    }
    setSaving(true);
    const r = await window.electron.setPrixFormation(val);
    setSaving(false);
    if (r.success) {
      setSaved(true);
      setTimeout(() => onClose(), 900);
    } else {
      setError("Erreur lors de la sauvegarde. Réessayez.");
    }
  };

  const presets = [20000, 25000, 30000, 35000, 40000];

  return (
    <div className="modal-overlay">
      <div className="modal new-modal" style={{ maxWidth: 460, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#0F6E56 0%,#0B5945 60%,#093F32 100%)",
          padding: "22px 24px 20px", position: "relative",
        }}>
          <span
            onClick={onClose}
            style={{
              position: "absolute", top: 16, right: 16, width: 28, height: 28,
              borderRadius: 8, background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} color="#fff"/>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wallet size={17} color="#fff"/>
            </div>
            <div>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 15, fontWeight: 700 }}>Prix de la formation</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: 11.5 }}>Montant facturé pour un permis complet</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "26px 24px 8px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Signature element : cadran de prix interactif */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "18px 10px" }}>
            <button
              onClick={() => step(-500)}
              disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #d1e7df",
                background: "#f0fdf7", color: "#0F6E56", fontSize: 18, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, lineHeight: 1,
              }}
            >−</button>

            {editing ? (
              <input
                autoFocus
                type="number"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => e.key === "Enter" && commitEdit()}
                style={{
                  width: 150, textAlign: "center", fontSize: 30, fontWeight: 800,
                  color: "#0F6E56", border: "none", outline: "none", background: "transparent",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <div
                onClick={startEdit}
                title="Cliquer pour modifier"
                style={{
                  fontSize: 30, fontWeight: 800, color: "#0F6E56", cursor: "text",
                  letterSpacing: "-0.02em", minWidth: 150, textAlign: "center",
                }}
              >
                {loading ? "…" : fmt(prix)}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#5eb79a", marginLeft: 5 }}>DA</span>
              </div>
            )}

            <button
              onClick={() => step(500)}
              disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #d1e7df",
                background: "#f0fdf7", color: "#0F6E56", fontSize: 18, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, lineHeight: 1,
              }}
            >+</button>
          </div>

          {/* Montants rapides */}
          <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
            {presets.map(p => (
              <button
                key={p}
                onClick={() => handleChange(p)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  border: `1.5px solid ${Number(prix) === p ? "#0F6E56" : "#e2e8f0"}`,
                  background: Number(prix) === p ? "#0F6E56" : "#fff",
                  color: Number(prix) === p ? "#fff" : "#64748b",
                  transition: "all 0.15s",
                }}
              >
                {fmt(p)}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#dc2626", textAlign: "center", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Aperçu reçu */}
          <div style={{ border: "1px dashed #bfe3d4", borderRadius: 12, padding: "12px 14px", background: "#f7fdfa" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#5eb79a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Aperçu — reçu candidat
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>Formation permis — Total</div>
                <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>Nouveau dossier candidat</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0F6E56" }}>{fmt(prix)} DA</div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0 }}>
            S'applique aux nouveaux dossiers. Les candidats déjà inscrits gardent leur montant initial.
          </p>
        </div>

        <div className="new-modal-footer">
          <button className="btn cancel" onClick={onClose}><X size={13}/> Annuler</button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={loading || saving}
            style={{ background: saved ? "#22c55e" : "#0F6E56", transition: "background 0.3s" }}
          >
            {saved ? <><Check size={13}/> Sauvegardé !</> : saving ? "⏳..." : <><Save size={13}/> Sauvegarder</>}
          </button>
        </div>
      </div>
    </div>
  );
};
/* ─── Modal Nombre de séances ────────────────────────────────────────────── */
const ModalNbSeances = ({ onClose }) => {
  const [nbSeances, setNbSeances] = useState(20);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState(null);
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState("");

  useEffect(() => {
    window.electron.getNbSeances()
      .then(n => { setNbSeances(n); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (val) => {
    const num = Math.max(1, Math.round(Number(val) || 0));
    setNbSeances(num);
    setSaved(false);
    setError(null);
  };

  const step = (delta) => handleChange(Number(nbSeances || 0) + delta);

  const startEdit = () => { setDraft(String(nbSeances)); setEditing(true); };
  const commitEdit = () => {
    const num = parseInt(draft, 10);
    if (!isNaN(num)) handleChange(num);
    setEditing(false);
  };

  const handleSave = async () => {
    const val = parseInt(nbSeances, 10);
    if (isNaN(val) || val <= 0) {
      setError("Veuillez saisir un nombre valide.");
      return;
    }
    setSaving(true);
    const r = await window.electron.setNbSeances(val);
    setSaving(false);
    if (r.success) {
      setSaved(true);
      setTimeout(() => onClose(), 900);
    } else {
      setError("Erreur lors de la sauvegarde. Réessayez.");
    }
  };

  const presets = [15, 20, 25, 30];

  return (
    <div className="modal-overlay">
      <div className="modal new-modal" style={{ maxWidth: 460, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 60%,#5b21b6 100%)",
          padding: "22px 24px 20px", position: "relative",
        }}>
          <span
            onClick={onClose}
            style={{
              position: "absolute", top: 16, right: 16, width: 28, height: 28,
              borderRadius: 8, background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={14} color="#fff"/>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CalendarPlus size={17} color="#fff"/>
            </div>
            <div>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 15, fontWeight: 700 }}>Nombre de séances</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: 11.5 }}>Séances de conduite incluses par candidat</p>
            </div>
          </div>
        </div>

        <div style={{ padding: "26px 24px 8px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Cadran interactif */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "18px 10px" }}>
            <button
              onClick={() => step(-1)}
              disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e4defc",
                background: "#f5f3ff", color: "#7c3aed", fontSize: 18, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, lineHeight: 1,
              }}
            >−</button>

            {editing ? (
              <input
                autoFocus
                type="number"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => e.key === "Enter" && commitEdit()}
                style={{
                  width: 110, textAlign: "center", fontSize: 30, fontWeight: 800,
                  color: "#7c3aed", border: "none", outline: "none", background: "transparent",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <div
                onClick={startEdit}
                title="Cliquer pour modifier"
                style={{
                  fontSize: 30, fontWeight: 800, color: "#7c3aed", cursor: "text",
                  letterSpacing: "-0.02em", minWidth: 110, textAlign: "center",
                }}
              >
                {loading ? "…" : nbSeances}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", marginLeft: 5 }}>séances</span>
              </div>
            )}

            <button
              onClick={() => step(1)}
              disabled={loading}
              style={{
                width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e4defc",
                background: "#f5f3ff", color: "#7c3aed", fontSize: 18, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, lineHeight: 1,
              }}
            >+</button>
          </div>

          {/* Presets */}
          <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
            {presets.map(p => (
              <button
                key={p}
                onClick={() => handleChange(p)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  border: `1.5px solid ${Number(nbSeances) === p ? "#7c3aed" : "#e2e8f0"}`,
                  background: Number(nbSeances) === p ? "#7c3aed" : "#fff",
                  color: Number(nbSeances) === p ? "#fff" : "#64748b",
                  transition: "all 0.15s",
                }}
              >
                {p} séances
              </button>
            ))}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#dc2626", textAlign: "center", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0 }}>
            S'applique aux nouveaux dossiers. Les candidats déjà inscrits gardent leur cap initial.
          </p>
        </div>

        <div className="new-modal-footer">
          <button className="btn cancel" onClick={onClose}><X size={13}/> Annuler</button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={loading || saving}
            style={{ background: saved ? "#22c55e" : "#7c3aed", transition: "background 0.3s" }}
          >
            {saved ? <><Check size={13}/> Sauvegardé !</> : saving ? "⏳..." : <><Save size={13}/> Sauvegarder</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Page Paramètres ────────────────────────────────────────────────────── */
const Parametres = () => {
  const [activeModal,   setActiveModal]   = useState(null);
  const [savedSections, setSavedSections] = useState([]);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openModal) setActiveModal(location.state.openModal);
  }, [location.state]);

  const sections = [
    { id:"inscription",   icon:<ClipboardList size={20}/>,              title:"Règles d'inscriptions",      description:"Conditions d'âge et documents requis",              accentColor:"#6c63ff" },
    { id:"examens",       icon:<BookOpen size={20}/>,                   title:"Règles des examens",          description:"Délais, tentatives max et jours autorisés",         accentColor:"#3b82f6" },
    { id:"conges",        icon:<CalendarOff size={20}/>,                title:"Gestion des congés",          description:"Congé annuel auto-école & congés moniteurs",        accentColor:"#f97316" },
    { id:"moniteurs",     icon:<UserCog size={20}/>,                    title:"Permissions des moniteurs",   description:"Accès aux fonctionnalités par moniteur",            accentColor:"#8b5cf6" },
    { id:"prixFormation", icon:<Wallet size={20}/>,                     title:"Prix de la formation",        description:"Montant total du permis facturé aux candidats",     accentColor:"#0F6E56" },
    { id:"chargily",      icon:<span style={{ fontSize:18 }}>💳</span>, title:"Paiement en ligne",           description:"Configurer Chargily Pay — CIB / EDAHABIA",         accentColor:"#6c63ff" },
     { id:"nbSeances",     icon:<CalendarPlus size={20}/>,               title:"Nombre de séances",           description:"Séances de conduite incluses par candidat",         accentColor:"#8b5cf6" },
  ];

  const openModal  = (id) => setActiveModal(id);
  const closeModal = () => {
    if (activeModal && !savedSections.includes(activeModal)) setSavedSections(p => [...p, activeModal]);
    setActiveModal(null);
  };

  return (
    <div className="container">
      <div className="main">
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img"/>
          <h1><img src={SmallCar} alt="" width={40}/> Tableau de contrôle de l'auto-école</h1>
          <p>Gérer les paramètres métier de votre établissement</p>
        </div>
        <div className="card">
          <div className="card-header"><h2>Paramètres</h2><p>Configurez les règles automatiques de votre système</p></div>
          <div className="params-grid">
            {sections.map(s => (
              <div className="param-card" key={s.id} style={{ borderLeft:`4px solid ${s.accentColor}20` }}>
                <div className="param-card-left">
                  <div className="param-icon" style={{ color:s.accentColor, background:s.accentColor+"15" }}>{s.icon}</div>
                  <div className="param-info"><h3>{s.title}</h3><p>{s.description}</p></div>
                </div>
                <div className="param-card-right">
                  {savedSections.includes(s.id) && <span className="saved-badge"><Check size={12}/> Configuré</span>}
                  <button className="btn-configurer" onClick={()=>openModal(s.id)} style={{ borderColor:s.accentColor+"40", color:s.accentColor }}>
                    Configurer <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeModal === "examens"       && <ModalExamens       onClose={closeModal}/>}
      {activeModal === "moniteurs"     && <ModalMoniteurs     onClose={closeModal}/>}
      {activeModal === "inscription"   && <ModalInscription   onClose={closeModal}/>}
      {activeModal === "conges"        && <ModalConges        onClose={closeModal}/>}
      {activeModal === "prixFormation" && <ModalPrixFormation onClose={closeModal}/>}
      {activeModal === "nbSeances"     && <ModalNbSeances     onClose={closeModal}/>}
      {activeModal === "chargily"      && <ModalChargily      onClose={closeModal}/>}
    </div>
  );
};

export default Parametres;