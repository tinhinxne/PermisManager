import React, { useState, useEffect } from "react";
import { useExamenCtx } from "../context/ExamenContext";
// const fDA = (n) => `${Number(n || 0).toLocaleString("fr-DZ")} DA`;
const fDA = (n) => {
  const num = Number(n || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " DA";
};
const normaliserType = (type) => {
  const raw = (type || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (raw.includes("circ")) return "circulation";
  if (raw.includes("cr"))   return "creneau";
  return "code";
};
// ── Crédit de séances supplémentaires (partagé avec AgendaPage) ───────────────
const SEANCE_SUP_CREDIT_KEY = "seance_sup_credit";

function getSeanceSupCredits() {
  try { return JSON.parse(localStorage.getItem(SEANCE_SUP_CREDIT_KEY) || "{}"); }
  catch { return {}; }
}

function getCredit(candidatId) {
  const credits = getSeanceSupCredits();
  return Number(credits[String(candidatId)] || 0);
}

function addCredit(candidatId, quantite) {
  const credits = getSeanceSupCredits();
  const current = Number(credits[String(candidatId)] || 0);
  credits[String(candidatId)] = current + quantite;
  localStorage.setItem(SEANCE_SUP_CREDIT_KEY, JSON.stringify(credits));
  return credits[String(candidatId)];
}

const IconPencil = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconTrash = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);
const IconSearch = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const IconX = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="M6 6l12 12" />
  </svg>
);
const IconPlus = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>
);
const IconCheck = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const SeanceSupModal = ({ onClose, onAddPayment, prefillCandidat }) => {
  const [candidats,      setCandidats]      = useState([]);
  const { examensList } = useExamenCtx();
  const [seancesParCand, setSeancesParCand] = useState({});
  const [selected,       setSelected]       = useState(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [loading,        setLoading]        = useState(true);

  const [nbSeances,  setNbSeances]  = useState(1);
  const [prixSeance, setPrixSeance] = useState("");
  const [methode,    setMethode]    = useState("especes");
  const [date,       setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [remarque,   setRemarque]   = useState("");
  const [errors,     setErrors]     = useState({});

  const total = nbSeances * (parseFloat(prixSeance) || 0);
  const [submitted, setSubmitted] = useState(false);

  // ── Ajout / édition d'une personne externe (permis obtenu hors de l'auto-école)
  const [showAddExterne,    setShowAddExterne]    = useState(false);
  const [editingExterneId,  setEditingExterneId]  = useState(null);
  const [extPrenom,         setExtPrenom]         = useState("");
  const [extNom,            setExtNom]            = useState("");
  const [extTel,            setExtTel]            = useState("");
  const [extDateNaissance,  setExtDateNaissance]  = useState("");
  const [extSexe,           setExtSexe]           = useState("M");
  const [extCategorie,      setExtCategorie]      = useState("B");
  const [extEmail,          setExtEmail]          = useState("");
  const [extError,          setExtError]          = useState("");
  const [savingExterne,     setSavingExterne]     = useState(false);
  const [deletingExterneId, setDeletingExterneId]  = useState(null);
  const [confirmDeleteId,   setConfirmDeleteId]   = useState(null);

  const CATEGORIES_PERMIS = ["A1", "A", "B", "BE", "C1", "C", "C1E", "CE", "D", "DE", "F"];

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [allCandidats, allSeances] = await Promise.all([
          window.electron.getCandidats(),
          window.electron.getSeances(),
        ]);

        // Construire compteur { idCandidat: [séances] }
        const compteur = {};
        (allSeances || []).forEach(s => {
          const ids = s.candidatsIds
            ? String(s.candidatsIds).split(",").map(id => parseInt(id.trim())).filter(Boolean)
            : [];
          ids.forEach(id => {
            if (!compteur[id]) compteur[id] = [];
            compteur[id].push(s);
          });
        });
        setSeancesParCand(compteur);

        // Éligibles : candidat ayant réussi les 3 examens (Code + Créneau + Circulation)
        // OU personne externe (permis obtenu hors de notre auto-école).
        // Le nombre de séances effectuées n'entre plus en compte.
        const aObtenuPermis = (candidatId) => {
          const exams = (examensList || []).filter(e => String(e.candidatId) === String(candidatId));
          return (
            exams.some(e => e.type === "Code"        && e.status === "Passed") &&
            exams.some(e => e.type === "Créneau"     && e.status === "Passed") &&
            exams.some(e => e.type === "Circulation" && e.status === "Passed")
          );
        };

        const eligibles = (allCandidats || []).filter(c => {
          const id = c.idCandidat || c.id;
          return c.externe || aObtenuPermis(id);
        });

        setCandidats(eligibles);
        // Pré-sélection si on arrive depuis l'agenda (milestone 20 séances)
        if (prefillCandidat) {
          const id = prefillCandidat.candidatId || prefillCandidat.id;
          const match = eligibles.find(c => String(c.idCandidat || c.id) === String(id));
          if (match) {
            setSelected(match);
            setSearchQuery(`${match.prenom} ${match.nom}`);
          }
        }
      } catch (err) {
        console.error("SeanceSupModal load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [prefillCandidat, examensList]);

  const candidatsFiltres = candidats.filter(c =>
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCandidat = (c) => {
    setSelected(c);
    setSearchQuery(`${c.prenom} ${c.nom}`);
    setErrors({});
    setShowAddExterne(false);
  };

  const validate = () => {
    const e = {};
    if (!selected)                                    e.candidate = "Sélectionnez un candidat";
    if (!nbSeances || nbSeances < 1)                  e.nbSeances = "Nombre de séances invalide";
    if (!prixSeance || parseFloat(prixSeance) <= 0)   e.prix      = "Prix par séance invalide";
    if (!date)                                        e.date      = "Date requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const candidatId = selected.idCandidat || selected.id;
    await onAddPayment({
      idCandidat:    candidatId,
      montant:       total,
      methode,
      dateVersement: date,
      remarque:      remarque || `${nbSeances} séance(s) sup. × ${fDA(prixSeance)}`,
      typeVersement: "seance_supplementaire",
      _meta: { nbSeances, prixSeance: parseFloat(prixSeance), total },
    });
    // Crédite le candidat : ces séances pourront être créées dans l'agenda
    // sans repasser par un paiement, jusqu'à épuisement du crédit.
    addCredit(candidatId, nbSeances);
    setSubmitted(true);
  };

  const resetExterneForm = () => {
    setShowAddExterne(false);
    setEditingExterneId(null);
    setExtPrenom(""); setExtNom(""); setExtTel("");
    setExtDateNaissance(""); setExtSexe("M"); setExtCategorie("B"); setExtEmail("");
    setExtError("");
  };

  const openAddExterne = () => {
    resetExterneForm();
    setShowAddExterne(true);
  };

  const toDateInputValue = (val) => {
    if (!val) return "";
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const openEditExterne = (c) => {
    setEditingExterneId(c.idCandidat || c.id);
    setExtPrenom(c.prenom || "");
    setExtNom(c.nom || "");
    setExtTel(c.telephone || "");
    setExtDateNaissance(toDateInputValue(c.date_naissance));
    setExtSexe(c.sexe || "M");
    setExtCategorie(c.categoriePermis || "B");
    setExtEmail(c.email || "");
    setExtError("");
    setShowAddExterne(true);
  };

  const handleSaveExterne = async () => {
    if (!extPrenom.trim() || !extNom.trim()) {
      setExtError("Prénom et nom requis");
      return;
    }
    if (!extDateNaissance) {
      setExtError("Date de naissance requise");
      return;
    }
    if (!extSexe) {
      setExtError("Sexe requis");
      return;
    }
    setSavingExterne(true);
    setExtError("");
    try {
      const payload = {
        prenom: extPrenom.trim(),
        nom: extNom.trim(),
        telephone: extTel.trim() || null,
        date_naissance: extDateNaissance,
        sexe: extSexe,
        categoriePermis: extCategorie,
        email: extEmail.trim() || null,
      };

      const isEdit = !!editingExterneId;
      const resultat = isEdit
        ? await window.electron.updateCandidatExterne({ idCandidat: editingExterneId, ...payload })
        : await window.electron.addCandidatExterne(payload);

      if (!resultat) {
        setExtError("Erreur lors de l'enregistrement — vérifie la console de l'app");
        return;
      }

      const candidatMaj = { ...resultat, externe: true };

      if (isEdit) {
        setCandidats(prev => prev.map(c => (c.idCandidat || c.id) === editingExterneId ? candidatMaj : c));
        if (selected && (selected.idCandidat || selected.id) === editingExterneId) {
          setSelected(candidatMaj);
          setSearchQuery(`${candidatMaj.prenom} ${candidatMaj.nom}`);
        }
      } else {
        setCandidats(prev => [candidatMaj, ...prev]);
        handleSelectCandidat(candidatMaj);
        return;
      }

      resetExterneForm();
    } catch (err) {
      console.error("Erreur enregistrement candidat externe:", err);
      setExtError("Erreur lors de l'enregistrement, réessayez");
    } finally {
      setSavingExterne(false);
    }
  };

  const handleDeleteExterne = async (c) => {
    const id = c.idCandidat || c.id;
    setDeletingExterneId(id);
    try {
      const ok = await window.electron.deleteCandidatExterne(id);
      if (!ok) {
        console.error("Échec de la suppression du candidat externe");
        setConfirmDeleteId(null);
        return;
      }
      setCandidats(prev => prev.filter(c2 => (c2.idCandidat || c2.id) !== id));
      if (selected && (selected.idCandidat || selected.id) === id) {
        setSelected(null);
        setSearchQuery("");
      }
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Erreur suppression candidat externe:", err);
    } finally {
      setDeletingExterneId(null);
    }
  };

  const seancesCandidat = selected ? (seancesParCand[selected.idCandidat || selected.id] || []) : [];
  const nbTotal = seancesCandidat.length;

  // Stats types pour le badge candidat sélectionné
  const typesCandidat = seancesCandidat.map(s => normaliserType(s.type));
  const nbCode        = typesCandidat.filter(t => t === "code").length;
  const nbCreneau     = typesCandidat.filter(t => t === "creneau").length;
  const nbCirc        = typesCandidat.filter(t => t === "circulation").length;

  const inpS = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9,
    fontSize: 13, outline: "none", background: "#f8fafc", color: "#1e293b",
    fontFamily: "inherit", transition: "border-color .15s ease, box-shadow .15s ease, background .15s ease",
  };
  const errStyle = { fontSize: 11, color: "#ef4444", marginTop: 3, fontWeight: 500 };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        animation: "ssm-fade .15s ease",
      }}
    >
      <style>{`
       
        @keyframes ssm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ssm-pop { from { opacity: 0; transform: translateY(6px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes ssm-slide { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        .ssm-add-externe-btn {
  transition: background-color .15s ease, border-color .15s ease, transform .1s ease;
}
.ssm-add-externe-btn:hover { background: #fef3c7 !important; border-color: #f59e0b !important; }
.ssm-add-externe-btn:active { transform: scale(.98); }
        .ssm-input:focus {
          border-color: #d97706 !important;
          box-shadow: 0 0 0 3px rgba(217,119,6,0.12);
          background: #fff !important;
        }
        .ssm-row {
          transition: background-color .15s ease;
        }
        .ssm-row:hover { background: #fefaf3; }

        .ssm-icon-btn {
          width: 28px; height: 28px; border-radius: 8px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: #f1f5f9; color: #64748b;
          transition: background-color .15s ease, color .15s ease, transform .1s ease;
        }
        .ssm-icon-btn:hover { transform: translateY(-1px); }
        .ssm-icon-btn:active { transform: translateY(0) scale(.94); }
        .ssm-icon-btn--edit:hover   { background: #eef2ff; color: #4338ca; }
        .ssm-icon-btn--delete:hover { background: #fef2f2; color: #dc2626; }
        .ssm-icon-btn--neutral:hover { background: #e2e8f0; color: #334155; }

        .ssm-link-btn {
          transition: background-color .15s ease, color .15s ease;
        }
        .ssm-link-btn:hover { background: #fffbeb !important; }

        .ssm-btn-primary {
          transition: filter .15s ease, transform .1s ease, box-shadow .15s ease;
        }
        .ssm-btn-primary:hover:not(:disabled) { filter: brightness(1.06); box-shadow: 0 8px 20px rgba(217,119,6,0.3); }
        .ssm-btn-primary:active:not(:disabled) { transform: translateY(1px); }

        .ssm-btn-ghost { transition: background-color .15s ease, border-color .15s ease; }
        .ssm-btn-ghost:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }

        .ssm-close-btn { transition: background-color .15s ease, transform .1s ease; }
        .ssm-close-btn:hover { background: rgba(255,255,255,0.32) !important; }
        .ssm-close-btn:active { transform: scale(.92); }

        .ssm-confirm-btn { transition: filter .15s ease, transform .1s ease; }
        .ssm-confirm-btn:hover { filter: brightness(1.05); }
        .ssm-confirm-btn:active { transform: scale(.96); }
      `}</style>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.28)", overflow: "hidden",
        animation: "ssm-pop .18s cubic-bezier(.16,1,.3,1)",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#d97706,#f59e0b)",
          padding: "20px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
              Paiement séance supplémentaire
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
              Candidats ayant réussi leurs 3 examens, ou personnes externes
            </div>
          </div>
          <button onClick={onClose} className="ssm-close-btn" style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10,
            width: 32, height: 32, cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Sélection candidat */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", display: "block", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Candidat *
            </label>

            <div style={{ position: "relative", marginBottom: 4 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none", display: "flex" }}>
                <IconSearch size={15} />
              </span>
              <input
                type="text"
                className="ssm-input"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSelected(null); }}
                placeholder="Rechercher un candidat éligible…"
                style={{ ...inpS, paddingLeft: 36, border: `1.5px solid ${errors.candidate ? "#ef4444" : "#e2e8f0"}` }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSelected(null); }} className="ssm-icon-btn ssm-icon-btn--neutral"
                  style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: 7, background: "transparent" }}>
                  <IconX size={13} />
                </button>
              )}
            </div>

            {!selected && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, maxHeight: 220, overflowY: "auto", background: "#fff", boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
                {loading ? (
                  <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>⏳ Chargement…</div>
                ) : candidatsFiltres.length === 0 ? (
                  <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    {candidats.length === 0
                      ? "Aucun candidat éligible — il faut avoir terminé le permis (code + créneau + circulation)"
                      : "Aucun résultat"}
                  </div>
                ) : (
                  candidatsFiltres.map((c, i) => {
                    const id  = c.idCandidat || c.id;
                    const nb  = (seancesParCand[id] || []).length;
                    const credit = getCredit(id);
                    const types = (seancesParCand[id] || []).map(s => normaliserType(s.type));
                    const isConfirming = confirmDeleteId === id;
                    return (
                      <div
                        key={id}
                        className="ssm-row"
                        style={{
                          padding: "11px 14px",
                          borderBottom: i < candidatsFiltres.length - 1 ? "1px solid #f1f5f9" : "none",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}
                      >
                        {isConfirming ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <span style={{ fontSize: 12.5, color: "#b91c1c", fontWeight: 600 }}>
                              Supprimer {c.prenom} {c.nom} ?
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="ssm-confirm-btn"
                                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => handleDeleteExterne(c)}
                                disabled={deletingExterneId === id}
                                className="ssm-confirm-btn"
                                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 11.5, cursor: deletingExterneId === id ? "not-allowed" : "pointer" }}
                              >
                                {deletingExterneId === id ? "…" : "Supprimer"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div onClick={() => handleSelectCandidat(c)} style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{c.prenom} {c.nom}</div>
                              {c.externe ? (
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                  Personne externe · {c.categoriePermis || "B"}
                                </div>
                              ) : (
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <span>{nb} séances effectuées</span>
                                  <span>· 🚦 {types.filter(t => t === "code").length} code</span>
                                  <span>· 🅿️ {types.filter(t => t === "creneau").length} créneau</span>
                                  <span>· 🚗 {types.filter(t => t === "circulation").length} circ.</span>
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                              {c.externe && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditExterne(c)}
                                    title="Modifier"
                                    className="ssm-icon-btn ssm-icon-btn--edit"
                                  >
                                    <IconPencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(id)}
                                    title="Supprimer"
                                    className="ssm-icon-btn ssm-icon-btn--delete"
                                  >
                                    <IconTrash size={13} />
                                  </button>
                                </>
                              )}
                              <span
                                onClick={() => handleSelectCandidat(c)}
                                style={{
                                  padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer",
                                  background: c.externe ? "#e0e7ff" : credit > 0 ? "#dcfce7" : "#fff7ed",
                                  color: c.externe ? "#3730a3" : credit > 0 ? "#166534" : "#d97706",
                                  border: `1px solid ${c.externe ? "#a5b4fc" : credit > 0 ? "#86efac" : "#fcd34d"}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.externe ? "🆕 externe" : credit > 0 ? `🎓 crédit : ${credit}` : "🎓 permis obtenu"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}

               {/* Lien pour ajouter une personne externe */}
                <div style={{ borderTop: candidatsFiltres.length > 0 ? "1px solid #f1f5f9" : "none", padding: 10 }}>
                  <button
                    type="button"
                    onClick={openAddExterne}
                    className="ssm-add-externe-btn"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: "1.5px dashed #fbbf24", background: "#fffbeb",
                      cursor: "pointer", color: "#b45309", fontWeight: 700, fontSize: 12.5,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%", background: "#fbbf24",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <IconPlus size={12} />
                    </span>
                    Ajouter une personne externe
                  </button>
                </div>
              </div>
            )}
            {errors.candidate && <p style={errStyle}>{errors.candidate}</p>}

            {/* Formulaire d'ajout / édition externe — visible dès que showAddExterne est vrai,
                que le candidat soit déjà sélectionné ou non (c'était le bug : ça restait masqué
                quand on cliquait "modifier" depuis la fiche du candidat sélectionné) */}
            {showAddExterne && (
              <div style={{ marginTop: 10, padding: 16, background: "#fafaf9", border: "1.5px solid #e2e8f0", borderRadius: 14, animation: "ssm-slide .15s ease" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  {editingExterneId ? <IconPencil size={13} /> : <IconPlus size={13} />}
                  {editingExterneId ? "Modifier la personne externe" : "Nouvelle personne externe"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Prénom *</label>
                    <input type="text" className="ssm-input" value={extPrenom} onChange={e => setExtPrenom(e.target.value)} style={inpS} placeholder="Prénom" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Nom *</label>
                    <input type="text" className="ssm-input" value={extNom} onChange={e => setExtNom(e.target.value)} style={inpS} placeholder="Nom" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Date de naissance *</label>
                    <input type="date" className="ssm-input" value={extDateNaissance} onChange={e => setExtDateNaissance(e.target.value)} style={inpS} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Sexe *</label>
                    <select value={extSexe} onChange={e => setExtSexe(e.target.value)} style={inpS}>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Catégorie de permis</label>
                    <select value={extCategorie} onChange={e => setExtCategorie(e.target.value)} style={inpS}>
                      {CATEGORIES_PERMIS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Téléphone</label>
                    <input type="text" className="ssm-input" value={extTel} onChange={e => setExtTel(e.target.value)} style={inpS} placeholder="Optionnel" />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
                  <input type="email" className="ssm-input" value={extEmail} onChange={e => setExtEmail(e.target.value)} style={inpS} placeholder="Optionnel" />
                </div>
                {extError && <p style={errStyle}>{extError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={resetExterneForm}
                    className="ssm-btn-ghost"
                    style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 12.5 }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveExterne}
                    disabled={savingExterne}
                    className="ssm-btn-primary"
                    style={{ flex: 2, padding: 10, borderRadius: 9, border: "none", background: savingExterne ? "#94a3b8" : "#d97706", color: "#fff", cursor: savingExterne ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {savingExterne ? "⏳ Enregistrement…" : (<><IconCheck size={13} />{editingExterneId ? "Enregistrer les modifications" : "Ajouter et sélectionner"}</>)}
                  </button>
                </div>
              </div>
            )}

            {/* Badge candidat sélectionné */}
            {selected && !showAddExterne && (
              <div style={{ padding: "14px 16px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 14, marginTop: 6, animation: "ssm-slide .15s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#92400e" }}>{selected.prenom} {selected.nom}</div>
                    {selected.externe ? (
                      <div style={{ fontSize: 12, color: "#a16207", marginTop: 6 }}>
                        🆕 Personne externe — permis {selected.categoriePermis || "B"} obtenu hors de notre auto-école
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: "#a16207", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span>📋 {nbTotal} séances effectuées</span>
                          <span style={{ fontWeight: 700 }}>🎓 crédit actuel : {getCredit(selected.idCandidat || selected.id)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#a16207", marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "2px 9px", borderRadius: 10, fontWeight: 600 }}>🚦 {nbCode} code</span>
                          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 9px", borderRadius: 10, fontWeight: 600 }}>🅿️ {nbCreneau} créneau</span>
                          <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 9px", borderRadius: 10, fontWeight: 600 }}>🚗 {nbCirc} circ.</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    {selected.externe && (
                      <button
                        type="button"
                        onClick={() => openEditExterne(selected)}
                        title="Modifier"
                        className="ssm-icon-btn ssm-icon-btn--edit"
                      >
                        <IconPencil size={13} />
                      </button>
                    )}
                    <button onClick={() => { setSelected(null); setSearchQuery(""); }}
                      style={{ background: "none", border: "none", color: "#a16207", cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: "4px 8px" }}>
                      ✕ Changer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Formulaire paiement */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
              💰 Détails du paiement
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Nombre de séances *</label>
                <input
                  type="number" min={1} value={nbSeances} className="ssm-input"
                  onChange={e => { setNbSeances(Math.max(1, parseInt(e.target.value) || 1)); setErrors(p => ({ ...p, nbSeances: "" })); }}
                  style={{ ...inpS, border: `1.5px solid ${errors.nbSeances ? "#ef4444" : "#e2e8f0"}` }}
                />
                {errors.nbSeances && <p style={errStyle}>{errors.nbSeances}</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Prix / séance (DA) *</label>
                <input
                  type="number" min={0} value={prixSeance} className="ssm-input"
                  placeholder="ex: 1500"
                  onChange={e => { setPrixSeance(e.target.value); setErrors(p => ({ ...p, prix: "" })); }}
                  style={{ ...inpS, border: `1.5px solid ${errors.prix ? "#ef4444" : "#e2e8f0"}` }}
                />
                {errors.prix && <p style={errStyle}>{errors.prix}</p>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Méthode</label>
                <select value={methode} onChange={e => setMethode(e.target.value)} style={inpS}>
                  <option value="especes">Espèces</option>
                  <option value="ccp">CCP</option>
                  <option value="carte">Carte</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Date *</label>
                <input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={e => setDate(e.target.value)}
                  style={{ ...inpS, border: `1.5px solid ${errors.date ? "#ef4444" : "#e2e8f0"}` }} />
                {errors.date && <p style={errStyle}>{errors.date}</p>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Remarque</label>
              <input type="text" className="ssm-input" value={remarque} onChange={e => setRemarque(e.target.value)}
                placeholder="Ex: séances de perfectionnement post-permis"
                style={inpS} />
            </div>
          </div>

          {/* Total récap */}
          {total > 0 && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Total à encaisser</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {nbSeances} séance{nbSeances > 1 ? "s" : ""} × {fDA(prixSeance)}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#166534" }}>{fDA(total)}</div>
            </div>
          )}
          {/* Message post-paiement : redirection vers l'agenda */}
          {submitted && (
            <div style={{
              background: "#eef2ff", border: "1.5px solid #c7d2fe", borderRadius: 12,
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div style={{ fontSize: 13, color: "#4338ca", fontWeight: 600 }}>
                Crédit ajouté : {nbSeances} séance{nbSeances > 1 ? "s" : ""}. Vous pouvez maintenant les créer dans l'agenda sans repasser par un paiement, jusqu'à épuisement du crédit.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, flexShrink: 0, background: "#f8fafc" }}>
          <button onClick={onClose} className="ssm-btn-ghost" style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {submitted ? "Fermer" : "Annuler"}
          </button>
          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={!selected || total <= 0}
              className="ssm-btn-primary"
              style={{
                flex: 2, padding: 12, borderRadius: 12, border: "none",
                background: !selected || total <= 0 ? "#94a3b8" : "#d97706",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: !selected || total <= 0 ? "not-allowed" : "pointer",
              }}
            >
              {total > 0 ? `💰 Enregistrer — ${fDA(total)}` : "Enregistrer le paiement"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeanceSupModal;