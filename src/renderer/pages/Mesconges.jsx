import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useCongeCtx } from "../context/CongeContext";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import {
  CalendarOff, Plus, Save, X, Trash2, Clock,
  CheckCircle2, XCircle, AlertCircle, CalendarDays,
} from "lucide-react";
import { usePermissionsCtx } from "../context/PermissionsContext";

const RAISONS = [
  { value: "maladie",  label: "🤒 Maladie",            color: "#ef4444" },
  { value: "voyage",   label: "✈️ Voyage",              color: "#3b82f6" },
  { value: "familial", label: "👨‍👩‍👧 Raison familiale",  color: "#f59e0b" },
  { value: "autre",    label: "📋 Autre",               color: "#8b5cf6" },
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

// const isActive  = (d, f) => { const now = new Date(); return new Date(d) <= now && now <= new Date(f + "T23:59:59"); };
// const isExpired = (f)    => new Date(f + "T23:59:59") < new Date();

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
    // On bloque aussi sur les congés en attente — pas de double demande
    if (c.statut !== "validee" && c.statut !== "en_attente") return false;
    return datesSeChevachent(c.dateDebut, c.dateFin, newDebut, newFin);
  }) || null;
};

const inp = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 11px", border: "1.5px solid #e2e8f0", borderRadius: 9,
  fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem",
  color: "#1e293b", background: "#f8fafc", outline: "none",
};

/* ── Badge de statut ────────────────────────────────────────────────────── */
const StatutBadge = ({ conge }) => {
  if (conge.statut === "en_attente") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px",
        borderRadius: 20, background: "#fef9c3", color: "#a16207",
        whiteSpace: "nowrap",
      }}>
        <Clock size={11} /> En attente de validation
      </span>
    );
  }
  if (conge.statut === "refusee") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px",
        borderRadius: 20, background: "#fee2e2", color: "#dc2626",
        whiteSpace: "nowrap",
      }}>
        <XCircle size={11} /> Refusé
      </span>
    );
  }
  if (isActive(conge.dateDebut, conge.dateFin)) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px",
        borderRadius: 20, background: "#dcfce7", color: "#16a34a",
        whiteSpace: "nowrap",
      }}>
        <CheckCircle2 size={11} /> En cours
      </span>
    );
  }
  if (isExpired(conge.dateFin)) {
    return (
      <span style={{
        fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px",
        borderRadius: 20, background: "#f1f5f9", color: "#94a3b8",
        whiteSpace: "nowrap",
      }}>
        ⚫ Expiré
      </span>
    );
  }
  if (isUpcoming(conge.dateDebut)) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px",
        borderRadius: 20, background: "#fff7ed", color: "#ea580c",
        whiteSpace: "nowrap",
      }}>
        🟡 À venir
      </span>
    );
  }
  return null;
};

