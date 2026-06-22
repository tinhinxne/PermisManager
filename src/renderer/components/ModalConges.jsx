// // src/renderer/components/ModalConges.jsx
// import React, { useState, useEffect } from "react";
// import { X, Save, Plus, Trash, CalendarOff, Building2, User } from "lucide-react";
// import { useCongeCtx } from "../context/CongeContext";

// const RAISONS = [
//   { value: "maladie",  label: "🤒 Maladie",            color: "#ef4444" },
//   { value: "voyage",   label: "✈️ Voyage",              color: "#3b82f6" },
//   { value: "familial", label: "👨‍👩‍👧 Raison familiale",  color: "#f59e0b" },
//   { value: "autre",    label: "📋 Autre",               color: "#8b5cf6" },
// ];

// const parseDate = (val) => {
//   if (!val) return null;
//   const str = typeof val === "string" ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10);
//   return new Date(str + "T12:00:00");
// };

// const formatDate = (iso) => {
//   const d = parseDate(iso);
//   if (!d || isNaN(d)) return "—";
//   return d.toLocaleDateString("fr-DZ", {
//     day: "2-digit", month: "long", year: "numeric",
//   });
// };

// const nbJours = (d1, d2) => {
//   const a = parseDate(d1), b = parseDate(d2);
//   if (!a || !b) return 0;
//   return Math.max(0, Math.round((b - a) / 86400000) + 1);
// };

// const isActive   = (d, f) => { const now = new Date(); return parseDate(d) <= now && now <= parseDate(f); };
// const isExpired  = (f)    => parseDate(f) < new Date();
// const isUpcoming = (d)    => parseDate(d) > new Date();

// const inp = {
//   width: "100%", boxSizing: "border-box",
//   padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8,
//   fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem",
//   color: "#1e293b", background: "#f8fafc", outline: "none",
// };

// // ── Onglet Congé Annuel ───────────────────────────────────────────────────────
// function TabCongeAnnuel() {
//   const { congeAnnuel, saveCongeAnnuel } = useCongeCtx();

//   const [actif,     setActif]     = useState(congeAnnuel?.actif     ?? false);
//   const [dateDebut, setDateDebut] = useState(congeAnnuel?.dateDebut ?? "");
//   const [dateFin,   setDateFin]   = useState(congeAnnuel?.dateFin   ?? "");
//   const [label,     setLabel]     = useState(congeAnnuel?.label     ?? "Congé annuel");
//   const [saving,    setSaving]    = useState(false);
//   const [saved,     setSaved]     = useState(false);
//   const [error,     setError]     = useState("");

//   useEffect(() => {
//     if (congeAnnuel) {
//       setActif(congeAnnuel.actif ?? false);
//       setDateDebut(congeAnnuel.dateDebut ?? "");
//       setDateFin(congeAnnuel.dateFin ?? "");
//       setLabel(congeAnnuel.label ?? "Congé annuel");
//     }
//   }, [congeAnnuel]);

//   const handleSave = async () => {
//     if (actif) {
//       if (!dateDebut || !dateFin) { setError("Renseignez les deux dates."); return; }
//       if (new Date(dateFin) < new Date(dateDebut)) { setError("La date de fin doit être après le début."); return; }
//     }
//     setError("");
//     setSaving(true);
//     const result = await saveCongeAnnuel({ actif, dateDebut, dateFin, label });
//     setSaving(false);
//     if (result?.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
//     else setError("Erreur lors de la sauvegarde.");
//   };

