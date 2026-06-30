import React, { useEffect, useState } from "react";
import {
  FaUserFriends, FaCar, FaCalendarCheck,
  FaCheckCircle, FaClock, FaCommentDots,
} from "react-icons/fa";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth }          from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import { useNavigate }      from "react-router-dom";
import "../../styles/DashboardMoniteur.css";

const PERM_LABELS = [
  { key: "CAN_VIEW_ALL_CANDIDATES",    label: "Voir tous les candidats"          },
  { key: "CAN_ADD_CANDIDAT",           label: "Ajouter un candidat"              },
  { key: "CAN_REMOVE_CANDIDAT",        label: "Supprimer un candidat"            },
  { key: "CAN_ADD_SESSION",            label: "Gérer les séances"                },
  { key: "CAN_ADD_PAYMENT",            label: "Enregistrer un paiement"          },
  { key: "CAN_TOGGLE_STATUS",          label: "Modifier le résultat d'un examen" },
  { key: "CAN_EXPORT_LISTE_CANDIDATS", label: "Générer قائمة المترشحين"         },
  { key: "CAN_REQUEST_CONGE",          label: "Demander un congé"                },
];

const DashboardMoniteur = () => {
  const { currentUser } = useAuth();
  const permissions     = useMyPermissions();
  const navigate        = useNavigate();

  const [stats, setStats] = useState({
    totalCandidats: 0, seancesAujourdhui: 0,
    seancesSemaine: 0, seancesTerminees:  0,
  });
  const [prochaines, setProchaines] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [erreur,  setErreur]        = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    console.log("ID utilisé pour les stats:", currentUser.id); // ← ajoute ça
    setLoading(true);
    window.electron.getMoniteurStats(currentUser.id)
      .then((result) => {
        if (result.success) {
          const { totalCandidats, seancesAujourdhui, seancesSemaine,
                  seancesTerminees, prochainesSeances } = result.data;
          setStats({ totalCandidats, seancesAujourdhui, seancesSemaine, seancesTerminees });
          setProchaines(prochainesSeances);
        } else {
          setErreur(result.error);
        }
      })
      .catch((e) => setErreur(e.message))
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  const statCards = [
    { label: "Mes étudiants",       value: stats.totalCandidats,    icon: <FaUserFriends />, color: "#1a1a2e" },
    { label: "Séances Aujourd'hui", value: stats.seancesAujourdhui, icon: <FaCar />,          color: "#10b981" },
    { label: "Cette semaine",       value: stats.seancesSemaine,    icon: <FaCalendarCheck />,color: "#f59e0b" },
    { label: "Terminées",           value: stats.seancesTerminees,  icon: <FaCheckCircle />,  color: "#8b5cf6" },
  ];

  const formatDate = (raw) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d) ? raw : d.toLocaleDateString("fr-FR");
  };

  // ── Uniquement les permissions actives ──────────────────────────────────────
  const activePerms = PERM_LABELS.filter(p => !!permissions[p.key]);

  return (
    <div className="dashboard-moniteur-container">
      <div className="main-content-wrapper">

        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1><img src={SmallCar} alt="" width={40} /> Panneau de contrôle de l'auto-école</h1>
          <p>Bienvenue, {currentUser?.prenom} {currentUser?.nom}</p>
        </div>

        <div className="dashboard-content-body">
          <div className="welcome-section">
            <h2 className="welcome-title">Tableau de bord du moniteur</h2>
            <p className="welcome-subtitle">Bon retour ! Voici votre emploi du temps pour aujourd'hui.</p>
          </div>

          {loading ? (
            <p style={{ color: "#94a3b8" }}>Chargement des statistiques…</p>
          ) : erreur ? (
            <p style={{ color: "#ef4444" }}>Erreur : {erreur}</p>
          ) : (
            <div className="stats-row-layout">
              {statCards.map((stat, index) => (
                <div key={index} className="interactive-stat-card-small">
                  <div className="stat-data">
                    <p className="stat-label-small">{stat.label}</p>
                    <h3 className="stat-number-small">{stat.value}</h3>
                  </div>
                  <div className="stat-icon-circle-small" style={{ backgroundColor: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="info-grid-columns">

            {/* Prochaines séances */}
            <div className="content-column sessions-theme">
              <h3 className="column-header"><FaClock /> Prochaines séances</h3>
              {loading ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Chargement…</p>
              ) : prochaines.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Aucune séance à venir.</p>
              ) : (
                prochaines.map((s) => (
                  <div key={s.idSeance} className="interactive-item-card">
                    <div className="item-details">
                      <strong>{s.candidatsNoms || "—"}</strong>
                      <p>{formatDate(s.date)} • {s.heure} • {s.type}</p>
                    </div>
                    <span className="badge-today">{s.statut}</span>
                  </div>
                ))
              )}
            </div>

            {/* ── Permissions ── */}
            <div className="content-column alerts-theme">
              <h3 className="column-header"><FaUserFriends /> Mes permissions</h3>

              {activePerms.length === 0 ? (
                /* Aucune permission active */
                <div style={{
                  padding: "14px 12px", borderRadius: 10,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    Aucune permission accordée
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                    Contactez l'administrateur pour obtenir des accès
                  </div>
                </div>
              ) : (
                /* Liste des permissions actives uniquement */
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {activePerms.map(({ key, label }) => (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 10px", borderRadius: 8,
                      background: "rgba(34,197,94,0.05)",
                      border: "1px solid rgba(34,197,94,0.18)",
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: "#22c55e",
                        boxShadow: "0 0 0 2px rgba(34,197,94,0.2)",
                      }} />
                      <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 600, flex: 1 }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "2px 7px", borderRadius: 20,
                        background: "rgba(34,197,94,0.1)", color: "#166534",
                      }}>
                        Autorisé
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton contacter l'admin */}
              <button
                onClick={() => navigate("/moniteur/parametres", { state: { openContactModal: true } })}
                style={{
                  marginTop: 12, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "9px 0", borderRadius: 9,
                  border: "1px solid #2b537e", background: "white",
                  color: "#2b537e", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(43,83,126,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}
              >
                <FaCommentDots size={13} />
                Demander une modification à l'administrateur
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMoniteur;