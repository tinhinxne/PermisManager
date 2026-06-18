import React, { useEffect, useState } from "react";
import {
  FaUserFriends, FaCar, FaCalendarCheck,
  FaCheckCircle, FaClock,
} from "react-icons/fa";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth } from "../context/AuthContext";
import "../../styles/DashboardMoniteur.css";

const DashboardMoniteur = () => {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState({
    totalCandidats:    0,
    seancesAujourdhui: 0,
    seancesSemaine:    0,
    seancesTerminees:  0,
  });
  const [prochaines, setProchaines] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [erreur, setErreur]         = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);
    window.electron.getMoniteurStats(currentUser.id)
      .then((result) => {
        if (result.success) {
          const { totalCandidats, seancesAujourdhui,
                  seancesSemaine, seancesTerminees,
                  prochainesSeances } = result.data;
          setStats({ totalCandidats, seancesAujourdhui,
                     seancesSemaine, seancesTerminees });
          setProchaines(prochainesSeances);
        } else {
          setErreur(result.error);
        }
      })
      .catch((e) => setErreur(e.message))
      .finally(() => setLoading(false));

  }, [currentUser?.id]);

  const statCards = [
    { label: "Mes étudiants",        value: stats.totalCandidats,    icon: <FaUserFriends />, color: "#1a1a2e" },
    { label: "Séances Aujourd'hui",  value: stats.seancesAujourdhui, icon: <FaCar />,         color: "#10b981" },
    { label: "Cette semaine",        value: stats.seancesSemaine,    icon: <FaCalendarCheck />,color: "#f59e0b" },
    { label: "Terminées",            value: stats.seancesTerminees,  icon: <FaCheckCircle />, color: "#8b5cf6" },
  ];

  // ── Formatage date lisible : "2025-04-25" → "25/04/2025"
  const formatDate = (raw) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d) ? raw : d.toLocaleDateString("fr-FR");
  };

  return (
    <div className="dashboard-moniteur-container">
      <div className="main-content-wrapper">

        {/* Header */}
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="" width={40} />
            Panneau de contrôle de l'auto-école
          </h1>
          <p>Bienvenue, {currentUser?.prenom} {currentUser?.nom}</p>
        </div>

        <div className="dashboard-content-body">
          <div className="welcome-section">
            <h2 className="welcome-title">Tableau de bord du moniteur</h2>
            <p className="welcome-subtitle">
              Bon retour ! Voici votre emploi du temps pour aujourd'hui.
            </p>
          </div>

          {/* ── Cartes stats ── */}
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
                  <div
                    className="stat-icon-circle-small"
                    style={{ backgroundColor: stat.color }}
                  >
                    {stat.icon}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Prochaines séances + Infos ── */}
          <div className="info-grid-columns">

            {/* Prochaines séances */}
            <div className="content-column sessions-theme">
              <h3 className="column-header">
                <FaClock /> Prochaines séances
              </h3>
              {loading ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>Chargement…</p>
              ) : prochaines.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>
                  Aucune séance à venir.
                </p>
              ) : (
                prochaines.map((s) => (
                  <div key={s.idSeance} className="interactive-item-card">
                    <div className="item-details">
                      <strong>{s.candidatsNoms || "—"}</strong>
                      <p>
                        {formatDate(s.date)} • {s.heure} • {s.type}
                      </p>
                    </div>
                    <span className="badge-today">{s.statut}</span>
                  </div>
                ))
              )}
            </div>

            {/* Infos */}
            <div className="content-column alerts-theme">
              <h3 className="column-header">
                <FaUserFriends /> Infos
              </h3>
              <div className="interactive-item-card alert-layout">
                <div className="status-dot dot-orange" />
                <div className="item-details">
                  <strong>Permissions</strong>
                  <p>Contactez l'admin pour modifier vos accès</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMoniteur;