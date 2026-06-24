import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaThLarge, FaUserFriends, FaCalendarAlt,
  FaMoneyBillWave, FaClipboardList, FaSignOutAlt,
  FaCog, FaUmbrellaBeach,
} from "react-icons/fa";
import SidebarImage from "../../assets/sidebarImage.png";

const SidebarMoniteur = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // ── Pas de "Parametres" ici — il est géré séparément en bas ──
  const menu = [
    { name: "Dashboard",     icon: <FaThLarge />,       path: "/moniteur/dashboard" },
    { name: "Mes Candidats", icon: <FaUserFriends />,   path: "/moniteur/candidat"  },
    { name: "Mes Séances",   icon: <FaCalendarAlt />,   path: "/moniteur/agenda"    },
    { name: "Mes Congés",    icon: <FaUmbrellaBeach />, path: "/moniteur/conges"    },
    { name: "Paiements",     icon: <FaMoneyBillWave />, path: "/moniteur/paiements" },
    { name: "Examens",       icon: <FaClipboardList />, path: "/moniteur/examens"   },
  ];

  const handleLogout = () => navigate("/connexion");

  const NavItem = ({ path, icon, name }) => {
    const isActive = location.pathname === path;
    return (
      <Link to={path} style={{ textDecoration: "none", color: "inherit" }}>
        <li style={{
          position: "relative",
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 18px",
          color: isActive ? "white" : "#94a3b8",
          background: isActive ? "rgba(77,163,255,0.12)" : "transparent",
          cursor: "pointer", fontSize: 13,
          whiteSpace: "nowrap", overflow: "hidden",
          transition: "color 0.2s, background 0.2s",
          listStyle: "none",
        }}>
          {/* Barre active */}
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: isActive ? 4 : 0, height: "100%",
            background: "#4da3ff", transition: "width 0.2s",
          }} />
          <span style={{
            fontSize: 15, flexShrink: 0, width: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isActive ? "#4da3ff" : "inherit",
          }}>
            {icon}
          </span>
          <span style={{ opacity: collapsed ? 0 : 1, transition: "opacity 0.18s" }}>
            {name}
          </span>
          {/* Tooltip quand replié */}
          {collapsed && (
            <span style={{
              position: "absolute", left: 68, top: "50%",
              transform: "translateY(-50%)",
              background: "#0f172a", color: "white",
              fontSize: 12, fontWeight: 500,
              padding: "5px 10px", borderRadius: 7,
              whiteSpace: "nowrap", pointerEvents: "none", zIndex: 200,
            }}>
              {name}
            </span>
          )}
        </li>
      </Link>
    );
  };

  return (
    <div style={{
      width: collapsed ? "62px" : "235px",
      height: "100vh",
      background: "#1e293b",
      position: "relative",
      overflow: "visible",
      flexShrink: 0,
      transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
      boxShadow: "4px 0 12px rgba(0,0,0,0.25)",
    }}>

      {/* ── Bouton toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Ouvrir" : "Réduire"}
        style={{
          position: "absolute", top: 72, right: -12,
          width: 24, height: 24,
          background: "white", border: "2px solid #1e293b",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 100, padding: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
          transition: "background 0.2s, border-color 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#4da3ff";
          e.currentTarget.style.borderColor = "#4da3ff";
          e.currentTarget.querySelector("svg").style.stroke = "white";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.borderColor = "#1e293b";
          e.currentTarget.querySelector("svg").style.stroke = "#1e293b";
        }}
      >
        <svg viewBox="0 0 10 10" style={{
          width: 10, height: 10, stroke: "#1e293b",
          fill: "none", strokeWidth: 2.5,
          strokeLinecap: "round", strokeLinejoin: "round",
          transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <polyline points="4,2 7,5 4,8" />
        </svg>
      </button>

      {/* ── Contenu ── */}
      <div style={{
        width: "100%", height: "100%", overflow: "hidden",
        display: "flex", flexDirection: "column",
        padding: "24px 0 16px", color: "white",
      }}>

        {/* Brand */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 16px", marginBottom: 28,
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          <div style={{
            width: 30, height: 30, background: "#4da3ff",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}>M</div>
          <span style={{
            fontSize: 14, fontWeight: 600,
            opacity: collapsed ? 0 : 1, transition: "opacity 0.18s",
            whiteSpace: "nowrap",
          }}>
            Espace <span style={{ color: "#4da3ff" }}>Moniteur</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {menu.map(item => (
              <NavItem key={item.name} {...item} />
            ))}
          </ul>

          {/* Séparateur */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 16px" }} />

          {/* ── Paramètres — lien unique vers /moniteur/parametres ── */}
          <NavItem path="/moniteur/parametres" icon={<FaCog />} name="Paramètres" />
        </nav>

        {/* Footer logout */}
        <div style={{
          position: "relative", padding: "0 10px", height: 160,
          display: "flex", flexDirection: "column",
          justifyContent: "flex-end", marginTop: "auto", overflow: "hidden",
        }}>
          <div
            onClick={handleLogout}
            style={{
              background: "rgba(228,76,60,0.1)",
              border: "1px solid rgba(228,76,60,0.2)",
              borderRadius: 10, padding: "10px 8px", marginBottom: 16,
              cursor: "pointer", position: "relative", zIndex: 10,
              overflow: "hidden", transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#E44C3C"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(228,76,60,0.1)"}
          >
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, whiteSpace: "nowrap",
            }}>
              <FaSignOutAlt style={{ color: "#E44C3C", fontSize: 14, flexShrink: 0 }} />
              <span style={{
                color: "#E44C3C", fontSize: 13, fontWeight: 600,
                opacity: collapsed ? 0 : 1, transition: "opacity 0.18s",
              }}>
                Déconnexion
              </span>
            </div>
          </div>
          <img src={SidebarImage} alt="" style={{
            position: "absolute", bottom: -20, left: 0,
            width: "100%", opacity: 0.1, zIndex: 1,
            pointerEvents: "none", filter: "grayscale(100%)",
          }} />
        </div>

      </div>
    </div>
  );
};

export default SidebarMoniteur;