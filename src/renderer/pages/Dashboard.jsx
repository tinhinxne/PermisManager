import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  FiUsers, FiActivity, FiCalendar, FiClock,
  FiUserPlus, FiPlusCircle, FiDollarSign,
  FiClipboard, FiSettings
} from "react-icons/fi";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/Dashboard.css";

import { useExamenCtx } from "../context/ExamenContext";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const statutColor = (statut) => {
  if (!statut) return { bg: "#F1F5F9", color: "#64748B" };
  const s = statut.toLowerCase();
  if (s === "planifiée" || s === "planifiee") return { bg: "#EFF6FF", color: "#3B82F6" };
  if (s === "terminée"  || s === "terminee")  return { bg: "#F0FDF4", color: "#16A34A" };
  return { bg: "#FFF7ED", color: "#EA580C" };
};

const TYPE_COLORS = {
  Code:        { bg: "#EFF6FF", color: "#3B82F6" },
  Créneau:     { bg: "#FFF7ED", color: "#EA580C" },
  Circulation: { bg: "#F0FDF4", color: "#16A34A" },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { examensList, generateExamens } = useExamenCtx();

  const [stats, setStats]                       = useState({ totalCandidats: 0, sessionsToday: 0, revenuMois: 0 });
  const [seances, setSeances]                   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [revenusData, setRevenusData]           = useState([]);
  const [seancesData, setSeancesData]           = useState([]);

  // Examens à venir = status "Scheduled", triés par date
  const examensAVenir = examensList
    .filter(e => e.status === "Scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  useEffect(() => {
    // Génère les examens automatiquement au chargement du dashboard
    async function loadAll() {
      try {
        const [s, allSeances, revenus, seancesMois, candidats] = await Promise.all([
          window.electron.getDashboardStats(),
          window.electron.getSeances(),
          window.electron.getRevenusMensuels(),
          window.electron.getSeancesMois(),
          window.electron.getCandidats(),
        ]);
        setStats(s ?? { totalCandidats: 0, sessionsToday: 0, revenuMois: 0 });
        setSeances((allSeances ?? []).slice(0, 5));
        setRevenusData(revenus    ?? []);
        setSeancesData(seancesMois ?? []);

        // Génère les examens depuis les séances et candidats réels
        if (allSeances && candidats) {
          generateExamens(allSeances, candidats);
        }
      } catch (err) {
        console.error("Erreur dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const cardData = [
    {
      label: "Nombre total de candidats",
      val: loading ? "…" : String(stats.totalCandidats ?? 0),
      trend: null,
      color: "blue",
      icon: <FiUsers />
    },
    {
      label: "Sessions aujourd'hui",
      val: loading ? "…" : String(stats.sessionsToday ?? 0),
      trend: null,
      color: "green",
      icon: <FiActivity />
    },
    {
      label: "Examens à venir",
      val: loading ? "…" : String(examensAVenir.length),
      trend: examensAVenir.length > 0 ? `Prochain : ${examensAVenir[0]?.date ?? "—"}` : "Aucun programmé",
      color: "red",
      icon: <FiCalendar />
    },
    {
      label: "Revenu mensuel",
      val: loading ? "…" : `${Number(stats.revenuMois ?? 0).toLocaleString("fr-DZ")} DA`,
      trend: null,
      color: "orange",
      icon: <FiActivity />
    }
  ];

  const quickActions = [
    {
      label: "Ajouter un candidat",
      icon: <FiUserPlus size={22} />,
      color: "#3B82F6",
      bg: "#EFF6FF",
      action: () => navigate("/candidats"),
    },
    {
      label: "Ajouter une séance",
      icon: <FiPlusCircle size={22} />,
      color: "#16A34A",
      bg: "#F0FDF4",
      action: () => navigate("/agenda"),
    },
    {
      label: "Ajouter un paiement",
      icon: <FiDollarSign size={22} />,
      color: "#EA580C",
      bg: "#FFF7ED",
      action: () => navigate("/payments"),
    },
    {
      label: "Voir les examens",
      icon: <FiClipboard size={22} />,
      color: "#7C3AED",
      bg: "#F5F3FF",
      action: () => navigate("/examens"),
    },
  ];

  return (
    <div className="dashboard-wrapper">

      {/* ── TOPBAR ── */}
      <div className="dashboard-topbar">
        <span className="topbar-title">Tableau de bord</span>
        <motion.button
          className="settings-btn"
          onClick={() => navigate("/parametres")}
          whileHover={{ rotate: 45, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300 }}
          title="Paramètres"
        >
          <FiSettings size={20} />
        </motion.button>
      </div>

      {/* ── BANNIÈRE ── */}
      <motion.div
        className="header-banner-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="" width={40} /> Panneau de contrôle de l'auto-école
          </h1>
          <p>Gérer les étudiants, les leçons et les examens de conduite</p>
        </div>
      </motion.div>

      {/* ── WELCOME ── */}
      <motion.div className="welcome-section" {...fadeInUp}>
        <h2>Tableau de bord de l'administrateur</h2>
        <p>Bon retour ! Voici votre emploi du temps pour aujourd'hui.</p>
      </motion.div>

      {/* ── ACTIONS RAPIDES ── */}
      <motion.div
        className="quick-actions-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
      >
        <button
          className={`qa-toggle-btn ${showQuickActions ? "open" : ""}`}
          onClick={() => setShowQuickActions(prev => !prev)}
        >
          <span className="qa-toggle-left">
            <span className="qa-toggle-icon">⚡</span>
            Actions rapides
          </span>
          <motion.span
            className="qa-toggle-arrow"
            animate={{ rotate: showQuickActions ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            ▾
          </motion.span>
        </button>

        <motion.div
          className="quick-actions-grid"
          initial={false}
          animate={
            showQuickActions
              ? { height: "auto", opacity: 1, marginTop: 14 }
              : { height: 0,      opacity: 0, marginTop: 0  }
          }
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {quickActions.map((qa, i) => (
            <motion.button
              key={i}
              className="quick-action-card"
              style={{ "--qa-color": qa.color, "--qa-bg": qa.bg }}
              onClick={qa.action}
              whileHover={{ y: -6, scale: 1.04, boxShadow: `0 8px 24px ${qa.color}30` }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 18 }}
              animate={showQuickActions ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ delay: showQuickActions ? i * 0.07 : 0 }}
            >
              <span className="qa-icon">{qa.icon}</span>
              <span className="qa-label">{qa.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* ── STAT CARDS ── */}
      <div className="stats-grid">
        {cardData.map((item, i) => (
          <motion.div
            key={i}
            className="stat-card-modern"
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="stat-left">
              <span className="stat-label">{item.label}</span>
              <span className="stat-value">{item.val}</span>
              {item.trend && (
                <span className={`stat-trend ${item.color}`}>{item.trend}</span>
              )}
            </div>
            <div className={`stat-icon ${item.color}`}>{item.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* ── GRAPHIQUES ── */}
      <div className="charts-main-grid">

        <motion.div className="chart-box blue-bg" {...fadeInUp} transition={{ delay: 0.4 }}>
          <h3>Aperçu des revenus</h3>
          {revenusData.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, paddingTop: 16 }}>
              Aucun versement enregistré.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="n" tick={{ fill: "#fff" }} axisLine={false} />
                <YAxis tick={{ fill: "#fff" }} axisLine={false} />
                <Tooltip
                  formatter={(val) => [`${Number(val).toLocaleString("fr-DZ")} DA`, "Revenus"]}
                  contentStyle={{ borderRadius: "12px", border: "none", color: "#1e293b" }}
                  cursor={{ stroke: "#fff", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#fff"
                  fillOpacity={0.4}
                  fill="#fff"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div className="chart-box blue-bg" {...fadeInUp} transition={{ delay: 0.5 }}>
          <h3>Sessions de ce mois</h3>
          {seancesData.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, paddingTop: 16 }}>
              Aucune séance ce mois-ci.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seancesData}>
                <XAxis dataKey="n" tick={{ fill: "#fff" }} axisLine={false} />
                <Tooltip
                  formatter={(val) => [val, "Séances"]}
                  cursor={{ fill: "rgba(255,255,255,0.1)" }}
                />
                <Bar dataKey="v" fill="#065F46" radius={[6, 6, 0, 0]} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

      </div>

      {/* ── LISTES BAS DE PAGE ── */}
      <div className="bottom-sections">

        {/* Examens à venir — données réelles depuis ExamenContext */}
        <motion.div className="list-container blue-container" {...fadeInUp} transition={{ delay: 0.6 }}>
          <h3>
            <FiCalendar /> Examens à venir
            {examensAVenir.length > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 12, background: "#EFF6FF",
                color: "#3B82F6", padding: "2px 10px", borderRadius: 20, fontWeight: 600,
              }}>
                {examensAVenir.length}
              </span>
            )}
          </h3>

          {loading && <p style={{ color: "#94A3B8", fontSize: 14 }}>Chargement…</p>}

          {!loading && examensAVenir.length === 0 && (
            <p style={{ color: "#94A3B8", fontSize: 14 }}>
              Aucun examen programmé. Allez dans la page Examens pour générer.
            </p>
          )}

          {!loading && examensAVenir.map((examen, i) => {
            const tc = TYPE_COLORS[examen.type] ?? { bg: "#F1F5F9", color: "#64748B" };
            return (
              <motion.div
                key={examen.id ?? i}
                className="modern-item-row"
                whileHover={{ x: 10, backgroundColor: "#fff" }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/examens")}
              >
                <div className="item-details">
                  <strong>{examen.candidat}</strong>
                  <span>{examen.date} à {examen.heure} — {examen.lieu}</span>
                </div>
                <span
                  className="type-badge"
                  style={{ background: tc.bg, color: tc.color, border: "none" }}
                >
                  {examen.type}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Activité récente — données réelles */}
        <motion.div className="list-container blue-container" {...fadeInUp} transition={{ delay: 0.7 }}>
          <h3><FiClock /> Activité récente (séances)</h3>

          {loading && <p style={{ color: "#94A3B8", fontSize: 14 }}>Chargement…</p>}

          {!loading && seances.length === 0 && (
            <p style={{ color: "#94A3B8", fontSize: 14 }}>Aucune séance enregistrée.</p>
          )}

          {!loading && seances.map((s) => {
            const { bg, color } = statutColor(s.statut);
            return (
              <motion.div
                key={s.idSeance}
                className="modern-item-row"
                whileHover={{ x: 10, backgroundColor: "#fff" }}
              >
                <div className="activity-flex">
                  <div className="blue-dot"></div>
                  <div className="item-details">
                    <strong>
                      Séance {s.type} — {s.moniteurNom ?? "Moniteur inconnu"}
                    </strong>
                    <span>
                      {new Date(s.date).toLocaleDateString("fr-FR")} à {s.heure}
                      {s.candidatsNoms ? ` · ${s.candidatsNoms}` : ""}
                    </span>
                  </div>
                </div>
                <span
                  className="type-badge"
                  style={{ background: bg, color, border: "none" }}
                >
                  {s.statut}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;