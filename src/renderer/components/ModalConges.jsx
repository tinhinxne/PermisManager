// src/renderer/components/ModalConges.jsx
import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash, CalendarOff, Building2, User, Search } from "lucide-react";
import { useCongeCtx } from "../context/CongeContext";

const RAISONS = [
  { value: "maladie",  label: "Maladie",          emoji: "🤒", color: "#ef4444" },
  { value: "voyage",   label: "Voyage",           emoji: "✈️", color: "#3b82f6" },
  { value: "familial", label: "Raison familiale", emoji: "👨‍👩‍👧", color: "#f59e0b" },
  { value: "autre",    label: "Autre",            emoji: "📋", color: "#8b5cf6" },
];

const parseDate = (val) => {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return new Date(val + "T12:00:00");
  }
  const d = new Date(val);
  const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return new Date(local + "T12:00:00");
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

const datesSeChevachent = (debut1, fin1, debut2, fin2) => {
  const d1 = new Date(debut1 + "T00:00:00");
  const f1 = new Date(fin1   + "T23:59:59");
  const d2 = new Date(debut2 + "T00:00:00");
  const f2 = new Date(fin2   + "T23:59:59");
  return d1 <= f2 && d2 <= f1;
};

const trouverCongeEnConflit = (conges, newDebut, newFin) => {
  return conges.find(c => {
    if (c.statut !== "validee") return false;
    return datesSeChevachent(c.dateDebut, c.dateFin, newDebut, newFin);
  }) || null;
};

const isDatePasse = (val) =>
  !!(val && new Date(val + "T12:00:00") < new Date(new Date().toDateString()));

const isDateFinInvalide = (debut, fin) =>
  !!(debut && fin && new Date(fin + "T12:00:00") < new Date(debut + "T12:00:00"));

/* ── Design tokens (mêmes que MesConges.jsx) ────────────────────────────── */
const T = {
  ink:      "#0f172a",
  muted:    "#64748b",
  faint:    "#94a3b8",
  border:   "#e6ebf2",
  surface:  "#ffffff",
  bg:       "#f6f8fb",
  accent:   "#2b537e",
  accentSoft: "#eaf1f8",
};

const inp = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 11px", border: `1.5px solid ${T.border}`, borderRadius: 10,
  fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem",
  color: T.ink, background: "#f8fafc", outline: "none",
  transition: "border-color .15s, background .15s",
};

const STATUT_STYLES = {
  en_attente: { bg: "#fef9c3", color: "#a16207", label: "⏳ En attente" },
  refusee:    { bg: "#fee2e2", color: "#dc2626", label: "❌ Refusé"     },
  en_cours:   { bg: "#dcfce7", color: "#16a34a", label: "🟢 En cours"   },
  expire:     { bg: "#f1f5f9", color: "#94a3b8", label: "⚫ Expiré"     },
  a_venir:    { bg: "#fff7ed", color: "#ea580c", label: "🟡 À venir"    },
};

const resolveStatutKey = (c) => {
  if (c.statut === "en_attente") return "en_attente";
  if (c.statut === "refusee")    return "refusee";
  if (isActive(c.dateDebut, c.dateFin)) return "en_cours";
  if (isExpired(c.dateFin)) return "expire";
  if (isUpcoming(c.dateDebut)) return "a_venir";
  return "expire";
};

