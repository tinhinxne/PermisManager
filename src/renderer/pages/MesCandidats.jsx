import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Plus, Trash2, FileText, X, Filter } from "lucide-react";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth } from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import AddCandidatModal from "../components/addCondidat";

// ─────────────────────────────────────────────
// Clés localStorage
// ─────────────────────────────────────────────
const ENVOI_REF_KEY       = "liste_envoi_derniere_date";
const ENVOI_DEFAULTS_KEY  = "export_pdf_defaults";
const ENVOI_IDS_KEY       = "liste_envoi_ids_envoyes";
const ENVOI_TIMESTAMP_KEY = "liste_envoi_derniere_generation";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDateAr(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  const d = new Date(str.includes("T") ? str : str + "T12:00:00");
  if (isNaN(d)) return str;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${j}`;
}

function formatDateHeure(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return "";
  const j   = String(d.getDate()).padStart(2, "0");
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const y   = d.getFullYear();
  const h   = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${j}/${m}/${y} à ${h}:${min}`;
}

function toComparableDate(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  return str.slice(0, 10);
}

// ─────────────────────────────────────────────
// Sous-composant champ formulaire
// ─────────────────────────────────────────────
const FormField = ({ label, value, onChange, placeholder, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid #d1d5db", fontSize: 13.5,
        color: "#1F2937", background: "#fff",
        outline: "none", boxSizing: "border-box",
      }}
    />
  </div>
);