//   const jours = actif && dateDebut && dateFin ? nbJours(dateDebut, dateFin) : 0;
//   const statut = actif && dateDebut && dateFin
//     ? isActive(dateDebut, dateFin) ? "en_cours"
//     : isExpired(dateFin) ? "expire"
//     : "a_venir"
//     : null;

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//       {/* Toggle actif */}
//       <div style={{
//         display: "flex", alignItems: "center", justifyContent: "space-between",
//         padding: "14px 16px", borderRadius: 12,
//         background: actif ? "#f0f5fa" : "#f8fafc",
//         border: `1.5px solid ${actif ? "#c3d6e8" : "#e2e8f0"}`,
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{
//             width: 36, height: 36, borderRadius: 10,
//             background: actif ? "linear-gradient(135deg,#2b537e,#3a6da0)" : "#e2e8f0",
//             display: "flex", alignItems: "center", justifyContent: "center",
//           }}>
//             <Building2 size={18} color={actif ? "#fff" : "#94a3b8"} />
//           </div>
//           <div>
//             <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Congé annuel de l'auto-école</div>
//             <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Aucune séance ne pourra être créée durant cette période</div>
//           </div>
//         </div>
//         <div
//           onClick={() => setActif(v => !v)}
//           style={{
//             width: 44, height: 24, borderRadius: 12,
//             background: actif ? "#2b537e" : "#cbd5e1",
//             cursor: "pointer", position: "relative", flexShrink: 0,
//             transition: "background 0.2s",
//           }}
//         >
//           <div style={{
//             position: "absolute", top: 3,
//             left: actif ? 22 : 3, width: 18, height: 18,
//             borderRadius: "50%", background: "#fff",
//             transition: "left 0.2s",
//             boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
//           }} />
//         </div>
//       </div>

//       {actif && (
//         <>
//           {/* Libellé */}
//           <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
//             <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
//               Libellé du congé
//             </label>
//             <input style={inp} type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="ex: Congé annuel été 2025" />
//           </div>

//           {/* Dates */}
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//             <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
//               <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
//                 Date de début <span style={{ color: "#ef4444" }}>*</span>
//               </label>
//               <input style={inp} type="date" value={dateDebut}
//                 onChange={e => { setDateDebut(e.target.value); setError(""); }} />
//             </div>
//             <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
//               <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
//                 Date de fin <span style={{ color: "#ef4444" }}>*</span>
//               </label>
//               <input style={inp} type="date" value={dateFin}
//                 onChange={e => { setDateFin(e.target.value); setError(""); }} />
//             </div>
//           </div>

//           {/* Résumé */}
//           {dateDebut && dateFin && !error && (
//             <div style={{
//               padding: "12px 16px", borderRadius: 10,
//               background: statut === "en_cours" ? "#f0fdf4" : statut === "expire" ? "#f8fafc" : "#f0f5fa",
//               border: `1px solid ${statut === "en_cours" ? "#86efac" : statut === "expire" ? "#e2e8f0" : "#c3d6e8"}`,
//               display: "flex", alignItems: "center", justifyContent: "space-between",
//             }}>
//               <div>
//                 <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
//                   {formatDate(dateDebut)} → {formatDate(dateFin)}
//                 </div>
//                 <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
//                   {jours} jour{jours > 1 ? "s" : ""} de fermeture
//                 </div>
//               </div>
//               <span style={{
//                 fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
//                 background: statut === "en_cours" ? "#dcfce7" : statut === "expire" ? "#f1f5f9" : "#dce6f0",
//                 color: statut === "en_cours" ? "#16a34a" : statut === "expire" ? "#94a3b8" : "#2b537e",
//               }}>
//                 {statut === "en_cours" ? "🟢 En cours" : statut === "expire" ? "⚫ Expiré" : "🟡 À venir"}
//               </span>
//             </div>
//           )}
//         </>
//       )}

//       {!actif && (
//         <div style={{
//           padding: "20px", borderRadius: 12, textAlign: "center",
//           background: "#f8fafc", border: "1px dashed #e2e8f0",
//         }}>
//           <CalendarOff size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
//           <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Aucun congé annuel actif</div>
//           <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: 4 }}>Activez le toggle pour définir une période de fermeture</div>
//         </div>
//       )}

//       {error && (
//         <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: "0.75rem", fontWeight: 600 }}>
//           ⚠️ {error}
//         </div>
//       )}

//       <button
//         onClick={handleSave}
//         disabled={saving}
//         style={{
//           padding: "10px 0", borderRadius: 10, border: "none",
//           background: saved ? "#22c55e" : saving ? "#94a3b8" : "#2b537e",
//           color: "#fff", fontFamily: "'Poppins',sans-serif",
//           fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
//           display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
//           transition: "background 0.3s",
//         }}
//       >
//         {saving ? "Enregistrement…" : saved ? "✅ Sauvegardé !" : <><Save size={14} /> Sauvegarder</>}
//       </button>
//     </div>
//   );
// }

// // ── Onglet Congés Moniteurs ───────────────────────────────────────────────────
// function TabCongesMoniteurs() {
//   const { congesMoniteurs, addCongeMoniteur, removeCongeMoniteur, refreshMoniteur } = useCongeCtx();
//   const [moniteurs,    setMoniteurs]    = useState([]);
//   const [selectedId,   setSelectedId]   = useState(null);
//   const [showForm,     setShowForm]     = useState(false);
//   const [form,         setForm]         = useState({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
//   const [error,        setError]        = useState("");
//   const [loadingMons,  setLoadingMons]  = useState(true);

//   useEffect(() => {
//     window.electron.getMoniteurs().then(list => {
//       setMoniteurs(list || []);
//       if (list?.length > 0) setSelectedId(String(list[0].id));
//       setLoadingMons(false);
//     }).catch(() => setLoadingMons(false));
//   }, []);

//   useEffect(() => {
//     if (selectedId) refreshMoniteur(Number(selectedId));
//   }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

//   const conges = selectedId ? (congesMoniteurs[selectedId] || []) : [];
//   const selectedMon = moniteurs.find(m => String(m.id) === selectedId);

//   const handleAdd = async () => {
//     if (!form.dateDebut || !form.dateFin) { setError("Renseignez les deux dates."); return; }

//     if (new Date(form.dateDebut + "T12:00:00") < new Date(new Date().toDateString())) {
//   setError("La date de début ne peut pas être dans le passé.");
//   return;
// }
//     if (new Date(form.dateFin) < new Date(form.dateDebut)) { setError("La fin doit être après le début."); return; }
//     if (form.raison === "autre" && !form.precision.trim()) { setError("Précisez la raison."); return; }
//     setError("");
//     await addCongeMoniteur(Number(selectedId), { ...form, precision: form.precision.trim() });
//     setForm({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
//     setShowForm(false);
//   };

//   const handleRemove = async (congeId) => {
//     await removeCongeMoniteur(Number(selectedId), congeId);
//   };

//   if (loadingMons) return (
//     <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: "0.82rem" }}>Chargement…</div>
//   );

//   if (moniteurs.length === 0) return (
//     <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: "0.82rem" }}>Aucun moniteur trouvé.</div>
//   );

//   const congeActif   = conges.find(c => c.statut === "validee" && isActive(c.dateDebut, c.dateFin));
//   const congesAvenir = conges.filter(c => c.statut === "validee" && isUpcoming(c.dateDebut));

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//       {/* Sélecteur moniteur */}
//       <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
//         <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
//           Moniteur
//         </label>
//         <select
//           value={selectedId || ""}
//           onChange={e => { setSelectedId(e.target.value); setShowForm(false); setError(""); }}
//           style={inp}
//         >
//           {moniteurs.map(m => (
//             <option key={m.id} value={String(m.id)}>
//               {m.prenom} {m.nom}
//               {congesMoniteurs[String(m.id)]?.some(c => c.statut === "validee" && isActive(c.dateDebut, c.dateFin)) ? " 🌴" : ""}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Fiche récap moniteur */}
//       {selectedMon && (
//         <div style={{
//           padding: "12px 14px", borderRadius: 12,
//           background: congeActif ? "#f0f5fa" : "#f8fafc",
//           border: `1.5px solid ${congeActif ? "#c3d6e8" : "#e2e8f0"}`,
//           display: "flex", alignItems: "center", gap: 12,
//         }}>
//           <div style={{
//             width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
//             background: congeActif ? "linear-gradient(135deg,#2b537e,#3a6da0)" : "#e2e8f0",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: "0.9rem", fontWeight: 700, color: congeActif ? "#fff" : "#64748b",
//           }}>
//             {selectedMon.prenom?.[0]}{selectedMon.nom?.[0]}
//           </div>
//           <div style={{ flex: 1 }}>
//             <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
//               {selectedMon.prenom} {selectedMon.nom}
//             </div>
//             <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 1 }}>
//               {conges.length} congé{conges.length !== 1 ? "s" : ""} enregistré{conges.length !== 1 ? "s" : ""}
//               {congeActif ? " · 🌴 En congé actuellement" : ""}
//             </div>
//           </div>
//           <div style={{ display: "flex", gap: 8, fontSize: "0.7rem", flexShrink: 0 }}>
//             {congeActif && (
//               <span style={{ padding: "3px 9px", borderRadius: 20, background: "#f0f5fa", color: "#2b537e", border: "1px solid #c3d6e8", fontWeight: 700 }}>
//                 En cours
//               </span>
//             )}
//             {congesAvenir.length > 0 && (
//               <span style={{ padding: "3px 9px", borderRadius: 20, background: "#fefce8", color: "#a16207", border: "1px solid #fde68a", fontWeight: 700 }}>
//                 {congesAvenir.length} à venir
//               </span>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Liste des congés */}
//       <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
//         {conges.length === 0 ? (
//           <div style={{
//             textAlign: "center", padding: "24px 0",
//             color: "#94a3b8", fontSize: "0.8rem",
//             background: "#f8fafc", borderRadius: 10,
//             border: "1px dashed #e2e8f0",
//           }}>
//             <CalendarOff size={28} color="#cbd5e1" style={{ marginBottom: 6, display: "block", margin: "0 auto 8px" }} />
//             Aucun congé pour ce moniteur
//           </div>
//         ) : (
//           conges.map(c => {
//             const r       = RAISONS.find(x => x.value === c.raison) || RAISONS[3];
//             const attente = c.statut === "en_attente";
//             const refuse  = c.statut === "refusee";
//             const actif   = !attente && !refuse && isActive(c.dateDebut, c.dateFin);
//             const expire  = !attente && !refuse && isExpired(c.dateFin);
//             const titre   = c.raison === "autre" && c.precision ? c.precision : r.label.slice(3);
//             const jours   = nbJours(c.dateDebut, c.dateFin);

//             const bg         = refuse ? "#fef2f2" : attente ? "#fffbeb" : actif ? "#f0fdf4" : expire ? "#f8fafc" : "#fefce8";
//             const border     = refuse ? "#fecaca" : attente ? "#fde68a" : actif ? "#bbf7d0" : expire ? "#e2e8f0" : "#fde68a";
//             const badgeBg    = refuse ? "#fee2e2" : attente ? "#fef9c3" : actif ? "#dcfce7" : expire ? "#f1f5f9" : "#fef9c3";
//             const badgeColor = refuse ? "#dc2626" : attente ? "#a16207" : actif ? "#16a34a" : expire ? "#94a3b8" : "#a16207";
//             const badgeLabel = refuse ? "❌ Refusé" : attente ? "⏳ En attente" : actif ? "🟢 En cours" : expire ? "⚫ Expiré" : "🟡 À venir";

//             return (
//               <div key={c.id} style={{
//                 padding: "12px 14px", borderRadius: 10,
//                 background: bg, border: `1px solid ${border}`,
//                 opacity: (expire || refuse) ? 0.7 : 1,
//                 display: "flex", alignItems: "flex-start", gap: 10,
//               }}>
//                 <div style={{
//                   width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
//                   background: `${r.color}1A`,
//                   display: "flex", alignItems: "center", justifyContent: "center",
//                   fontSize: 16,
//                 }}>
//                   {r.label.split(" ")[0]}
//                 </div>
//                 <div style={{ flex: 1, minWidth: 0 }}>
//                   <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
//                     <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1e293b" }}>{titre}</span>
//                     <span style={{
//                       fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
//                       background: badgeBg, color: badgeColor,
//                     }}>
//                       {badgeLabel}
//                     </span>
//                   </div>
//                   <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
//                     📅 {formatDate(c.dateDebut)} → {formatDate(c.dateFin)}
//                   </div>
//                   <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>
//                     {jours} jour{jours > 1 ? "s" : ""}
//                   </div>
//                   {refuse && c.motifRefus && (
//                     <div style={{ fontSize: "0.7rem", color: "#dc2626", marginTop: 4, fontStyle: "italic" }}>
//                       Motif du refus : {c.motifRefus}
//                     </div>
//                   )}
//                 </div>
//                 {!attente && (
//                   <button
//                     onClick={() => handleRemove(c.id)}
//                     style={{
//                       background: "none", border: "none", cursor: "pointer",
//                       color: "#ef4444", padding: 4, flexShrink: 0,
//                       borderRadius: 6, display: "flex", alignItems: "center",
//                     }}
//                     title="Supprimer"
//                   >
//                     <Trash size={14} />
//                   </button>
//                 )}
//               </div>
//             );
//           })
//         )}
//       </div>

//       {/* Formulaire ajout */}
//       {showForm ? (
//         <div style={{ background: "#f8faff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: 14 }}>
//           <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4338ca", marginBottom: 10 }}>
//             Nouveau congé — {selectedMon?.prenom} {selectedMon?.nom}
//           </div>

//           {/* Raisons */}
//           <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
//             {RAISONS.map(r => (
//               <button key={r.value} onClick={() => setForm(f => ({ ...f, raison: r.value }))} style={{
//                 padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", cursor: "pointer",
//                 border: `1.5px solid ${form.raison === r.value ? r.color : "#e2e8f0"}`,
//                 background: form.raison === r.value ? r.color + "18" : "white",
//                 color: form.raison === r.value ? r.color : "#64748b",
//                 fontWeight: form.raison === r.value ? 700 : 400,
//               }}>
//                 {r.label}
//               </button>
//             ))}
//           </div>

//           {form.raison === "autre" && (
//             <div style={{ marginBottom: 10 }}>
//               <input
//                 style={inp} type="text" value={form.precision}
//                 onChange={e => { setForm(f => ({ ...f, precision: e.target.value })); setError(""); }}
//                 placeholder="Précisez la raison…"
//               />
//             </div>
//           )}

//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
//             {[["dateDebut", "Date de début"], ["dateFin", "Date de fin"]].map(([key, lbl]) => (
//   <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
//     <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{lbl}</label>
//     <input
//       style={{
//         ...inp,
//         borderColor: form[key] && new Date(form[key] + "T12:00:00") < new Date(new Date().toDateString()) ? "#fca5a5" : "#e2e8f0",
//         background:  form[key] && new Date(form[key] + "T12:00:00") < new Date(new Date().toDateString()) ? "#fef2f2" : "#f8fafc",
//       }}
//       type="date" value={form[key]}
//       onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
//     />
//     {form[key] && new Date(form[key] + "T12:00:00") < new Date(new Date().toDateString()) && (
//       <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#dc2626", fontWeight:600, marginTop:3 }}>
//         <span>📅</span> Date dans le passé
//       </div>
//     )}
//   </div>
// ))}
//           </div>

//           {form.dateDebut && form.dateFin && new Date(form.dateFin) >= new Date(form.dateDebut) && (
//             <div style={{ fontSize: "0.72rem", color: "#6366f1", marginBottom: 8, fontWeight: 600 }}>
//               📅 {formatDate(form.dateDebut)} → {formatDate(form.dateFin)} · {nbJours(form.dateDebut, form.dateFin)} jour(s)
//             </div>
//           )}

//           {error && (
//             <div style={{ fontSize: "0.72rem", color: "#ef4444", marginBottom: 8, fontWeight: 600 }}>⚠️ {error}</div>
//           )}

//           <div style={{ display: "flex", gap: 8 }}>
//             <button onClick={() => { setShowForm(false); setError(""); }} style={{
//               flex: 1, padding: "8px", borderRadius: 8,
//               border: "1px solid #e2e8f0", background: "white",
//               color: "#64748b", fontSize: "0.8rem", cursor: "pointer",
//               fontFamily: "'Poppins',sans-serif",
//             }}>
//               Annuler
//             </button>
//             <button onClick={handleAdd} style={{
//               flex: 2, padding: "8px", borderRadius: 8, border: "none",
//               background: "#6366f1", color: "white",
//               fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
//               fontFamily: "'Poppins',sans-serif",
//               display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
//             }}>
//               <Save size={13} /> Enregistrer
//             </button>
//           </div>
//         </div>
//       ) : (
//         <button onClick={() => setShowForm(true)} style={{
//           padding: "9px", borderRadius: 8,
//           border: "1.5px dashed #c7d2fe", background: "#f0f0ff",
//           color: "#6366f1", fontWeight: 600, fontSize: "0.8rem",
//           cursor: "pointer", display: "flex", alignItems: "center",
//           justifyContent: "center", gap: 6,
//           fontFamily: "'Poppins',sans-serif",
//         }}>
//           <Plus size={14} /> Ajouter un congé
//         </button>
//       )}
//     </div>
//   );
// }

// // ── Modale principale ─────────────────────────────────────────────────────────
// export default function ModalConges({ onClose }) {
//   const [tab, setTab] = useState("annuel");

//   const tabStyle = (id) => ({
//     flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
//     fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem", fontWeight: 600,
//     borderBottom: tab === id ? "2.5px solid #2b537e" : "2.5px solid transparent",
//     background: "transparent",
//     color: tab === id ? "#2b537e" : "#64748b",
//     transition: "color 0.2s, border-color 0.2s",
//   });

//   return (
//     <div style={{
//       position: "fixed", inset: 0, zIndex: 500,
//       background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
//       display: "flex", alignItems: "center", justifyContent: "center",
//       fontFamily: "'Poppins',sans-serif",
//     }}
//       onClick={e => e.target === e.currentTarget && onClose()}
//     >
//       <div style={{
//         background: "#fff", borderRadius: 20,
//         width: 520, maxWidth: "95vw", maxHeight: "88vh",
//         display: "flex", flexDirection: "column",
//         boxShadow: "0 30px 80px rgba(0,0,0,0.2)", overflow: "hidden",
//       }}>
//         {/* Header */}
//         <div style={{
//           background: "linear-gradient(135deg,#2b537e,#3a6da0)",
//           padding: "18px 22px",
//           display: "flex", alignItems: "center", justifyContent: "space-between",
//         }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             <div style={{
//               width: 34, height: 34, borderRadius: 10,
//               background: "rgba(255,255,255,0.22)",
//               display: "flex", alignItems: "center", justifyContent: "center",
//             }}>
//               <CalendarOff size={18} color="white" />
//             </div>
//             <div>
//               <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>Gestion des congés</div>
//               <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)" }}>Congé annuel & congés personnels</div>
//             </div>
//           </div>
//           <button onClick={onClose} style={{
//             background: "rgba(255,255,255,0.2)", border: "none",
//             borderRadius: 8, width: 30, height: 30,
//             display: "flex", alignItems: "center", justifyContent: "center",
//             cursor: "pointer",
//           }}>
//             <X size={15} color="white" />
//           </button>
//         </div>

//         {/* Tabs */}
//         <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fafafa" }}>
//           <button style={tabStyle("annuel")} onClick={() => setTab("annuel")}>
//             <Building2 size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
//             Congé annuel
//           </button>
//           <button style={tabStyle("moniteurs")} onClick={() => setTab("moniteurs")}>
//             <User size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
//             Moniteurs
//           </button>
//         </div>

//         {/* Contenu */}
//         <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
//           {tab === "annuel"    && <TabCongeAnnuel />}
//           {tab === "moniteurs" && <TabCongesMoniteurs />}
//         </div>
//       </div>
//     </div>
//   );
// }





// src/renderer/components/ModalConges.jsx
import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash, CalendarOff, Building2, User } from "lucide-react";
import { useCongeCtx } from "../context/CongeContext";