/* ── Carte congé individuelle ──────────────────────────────────────────── */
const CongeCard = ({ conge, onCancel }) => {
  const r     = RAISONS.find(x => x.value === conge.raison) || RAISONS[3];
  const titre = conge.raison === "autre" && conge.precision ? conge.precision : r.label.slice(3);
  const jours = nbJours(conge.dateDebut, conge.dateFin);
  const peutAnnuler = conge.statut === "en_attente";

  const bgByStatut = {
    en_attente: "#fffbeb",
    refusee:    "#fef2f2",
    validee:    isActive(conge.dateDebut, conge.dateFin) ? "#f0fdf4" : "#f8fafc",
  };
  const borderByStatut = {
    en_attente: "#fde68a",
    refusee:    "#fecaca",
    validee:    isActive(conge.dateDebut, conge.dateFin) ? "#bbf7d0" : "#e2e8f0",
  };

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 12,
      background: bgByStatut[conge.statut] || "#f8fafc",
      border: `1.5px solid ${borderByStatut[conge.statut] || "#e2e8f0"}`,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: `${r.color}1A`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>
        {r.label.split(" ")[0]}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b" }}>{titre}</span>
          <StatutBadge conge={conge} />
        </div>

        <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
          <CalendarDays size={13} />
          {formatDate(conge.dateDebut)} → {formatDate(conge.dateFin)}
          <span style={{ color: "#cbd5e1" }}>·</span>
          {jours} jour{jours > 1 ? "s" : ""}
        </div>

        {conge.statut === "refusee" && conge.motif_refus && (
          <div style={{
            marginTop: 8, padding: "8px 10px", borderRadius: 8,
            background: "#fff", border: "1px solid #fecaca",
            fontSize: "0.78rem", color: "#991b1b",
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
              color: "#dc2626", borderRadius: 7, padding: "4px 10px",
              fontSize: "0.74rem", fontWeight: 600, cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <Trash2 size={12} /> Annuler ma demande
          </button>
        )}
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
  const [conflit,      setConflit]      = useState(null); // congé en conflit détecté en temps réel
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

  // ── Détection chevauchement en temps réel ─────────────────────────────────
  useEffect(() => {
    if (!form.dateDebut || !form.dateFin) { setConflit(null); return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) { setConflit(null); return; }
    const c = trouverCongeEnConflit(conges, form.dateDebut, form.dateFin);
    setConflit(c || null);
  }, [form.dateDebut, form.dateFin, conges]);

  if (!moniteurId) {
    return (
      <div style={{ padding: "28px 32px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
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

  console.log("conges:", conges);
console.log("form:", form.dateDebut, form.dateFin);
const congeEnConflit = trouverCongeEnConflit(conges, form.dateDebut, form.dateFin);
console.log("conflit:", congeEnConflit)
  const handleSubmit = async () => {
    if (!form.dateDebut || !form.dateFin) { setError("Renseignez les deux dates."); return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) { setError("La date de fin doit être après le début."); return; }
    if (new Date(form.dateDebut) < new Date(new Date().toDateString())) { setError("La date de début ne peut pas être dans le passé."); return; }
    if (new Date(form.dateFin) < new Date(new Date().toDateString())) { setError("La date de fin ne peut pas être dans le passé."); return; }
    if (form.raison === "autre" && !form.precision.trim()) { setError("Précisez la raison de votre congé."); return; }

    // ── Blocage chevauchement ─────────────────────────────────────────────
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

  // Le bouton Envoyer est bloqué si conflit détecté
 const formBloque =
    isDatePasse(form.dateDebut)  ||
    isDatePasse(form.dateFin)    ||
    isDateFinInvalide(form.dateDebut, form.dateFin) ||
    !!conflit;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Poppins', sans-serif" }}>
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
          background: "#fef2f2", border: "1.5px solid #fecaca",
          borderRadius: 10, padding: "10px 14px", marginBottom: 16,
          fontSize: "0.78rem", color: "#991b1b",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🔒 La demande de congé a été désactivée par l'administrateur pour votre compte.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
          borderRadius: 10, padding: "6px 14px",
          fontSize: "0.75rem", color: "#ea580c", fontWeight: 600,
        }}>
          📅 Suivi de vos demandes de congé
        </div>

        <button
          onClick={() => { if (!peutDemanderConge) return; setShowForm(v => !v); setError(""); setConflit(null); }}
          disabled={!peutDemanderConge}
          title={!peutDemanderConge ? "Cette action a été désactivée par l'administrateur" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 20px", borderRadius: 10,
            background: !peutDemanderConge ? "#cbd5e1" : "#2b537e",
            border: "none", color: "#fff", fontFamily: "inherit",
            fontSize: "0.85rem", fontWeight: 700,
            cursor: !peutDemanderConge ? "not-allowed" : "pointer",
            boxShadow: !peutDemanderConge ? "none" : "0 4px 14px rgba(43,83,126,0.3)",
            opacity: !peutDemanderConge ? 0.7 : 1,
          }}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Fermer" : "Demander un congé"}
        </button>
      </div>

      {/* ── Stats rapides ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { label: "En attente", value: stats.enAttente, color: "#a16207", bg: "#fefce8", border: "#fde68a", icon: <Clock size={16} color="#a16207" /> },
          { label: "Validés",    value: stats.valides,   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={16} color="#16a34a" /> },
          { label: "Refusés",    value: stats.refuses,   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={16} color="#dc2626" /> },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1.5px solid ${s.border}`,
            borderRadius: 14, padding: "16px 18px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Formulaire nouvelle demande ── */}
      {showForm && (
        <div style={{
          background: "#f8faff", border: "1.5px solid #c7d2fe",
          borderRadius: 16, padding: 20, marginBottom: 22,
        }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#4338ca", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
            <Plus size={16} /> Nouvelle demande de congé
          </div>

          <div style={{
            background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 9,
            padding: "9px 12px", marginBottom: 14, fontSize: "0.76rem", color: "#4338ca",
            display: "flex", alignItems: "flex-start", gap: 7,
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Votre demande sera envoyée à l'administrateur pour validation. Vous serez notifié de sa décision.
          </div>

          {/* Raisons */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 7 }}>
              Raison
            </label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {RAISONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setForm(f => ({ ...f, raison: r.value }))}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: "0.78rem", cursor: "pointer",
                    border: `1.5px solid ${form.raison === r.value ? r.color : "#e2e8f0"}`,
                    background: form.raison === r.value ? r.color + "18" : "white",
                    color: form.raison === r.value ? r.color : "#64748b",
                    fontWeight: form.raison === r.value ? 700 : 400,
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {form.raison === "autre" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 5 }}>
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
          {/* <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {[["dateDebut", "Date de début"], ["dateFin", "Date de fin"]].map(([key, lbl]) => (
              <div key={key}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 5 }}>
                  {lbl}
                </label>
                <input
                  style={inp} type="date" value={form[key]}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
                />
              </div>
            ))}
          </div> */}

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {[["dateDebut", "Date de début"], ["dateFin", "Date de fin"]].map(([key, lbl]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {lbl}
                </label>
                <input
                  style={{
                    ...inp,
                    borderColor: isDatePasse(form[key]) ? "#fca5a5" : "#e2e8f0",
                    background:  isDatePasse(form[key]) ? "#fef2f2" : "#f8fafc",
                  }}
                  type="date" value={form[key]}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
                />
                {key === "dateDebut" && isDatePasse(form.dateDebut) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 3 }}>
                    <span>📅</span> Date dans le passé
                  </div>
                )}
                {key === "dateFin" && isDatePasse(form.dateFin) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 3 }}>
                    <span>📅</span> Date dans le passé
                  </div>
                )}
                {key === "dateFin" && isDateFinInvalide(form.dateDebut, form.dateFin) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 3 }}>
                    <span>📅</span> Doit être après la date de début
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Résumé durée */}
          {form.dateDebut && form.dateFin && new Date(form.dateFin) >= new Date(form.dateDebut) && (
            <div style={{ fontSize: "0.78rem", color: "#6366f1", marginBottom: 14, fontWeight: 600 }}>
              📅 {formatDate(form.dateDebut)} → {formatDate(form.dateFin)} · {nbJours(form.dateDebut, form.dateFin)} jour(s)
            </div>
          )}

          {/* ── Alerte chevauchement en temps réel ── */}
          {conflit && (
            <div style={{
              padding: "10px 12px", borderRadius: 8, marginBottom: 14,
              background: "#fef2f2", border: "1.5px solid #fca5a5",
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#dc2626" }}>
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
              fontSize: "0.78rem", color: "#dc2626", marginBottom: 14, fontWeight: 600,
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px",
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setShowForm(false); setError(""); setConflit(null); }}
              style={{
                flex: 1, padding: "10px", borderRadius: 9,
                border: "1px solid #e2e8f0", background: "white",
                color: "#64748b", fontSize: "0.84rem", cursor: "pointer",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || formBloque}
              style={{
                flex: 2, padding: "10px", borderRadius: 9, border: "none",
                background: (submitting || formBloque) ? "#94a3b8" : "#f97316",
                color: "white", fontSize: "0.84rem", fontWeight: 700,
                cursor: (submitting || formBloque) ? "not-allowed" : "pointer",
                fontFamily: "'Poppins', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                transition: "background 0.2s",
              }}
            >
              <Save size={14} /> {submitting ? "Envoi…" : "Envoyer la demande"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filtres ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          ["tous", "Tous"],
          ["en_attente", "En attente"],
          ["validee", "Validés"],
          ["refusee", "Refusés"],
        ].map(([key, lbl]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: "0.78rem",
              border: `1.5px solid ${filter === key ? "#f97316" : "#e2e8f0"}`,
              background: filter === key ? "#fff7ed" : "white",
              color: filter === key ? "#ea580c" : "#64748b",
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
        <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "50px 20px", borderRadius: 16,
          background: "#f8fafc", border: "1.5px dashed #e2e8f0",
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
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 5 }}>
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