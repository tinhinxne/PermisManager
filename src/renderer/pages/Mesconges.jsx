import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCongeCtx } from "../context/CongeContext";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import {
  CalendarOff, Plus, Save, X, Trash2, Clock,
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, CalendarDays, Lock,
  Thermometer, Plane, Users, ClipboardList,
} from "lucide-react";
import { usePermissionsCtx } from "../context/PermissionsContext";

const RAISONS = [
  { value: "maladie",  label: "Maladie",           icon: Thermometer,   color: "#ef4444" },
  { value: "voyage",   label: "Voyage",            icon: Plane,         color: "#3b82f6" },
  { value: "familial", label: "Raison familiale",  icon: Users,         color: "#f59e0b" },
  { value: "autre",    label: "Autre",             icon: ClipboardList, color: "#8b5cf6" },
];

const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-DZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

const nbJours = (d1, d2) => {
  if (!d1 || !d2) return 0;
  return Math.max(0, Math.round((new Date(d2) - new Date(d1)) / 86400000) + 1);
};

const isDatePasse = (val) =>
  !!(val && new Date(val + "T12:00:00") < new Date(new Date().toDateString()));

const isDateFinInvalide = (debut, fin) =>
  !!(debut && fin && new Date(fin + "T12:00:00") < new Date(debut + "T12:00:00"));

const isActive   = (d, f) => { const now = new Date(); return new Date(d + "T00:00:00") <= now && now <= new Date(f + "T23:59:59"); };
const isExpired  = (f)    => new Date(f + "T23:59:59") < new Date();
const isUpcoming = (d)    => new Date(d + "T00:00:00") > new Date();

// ── Vérifie si deux plages se chevauchent ─────────────────────────────────────
const datesSeChevachent = (debut1, fin1, debut2, fin2) => {
  const d1 = new Date(debut1 + "T00:00:00");
  const f1 = new Date(fin1   + "T23:59:59");
  const d2 = new Date(debut2 + "T00:00:00");
  const f2 = new Date(fin2   + "T23:59:59");
  return d1 <= f2 && d2 <= f1;
};

// ── Trouve un congé validé ou en_attente qui chevauche la plage ───────────────
const trouverCongeEnConflit = (conges, newDebut, newFin) => {
  return conges.find(c => {
    if (c.statut !== "validee" && c.statut !== "en_attente") return false;
    return datesSeChevachent(c.dateDebut, c.dateFin, newDebut, newFin);
  }) || null;
};

/* ── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  ink:      "#0f172a",
  muted:    "#64748b",
  faint:    "#94a3b8",
  border:   "#e6ebf2",
  surface:  "#ffffff",
  bg:       "#f6f8fb",
  accent:   "#2b537e",
  accentSoft: "#eaf1f8",
  radius:   16,
};

const inp = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px", border: `1.5px solid ${T.border}`, borderRadius: 10,
  fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem",
  color: T.ink, background: "#f8fafc", outline: "none",
  transition: "border-color .15s, background .15s",
};

/* ── Badge de statut ────────────────────────────────────────────────────── */
const STATUT_STYLES = {
  en_attente: { bg: "#fef9c3", color: "#a16207", icon: <Clock size={11} />,        label: "En attente" },
  refusee:    { bg: "#fee2e2", color: "#dc2626", icon: <XCircle size={11} />,      label: "Refusé"     },
  en_cours:   { bg: "#dcfce7", color: "#16a34a", icon: <CheckCircle2 size={11} />, label: "En cours"   },
  expire:     { bg: "#f1f5f9", color: "#94a3b8", icon: null,                       label: "Expiré"     },
  a_venir:    { bg: "#fff7ed", color: "#ea580c", icon: null,                       label: "À venir"    },
};

const resolveStatutKey = (conge) => {
  if (conge.statut === "en_attente") return "en_attente";
  if (conge.statut === "refusee")    return "refusee";
  if (isActive(conge.dateDebut, conge.dateFin)) return "en_cours";
  if (isExpired(conge.dateFin)) return "expire";
  if (isUpcoming(conge.dateDebut)) return "a_venir";
  return "expire";
};

