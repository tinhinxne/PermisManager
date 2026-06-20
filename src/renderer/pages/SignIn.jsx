import React, { useState } from 'react';
import '../../styles/SignIn.css';
import CarImage from '../../assets/Car.png';
import { useNavigate } from "react-router-dom";
import { Ban, Eye, EyeOff } from 'lucide-react';
import { useAuth } from "../context/AuthContext";

const SteeringWheelIcon = () => (
  <svg
    className="signin-card__app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="9" />
    <line x1="4.22" y1="6.22" x2="9.17" y2="9.17" />
    <line x1="19.78" y1="6.22" x2="14.83" y2="9.17" />
    <line x1="12" y1="22" x2="12" y2="15" />
    <line x1="4.22" y1="17.78" x2="9.17" y2="14.83" />
    <line x1="19.78" y1="17.78" x2="14.83" y2="14.83" />
  </svg>
);

const EmailIcon = () => (
  <svg
    className="signin-form__field-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0
      2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const LockIcon = () => (
  <svg
    className="signin-form__field-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1
      0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9
      2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2
      2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71
      1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

// ── Popup compte inactif ──────────────────────────────────────────────────────
const InactivePopup = ({ onClose }) => (
  <div style={{
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  }}>
    <div style={{
      backgroundColor: '#f7e5e4',
      borderRadius: '12px',
      padding: '36px 40px',
      maxWidth: '380px',
      width: '90%',
      border: 'solid 3px #c0392b ',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div>
        <Ban color="#c0392b" size={32}/>
      </div>

      <h2 style={{
        color: '#0d0a0a',
        fontSize: '18px',
        fontWeight: '700',
        margin: '0 0 12px',
      }}>
        Compte inactif
      </h2>

      <p style={{
        color: '#261816',
        fontSize: '14px',
        lineHeight: '1.6',
        margin: '0 0 28px',
      }}>
        Votre compte est inactif.<br />
        Impossible de vous connecter.
      </p>

      <button
        onClick={onClose}
        style={{
          backgroundColor: '#fff',
          color: '#c0392b',
          border: 'solid 2px #c0392b',
          borderRadius: '8px',
          padding: '10px 28px',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
        }}
      >
        Fermer
      </button>
    </div>
  </div>
);
const LockedPopup = ({ minutes, onClose }) => (
  <div style={{
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  }}>
    <div style={{
      backgroundColor: '#fdf2e9',
      borderRadius: '12px',
      padding: '36px 40px',
      maxWidth: '380px',
      width: '90%',
      border: 'solid 3px #e67e22',
      textAlign: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <h2 style={{
        color: '#0d0a0a',
        fontSize: '18px',
        fontWeight: '700',
        margin: '0 0 12px',
      }}>
        Compte bloqué
      </h2>

      <p style={{
        color: '#261816',
        fontSize: '14px',
        lineHeight: '1.6',
        margin: '0 0 28px',
      }}>
        Trop de tentatives échouées.<br />
        Réessayez dans {minutes} minute{minutes > 1 ? 's' : ''}.<br />
        Un email vous a été envoyé.
      </p>

      <button
        onClick={onClose}
        style={{
          backgroundColor: '#fff',
          color: '#e67e22',
          border: 'solid 2px #e67e22',
          borderRadius: '8px',
          padding: '10px 28px',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
        }}
      >
        Fermer
      </button>
    </div>
  </div>
);

export default function SignIn() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showInactivePopup, setShowInactivePopup] = useState(false);

  // 👇 AJOUTE ÇA
  const [showPassword, setShowPassword] = useState(false);
const [showLockedPopup, setShowLockedPopup] = useState(false);
const [lockMinutes, setLockMinutes] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await window.electron.login({ email, password });

     if (response.success) {
  login(response.user);
  localStorage.setItem("user", JSON.stringify(response.user));

  if (response.user.type_utilisateur === "moniteur") {
    navigate("/moniteur/dashboard");
  } else {
    navigate("/dashboard");
  }
} else if (response.locked) {
  setLockMinutes(response.minutesRestantes);
  setShowLockedPopup(true);
} else if (response.inactive) {
  setShowInactivePopup(true);
} else {
  alert(response.message || "Identifiants invalides");
}
    } catch (error) {
      console.error("Erreur lors de la tentative de connexion :", error);
      alert("Impossible de contacter la base de données.");
    }
  };

  return (
    <div
      className="signin-page"
      style={{ backgroundImage: `url(${CarImage})` }}
    >

      {/* ── Popup compte inactif ── */}
      {showInactivePopup && (
        <InactivePopup onClose={() => setShowInactivePopup(false)} />
      )}
        {/* ── Popup compte bloqué ── */}
      {showLockedPopup && (
        <LockedPopup minutes={lockMinutes} onClose={() => setShowLockedPopup(false)} />
      )}
      {/* ── Images de fond ── */}
      <img
        src="../../assets/Car.png"
        alt=""
        aria-hidden="true"
        className="signin-page__bg-image signin-page__bg-image--instructor"
      />

      <img
        src="../../assets/Car.png"
        alt=""
        aria-hidden="true"
        className="signin-page__bg-image signin-page__bg-image--car"
      />

      {/* ── Carte de connexion ── */}
      <div className="signin-card">

        {/* Logo + nom appli */}
        <div className="signin-card__app-header">
          <SteeringWheelIcon />
          <span className="signin-card__app-title">
            Ecole de Conduite
          </span>
        </div>

        {/* Titre */}
        <h1 className="signin-card__title">Connexion</h1>

        {/* Sous titre */}
        <div className="signin-card__subtitle-band">
          <p className="signin-card__subtitle">
            Connectez-vous à votre compte
          </p>
        </div>

        {/* Formulaire */}
        <form className="signin-form" onSubmit={handleSubmit}>

          {/* Email */}
          <div className="signin-form__field">
            <EmailIcon />

            <input
              className="signin-form__input"
              type="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div
            className="signin-form__field"
            style={{ position: "relative" }}
          >
            <LockIcon />

            <input
              className="signin-form__input"
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {/* 👁️ Icône oeil */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {/* Mot de passe oublié */}
          <div className="signin-form__forgot">
           <span onClick={() => navigate("/forgot-password")} 
  className="signin-form__forgot-link" style={{ cursor: "pointer" }}>
  Mot de passe oublié ?
</span>
          </div>

          {/* Bouton */}
          <button
            type="submit"
            className="signin-form__submit"
          >
            Se connecter
          </button>

        </form>
      </div>
    </div>
  );
}