const RAISONS = [
  { value: "maladie",  label: "🤒 Maladie",            color: "#ef4444" },
  { value: "voyage",   label: "✈️ Voyage",              color: "#3b82f6" },
  { value: "familial", label: "👨‍👩‍👧 Raison familiale",  color: "#f59e0b" },
  { value: "autre",    label: "📋 Autre",               color: "#8b5cf6" },
];

const parseDate = (val) => {
  if (!val) return null;
  const str = typeof val === "string" ? val.slice(0, 10) : new Date(val).toISOString().slice(0, 10);
  return new Date(str + "T12:00:00");
};

const formatDate = (iso) => {
  const d = parseDate(iso);
  if (!d || isNaN(d)) return "—";
  return d.toLocaleDateString("fr-DZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

const nbJours = (d1, d2) => {
  const a = parseDate(d1), b = parseDate(d2);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000) + 1);
};

const isActive   = (d, f) => { const now = new Date(); return parseDate(d) <= now && now <= parseDate(f); };
const isExpired  = (f)    => parseDate(f) < new Date();
const isUpcoming = (d)    => parseDate(d) > new Date();

const inp = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem",
  color: "#1e293b", background: "#f8fafc", outline: "none",
};

const isDatePasse  = (val) =>
  !!(val && new Date(val + "T12:00:00") < new Date(new Date().toDateString()));

