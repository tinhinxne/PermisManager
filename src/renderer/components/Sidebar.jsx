import React, { useState } from "react";
import "./Sidebar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaThLarge, FaUserFriends, FaUserTie, FaCalendarAlt,
  FaFileAlt, FaCreditCard, FaSignOutAlt, FaCog, FaChevronRight
} from "react-icons/fa";
import SidebarImage from "../../assets/sidebarImage.png";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menu = [
    { name: "Dashboard", icon: <FaThLarge />,     path: "/dashboard" },
    { name: "Candidats", icon: <FaUserFriends />, path: "/candidats" },
    { name: "Moniteur",  icon: <FaUserTie />,     path: "/moniteur"  },
    { name: "Agenda",    icon: <FaCalendarAlt />, path: "/agenda"    },
    { name: "Examens",   icon: <FaFileAlt />,     path: "/examens"   },
    { name: "Paiements",  icon: <FaCreditCard />,  path: "/payments"  },
  ];

  const handleLogout = () => navigate("/connexion");

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>

      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Ouvrir" : "Réduire"}
      >
        <FaChevronRight className="toggle-icon" />
      </button>

      <div className="sidebar-inner">

        <div className="sidebar-brand">
          <div className="brand-icon">A</div>
          <span className="brand-text">
            Auto<span>École</span> Pro
          </span>
        </div>

        <nav className="sidebar-nav">
          <ul className="menu">
            {menu.map((item) => (
              <Link to={item.path} key={item.name} className="menu-link">
                <li className={`menu-item ${location.pathname === item.path ? "active" : ""}`}>
                  <div className="active-indicator" />
                  <span className="icon">{item.icon}</span>
                  <span className="text">{item.name}</span>
                  {collapsed && (
                    <span className="sidebar-tooltip">{item.name}</span>
                  )}
                </li>
              </Link>
            ))}
          </ul>

          <div className="separator" />

          <Link to="/parametres" className="menu-link">
            <li className={`menu-item ${location.pathname === "/parametres" ? "active" : ""}`}>
              <div className="active-indicator" />
              <span className="icon"><FaCog /></span>
              <span className="text">Paramètres</span>
              {collapsed && (
                <span className="sidebar-tooltip">Paramètres</span>
              )}
            </li>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="logout-card" onClick={handleLogout}>
            <div className="logout-btn">
              <FaSignOutAlt className="logout-icon" />
              <span className="logout-text">Quitter</span>
            </div>
          </div>
          <img src={SidebarImage} alt="" className="footer-bg-img" />
        </div>

      </div>
    </div>
  );
};

export default Sidebar;