/* ── Toggle réutilisable ─────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? T.accent : "#cbd5e1",
      cursor: "pointer", position: "relative", flexShrink: 0,
      transition: "background 0.2s",
    }}
  >
    <div style={{
      position: "absolute", top: 3,
      left: checked ? 22 : 3, width: 18, height: 18,
      borderRadius: "50%", background: "#fff",
      transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    }} />
  </div>
);

/* ── Onglet Congé Annuel ───────────────────────────────────────────────────────*/
function TabCongeAnnuel() {
  const { congeAnnuel, saveCongeAnnuel } = useCongeCtx();

  const [actif,     setActif]     = useState(congeAnnuel?.actif     ?? false);
  const [dateDebut, setDateDebut] = useState(congeAnnuel?.dateDebut ?? "");
  const [dateFin,   setDateFin]   = useState(congeAnnuel?.dateFin   ?? "");
  const [label,     setLabel]     = useState(congeAnnuel?.label     ?? "Congé annuel");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");

  const dateBloquee =
    actif && (
      isDatePasse(dateDebut) ||
      isDatePasse(dateFin)   ||
      isDateFinInvalide(dateDebut, dateFin)
    );

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
      if (isDateFinInvalide(dateDebut, dateFin)) { setError("La date de fin doit être après le début."); return; }
    }
    setError("");
    setSaving(true);
    const result = await saveCongeAnnuel({ actif, dateDebut, dateFin, label });
    setSaving(false);
    if (result?.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setError("Erreur lors de la sauvegarde.");
  };

  const jours  = actif && dateDebut && dateFin ? nbJours(dateDebut, dateFin) : 0;
  const statut = actif && dateDebut && dateFin
    ? isActive(dateDebut, dateFin)  ? "en_cours"
    : isExpired(dateFin)            ? "expire"
    : "a_venir"
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toggle actif */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", borderRadius: 14,
        background: actif ? T.accentSoft : "#f8fafc",
        border: `1.5px solid ${actif ? "#c9d9e8" : T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: actif ? T.accent : "#e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={18} color={actif ? "#fff" : "#94a3b8"} />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: T.ink }}>
              Congé annuel de l'auto-école
            </div>
            <div style={{ fontSize: "0.72rem", color: T.muted, marginTop: 1 }}>
              Aucune séance ne pourra être créée durant cette période
            </div>
          </div>
        </div>
        <Toggle checked={actif} onChange={() => setActif(v => !v)} />
      </div>

      {actif && (
        <>
          {/* Libellé */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Libellé du congé
            </label>
            <input
              style={inp} type="text" value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex: Congé annuel été 2025"
            />
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Date de début <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={{
                  ...inp,
                  borderColor: isDatePasse(dateDebut) ? "#fca5a5" : T.border,
                  background:  isDatePasse(dateDebut) ? "#fef2f2" : "#f8fafc",
                }}
                type="date" value={dateDebut}
                onChange={e => { setDateDebut(e.target.value); setError(""); }}
              />
              {isDatePasse(dateDebut) && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                  📅 Date dans le passé
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Date de fin <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                style={{
                  ...inp,
                  borderColor: isDatePasse(dateFin) || isDateFinInvalide(dateDebut, dateFin) ? "#fca5a5" : T.border,
                  background:  isDatePasse(dateFin) || isDateFinInvalide(dateDebut, dateFin) ? "#fef2f2" : "#f8fafc",
                }}
                type="date" value={dateFin}
                onChange={e => { setDateFin(e.target.value); setError(""); }}
              />
              {isDatePasse(dateFin) && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                  📅 Date dans le passé
                </div>
              )}
              {isDateFinInvalide(dateDebut, dateFin) && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                  📅 Doit être après la date de début
                </div>
              )}
            </div>
          </div>

          {/* Résumé */}
          {dateDebut && dateFin && !error && (
            <div style={{
              padding: "12px 16px", borderRadius: 12,
              background: statut === "en_cours" ? "#f0fdf4" : statut === "expire" ? "#f8fafc" : T.accentSoft,
              border: `1px solid ${statut === "en_cours" ? "#86efac" : statut === "expire" ? T.border : "#c9d9e8"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.ink }}>
                  {formatDate(dateDebut)} → {formatDate(dateFin)}
                </div>
                <div style={{ fontSize: "0.72rem", color: T.muted, marginTop: 2 }}>
                  {jours} jour{jours > 1 ? "s" : ""} de fermeture
                </div>
              </div>
              <span style={{
                fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: statut === "en_cours" ? "#dcfce7" : statut === "expire" ? "#f1f5f9" : "#dce6f0",
                color:      statut === "en_cours" ? "#16a34a" : statut === "expire" ? "#94a3b8" : T.accent,
              }}>
                {statut === "en_cours" ? "🟢 En cours" : statut === "expire" ? "⚫ Expiré" : "🟡 À venir"}
              </span>
            </div>
          )}
        </>
      )}

      {!actif && (
        <div style={{
          padding: "22px", borderRadius: 14, textAlign: "center",
          background: "#f8fafc", border: `1.5px dashed ${T.border}`,
        }}>
          <CalendarOff size={30} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: "0.8rem", color: T.faint }}>Aucun congé annuel actif</div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1", marginTop: 4 }}>
            Activez le toggle pour définir une période de fermeture
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: "9px 13px", borderRadius: 9,
          background: "#fef2f2", border: "1px solid #fca5a5",
          color: "#dc2626", fontSize: "0.75rem", fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || dateBloquee}
        style={{
          padding: "11px 0", borderRadius: 12, border: "none",
          background: saved ? "#22c55e" : (saving || dateBloquee) ? "#cbd5e1" : T.accent,
          color: "#fff", fontFamily: "'Poppins',sans-serif",
          fontSize: "0.85rem", fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: (saving || dateBloquee) ? "none" : "0 6px 16px rgba(43,83,126,0.26)",
          transition: "background 0.3s",
        }}
      >
        {saving ? "Enregistrement…" : saved ? "✅ Sauvegardé !" : <><Save size={14} /> Sauvegarder</>}
      </button>
    </div>
  );
}