// ─────────────────────────────────────────────
// Modale لائحة الإرسال
// ─────────────────────────────────────────────
function EnvoiCandidatsModal({ candidats, onClose }) {
  const [dateDebut,          setDateDebut]          = useState("");
  const [dateFin,            setDateFin]            = useState("");
  const [wilaya,             setWilaya]             = useState("");
  const [nomEcole,           setNomEcole]           = useState("");
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [sentIds,            setSentIds]            = useState([]);
  const [derniereGeneration, setDerniereGeneration] = useState("");

  useEffect(() => {
    try {
      const ref = localStorage.getItem(ENVOI_REF_KEY);
      if (ref) setDateDebut(ref);

      const ids = JSON.parse(localStorage.getItem(ENVOI_IDS_KEY) || "[]");
      setSentIds(Array.isArray(ids) ? ids : []);

      const defaults = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
      setWilaya(defaults.wilaya   || "");
      setNomEcole(defaults.nomEcole || "");

      const ts = localStorage.getItem(ENVOI_TIMESTAMP_KEY);
      if (ts) setDerniereGeneration(ts);
    } catch {
      setSentIds([]);
    }
  }, []);

  const candidatsFiltres = candidats.filter((c) => {
    const insc = toComparableDate(c._raw?.date_inscription);
    if (!insc || !dateDebut || !dateFin) return false;
    return insc >= dateDebut && insc <= dateFin;
  });

  const periodeVide = !!dateDebut && !!dateFin && candidatsFiltres.length === 0;

  const handleConfirm = async () => {
    setError("");
    if (!dateDebut)       { setError("Merci de renseigner la date de début.");                           return; }
    if (!dateFin)         { setError("Merci de choisir la date jusqu'à laquelle inclure les inscrits."); return; }
    if (!wilaya.trim())   { setError("Merci de renseigner la wilaya.");                                  return; }
    if (candidatsFiltres.length === 0) { setError("Aucun candidat inscrit sur cette période.");          return; }

    setLoading(true);
    try {
      const candidatsPourEnvoi = candidatsFiltres.map((c) => {
        const nomAr    = c._raw?.nom_ar    || "";
        const prenomAr = c._raw?.prenom_ar || "";
        return {
          nomPrenom:     `${c.prenom} ${c.nom}`,
          nomPrenomAr:   (nomAr || prenomAr) ? `${nomAr} ${prenomAr}`.trim() : "",
          dateNaissance: formatDateAr(c._raw?.date_naissance),
          categorie:     c.categoriePermis || "",
        };
      });

      const savedPath = await window.electron.generateListeEnvoiPDF({
        wilaya,
        nomEcole,
        dateDepot: formatDateAr(dateFin),
        candidats: candidatsPourEnvoi,
      });

      if (savedPath) {
        localStorage.setItem(ENVOI_REF_KEY, dateFin);

        const nouveauxIds = Array.from(
          new Set([...sentIds, ...candidatsFiltres.map((c) => c.id)])
        );
        localStorage.setItem(ENVOI_IDS_KEY, JSON.stringify(nouveauxIds));

        const nowIso = new Date().toISOString();
        localStorage.setItem(ENVOI_TIMESTAMP_KEY, nowIso);
        setDerniereGeneration(nowIso);

        try {
          const prev = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
          localStorage.setItem(ENVOI_DEFAULTS_KEY, JSON.stringify({ ...prev, wilaya, nomEcole }));
        } catch { /* ignore */ }

        alert(`لائحة الإرسال enregistrée :\n${savedPath}`);
        onClose();
      }
    } catch (e) {
      console.error("Erreur génération لائحة الإرسال :", e);
      alert("Erreur lors de la génération du document.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, padding: 24,
          width: 420, maxWidth: "90vw",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>لائحة الإرسال — نوعي الجديد</h3>
          <button
            onClick={() => !loading && onClose()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
          Liste de mes candidats inscrits sur la période choisie — المندوبية الولائية للأمن في الطرق
        </p>

        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 8, padding: "8px 12px", marginBottom: 14,
          fontSize: 12, color: "#475569",
        }}>
          {derniereGeneration
            ? <>Dernière liste générée le <strong>{formatDateHeure(derniereGeneration)}</strong></>
            : "Aucune liste générée pour le moment."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <FormField label="Depuis le"               value={dateDebut} onChange={setDateDebut} type="date" required />
          <FormField label="Jusqu'au"                value={dateFin}   onChange={setDateFin}   type="date" required />
          <FormField label="الولاية (Wilaya)"        value={wilaya}    onChange={setWilaya}    placeholder="Ex : بجاية / Béjaïa" required />
          <FormField label="Nom de l'auto-école (optionnel)" value={nomEcole} onChange={setNomEcole} placeholder="Ex : Auto-École Essalem" />
        </div>

        {periodeVide ? (
          <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
            Aucun de mes candidats inscrit sur cette période.
          </div>
        ) : (
          <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
            <strong style={{ color: "#1f2937" }}>Mes candidats trouvés sur cette période :</strong> {candidatsFiltres.length}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 10, padding: "9px 13px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13.5, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Génération..." : "Générer لائحة الإرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers cartes
// ─────────────────────────────────────────────
const getInitials = (nom) =>
  nom.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  { color: "#dbeafe", textColor: "#185fa5" },
  { color: "#dcfce7", textColor: "#3b6d11" },
  { color: "#faeeda", textColor: "#854f0b" },
  { color: "#fbeaf0", textColor: "#993556" },
  { color: "#eeedfe", textColor: "#534ab7" },
];

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
const MesCandidats = () => {
  const { currentUser } = useAuth();
  const { CAN_VIEW_ALL_CANDIDATES, CAN_REMOVE_CANDIDAT, CAN_ADD_CANDIDAT } = useMyPermissions();

  const [search,         setSearch]         = useState("");
  const [candidats,      setCandidats]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [editCandidat,   setEditCandidat]   = useState(null);
  const [showEnvoiModal, setShowEnvoiModal] = useState(false);

  // ── Chargement ───────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      setLoading(true);
      const [rawCandidats, rawSeances] = await Promise.all([
        window.electron.getCandidats(),
        window.electron.getSeances(),
      ]);

      const moniteurId = currentUser?.id;
      const mesSeances = CAN_VIEW_ALL_CANDIDATES
        ? rawSeances
        : moniteurId
          ? rawSeances.filter((s) => s.moniteur_id === moniteurId)
          : [];

      const candidatIdSet = new Set();
      mesSeances.forEach((s) => {
        if (!s.candidatsIds) return;
        String(s.candidatsIds).split(",")
          .forEach((id) => candidatIdSet.add(parseInt(id.trim())));
      });

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const formatted = rawCandidats
        .filter((c) => CAN_VIEW_ALL_CANDIDATES || candidatIdSet.has(c.idCandidat))
        .map((c, index) => {
          const seancesDuCandidat = mesSeances.filter((s) => {
            if (!s.candidatsIds) return false;
            return String(s.candidatsIds).split(",")
              .map((id) => parseInt(id.trim()))
              .includes(c.idCandidat);
          });

          const nbSessions = seancesDuCandidat.length;

          const nextSeance = seancesDuCandidat
            .map((s) => {
              const dateObj = s.date instanceof Date ? s.date : new Date(s.date);
              const [h, m, sec] = (s.heure || "08:00").split(":");
              const dt = new Date(dateObj);
              dt.setHours(parseInt(h), parseInt(m), parseInt(sec || 0), 0);
              return { ...s, _dt: dt };
            })
            .filter((s) => {
              const seanceMidnight = new Date(s._dt);
              seanceMidnight.setHours(0, 0, 0, 0);
              const isToday  = seanceMidnight.getTime() === todayMidnight.getTime();
              const isFuture = seanceMidnight > todayMidnight;
              const isDone   = s.statut === "terminée" || s.statut === "annulée";
              return (isToday || isFuture) && !isDone;
            })
            .sort((a, b) => a._dt - b._dt)[0];

          const nextSession = nextSeance
            ? `${new Date(nextSeance._dt).toLocaleDateString("fr-FR")} ${nextSeance.heure}`
            : "—";

          const currentCat = (
            c.categoriePermis || c.categorie || c.categorie_permis || "B"
          ).toString().trim().toUpperCase();

          return {
            id:              c.idCandidat,
            nom:             `${c.prenom} ${c.nom}`,
            prenom:          c.prenom,
            tel:             c.telephone,
            categoriePermis: currentCat,
            sessions:        nbSessions,
            total:           20,
            nextSession,
            status:          c.statut,
            _raw:            c,
            ...AVATAR_COLORS[index % AVATAR_COLORS.length],
          };
        });

      setCandidats(formatted);
    } catch (error) {
      console.error("Erreur lors du chargement des candidats :", error);
      setCandidats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentUser?.id, CAN_VIEW_ALL_CANDIDATES]);

  // ── Ajouter ──────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!CAN_ADD_CANDIDAT) return;
    setEditCandidat(null);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    if (!CAN_ADD_CANDIDAT) return;
    if (data.idCandidat) {
      await window.electron.updateCandidat(data);
    } else {
      await window.electron.addCandidat(data);
    }
    await loadData();
    setShowModal(false);
  };

  // ── Supprimer ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!CAN_REMOVE_CANDIDAT) return;
    const confirmed = window.confirm("Supprimer ce candidat définitivement ? Cette action est irréversible.");
    if (!confirmed) return;
    const result = await window.electron.deleteCandidat(id);
    if (result?.success) {
      await loadData();
    } else {
      alert("Erreur lors de la suppression du candidat.");
    }
  };

  // ── Bordereau ────────────────────────────────────────────────────────────────
  const handleOpenEnvoiModal = () => {
    if (candidats.length === 0) {
      alert("Aucun candidat enregistré pour le moment.");
      return;
    }
    setShowEnvoiModal(true);
  };

  // ── Stats + filtre ────────────────────────────────────────────────────────────
  const onTrack  = candidats.filter((c) => c.sessions / c.total >= 0.5).length;
  const filtered = candidats.filter(
    (c) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.tel?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="main">

        {/* HEADER */}
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="" width={40} />
            Panneau de contrôle de l'auto-école
          </h1>
          <p>
            {CAN_VIEW_ALL_CANDIDATES
              ? "Vue complète — tous les candidats de l'auto-école"
              : "Mes candidats — vue lecture seule"}
          </p>
        </div>

        {/* Badge mode */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: CAN_VIEW_ALL_CANDIDATES ? "rgba(22,101,52,0.08)" : "rgba(148,163,184,0.12)",
          border: `1px solid ${CAN_VIEW_ALL_CANDIDATES ? "rgba(22,101,52,0.25)" : "#e2e8f0"}`,
          borderRadius: 10, padding: "6px 14px",
          fontSize: "0.75rem",
          color: CAN_VIEW_ALL_CANDIDATES ? "#166534" : "#64748b",
          fontWeight: 600, marginBottom: 14,
        }}>
          {CAN_VIEW_ALL_CANDIDATES
            ? "👥 Accès complet — vous pouvez voir tous les candidats"
            : "🔒 Vue lecture seule — contactez l'admin pour voir les candidats"}
        </div>

        {/* STATS */}
        <div className="stats-row-layout">
          <div className="interactive-stat-card-small large-stat">
            <div className="stat-data">
              <p className="stat-label-small">
                {CAN_VIEW_ALL_CANDIDATES ? "Total Candidats" : "Mes Candidats"}
              </p>
              <h3 className="stat-number-small">{candidats.length}</h3>
            </div>
            <div className="stat-icon-circle-small large-icon" style={{ backgroundColor: "rgba(77,163,255,0.15)" }}>
              <Users size={24} color="#4da3ff" />
            </div>
          </div>

          <div className="interactive-stat-card-small large-stat">
            <div className="stat-data">
              <p className="stat-label-small">En bonne voie</p>
              <h3 className="stat-number-small">{onTrack}</h3>
            </div>
            <div className="stat-icon-circle-small large-icon" style={{ backgroundColor: "#d4edda" }}>
              <TrendingUp size={24} color="green" />
            </div>
          </div>
        </div>

        {/* SECTION CANDIDATS */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2>{CAN_VIEW_ALL_CANDIDATES ? "Tous les Candidats" : "Mes Candidats"}</h2>
              <p>
                {CAN_VIEW_ALL_CANDIDATES
                  ? "Voir et suivre tous les candidats"
                  : "Suivi de la progression de vos candidats"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleOpenEnvoiModal}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#7c3aed", color: "#fff", border: "none",
                  padding: "10px 18px", borderRadius: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                }}
              >
                <FileText size={16} /> لائحة الإرسال (نوعي)
              </button>

              {/* ← CAN_ADD_CANDIDAT ici, indépendant de CAN_VIEW_ALL_CANDIDATES */}
              {CAN_ADD_CANDIDAT && (
                <button
                  onClick={handleAdd}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 20px", borderRadius: 10,
                    background: "#2b537e", border: "none", color: "#fff",
                    fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 700,
                    cursor: "pointer", boxShadow: "0 4px 14px rgba(43,83,126,0.3)",
                  }}
                >
                  <Plus size={15} /> Ajouter candidat
                </button>
              )}
            </div>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div style={{
            display: "flex", gap: "12px", marginBottom: "20px",
            background: "#fff", padding: "10px 14px",
            borderRadius: "12px", border: "1px solid #E2E8F0", alignItems: "center",
          }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un candidat (Nom, téléphone...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, padding: "10px 14px",
                border: "1px solid #E2E8F0", borderRadius: "8px",
                outline: "none", fontSize: "14px", background: "#F8FAFC",
              }}
            />
          </div>

          {/* CARDS */}
          {loading ? (
            <p style={{ textAlign: "center", color: "#888", padding: "20px" }}>Chargement…</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: "center", color: "#888", padding: "20px" }}>Aucun candidat trouvé</p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}>
              {filtered.map((c) => {
                const pct = Math.min(Math.round((c.sessions / c.total) * 100), 100);
                return (
                  <div key={c.id} style={candidateCard}>

                    {/* Avatar + nom */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: c.color, color: c.textColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {getInitials(c.nom)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{c.nom}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>{c.tel}</div>
                      </div>
                    </div>

                    {/* Badge catégorie */}
                    <span style={{
                      fontSize: "11px", background: "#e0f2fe", color: "#0369a1",
                      padding: "2px 8px", borderRadius: "4px", fontWeight: "bold",
                      display: "inline-block", marginBottom: 10,
                    }}>
                      Catégorie {c.categoriePermis}
                    </span>

                    {/* Progress */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span className="progress-text">Progression</span>
                      <span className="progress-text">{c.sessions}/{c.total} sessions</span>
                    </div>
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${pct}%` }} />
                    </div>

                    {/* Status */}
                    <div style={{ marginTop: 8 }}>
                      <span className={`status ${c.status}`}>{c.status}</span>
                    </div>

                    {/* Prochaine session */}
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>
                      Prochaine session :{" "}
                      <span style={{ color: "#1e293b", fontWeight: 600 }}>{c.nextSession}</span>
                    </div>

                    {/* Bouton Supprimer */}
                    {CAN_REMOVE_CANDIDAT && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          marginTop: 12,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          width: "100%", padding: "7px 0", borderRadius: 8,
                          background: "rgba(239,68,68,0.07)",
                          border: "1px solid rgba(239,68,68,0.22)",
                          color: "#dc2626", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", transition: "background 0.18s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.07)"}
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODALE AJOUT ← CAN_ADD_CANDIDAT ici */}
      {CAN_ADD_CANDIDAT && (
        <AddCandidatModal
          showModal={showModal}
          setShowModal={setShowModal}
          candidat={editCandidat}
          onSave={handleSave}
        />
      )}

      {/* MODALE لائحة الإرسال */}
      {showEnvoiModal && (
        <EnvoiCandidatsModal
          candidats={candidats}
          onClose={() => setShowEnvoiModal(false)}
        />
      )}
    </div>
  );
};

const candidateCard = {
  background: "#f0f6ff",
  border: "1px solid #e2eaf6",
  borderRadius: 10,
  padding: "1rem 1.25rem",
};

export default MesCandidats;