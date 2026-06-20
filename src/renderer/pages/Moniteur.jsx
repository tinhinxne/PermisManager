import React, { useState, useEffect } from "react";
import "../../styles/Moniteur.css";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import Button from "../components/Button";
import AddMoniteurModal from "../components/addMoniteur";
import { useCongeCtx } from "../context/CongeContext";
import { CalendarOff, X, Save, Plus, Trash, Clock, Check, X as XIcon } from "lucide-react";

/* ── Couleurs par famille de permis ─────────────────────────────────────── */
const CATEGORY_COLORS = {
  A1: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  A:  { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  B:  { bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  BE: { bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD" },
  C1: { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  C:  { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  C1E:{ bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  CE: { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  D:  { bg: "#FCE7F3", color: "#9D174D", border: "#F9A8D4" },
  DE: { bg: "#FDF2F8", color: "#831843", border: "#F0ABFC" },
  F:  { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
};

const CategoryBadge = ({ cat }) => {
  const colors = CATEGORY_COLORS[cat] || { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.4px",
      background: colors.bg, color: colors.color,
      border: `1.5px solid ${colors.border}`,
      fontFamily: "'Sora', sans-serif",
    }}>
      {cat}
    </span>
  );
};

/* ── Raisons de congé ───────────────────────────────────────────────────── */
const RAISONS = [
  { value: "maladie",  label: "🤒 Maladie",           color: "#ef4444" },
  { value: "voyage",   label: "✈️ Voyage",             color: "#3b82f6" },
  { value: "familial", label: "👨‍👩‍👧 Raison familiale", color: "#f59e0b" },
  { value: "autre",    label: "📋 Autre",              color: "#8b5cf6" },
];

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-DZ", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const nbJours = (d1, d2) => {
  if (!d1 || !d2) return 0;
  return Math.max(0, Math.round((new Date(d2) - new Date(d1)) / 86400000) + 1);
};

const CONGE_PULSE_CSS = `@keyframes congePulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }`;

/* ── Mini-modale congé rapide ────────────────────────────────────────────── */
const CongeQuickModal = ({ moniteur, onClose }) => {
  const { congesMoniteurs, addCongeMoniteur, removeCongeMoniteur, refreshMoniteur } = useCongeCtx();
  const conges = congesMoniteurs[String(moniteur.id)] || [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
  const [error, setError]       = useState("");

  useEffect(() => {
    refreshMoniteur(moniteur.id);
  }, [moniteur.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!form.dateDebut || !form.dateFin) { setError("Renseignez les deux dates."); return; }
    if (new Date(form.dateFin) < new Date(form.dateDebut)) { setError("La fin doit être après le début."); return; }
    if (form.raison === "autre" && !form.precision.trim()) { setError("Précisez la raison du congé."); return; }
    await addCongeMoniteur(moniteur.id, { ...form, precision: form.precision.trim() });
    setForm({ dateDebut: "", dateFin: "", raison: "maladie", precision: "" });
    setShowForm(false);
    setError("");
  };

  const handleRemove = (congeId) => removeCongeMoniteur(moniteur.id, congeId);

  const isActive  = (d, f) => { const now = new Date(); return new Date(d) <= now && now <= new Date(f + "T23:59:59"); };
  const isExpired = (f)    => new Date(f + "T23:59:59") < new Date();

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "white", borderRadius: 16, width: 380, maxWidth: "94vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #2b537e, #3a6da0)",
          padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9,
              background: "rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <CalendarOff size={16} color="white" strokeWidth={2.3} />
            </div>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
              Congés — {moniteur.prenom} {moniteur.nom}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} color="white" />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Liste congés */}
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
            {conges.length === 0 ? (
              <div style={{ textAlign: "center", padding: "26px 0", color: "#94a3b8", fontSize: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", background: "#f0f5fa",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 8px",
                }}>
                  <CalendarOff size={22} color="#90b4d6" strokeWidth={2} />
                </div>
                Aucun congé enregistré pour ce moniteur
              </div>
            ) : (
              conges.map((c) => {
                const r       = RAISONS.find(x => x.value === c.raison) || RAISONS[3];
                const attente = c.statut === "en_attente";
                const refuse  = c.statut === "refusee";
                const actif   = !attente && !refuse && isActive(c.dateDebut, c.dateFin);
                const expire  = !attente && !refuse && isExpired(c.dateFin);
                const titre   = c.raison === "autre" && c.precision ? c.precision : r.label.slice(3);
                const jours   = nbJours(c.dateDebut, c.dateFin);

                const bg     = refuse ? "#fef2f2" : attente ? "#fffbeb" : actif ? "#f0fdf4" : expire ? "#f8fafc" : "#fefce8";
                const border = refuse ? "#fecaca" : attente ? "#fde68a" : actif ? "#bbf7d0" : expire ? "#e2e8f0" : "#fde68a";

                return (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 10, marginBottom: 6,
                    background: bg, border: `1px solid ${border}`,
                    opacity: (expire || refuse) ? 0.65 : 1,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: `${r.color}1A`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}>
                      {r.label.split(" ")[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {titre}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {formatDate(c.dateDebut)} → {formatDate(c.dateFin)} · {jours}j
                      </div>
                      {refuse && c.motifRefus && (
                        <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2, fontStyle: "italic" }}>
                          Motif : {c.motifRefus}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px",
                      borderRadius: 20, whiteSpace: "nowrap",
                      background: refuse ? "#fee2e2" : attente ? "#fef9c3" : actif ? "#dcfce7" : expire ? "#f1f5f9" : "#fef9c3",
                      color: refuse ? "#dc2626" : attente ? "#a16207" : actif ? "#16a34a" : expire ? "#94a3b8" : "#a16207",
                    }}>
                      {refuse ? "Refusé" : attente ? "En attente" : actif ? "En cours" : expire ? "Expiré" : "À venir"}
                    </span>
                    {!attente && (
                      <button
                        onClick={() => handleRemove(c.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2, flexShrink: 0 }}
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Formulaire ajout */}
          {showForm ? (
            <div style={{
              background: "#f8faff", border: "1px solid #c7d2fe",
              borderRadius: 10, padding: 12,
            }}>
              {/* Raisons */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {RAISONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setForm(f => ({ ...f, raison: r.value }))}
                    style={{
                      padding: "3px 9px", borderRadius: 20, fontSize: 11,
                      border: `1.5px solid ${form.raison === r.value ? r.color : "#e2e8f0"}`,
                      background: form.raison === r.value ? r.color + "18" : "white",
                      color: form.raison === r.value ? r.color : "#64748b",
                      cursor: "pointer", fontWeight: form.raison === r.value ? 700 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {form.raison === "autre" && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{
                    fontSize: 10, fontWeight: 600, color: "#64748b",
                    display: "block", marginBottom: 3,
                  }}>
                    PRÉCISEZ LA RAISON
                  </label>
                  <input
                    type="text"
                    value={form.precision}
                    onChange={e => { setForm(f => ({ ...f, precision: e.target.value })); setError(""); }}
                    placeholder="Ex : formation, déménagement, examen personnel..."
                    style={{
                      width: "100%", padding: "6px 9px", borderRadius: 7,
                      border: "1px solid #c7d2fe", fontSize: 12,
                      background: "white", boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
              )}

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[["dateDebut", "Début"], ["dateFin", "Fin"]].map(([key, label]) => (
                  <div key={key}>
                    <label style={{
                      fontSize: 10, fontWeight: 600, color: "#64748b",
                      display: "block", marginBottom: 3,
                    }}>
                      {label.toUpperCase()}
                    </label>
                    <input
                      type="date"
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "5px 7px", borderRadius: 7,
                        border: "1px solid #c7d2fe", fontSize: 12,
                        background: "white", boxSizing: "border-box", outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 7, fontWeight: 600 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  style={{
                    flex: 1, padding: "7px", borderRadius: 7,
                    border: "1px solid #e2e8f0", background: "white",
                    color: "#64748b", fontSize: 12, cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAdd}
                  style={{
                    flex: 2, padding: "7px", borderRadius: 7, border: "none",
                    background: "#2b537e", color: "white",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}
                >
                  <Save size={12} /> Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%", padding: "8px", borderRadius: 8,
                border: "1.5px dashed #c3d6e8", background: "#f0f5fa",
                color: "#2b537e", fontWeight: 600, fontSize: 12,
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}
            >
              <Plus size={13} /> Nouveau congé
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── MoniteurCard ────────────────────────────────────────────────────────── */
const MoniteurCard = ({ moniteur, onDelete, onEdit }) => {
  const { isMoniteurEnConge, getCongeActifMoniteur } = useCongeCtx();
  const [showCongeModal, setShowCongeModal] = useState(false);

  const today      = new Date();
  const enConge    = isMoniteurEnConge(moniteur.id, today);
  const congeActif = enConge ? getCongeActifMoniteur(moniteur.id, today) : null;

  const raisonIcon = congeActif
    ? (RAISONS.find(r => r.value === congeActif.raison)?.label.split(" ")[0] || "📋")
    : null;

  const initials = `${moniteur.prenom?.[0] || ""}${moniteur.nom?.[0] || ""}`.toUpperCase();

  const categories = moniteur.categories_habilitees
    ? moniteur.categories_habilitees.split(",").map(c => c.trim()).filter(Boolean)
    : ["B"];

  return (
    <>
      <div
        className="moniteur-card-proto"
        style={{
          border: enConge ? "1.5px solid #fed7aa" : undefined,
          boxShadow: enConge ? "0 2px 12px rgba(249,115,22,0.12)" : undefined,
          opacity: enConge ? 0.93 : 1,
          position: "relative",
        }}
      >
        {/* Badge congé actif — affiché en haut à droite de la card */}
        {enConge && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "#fff7ed", border: "1px solid #fed7aa",
            borderRadius: 20, padding: "3px 9px 3px 7px",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, color: "#ea580c",
            zIndex: 1,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#f97316",
              flexShrink: 0, animation: "congePulse 1.6s ease-in-out infinite",
            }} />
            {raisonIcon} En congé
          </div>
        )}

        <div className="card-header-proto">
          <div className="avatar-proto" style={{
            background: enConge
              ? "linear-gradient(135deg, #fed7aa, #fb923c)"
              : undefined,
          }}>
            {moniteur.photo ? (
              <img
                src={moniteur.photo}
                alt={`${moniteur.prenom} ${moniteur.nom}`}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>
          {!enConge && (
            <span className={`status-pill-proto ${moniteur.statut}`}>
              {moniteur.statut === "actif" ? "Active" : "Inactive"}
            </span>
          )}
        </div>

        <div className="card-body-proto">
          <h3 className="name-proto">{moniteur.prenom} {moniteur.nom}</h3>
          <div className="info-list-proto">
            <div className="info-item-proto">
              <i className="fa-regular fa-envelope" />
              <span>{moniteur.email}</span>
            </div>
            <div className="info-item-proto">
              <i className="fa-solid fa-phone" />
              <span>{moniteur.telephone}</span>
            </div>
          </div>

          {/* Catégories */}
          <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: "11px", color: "#94A3B8" }} />
              <span style={{
                fontSize: "11px", fontWeight: "600", color: "#94A3B8",
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                Habilitations
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {categories.map(cat => <CategoryBadge key={cat} cat={cat} />)}
            </div>
          </div>
        </div>

        <div className="card-actions-proto">
          {/* Bouton congé */}
          <button
            onClick={() => setShowCongeModal(true)}
            title="Gérer les congés"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "0 10px", height: 30, borderRadius: 8,
              border: `1.5px solid ${enConge ? "transparent" : "#fed7aa"}`,
              background: enConge ? "linear-gradient(135deg,#f97316,#fb923c)" : "#fff7ed",
              color: enConge ? "#fff" : "#ea580c",
              cursor: "pointer", fontSize: 11.5, fontWeight: 700,
              fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap",
              boxShadow: enConge ? "0 3px 10px rgba(249,115,22,0.35)" : "none",
              transition: "all 0.15s", flexShrink: 0,
            }}
          >
            <CalendarOff size={13} strokeWidth={2.4} />
            Congé
          </button>

          <button className="btn-edit-proto" onClick={() => onEdit(moniteur)}>
            <i className="fa-regular fa-pen-to-square" /> Modifier
          </button>
          <button className="btn-delete-proto" onClick={() => onDelete(moniteur.id)}>
            <i className="fa-solid fa-trash-can" />
          </button>
        </div>
      </div>

      {showCongeModal && (
        <CongeQuickModal
          moniteur={moniteur}
          onClose={() => setShowCongeModal(false)}
        />
      )}
    </>
  );
};

/* ── Page Moniteur ───────────────────────────────────────────────────────── */
const Moniteur = () => {
  const [moniteurs,      setMoniteurs]      = useState([]);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterStatus,   setFilterStatus]   = useState("tous");
  const [showModal,      setShowModal]      = useState(false);
  const [selectedMoniteur, setSelectedMoniteur] = useState(null);

  const {
    congesEnAttente,
    refreshCongesEnAttente,
    validerCongeMoniteur,
    refuserCongeMoniteur,
  } = useCongeCtx();

  const [refusingId, setRefusingId] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");

  const handleValider = async (id, moniteurId) => {
    await validerCongeMoniteur(id, moniteurId);
  };

  const handleRefuser = async (id, moniteurId) => {
    await refuserCongeMoniteur(id, moniteurId, motifRefus.trim() || null);
    setRefusingId(null);
    setMotifRefus("");
  };

  const loadMoniteurs = async () => {
    try {
      const data = await window.electron.getMoniteurs();
      setMoniteurs(data);
    } catch (error) {
      console.error("Erreur lors du chargement des moniteurs:", error);
    }
  };

  useEffect(() => {
    loadMoniteurs();
    refreshCongesEnAttente();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (data) => {
    try {
      const result = data.id
        ? await window.electron.updateMoniteur(data)
        : await window.electron.addMoniteur(data);
      if (result?.success) {
        await loadMoniteurs();
        if (data.id) setShowModal(false);
      }
      return result;
    } catch (err) {
      console.error("Erreur save:", err);
      return { success: false, error: err.message };
    }
  };

  const handleDelete = async (id) => {
    if (!id) { alert("Erreur : ID introuvable"); return; }
    if (window.confirm("Supprimer ce moniteur définitivement ?")) {
      try {
        const result = await window.electron.deleteMoniteur(id);
        if (result.success) await loadMoniteurs();
        else alert("Erreur BDD : " + result.error);
      } catch (err) {
        console.error("Erreur appel IPC delete:", err);
      }
    }
  };

  const handleEditClick = (moniteur) => { setSelectedMoniteur(moniteur); setShowModal(true); };
  const handleAddClick  = ()          => { setSelectedMoniteur(null);     setShowModal(true); };

  const filteredMoniteurs = moniteurs.filter((m) => {
    const fullName     = `${m.prenom} ${m.nom}`.toLowerCase();
    const matchSearch  = fullName.includes(searchTerm.toLowerCase());
    const matchStatus  = filterStatus === "tous" || m.statut === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="container">
      <style>{CONGE_PULSE_CSS}</style>
      <div className="main">
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1><img src={SmallCar} alt="" width={40} /> Panneau de contrôle</h1>
          <p>Gérer les moniteurs de l'auto-école</p>
        </div>

        {/* ── Demandes de congé en attente ── */}
        {congesEnAttente.length > 0 && (
          <div style={{
            background: "#fffbeb", border: "1.5px solid #fde68a",
            borderRadius: 14, padding: "16px 20px", marginBottom: 20,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 9, marginBottom: 14,
              fontSize: 14, fontWeight: 700, color: "#a16207",
            }}>
              <Clock size={17} />
              {congesEnAttente.length} demande{congesEnAttente.length > 1 ? "s" : ""} de congé en attente
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {congesEnAttente.map((d) => (
                <div key={d.id} style={{
                  background: "white", border: "1px solid #fde68a", borderRadius: 10,
                  padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <strong style={{ color: "#1e293b" }}>{d.moniteurNom}</strong>
                      <span style={{ color: "#64748b" }}>
                        {" "}— {formatDate(d.dateDebut)} → {formatDate(d.dateFin)}
                        {" "}({d.raison === "autre" && d.precision ? d.precision : d.raison})
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 7 }}>
                      <button
                        onClick={() => handleValider(d.id, d.moniteur_id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 11px", borderRadius: 7, border: "none",
                          background: "#22c55e", color: "white",
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        <Check size={13} /> Valider
                      </button>
                      <button
                        onClick={() => setRefusingId(refusingId === d.id ? null : d.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 11px", borderRadius: 7,
                          border: "1px solid #ef4444", background: "white",
                          color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        <XIcon size={13} /> Refuser
                      </button>
                    </div>
                  </div>

                  {refusingId === d.id && (
                    <div style={{ display: "flex", gap: 7 }}>
                      <input
                        type="text"
                        placeholder="Motif du refus (optionnel)"
                        value={motifRefus}
                        onChange={(e) => setMotifRefus(e.target.value)}
                        style={{
                          flex: 1, padding: "6px 10px", borderRadius: 7,
                          border: "1px solid #e2e8f0", fontSize: 12, outline: "none",
                        }}
                      />
                      <button
                        onClick={() => handleRefuser(d.id, d.moniteur_id)}
                        style={{
                          padding: "6px 12px", borderRadius: 7, border: "none",
                          background: "#ef4444", color: "white",
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Confirmer le refus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="content-section">
          <div className="section-header">
            <div>
              <h2>Moniteurs</h2>
              <p>{moniteurs.length} formateur(s) enregistré(s)</p>
            </div>
            <Button text="  + Ajouter moniteur" onClick={handleAddClick} />
          </div>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
            <div style={{
              flex: 1, background: "#fff", padding: "12px 20px",
              borderRadius: "15px", display: "flex", gap: "15px",
              alignItems: "center", border: "1px solid #E2E8F0",
            }}>
              <input
                type="text"
                placeholder="🔍 Rechercher un moniteur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1, padding: "10px", border: "1px solid #CBD5E0",
                  borderRadius: "10px", outline: "none", fontSize: "14px",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#4A5568" }}>
                <span>Statut :</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: "8px 12px", border: "1px solid #CBD5E0",
                    borderRadius: "8px", outline: "none", fontSize: "14px",
                    color: "#4A5568", background: "#fff", cursor: "pointer",
                  }}
                >
                  <option value="tous">Tous</option>
                  <option value="actif">Actifs</option>
                  <option value="inactif">Inactifs</option>
                </select>
              </div>
            </div>
          </div>

          <div className="moniteur-grid-proto">
            {filteredMoniteurs.length > 0 ? (
              filteredMoniteurs.map(m => (
                <MoniteurCard
                  key={m.id}
                  moniteur={m}
                  onDelete={handleDelete}
                  onEdit={handleEditClick}
                />
              ))
            ) : (
              <p className="no-data">Aucun moniteur trouvé.</p>
            )}
          </div>
        </div>
      </div>

      <AddMoniteurModal
        showModal={showModal}
        setShowModal={setShowModal}
        selectedMoniteur={selectedMoniteur}
        onSave={handleSave}
      />
    </div>
  );
};

export default Moniteur;