/* ── Onglet Congés Moniteurs ───────────────────────────────────────────────────*/
function TabCongesMoniteurs() {
  const { congesMoniteurs, addCongeMoniteur, removeCongeMoniteur, refreshMoniteur } = useCongeCtx();

  const [moniteurs,   setMoniteurs]   = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
  const [error,       setError]       = useState("");
  const [conflit,     setConflit]     = useState(null);
  const [loadingMons, setLoadingMons] = useState(true);

  const [searchTerm, setSearchTerm]     = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

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

  const conges      = selectedId ? (congesMoniteurs[selectedId] || []) : [];
  const selectedMon = moniteurs.find(m => String(m.id) === selectedId);

  const filteredMoniteurs = moniteurs.filter(m =>
    `${m.prenom} ${m.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!form.dateDebut || !form.dateFin) { setConflit(null); return; }
    if (isDateFinInvalide(form.dateDebut, form.dateFin)) { setConflit(null); return; }
    const c = trouverCongeEnConflit(conges, form.dateDebut, form.dateFin);
    setConflit(c || null);
  }, [form.dateDebut, form.dateFin, conges]);

  const handleAdd = async () => {
    if (!form.dateDebut || !form.dateFin) { setError("Renseignez les deux dates."); return; }
    const today = new Date(new Date().toDateString());
    if (new Date(form.dateDebut + "T12:00:00") < today) { setError("La date de début ne peut pas être dans le passé."); return; }
    if (new Date(form.dateFin   + "T12:00:00") < today) { setError("La date de fin ne peut pas être dans le passé.");   return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut))  { setError("La fin doit être après le début."); return; }
    if (form.raison === "autre" && !form.precision.trim())  { setError("Précisez la raison."); return; }

    const congeEnConflit = trouverCongeEnConflit(conges, form.dateDebut, form.dateFin);
    if (congeEnConflit) {
      setError(
        `Ce moniteur a déjà un congé accordé du ${formatDate(congeEnConflit.dateDebut)} ` +
        `au ${formatDate(congeEnConflit.dateFin)}.`
      );
      return;
    }

    setError("");
    const result = await addCongeMoniteur(Number(selectedId), { ...form, precision: form.precision.trim() });

    if (!result?.success) {
      if (result?.conflict) {
        const ex = result.existing;
        setError(
          `⛔ Conflit détecté : ce moniteur a déjà un congé du ` +
          `${formatDate(ex.dateDebut)} au ${formatDate(ex.dateFin)}.`
        );
        await refreshMoniteur(Number(selectedId));
      } else {
        setError("Erreur lors de l'enregistrement. Réessaie.");
      }
      return;
    }

    setForm({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
    setConflit(null);
    setShowForm(false);
  };

  const handleRemove = async (congeId) => {
    await removeCongeMoniteur(Number(selectedId), congeId);
  };

  if (loadingMons) return (
    <div style={{ textAlign: "center", padding: "30px 0", color: T.faint, fontSize: "0.82rem" }}>
      Chargement…
    </div>
  );

  if (moniteurs.length === 0) return (
    <div style={{ textAlign: "center", padding: "30px 0", color: T.faint, fontSize: "0.82rem" }}>
      Aucun moniteur trouvé.
    </div>
  );

  const congeActif   = conges.find(c => c.statut === "validee" && isActive(c.dateDebut, c.dateFin));
  const congesAvenir = conges.filter(c => c.statut === "validee" && isUpcoming(c.dateDebut));

  const formBloque =
    isDatePasse(form.dateDebut) ||
    isDatePasse(form.dateFin)   ||
    isDateFinInvalide(form.dateDebut, form.dateFin) ||
    !!conflit;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Sélecteur moniteur avec recherche */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative" }}>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Moniteur
        </label>
        <div style={{ position: "relative" }}>
          <Search size={14} color={T.faint} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={selectedMon ? `${selectedMon.prenom} ${selectedMon.nom}` : "Rechercher un moniteur…"}
            style={{ ...inp, paddingLeft: 32 }}
          />
        </div>

        {showDropdown && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 5,
            background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 12,
            boxShadow: "0 12px 28px rgba(15,23,42,0.14)", zIndex: 20,
            maxHeight: 200, overflowY: "auto", padding: 4,
          }}>
            {filteredMoniteurs.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: "0.75rem", color: T.faint }}>Aucun moniteur trouvé</div>
            ) : (
              filteredMoniteurs.map(m => {
                const enConge = congesMoniteurs[String(m.id)]?.some(
                  c => c.statut === "validee" && isActive(c.dateDebut, c.dateFin)
                );
                const isSel = String(m.id) === selectedId;
                return (
                  <div
                    key={m.id}
                    onMouseDown={() => {
                      setSelectedId(String(m.id));
                      setShowForm(false); setError(""); setConflit(null);
                      setSearchTerm(""); setShowDropdown(false);
                    }}
                    style={{
                      padding: "9px 10px", cursor: "pointer", fontSize: "0.8rem",
                      borderRadius: 8,
                      background: isSel ? T.accentSoft : "transparent",
                      color: isSel ? T.accent : T.ink,
                      fontWeight: isSel ? 700 : 500,
                    }}
                  >
                    {m.prenom} {m.nom}{enConge ? " 🌴" : ""}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Fiche récap moniteur */}
      {selectedMon && (
        <div style={{
          padding: "13px 15px", borderRadius: 14,
          background: congeActif ? T.accentSoft : "#f8fafc",
          border: `1.5px solid ${congeActif ? "#c9d9e8" : T.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: congeActif ? T.accent : "#e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9rem", fontWeight: 700,
            color: congeActif ? "#fff" : "#64748b",
          }}>
            {selectedMon.prenom?.[0]}{selectedMon.nom?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: T.ink }}>
              {selectedMon.prenom} {selectedMon.nom}
            </div>
            <div style={{ fontSize: "0.72rem", color: T.muted, marginTop: 1 }}>
              {conges.length} congé{conges.length !== 1 ? "s" : ""} enregistré{conges.length !== 1 ? "s" : ""}
              {congeActif ? " · 🌴 En congé actuellement" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, fontSize: "0.7rem", flexShrink: 0 }}>
            {congeActif && (
              <span style={{ padding: "3px 9px", borderRadius: 20, background: "#fff", color: T.accent, border: "1px solid #c9d9e8", fontWeight: 700 }}>
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
            textAlign: "center", padding: "26px 0",
            color: T.faint, fontSize: "0.8rem",
            background: "#f8fafc", borderRadius: 12,
            border: `1.5px dashed ${T.border}`,
          }}>
            <CalendarOff size={28} color="#cbd5e1" style={{ display: "block", margin: "0 auto 8px" }} />
            Aucun congé pour ce moniteur
          </div>
        ) : (
          conges.map(c => {
            const r    = RAISONS.find(x => x.value === c.raison) || RAISONS[3];
            const statutKey = resolveStatutKey(c);
            const s = STATUT_STYLES[statutKey];
            const titre = c.raison === "autre" && c.precision ? c.precision : r.label;
            const jours = nbJours(c.dateDebut, c.dateFin);
            const attente = c.statut === "en_attente";
            const estAtone = statutKey === "expire" || statutKey === "refusee";

            return (
              <div key={c.id} style={{
                display: "flex", borderRadius: 12,
                background: T.surface, border: `1px solid ${T.border}`,
                overflow: "hidden", opacity: estAtone ? 0.72 : 1,
              }}>
                <div style={{ width: 4, flexShrink: 0, background: r.color }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: `${r.color}14`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15,
                  }}>
                    {r.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: T.ink }}>{titre}</span>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
                        borderRadius: 20, flexShrink: 0,
                        background: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: T.muted }}>
                      {formatDate(c.dateDebut)} → {formatDate(c.dateFin)}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: T.faint, marginTop: 2 }}>
                      {jours} jour{jours > 1 ? "s" : ""}
                    </div>
                    {c.statut === "refusee" && c.motifRefus && (
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
                        transition: "background .15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      title="Supprimer"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Formulaire ajout */}
      {showForm ? (
        <div style={{ background: T.accentSoft, border: "1.5px solid #c9d9e8", borderRadius: 14, padding: 15 }}>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: T.accent, marginBottom: 11 }}>
            Nouveau congé — {selectedMon?.prenom} {selectedMon?.nom}
          </div>

          {/* Raisons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginBottom: 11 }}>
            {RAISONS.map(r => {
              const active = form.raison === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setForm(f => ({ ...f, raison: r.value }))}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    padding: "8px 4px", borderRadius: 9, cursor: "pointer",
                    border: `1.5px solid ${active ? r.color : T.border}`,
                    background: active ? `${r.color}12` : "#fff",
                    color: active ? r.color : T.muted,
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.66rem", textAlign: "center",
                    fontFamily: "'Poppins',sans-serif",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{r.emoji}</span>
                  {r.label}
                </button>
              );
            })}
          </div>

          {form.raison === "autre" && (
            <div style={{ marginBottom: 11 }}>
              <input
                style={inp} type="text" value={form.precision}
                onChange={e => { setForm(f => ({ ...f, precision: e.target.value })); setError(""); }}
                placeholder="Précisez la raison…"
              />
            </div>
          )}

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 11 }}>
            {[["dateDebut", "Date de début"], ["dateFin", "Date de fin"]].map(([key, lbl]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.68rem", fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>
                  {lbl}
                </label>
                <input
                  style={{
                    ...inp,
                    borderColor: isDatePasse(form[key]) ? "#fca5a5" : T.border,
                    background:  isDatePasse(form[key]) ? "#fef2f2" : "#fff",
                  }}
                  type="date" value={form[key]}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
                />
                {key === "dateFin" && isDateFinInvalide(form.dateDebut, form.dateFin) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                    📅 Doit être après la date de début
                  </div>
                )}
                {key === "dateDebut" && isDatePasse(form.dateDebut) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                    📅 Date dans le passé
                  </div>
                )}
                {key === "dateFin" && isDatePasse(form.dateFin) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                    📅 Date dans le passé
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Résumé durée */}
          {form.dateDebut && form.dateFin && !isDateFinInvalide(form.dateDebut, form.dateFin) && (
            <div style={{ fontSize: "0.72rem", color: T.accent, marginBottom: 9, fontWeight: 600 }}>
              {formatDate(form.dateDebut)} → {formatDate(form.dateFin)} · {nbJours(form.dateDebut, form.dateFin)} jour(s)
            </div>
          )}

          {/* Alerte chevauchement */}
          {conflit && (
            <div style={{
              padding: "10px 12px", borderRadius: 9, marginBottom: 9,
              background: "#fef2f2", border: "1.5px solid #fca5a5",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#dc2626" }}>
                  Congé déjà accordé sur cette période
                </div>
                <div style={{ fontSize: "0.7rem", color: "#b91c1c", marginTop: 3 }}>
                  {selectedMon?.prenom} est déjà en congé du{" "}
                  <strong>{formatDate(conflit.dateDebut)}</strong> au{" "}
                  <strong>{formatDate(conflit.dateFin)}</strong>.
                  Attendez la fin de ce congé avant d'en créer un nouveau.
                </div>
              </div>
            </div>
          )}

          {error && !conflit && (
            <div style={{ fontSize: "0.72rem", color: "#ef4444", marginBottom: 9, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setShowForm(false); setError(""); setConflit(null); }}
              style={{
                flex: 1, padding: "9px", borderRadius: 9,
                border: `1px solid ${T.border}`, background: "white",
                color: T.muted, fontSize: "0.8rem", cursor: "pointer",
                fontFamily: "'Poppins',sans-serif", fontWeight: 600,
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={formBloque}
              style={{
                flex: 2, padding: "9px", borderRadius: 9, border: "none",
                background: formBloque ? "#cbd5e1" : T.accent,
                color: "white", fontSize: "0.8rem", fontWeight: 700,
                cursor: formBloque ? "not-allowed" : "pointer",
                fontFamily: "'Poppins',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: formBloque ? "none" : "0 5px 14px rgba(43,83,126,0.26)",
                transition: "background 0.2s",
              }}
            >
              <Save size={13} /> Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: "10px", borderRadius: 10,
            border: `1.5px dashed #c9d9e8`, background: T.accentSoft,
            color: T.accent, fontWeight: 700, fontSize: "0.8rem",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
            fontFamily: "'Poppins',sans-serif",
          }}
        >
          <Plus size={14} /> Ajouter un congé
        </button>
      )}
    </div>
  );
}

/* ── Modale principale ─────────────────────────────────────────────────────────*/
export default function ModalConges({ onClose }) {
  const [tab, setTab] = useState("annuel");

  const tabStyle = (id) => ({
    flex: 1, padding: "12px 0", border: "none", cursor: "pointer",
    fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem", fontWeight: 700,
    borderBottom: tab === id ? `2.5px solid ${T.accent}` : "2.5px solid transparent",
    background: "transparent",
    color: tab === id ? T.accent : T.muted,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    transition: "color 0.2s, border-color 0.2s",
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Poppins',sans-serif",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: T.surface, borderRadius: 22,
        width: 520, maxWidth: "95vw", maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,0.22)", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${T.accent}, #3a6da0)`,
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CalendarOff size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#fff" }}>Gestion des congés</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.82)", marginTop: 1 }}>Congé annuel & congés personnels</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.18)", border: "none",
              borderRadius: 9, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "background .15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
          >
            <X size={15} color="white" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "#fafbfc" }}>
          <button style={tabStyle("annuel")} onClick={() => setTab("annuel")}>
            <Building2 size={14} /> Congé annuel
          </button>
          <button style={tabStyle("moniteurs")} onClick={() => setTab("moniteurs")}>
            <User size={14} /> Moniteurs
          </button>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px", background: T.bg }}>
          {tab === "annuel"    && <TabCongeAnnuel />}
          {tab === "moniteurs" && <TabCongesMoniteurs />}
        </div>
      </div>
    </div>
  );
}