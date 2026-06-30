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
          return aObtenuPermis(id);
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

 const seancesCandidat = selected ? (seancesParCand[selected.idCandidat || selected.id] || []) : [];
  const nbTotal = seancesCandidat.length;

  // Stats types pour le badge candidat sélectionné
  const typesCandidat = seancesCandidat.map(s => normaliserType(s.type));
  const nbCode        = typesCandidat.filter(t => t === "code").length;
  const nbCreneau     = typesCandidat.filter(t => t === "creneau").length;
  const nbCirc        = typesCandidat.filter(t => t === "circulation").length;

  const inpS = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, outline: "none", background: "#f8fafc", color: "#1e293b",
    fontFamily: "inherit",
  };
  const errStyle = { fontSize: 11, color: "#ef4444", marginTop: 3 };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#d97706,#f59e0b)",
          padding: "18px 22px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
              ➕ Paiement séance supplémentaire
            </div>
           <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
              Candidats ayant réussi leurs 3 examens (Code + Créneau + Circulation)
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Sélection candidat */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Candidat *
            </label>

            <div style={{ position: "relative", marginBottom: 4 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSelected(null); }}
                placeholder="Rechercher un candidat éligible…"
                style={{ ...inpS, paddingLeft: 32, border: `1.5px solid ${errors.candidate ? "#ef4444" : "#e2e8f0"}` }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSelected(null); }}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14 }}>✕</button>
              )}
            </div>

            {!selected && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, maxHeight: 200, overflowY: "auto", background: "#fff" }}>
                {loading ? (
                  <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>⏳ Chargement…</div>
                ) : candidatsFiltres.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    {candidats.length === 0
                      ? "Aucun candidat éligible — il faut avoir terminé le permis (code + créneau + circulation) "
                      : "Aucun résultat"}
                  </div>
                ) : (
                 candidatsFiltres.map((c, i) => {
                    const id  = c.idCandidat || c.id;
                    const nb  = (seancesParCand[id] || []).length;
                    const credit = getCredit(id);
                    const types = (seancesParCand[id] || []).map(s => normaliserType(s.type));
                    return (
                      <div
                        key={id}
                        onClick={() => handleSelectCandidat(c)}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: i < candidatsFiltres.length - 1 ? "1px solid #f1f5f9" : "none",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fefce8"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{c.prenom} {c.nom}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8 }}>
                            <span>{nb} séances effectuées</span>
                            <span>· 🚦 {types.filter(t => t === "code").length} code</span>
                            <span>· 🅿️ {types.filter(t => t === "creneau").length} créneau</span>
                            <span>· 🚗 {types.filter(t => t === "circulation").length} circ.</span>
                          </div>
                        </div>
                        <span style={{
                          padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: credit > 0 ? "#dcfce7" : "#fff7ed",
                          color: credit > 0 ? "#166534" : "#d97706",
                          border: `1px solid ${credit > 0 ? "#86efac" : "#fcd34d"}`,
                          flexShrink: 0,
                        }}>
                          {credit > 0 ? `🎓 crédit : ${credit}` : "🎓 permis obtenu"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {errors.candidate && <p style={errStyle}>{errors.candidate}</p>}

            {/* Badge candidat sélectionné */}
          {selected && (
              <div style={{ padding: "12px 16px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 10, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#92400e" }}>{selected.prenom} {selected.nom}</div>
                    <div style={{ fontSize: 12, color: "#a16207", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>📋 {nbTotal} séances effectuées</span>
                      <span style={{ fontWeight: 700 }}>🎓 crédit actuel : {getCredit(selected.idCandidat || selected.id)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#a16207", marginTop: 4, display: "flex", gap: 8 }}>
                      <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>🚦 {nbCode} code</span>
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>🅿️ {nbCreneau} créneau</span>
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>🚗 {nbCirc} circ.</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setSearchQuery(""); }}
                    style={{ background: "none", border: "none", color: "#a16207", cursor: "pointer", fontSize: 13, padding: "2px 6px" }}>
                    ✕ Changer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Formulaire paiement */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
              💰 Détails du paiement
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Nombre de séances *</label>
                <input
                  type="number" min={1} value={nbSeances}
                  onChange={e => { setNbSeances(Math.max(1, parseInt(e.target.value) || 1)); setErrors(p => ({ ...p, nbSeances: "" })); }}
                  style={{ ...inpS, border: `1.5px solid ${errors.nbSeances ? "#ef4444" : "#e2e8f0"}` }}
                />
                {errors.nbSeances && <p style={errStyle}>{errors.nbSeances}</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Prix / séance (DA) *</label>
                <input
                  type="number" min={0} value={prixSeance}
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
                {/* <input type="date" value={date} onChange={e => setDate(e.target.value)} */}
                <input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={e => setDate(e.target.value)}
                  style={{ ...inpS, border: `1.5px solid ${errors.date ? "#ef4444" : "#e2e8f0"}` }} />
                {errors.date && <p style={errStyle}>{errors.date}</p>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Remarque</label>
              <input type="text" value={remarque} onChange={e => setRemarque(e.target.value)}
                placeholder="Ex: séances de perfectionnement post-permis"
                style={inpS} />
            </div>
          </div>

          {/* Total récap */}
          {total > 0 && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              background: "#eef2ff", border: "1.5px solid #c7d2fe", borderRadius: 10,
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>📅</span>
           <div style={{ fontSize: 13, color: "#4338ca", fontWeight: 600 }}>
                Crédit ajouté : {nbSeances} séance{nbSeances > 1 ? "s" : ""}. Vous pouvez maintenant les créer dans l'agenda sans repasser par un paiement, jusqu'à épuisement du crédit.
              </div>
            </div>
          )}
        </div>

       {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, flexShrink: 0, background: "#f8fafc" }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {submitted ? "Fermer" : "Annuler"}
          </button>
          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={!selected || total <= 0}
              style={{
                flex: 2, padding: 11, borderRadius: 10, border: "none",
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