const isDateFinInvalide = (debut, fin) =>
  !!(debut && fin && new Date(fin + "T12:00:00") < new Date(debut + "T12:00:00"));

// ── Onglet Congé Annuel ───────────────────────────────────────────────────────
function TabCongeAnnuel() {
  const { congeAnnuel, saveCongeAnnuel } = useCongeCtx();

  const [actif,     setActif]     = useState(congeAnnuel?.actif     ?? false);
  const [dateDebut, setDateDebut] = useState(congeAnnuel?.dateDebut ?? "");
  const [dateFin,   setDateFin]   = useState(congeAnnuel?.dateFin   ?? "");
  const [label,     setLabel]     = useState(congeAnnuel?.label     ?? "Congé annuel");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (congeAnnuel) {
      setActif(congeAnnuel.actif ?? false);
      setDateDebut(congeAnnuel.dateDebut ?? "");
      setDateFin(congeAnnuel.dateFin ?? "");
      setLabel(congeAnnuel.label ?? "Congé annuel");
    }
  }, [congeAnnuel]);

  const handleSave = async () => {
    if (actif) {
      if (!dateDebut || !dateFin) { setError("Renseignez les deux dates."); return; }
      if (new Date(dateFin) < new Date(dateDebut)) { setError("La date de fin doit être après le début."); return; }
    }
    setError("");
    setSaving(true);
    const result = await saveCongeAnnuel({ actif, dateDebut, dateFin, label });
    setSaving(false);
    if (result?.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setError("Erreur lors de la sauvegarde.");
  };

  const jours = actif && dateDebut && dateFin ? nbJours(dateDebut, dateFin) : 0;
  const statut = actif && dateDebut && dateFin
    ? isActive(dateDebut, dateFin) ? "en_cours"
    : isExpired(dateFin) ? "expire"
    : "a_venir"
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toggle actif */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderRadius: 12,
        background: actif ? "#f0f5fa" : "#f8fafc",
        border: `1.5px solid ${actif ? "#c3d6e8" : "#e2e8f0"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: actif ? "linear-gradient(135deg,#2b537e,#3a6da0)" : "#e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={18} color={actif ? "#fff" : "#94a3b8"} />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Congé annuel de l'auto-école</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Aucune séance ne pourra être créée durant cette période</div>
          </div>
        </div>
        <div
          onClick={() => setActif(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: actif ? "#2b537e" : "#cbd5e1",
            cursor: "pointer", position: "relative", flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <div style={{
            position: "absolute", top: 3,
            left: actif ? 22 : 3, width: 18, height: 18,
            borderRadius: "50%", background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>

      {actif && (
        <>
          {/* Libellé */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Libellé du congé
            </label>
            <input style={inp} type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="ex: Congé annuel été 2025" />
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
                Date de début <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={inp}
                type="date" value={dateDebut}
                onChange={e => { setDateDebut(e.target.value); setError(""); }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
                Date de fin <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={inp}
                type="date" value={dateFin}
                onChange={e => { setDateFin(e.target.value); setError(""); }}
              />
            </div>
          </div>

          {/* Résumé */}
          {dateDebut && dateFin && !error && (
            <div style={{
              padding: "12px 16px", borderRadius: 10,
              background: statut === "en_cours" ? "#f0fdf4" : statut === "expire" ? "#f8fafc" : "#f0f5fa",
              border: `1px solid ${statut === "en_cours" ? "#86efac" : statut === "expire" ? "#e2e8f0" : "#c3d6e8"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                  {formatDate(dateDebut)} → {formatDate(dateFin)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
                  {jours} jour{jours > 1 ? "s" : ""} de fermeture
                </div>
              </div>
              <span style={{
                fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: statut === "en_cours" ? "#dcfce7" : statut === "expire" ? "#f1f5f9" : "#dce6f0",
                color: statut === "en_cours" ? "#16a34a" : statut === "expire" ? "#94a3b8" : "#2b537e",
              }}>
                {statut === "en_cours" ? "🟢 En cours" : statut === "expire" ? "⚫ Expiré" : "🟡 À venir"}
              </span>
            </div>
          )}
        </>
      )}

      {!actif && (
        <div style={{
          padding: "20px", borderRadius: 12, textAlign: "center",
          background: "#f8fafc", border: "1px dashed #e2e8f0",
        }}>
          <CalendarOff size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Aucun congé annuel actif</div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: 4 }}>Activez le toggle pour définir une période de fermeture</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: "0.75rem", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 0", borderRadius: 10, border: "none",
          background: saved ? "#22c55e" : saving ? "#94a3b8" : "#2b537e",
          color: "#fff", fontFamily: "'Poppins',sans-serif",
          fontSize: "0.85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background 0.3s",
        }}
      >
        {saving ? "Enregistrement…" : saved ? "✅ Sauvegardé !" : <><Save size={14} /> Sauvegarder</>}
      </button>
    </div>
  );
}