const StatutBadge = ({ conge }) => {
  const key = resolveStatutKey(conge);
  const s = STATUT_STYLES[key];
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px",
      borderRadius: 20, background: s.bg, color: s.color,
      whiteSpace: "nowrap",
    }}>
      {s.icon} {s.label}
    </span>
  );
};

/* ── Carte congé individuelle ──────────────────────────────────────────── */
const CongeCard = ({ conge, onCancel }) => {
  const r     = RAISONS.find(x => x.value === conge.raison) || RAISONS[3];
  const titre = conge.raison === "autre" && conge.precision ? conge.precision : r.label;
  const jours = nbJours(conge.dateDebut, conge.dateFin);
  const peutAnnuler = conge.statut === "en_attente";
  const statutKey = resolveStatutKey(conge);
  const estAtone = statutKey === "expire" || statutKey === "refusee";

  return (
    <div style={{
      display: "flex", borderRadius: 14,
      background: T.surface, border: `1px solid ${T.border}`,
      boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      overflow: "hidden", opacity: estAtone ? 0.75 : 1,
      transition: "box-shadow .15s, transform .15s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,23,42,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 2px rgba(15,23,42,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Liseré de couleur = raison */}
      <div style={{ width: 4, flexShrink: 0, background: r.color }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", flex: 1, minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${r.color}14`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <r.icon size={17} color={r.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: T.ink }}>{titre}</span>
            <StatutBadge conge={conge} />
          </div>

          <div style={{ fontSize: "0.78rem", color: T.muted, display: "flex", alignItems: "center", gap: 5 }}>
            <CalendarDays size={13} />
            {formatDate(conge.dateDebut)} → {formatDate(conge.dateFin)}
            <span style={{ color: "#cbd5e1" }}>·</span>
            {jours} jour{jours > 1 ? "s" : ""}
          </div>

          {conge.statut === "refusee" && conge.motif_refus && (
            <div style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 9,
              background: "#fef2f2", border: "1px solid #fecaca",
              fontSize: "0.76rem", color: "#991b1b",
            }}>
              <strong>Motif du refus :</strong> {conge.motif_refus}
            </div>
          )}

          {peutAnnuler && (
            <button
              onClick={() => onCancel(conge.id)}
              style={{
                marginTop: 9, display: "inline-flex", alignItems: "center", gap: 5,
                background: "none", border: "1px solid #fca5a5",
                color: "#dc2626", borderRadius: 8, padding: "4px 10px",
                fontSize: "0.73rem", fontWeight: 600, cursor: "pointer",
                fontFamily: "'Poppins', sans-serif", transition: "background .15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Trash2 size={12} /> Annuler ma demande
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Page principale ────────────────────────────────────────────────────── */
const MesConges = () => {
  const { currentUser } = useAuth();
  const moniteurId = currentUser?.id;

  const { getCongesMoniteur, refreshMoniteur, requestCongeMoniteur, annulerMaDemandeConge, loading } = useCongeCtx();

  const [localLoading, setLocalLoading] = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
  const [error,        setError]        = useState("");
  const [conflit,      setConflit]      = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [filter,       setFilter]       = useState("tous");

  useEffect(() => {
    if (!moniteurId) return;
    (async () => {
      await refreshMoniteur(moniteurId);
      setLocalLoading(false);
    })();
  }, [moniteurId]);

  const conges = getCongesMoniteur(moniteurId);

  useEffect(() => {
    if (!form.dateDebut || !form.dateFin) { setConflit(null); return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) { setConflit(null); return; }
    const c = trouverCongeEnConflit(conges, form.dateDebut, form.dateFin);
    setConflit(c || null);
  }, [form.dateDebut, form.dateFin, conges]);

  if (!moniteurId) {
    return (
      <div style={{ padding: "28px 32px", textAlign: "center", color: T.faint, fontSize: "0.85rem" }}>
        Chargement du profil…
      </div>
    );
  }

  const sorted = useMemo(() => {
    return [...conges].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));
  }, [conges]);

  const filtered = filter === "tous" ? sorted : sorted.filter(c => c.statut === filter);

  const stats = useMemo(() => ({
    enAttente: conges.filter(c => c.statut === "en_attente").length,
    valides:   conges.filter(c => c.statut === "validee").length,
    refuses:   conges.filter(c => c.statut === "refusee").length,
  }), [conges]);

  const { getPermissions } = usePermissionsCtx();
  const permissions = getPermissions(moniteurId);
  const peutDemanderConge = !!permissions.CAN_REQUEST_CONGE;

  const handleSubmit = async () => {
    if (!form.dateDebut || !form.dateFin) { setError("Renseignez les deux dates."); return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) { setError("La date de fin doit être après le début."); return; }
    if (new Date(form.dateDebut) < new Date(new Date().toDateString())) { setError("La date de début ne peut pas être dans le passé."); return; }
    if (new Date(form.dateFin) < new Date(new Date().toDateString())) { setError("La date de fin ne peut pas être dans le passé."); return; }
    if (form.raison === "autre" && !form.precision.trim()) { setError("Précisez la raison de votre congé."); return; }

    const congeEnConflit = trouverCongeEnConflit(conges, form.dateDebut, form.dateFin);
    if (congeEnConflit) {
      const labelStatut = congeEnConflit.statut === "en_attente" ? "en attente de validation" : "déjà accordé";
      setError(
        `Vous avez un congé ${labelStatut} du ${formatDate(congeEnConflit.dateDebut)} au ${formatDate(congeEnConflit.dateFin)}. ` +
        `Impossible d'envoyer une demande qui chevauche cette période.`
      );
      return;
    }

    setError("");
    setSubmitting(true);
    const result = await requestCongeMoniteur(moniteurId, { ...form, precision: form.precision.trim() });
    setSubmitting(false);

    if (result?.success) {
      setForm({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
      setConflit(null);
      setShowForm(false);
    } else {
      setError(result?.error || "Erreur lors de l'envoi de la demande.");
    }
  };

  const handleCancel = async (congeId) => {
    if (window.confirm("Annuler cette demande de congé ?")) {
      await annulerMaDemandeConge(congeId, moniteurId);
    }
  };

  const isLoading = loading || localLoading;

  const formBloque =
    isDatePasse(form.dateDebut)  ||
    isDatePasse(form.dateFin)    ||
    isDateFinInvalide(form.dateDebut, form.dateFin) ||
    !!conflit;

  const FILTERS = [
    ["tous", "Tous"],
    ["en_attente", "En attente"],
    ["validee", "Validés"],
    ["refusee", "Refusés"],
  ];

  const STATS_DATA = [
    { key: "enAttente", label: "En attente", value: stats.enAttente, color: "#a16207", bg: "#fefce8", icon: <Clock size={17} color="#a16207" /> },
    { key: "valides",   label: "Validés",    value: stats.valides,   color: "#16a34a", bg: "#f0fdf4", icon: <CheckCircle2 size={17} color="#16a34a" /> },
    { key: "refuses",   label: "Refusés",    value: stats.refuses,   color: "#dc2626", bg: "#fef2f2", icon: <XCircle size={17} color="#dc2626" /> },
  ];

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Poppins', sans-serif", background: T.bg, minHeight: "100%" }}>
      {/* HEADER */}
      <div className="header">
        <img src={ConnexionImg} alt="illustration" className="header-img" />
        <h1>
          <img src={SmallCar} alt="" width={40} />
          Gestion des congés
        </h1>
        <p>
          Consultez vos congés et effectuez vos demandes de congé.
          Chaque demande est soumise à la validation de l'administrateur.
        </p>
      </div>

      {!peutDemanderConge && (
        <div style={{
          background: "#fef2f2", border: `1px solid #fecaca`,
          borderRadius: 12, padding: "11px 16px", marginBottom: 18,
          fontSize: "0.8rem", color: "#991b1b",
          display: "flex", alignItems: "center", gap: 9,
        }}>
          <Lock size={15} /> La demande de congé a été désactivée par l'administrateur pour votre compte.
        </div>
      )}

      {/* ── Barre titre + action ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: T.ink }}>Suivi de vos demandes</div>
          <div style={{ fontSize: "0.78rem", color: T.muted, marginTop: 2 }}>
            {conges.length} congé{conges.length !== 1 ? "s" : ""} au total
          </div>
        </div>

        <button
          onClick={() => { if (!peutDemanderConge) return; setShowForm(v => !v); setError(""); setConflit(null); }}
          disabled={!peutDemanderConge}
          title={!peutDemanderConge ? "Cette action a été désactivée par l'administrateur" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "11px 22px", borderRadius: 12,
            background: !peutDemanderConge ? "#cbd5e1" : (showForm ? "#fff" : T.accent),
            border: showForm && peutDemanderConge ? `1.5px solid ${T.border}` : "none",
            color: !peutDemanderConge ? "#fff" : (showForm ? T.muted : "#fff"),
            fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 700,
            cursor: !peutDemanderConge ? "not-allowed" : "pointer",
            boxShadow: (!peutDemanderConge || showForm) ? "none" : "0 6px 16px rgba(43,83,126,0.28)",
            transition: "all .15s",
          }}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Fermer" : "Demander un congé"}
        </button>
      </div>

      {/* ── Stats rapides ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {STATS_DATA.map(s => (
          <div key={s.key} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "16px 18px",
            display: "flex", alignItems: "center", gap: 13,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            transition: "box-shadow .15s, transform .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 10px 22px rgba(15,23,42,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 2px rgba(15,23,42,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: s.bg,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.55rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: T.muted, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Formulaire nouvelle demande ── */}
      {showForm && (
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 18, padding: 22, marginBottom: 24,
          boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: T.accentSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus size={16} color={T.accent} />
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: T.ink }}>
              Nouvelle demande de congé
            </div>
          </div>

          <div style={{
            background: T.accentSoft, borderRadius: 10,
            padding: "10px 13px", marginBottom: 16, fontSize: "0.76rem", color: T.accent,
            display: "flex", alignItems: "flex-start", gap: 7,
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Votre demande sera envoyée à l'administrateur pour validation. Vous serez notifié de sa décision.
          </div>

          {/* Raisons */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              Raison
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {RAISONS.map(r => {
                const active = form.raison === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setForm(f => ({ ...f, raison: r.value }))}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "10px 6px", borderRadius: 11, cursor: "pointer",
                      border: `1.5px solid ${active ? r.color : T.border}`,
                      background: active ? `${r.color}12` : "#fff",
                      color: active ? r.color : T.muted,
                      fontWeight: active ? 700 : 500,
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: "0.7rem", textAlign: "center",
                      transition: "all .15s",
                    }}
                  >
                    <r.icon size={17} color={active ? r.color : T.muted} />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {form.raison === "autre" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
                Précisez la raison
              </label>
              <input
                style={inp} type="text" value={form.precision}
                onChange={e => { setForm(f => ({ ...f, precision: e.target.value })); setError(""); }}
                placeholder="Ex : formation, déménagement, examen personnel..."
              />
            </div>
          )}

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[["dateDebut", "Date de début"], ["dateFin", "Date de fin"]].map(([key, lbl]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {lbl}
                </label>
                <input
                  style={{
                    ...inp,
                    borderColor: isDatePasse(form[key]) ? "#fca5a5" : T.border,
                    background:  isDatePasse(form[key]) ? "#fef2f2" : "#f8fafc",
                  }}
                  type="date" value={form[key]}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
                />
                {key === "dateDebut" && isDatePasse(form.dateDebut) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                    <CalendarOff size={12} /> Date dans le passé
                  </div>
                )}
                {key === "dateFin" && isDatePasse(form.dateFin) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                    <CalendarOff size={12} /> Date dans le passé
                  </div>
                )}
                {key === "dateFin" && isDateFinInvalide(form.dateDebut, form.dateFin) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 2 }}>
                    <CalendarOff size={12} /> Doit être après la date de début
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Résumé durée */}
          {form.dateDebut && form.dateFin && new Date(form.dateFin) >= new Date(form.dateDebut) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 13px", borderRadius: 10, marginBottom: 16,
              background: T.accentSoft, fontSize: "0.79rem", color: T.accent, fontWeight: 600,
            }}>
              <CalendarDays size={14} />
              {formatDate(form.dateDebut)} → {formatDate(form.dateFin)} · {nbJours(form.dateDebut, form.dateFin)} jour(s)
            </div>
          )}

          {/* ── Alerte chevauchement en temps réel ── */}
          {conflit && (
            <div style={{
              padding: "11px 13px", borderRadius: 10, marginBottom: 16,
              background: "#fef2f2", border: "1.5px solid #fca5a5",
              display: "flex", alignItems: "flex-start", gap: 9,
            }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: "0.79rem", fontWeight: 700, color: "#dc2626" }}>
                  {conflit.statut === "en_attente"
                    ? "Vous avez déjà une demande en attente sur cette période"
                    : "Vous avez déjà un congé accordé sur cette période"}
                </div>
                <div style={{ fontSize: "0.73rem", color: "#b91c1c", marginTop: 3 }}>
                  Congé {conflit.statut === "en_attente" ? "en attente" : "validé"} du{" "}
                  <strong>{formatDate(conflit.dateDebut)}</strong> au{" "}
                  <strong>{formatDate(conflit.dateFin)}</strong>.
                  Attendez la fin ou annulez ce congé avant d'en créer un nouveau.
                </div>
              </div>
            </div>
          )}

          {/* Erreur générique */}
          {error && !conflit && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              fontSize: "0.78rem", color: "#dc2626", marginBottom: 16, fontWeight: 600,
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 13px",
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setShowForm(false); setError(""); setConflit(null); }}
              style={{
                flex: 1, padding: "11px", borderRadius: 11,
                border: `1.5px solid ${T.border}`, background: "white",
                color: T.muted, fontSize: "0.84rem", cursor: "pointer",
                fontFamily: "'Poppins', sans-serif", fontWeight: 600,
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || formBloque}
              style={{
                flex: 2, padding: "11px", borderRadius: 11, border: "none",
                background: (submitting || formBloque) ? "#cbd5e1" : T.accent,
                color: "white", fontSize: "0.84rem", fontWeight: 700,
                cursor: (submitting || formBloque) ? "not-allowed" : "pointer",
                fontFamily: "'Poppins', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: (submitting || formBloque) ? "none" : "0 6px 16px rgba(43,83,126,0.28)",
                transition: "background 0.2s",
              }}
            >
              <Save size={14} /> {submitting ? "Envoi…" : "Envoyer la demande"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filtres ── */}
      <div style={{
        display: "inline-flex", gap: 4, marginBottom: 18,
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: 4,
      }}>
        {FILTERS.map(([key, lbl]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "7px 15px", borderRadius: 9, fontSize: "0.78rem",
              border: "none",
              background: filter === key ? T.accent : "transparent",
              color: filter === key ? "#fff" : T.muted,
              fontWeight: filter === key ? 700 : 500,
              cursor: "pointer", fontFamily: "'Poppins', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Liste des congés ── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: T.faint, fontSize: "0.85rem" }}>
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "50px 20px", borderRadius: 18,
          background: T.surface, border: `1.5px dashed ${T.border}`,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%", background: "#fff7ed",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <CalendarOff size={28} color="#fdba74" />
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#475569" }}>
            {filter === "tous" ? "Aucun congé pour le moment" : "Aucun résultat pour ce filtre"}
          </div>
          <div style={{ fontSize: "0.8rem", color: T.faint, marginTop: 5 }}>
            {filter === "tous" && "Cliquez sur \"Demander un congé\" pour faire votre première demande."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => (
            <CongeCard key={c.id} conge={c} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MesConges;