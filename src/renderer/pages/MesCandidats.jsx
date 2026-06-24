import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Plus, Trash2, FileText, X } from "lucide-react";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth } from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import AddCandidatModal from "../components/addCondidat";

// ─────────────────────────────────────────────
// Helpers pour le bordereau
// ─────────────────────────────────────────────
const ENVOI_REF_KEY = "liste_envoi_derniere_date";
const ENVOI_DEFAULTS_KEY = "export_pdf_defaults";

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

function toComparableDate(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  return str.slice(0, 10);
}

// ─────────────────────────────────────────────
// Modale Bordereau d'envoi intégrée
// ─────────────────────────────────────────────
function EnvoiCandidatsModal({ candidats, onClose }) {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [nomEcole, setNomEcole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [derniereDate, setDerniereDate] = useState(null);

  useEffect(() => {
    try {
      const ref = localStorage.getItem(ENVOI_REF_KEY);
      setDerniereDate(ref || null);
      if (ref) setDateDebut(ref);
      const defaults = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
      setWilaya(defaults.wilaya || "");
      setNomEcole(defaults.nomEcole || "");
    } catch {
      setDerniereDate(null);
    }
  }, []);

  const candidatsFiltresParDate = candidats.filter((c) => {
    const insc = toComparableDate(c._raw?.date_inscription);
    if (!insc || !dateDebut || !dateFin) return false;
    return dateDebut === derniereDate
      ? insc > dateDebut && insc <= dateFin
      : insc >= dateDebut && insc <= dateFin;
  });

  const handleConfirm = async () => {
    setError("");
    if (!dateDebut) return setError("Merci de renseigner la date de début.");
    if (!dateFin) return setError("Merci de choisir la date jusqu'à laquelle inclure les inscrits.");
    if (!wilaya.trim()) return setError("Merci de renseigner la wilaya.");
    if (candidatsFiltresParDate.length === 0) return setError("Aucun nouvel inscrit trouvé sur cette période.");

    setLoading(true);
    try {
      const candidatsPourEnvoi = candidatsFiltresParDate.map((c) => ({
        nomPrenom: `${c.prenom} ${c.nom}`,
        nomPrenomAr: (c._raw?.nom_ar || "") + " " + (c._raw?.prenom_ar || ""),
        dateNaissance: formatDateAr(c._raw?.date_naissance),
        categorie: c.categoriePermis || "",
      }));

      const savedPath = await window.electron.generateListeEnvoiPDF({
        wilaya,
        nomEcole,
        dateDepot: formatDateAr(dateFin),
        candidats: candidatsPourEnvoi,
      });

      if (savedPath) {
        localStorage.setItem(ENVOI_REF_KEY, dateFin);
        localStorage.setItem(ENVOI_DEFAULTS_KEY, JSON.stringify({ wilaya, nomEcole }));
        alert(`لائحة الإرسال enregistrée :\n${savedPath}`);
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du document.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>لائحة الإرسال — نوعي الجديد</h3>
          <button onClick={() => !loading && onClose()} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
          Liste des nouveaux inscrits depuis le dernier envoi — المندوبية الولائية للأمن في الطرق
        </p>

        {derniereDate ? (
          <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#6d28d9" }}>
            Dernière liste envoyée jusqu'au <strong>{derniereDate}</strong>.
          </div>
        ) : (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#c2410c" }}>
            Aucune liste précédente trouvée.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Depuis le <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Jusqu'au <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>الولاية (Wilaya) <span style={{ color: "#dc2626" }}>*</span></label>
            <input type="text" value={wilaya} onChange={(e) => setWilaya(e.target.value)} placeholder="Ex : بجاية / Béjaïa" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Nom de l'auto-école (optionnel)</label>
            <input type="text" value={nomEcole} onChange={(e) => setNomEcole(e.target.value)} placeholder="Ex : Auto-École Essalem" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13.5, outline: "none" }} />
          </div>
        </div>

        <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
          <strong style={{ color: "#1f2937" }}>Nouveaux inscrits trouvés :</strong> {candidatsFiltresParDate.length}
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: "9px 13px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>Annuler</button>
          <button onClick={handleConfirm} disabled={loading} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13.5, opacity: loading ? 0.7 : 1 }}>{loading ? "Génération..." : "Générer لائحة الإرسال"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers pour le reste
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
  const { CAN_VIEW_ALL_CANDIDATES, CAN_REMOVE_CANDIDAT } = useMyPermissions();

  const [search, setSearch] = useState("");
  const [candidats, setCandidats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCandidat, setEditCandidat] = useState(null);
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

          return {
            id:          c.idCandidat,
            nom:         `${c.prenom} ${c.nom}`,
            prenom:      c.prenom,
            tel:         c.telephone,
            sessions:    nbSessions,
            total:       20,
            nextSession,
            status:      c.statut,
            _raw:        c,
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
    if (!CAN_VIEW_ALL_CANDIDATES) return;
    setEditCandidat(null);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    if (!CAN_VIEW_ALL_CANDIDATES) return;
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

  // ── Bordereau d'envoi ──────────────────────────────────────────────────────
  const handleOpenEnvoiModal = () => {
    if (candidats.length === 0) {
      alert("Aucun candidat enregistré pour le moment.");
      return;
    }
    setShowEnvoiModal(true);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const onTrack = candidats.filter((c) => c.sessions / c.total >= 0.5).length;

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
            ? "👥 Accès complet — vous pouvez voir et ajouter des candidats"
            : "🔒 Vue lecture seule — contactez l'admin pour ajouter des candidats"}
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
            <div className="stat-icon-circle-small large-icon"
              style={{ backgroundColor: "rgba(77,163,255,0.15)" }}>
              <Users size={24} color="#4da3ff" />
            </div>
          </div>

          <div className="interactive-stat-card-small large-stat">
            <div className="stat-data">
              <p className="stat-label-small">En bonne voie</p>
              <h3 className="stat-number-small">{onTrack}</h3>
            </div>
            <div className="stat-icon-circle-small large-icon"
              style={{ backgroundColor: "#d4edda" }}>
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
                  ? "Voir, suivre et ajouter des candidats"
                  : "Suivi de la progression de vos candidats"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {CAN_VIEW_ALL_CANDIDATES && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
            <div style={{
              flex: 1,
              background: "#fff",
              padding: "12px 20px",
              borderRadius: "15px",
              display: "flex",
              gap: "15px",
              alignItems: "center",
              border: "1px solid #E2E8F0"
            }}>
              <input
                type="text"
                placeholder="🔍 Rechercher un candidat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #CBD5E0",
                  borderRadius: "10px",
                  outline: "none",
                  fontSize: "14px"
                }}
              />
            </div>
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

                    {/* Next session */}
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
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.07)"}
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

      {/* MODALE AJOUT */}
      {CAN_VIEW_ALL_CANDIDATES && (
        <AddCandidatModal
          showModal={showModal}
          setShowModal={setShowModal}
          candidat={editCandidat}
          onSave={handleSave}
        />
      )}

      {/* MODALE BORDEREAU D'ENVOI */}
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