// ── Onglet Congés Moniteurs ───────────────────────────────────────────────────
function TabCongesMoniteurs() {
  const { congesMoniteurs, addCongeMoniteur, removeCongeMoniteur, refreshMoniteur } = useCongeCtx();
  const [moniteurs,    setMoniteurs]    = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
  const [error,        setError]        = useState("");
  const [loadingMons,  setLoadingMons]  = useState(true);

  useEffect(() => {
    window.electron.getMoniteurs().then(list => {
      setMoniteurs(list || []);
      if (list?.length > 0) setSelectedId(String(list[0].id));
      setLoadingMons(false);
    }).catch(() => setLoadingMons(false));
  }, []);

  useEffect(() => {
    if (selectedId) refreshMoniteur(Number(selectedId));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const conges = selectedId ? (congesMoniteurs[selectedId] || []) : [];
  const selectedMon = moniteurs.find(m => String(m.id) === selectedId);

  const handleAdd = async () => {
    if (!form.dateDebut || !form.dateFin) { setError("Renseignez les deux dates."); return; }
    const today = new Date(new Date().toDateString());
    if (new Date(form.dateDebut + "T12:00:00") < today) { setError("La date de début ne peut pas être dans le passé."); return; }
    if (new Date(form.dateFin   + "T12:00:00") < today) { setError("La date de fin ne peut pas être dans le passé."); return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) { setError("La fin doit être après le début."); return; }
    if (form.raison === "autre" && !form.precision.trim()) { setError("Précisez la raison."); return; }
    setError("");
    await addCongeMoniteur(Number(selectedId), { ...form, precision: form.precision.trim() });
    setForm({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
    setShowForm(false);
  };

  const handleRemove = async (congeId) => {
    await removeCongeMoniteur(Number(selectedId), congeId);
  };

  if (loadingMons) return (
    <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: "0.82rem" }}>Chargement…</div>
  );

  if (moniteurs.length === 0) return (
    <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: "0.82rem" }}>Aucun moniteur trouvé.</div>
  );

  const congeActif   = conges.find(c => c.statut === "validee" && isActive(c.dateDebut, c.dateFin));
  const congesAvenir = conges.filter(c => c.statut === "validee" && isUpcoming(c.dateDebut));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Sélecteur moniteur */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Moniteur
        </label>
        <select
          value={selectedId || ""}
          onChange={e => { setSelectedId(e.target.value); setShowForm(false); setError(""); }}
          style={inp}
        >
          {moniteurs.map(m => (
            <option key={m.id} value={String(m.id)}>
              {m.prenom} {m.nom}
              {congesMoniteurs[String(m.id)]?.some(c => c.statut === "validee" && isActive(c.dateDebut, c.dateFin)) ? " 🌴" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Fiche récap moniteur */}
      {selectedMon && (
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: congeActif ? "#f0f5fa" : "#f8fafc",
          border: `1.5px solid ${congeActif ? "#c3d6e8" : "#e2e8f0"}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: congeActif ? "linear-gradient(135deg,#2b537e,#3a6da0)" : "#e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9rem", fontWeight: 700, color: congeActif ? "#fff" : "#64748b",
          }}>
            {selectedMon.prenom?.[0]}{selectedMon.nom?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
              {selectedMon.prenom} {selectedMon.nom}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 1 }}>
              {conges.length} congé{conges.length !== 1 ? "s" : ""} enregistré{conges.length !== 1 ? "s" : ""}
              {congeActif ? " · 🌴 En congé actuellement" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, fontSize: "0.7rem", flexShrink: 0 }}>
            {congeActif && (
              <span style={{ padding: "3px 9px", borderRadius: 20, background: "#f0f5fa", color: "#2b537e", border: "1px solid #c3d6e8", fontWeight: 700 }}>
                En cours
              </span>
            )}
            {congesAvenir.length > 0 && (
              <span style={{ padding: "3px 9px", borderRadius: 20, background: "#fefce8", color: "#a16207", border: "1px solid #fde68a", fontWeight: 700 }}>
                {congesAvenir.length} à venir
              </span>
            )}
          </div>
        </div>
      )}

      {/* Liste des congés */}
      <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {conges.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "24px 0",
            color: "#94a3b8", fontSize: "0.8rem",
            background: "#f8fafc", borderRadius: 10,
            border: "1px dashed #e2e8f0",
          }}>
            <CalendarOff size={28} color="#cbd5e1" style={{ marginBottom: 6, display: "block", margin: "0 auto 8px" }} />
            Aucun congé pour ce moniteur
          </div>
        ) : (
          conges.map(c => {
            const r       = RAISONS.find(x => x.value === c.raison) || RAISONS[3];
            const attente = c.statut === "en_attente";
            const refuse  = c.statut === "refusee";
            const actif   = !attente && !refuse && isActive(c.dateDebut, c.dateFin);
            const expire  = !attente && !refuse && isExpired(c.dateFin);
            const titre   = c.raison === "autre" && c.precision ? c.precision : r.label.slice(3);
            const jours   = nbJours(c.dateDebut, c.dateFin);

            const bg         = refuse ? "#fef2f2" : attente ? "#fffbeb" : actif ? "#f0fdf4" : expire ? "#f8fafc" : "#fefce8";
            const border     = refuse ? "#fecaca" : attente ? "#fde68a" : actif ? "#bbf7d0" : expire ? "#e2e8f0" : "#fde68a";
            const badgeBg    = refuse ? "#fee2e2" : attente ? "#fef9c3" : actif ? "#dcfce7" : expire ? "#f1f5f9" : "#fef9c3";
            const badgeColor = refuse ? "#dc2626" : attente ? "#a16207" : actif ? "#16a34a" : expire ? "#94a3b8" : "#a16207";
            const badgeLabel = refuse ? "❌ Refusé" : attente ? "⏳ En attente" : actif ? "🟢 En cours" : expire ? "⚫ Expiré" : "🟡 À venir";

            return (
              <div key={c.id} style={{
                padding: "12px 14px", borderRadius: 10,
                background: bg, border: `1px solid ${border}`,
                opacity: (expire || refuse) ? 0.7 : 1,
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: `${r.color}1A`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {r.label.split(" ")[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1e293b" }}>{titre}</span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                      background: badgeBg, color: badgeColor,
                    }}>
                      {badgeLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    📅 {formatDate(c.dateDebut)} → {formatDate(c.dateFin)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>
                    {jours} jour{jours > 1 ? "s" : ""}
                  </div>
                  {refuse && c.motifRefus && (
                    <div style={{ fontSize: "0.7rem", color: "#dc2626", marginTop: 4, fontStyle: "italic" }}>
                      Motif du refus : {c.motifRefus}
                    </div>
                  )}
                </div>
                {!attente && (
                  <button
                    onClick={() => handleRemove(c.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#ef4444", padding: 4, flexShrink: 0,
                      borderRadius: 6, display: "flex", alignItems: "center",
                    }}
                    title="Supprimer"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Formulaire ajout */}
      {showForm ? (
        <div style={{ background: "#f8faff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4338ca", marginBottom: 10 }}>
            Nouveau congé — {selectedMon?.prenom} {selectedMon?.nom}
          </div>

          {/* Raisons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {RAISONS.map(r => (
              <button key={r.value} onClick={() => setForm(f => ({ ...f, raison: r.value }))} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", cursor: "pointer",
                border: `1.5px solid ${form.raison === r.value ? r.color : "#e2e8f0"}`,
                background: form.raison === r.value ? r.color + "18" : "white",
                color: form.raison === r.value ? r.color : "#64748b",
                fontWeight: form.raison === r.value ? 700 : 400,
              }}>
                {r.label}
              </button>
            ))}
          </div>

          {form.raison === "autre" && (
            <div style={{ marginBottom: 10 }}>
              <input
                style={inp} type="text" value={form.precision}
                onChange={e => { setForm(f => ({ ...f, precision: e.target.value })); setError(""); }}
                placeholder="Précisez la raison…"
              />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["dateDebut", "Date de début"], ["dateFin", "Date de fin"]].map(([key, lbl]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.68rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{lbl}</label>
                <input
                  style={{
                    ...inp,
                    borderColor: isDatePasse(form[key]) ? "#fca5a5" : "#e2e8f0",
                    background:  isDatePasse(form[key]) ? "#fef2f2" : "#f8fafc",
                  }}
                  type="date" value={form[key]}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
                />
                {key === "dateFin" && isDateFinInvalide(form.dateDebut, form.dateFin) && (
  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#dc2626", fontWeight:600, marginTop:3 }}>
    <span>📅</span> Doit être après la date de début
  </div>
)}
{key === "dateDebut" && isDatePasse(form.dateDebut) && (
  <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.72rem", color:"#dc2626", fontWeight:600, marginTop:3 }}>
    <span>📅</span> Date dans le passé
  </div>
)}
              </div>
            ))}
          </div>

          {form.dateDebut && form.dateFin && new Date(form.dateFin) >= new Date(form.dateDebut) && (
            <div style={{ fontSize: "0.72rem", color: "#6366f1", marginBottom: 8, fontWeight: 600 }}>
              📅 {formatDate(form.dateDebut)} → {formatDate(form.dateFin)} · {nbJours(form.dateDebut, form.dateFin)} jour(s)
            </div>
          )}

          {error && (
            <div style={{ fontSize: "0.72rem", color: "#ef4444", marginBottom: 8, fontWeight: 600 }}>⚠️ {error}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowForm(false); setError(""); }} style={{
              flex: 1, padding: "8px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "white",
              color: "#64748b", fontSize: "0.8rem", cursor: "pointer",
              fontFamily: "'Poppins',sans-serif",
            }}>
              Annuler
            </button>
         <button onClick={handleAdd} disabled={isDatePasse(form.dateDebut) || isDateFinInvalide(form.dateDebut, form.dateFin)} style={{
  flex: 2, padding: "8px", borderRadius: 8, border: "none",
  background: isDatePasse(form.dateDebut) || isDateFinInvalide(form.dateDebut, form.dateFin) ? "#94a3b8" : "#6366f1", color: "white",
              fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "'Poppins',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Save size={13} /> Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{
          padding: "9px", borderRadius: 8,
          border: "1.5px dashed #c7d2fe", background: "#f0f0ff",
          color: "#6366f1", fontWeight: 600, fontSize: "0.8rem",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 6,
          fontFamily: "'Poppins',sans-serif",
        }}>
          <Plus size={14} /> Ajouter un congé
        </button>
      )}
    </div>
  );
}

// ── Modale principale ─────────────────────────────────────────────────────────
export default function ModalConges({ onClose }) {
  const [tab, setTab] = useState("annuel");

  const tabStyle = (id) => ({
    flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
    fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem", fontWeight: 600,
    borderBottom: tab === id ? "2.5px solid #2b537e" : "2.5px solid transparent",
    background: "transparent",
    color: tab === id ? "#2b537e" : "#64748b",
    transition: "color 0.2s, border-color 0.2s",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Poppins',sans-serif",
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 20,
        width: 520, maxWidth: "95vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,0.2)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#2b537e,#3a6da0)",
          padding: "18px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CalendarOff size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>Gestion des congés</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)" }}>Congé annuel & congés personnels</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none",
            borderRadius: 8, width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <X size={15} color="white" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fafafa" }}>
          <button style={tabStyle("annuel")} onClick={() => setTab("annuel")}>
            <Building2 size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
            Congé annuel
          </button>
          <button style={tabStyle("moniteurs")} onClick={() => setTab("moniteurs")}>
            <User size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
            Moniteurs
          </button>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {tab === "annuel"    && <TabCongeAnnuel />}
          {tab === "moniteurs" && <TabCongesMoniteurs />}
        </div>
      </div>
    </div>
  );
}