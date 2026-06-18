import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CarImage from '../../assets/Car.png';
import '../../styles/SignIn.css';

const SteeringWheelIcon = () => (
  <svg className="signin-card__app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg className="signin-form__field-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const KeyIcon = () => (
  <svg className="signin-form__field-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

const LockIcon = () => (
  <svg className="signin-form__field-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(1);
  const [email, setEmail]           = useState("");
  const [code, setCode]             = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [sentTo, setSentTo] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await window.electron.forgotPasswordSendOtp({ email });
    setLoading(false);
    if (res.success) setStep(2);
    if (res.success) {
  setSentTo(res.isAdmin ? maskEmail(res.recoveryEmail) : maskEmail(email));
  setStep(2);
}
    else setError(res.message);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await window.electron.forgotPasswordVerifyOtp({ email, code });
    setLoading(false);
    if (res.success) setStep(3);
    else setError(res.message);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) return setError("Les mots de passe ne correspondent pas.");
    if (newPwd.length < 6)     return setError("Minimum 6 caractères.");
    setError(""); setLoading(true);
    const res = await window.electron.forgotPasswordReset({ email, newPassword: newPwd });
    setLoading(false);
    if (res.success) navigate("/", { state: { successMsg: "Mot de passe mis à jour !" } });
    else setError(res.message);
  };

  const stepLabels = ["Email", "Vérification", "Nouveau mot de passe"];
  function maskEmail(e) {
  const [user, domain] = e.split("@");
  return user.slice(0, 2) + "***@" + domain;
}

  return (
    <div className="signin-page" style={{ backgroundImage: `url(${CarImage})` }}>

      <div className="signin-card">

        {/* Logo */}
        <div className="signin-card__app-header">
          <SteeringWheelIcon />
          <span className="signin-card__app-title">Ecole de Conduite</span>
        </div>

        {/* Titre */}
        <h1 className="signin-card__title">
          {step === 1 ? "Mot de passe oublié" : step === 2 ? "Vérification" : "Nouveau mot de passe"}
        </h1>

        {/* Bandeau sous-titre avec fil d'étapes */}
        <div className="signin-card__subtitle-band">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
            {[1, 2, 3].map((s, i) => (
              <React.Fragment key={s}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    background: step >= s ? "#4E96E1" : "rgba(255,255,255,0.2)",
                    color: "#fff",
                    border: step === s ? "2px solid #fff" : "2px solid transparent",
                    transition: "all 0.3s",
                  }}>{s}</div>
                  <span style={{ fontSize: 10, color: step >= s ? "#fff" : "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                    {stepLabels[i]}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{
                    width: 40, height: 2, margin: "0 4px", marginBottom: 18,
                    background: step > s ? "#fff" : "rgba(255,255,255,0.25)",
                    transition: "background 0.3s",
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.4)",
            borderRadius: 8, padding: "10px 14px", color: "#f87171",
            fontSize: 13, marginBottom: 14, textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* ── Étape 1 : Email ── */}
        {step === 1 && (
          <form className="signin-form" onSubmit={handleSendOtp}>
            <div className="signin-form__field">
              <EmailIcon />
              <input
                className="signin-form__input"
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className="signin-form__submit" disabled={loading}>
              {loading ? "Envoi en cours..." : "Envoyer le code"}
            </button>
          </form>
        )}

        {/* ── Étape 2 : Code OTP ── */}
        {step === 2 && (
          <form className="signin-form" onSubmit={handleVerifyOtp}>
            <p style={{ color: "#888", fontSize: 12, textAlign: "center", margin: "0 0 12px" }}>
Code envoyé à <strong style={{ color: "#4E96E1" }}>{sentTo}</strong>
            </p>
            <div className="signin-form__field" style={{ justifyContent: "center" }}>
              <KeyIcon />
              <input
                className="signin-form__input"
                type="text"
                placeholder="_ _ _ _ _ _"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                required
                style={{ letterSpacing: 6, textAlign: "center", fontSize: 20, fontWeight: 700 }}
              />
            </div>
            <button type="submit" className="signin-form__submit" disabled={loading}>
              {loading ? "Vérification..." : "Valider le code"}
            </button>
            <button type="button" onClick={() => { setStep(1); setCode(""); setError(""); }}
              style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", marginTop: 6, width: "100%", textAlign: "center" }}>
              ← Renvoyer le code
            </button>
          </form>
        )}

        {/* ── Étape 3 : Nouveau mot de passe ── */}
        {step === 3 && (
          <form className="signin-form" onSubmit={handleReset}>
            <div className="signin-form__field">
              <LockIcon />
              <input
                className="signin-form__input"
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
              />
            </div>
            <div className="signin-form__field">
              <LockIcon />
              <input
                className="signin-form__input"
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="signin-form__submit" disabled={loading}>
              {loading ? "Mise à jour..." : "Réinitialiser"}
            </button>
          </form>
        )}

        {/* Retour connexion */}
        <div className="signin-form__forgot" style={{ textAlign: "center", marginTop: 16 }}>
          <span
            onClick={() => navigate("/")}
            className="signin-form__forgot-link"
            style={{ cursor: "pointer" }}
          >
            ← Retour à la connexion
          </span>
        </div>

      </div>
    </div>
  );
}