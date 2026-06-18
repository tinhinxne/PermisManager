import React, { useState, useEffect } from "react";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth } from "../context/AuthContext";
import {
  User, Phone, Mail, Lock, Eye, EyeOff,
  Save, X, Check, ShieldCheck, AlertCircle,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (prenom = "", nom = "") =>
  `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();

const AVATAR_BG = "#dbeafe";
const AVATAR_COLOR = "#185fa5";

// ─── Champ lecture seule ────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 18px",
    background: "#f8faff",
    border: "1px solid #e2eaf6",
    borderRadius: 12,
    marginBottom: 10,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "rgba(43,83,126,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>
        {value || "—"}
      </div>
    </div>
  </div>
);

// ─── Champ mot de passe ──────────────────────────────────────────────────────
const PasswordInput = ({ label, value, onChange, show, onToggle, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 42px 10px 14px",
          borderRadius: 10, border: "1px solid #e2eaf6",
          fontSize: 14, outline: "none", boxSizing: "border-box",
          background: "#f8faff", color: "#1e293b",
        }}
      />
      <span
        onClick={onToggle}
        style={{
          position: "absolute", right: 12, top: "50%",
          transform: "translateY(-50%)", cursor: "pointer", color: "#94a3b8",
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </span>
    </div>
  </div>
);

// ─── Composant principal ─────────────────────────────────────────────────────
const ParametresMoniteur = () => {
  const { currentUser } = useAuth();

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  // Champs mot de passe
  const [oldPwd,  setOldPwd]  = useState("");
  const [newPwd,  setNewPwd]  = useState("");
  const [confPwd, setConfPwd] = useState("");

  // Visibilité
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Feedback
  const [pwdStatus, setPwdStatus] = useState(null); // { type: 'success'|'error', message }
  const [saving,    setSaving]    = useState(false);

  // ── Chargement profil ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    window.electron.getMoniteurProfile(currentUser.id)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser?.id]);

  // ── Validation mot de passe ────────────────────────────────────────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { label: "Trop court", color: "#ef4444", width: "25%" };
    if (pwd.length < 10) return { label: "Moyen", color: "#f59e0b", width: "55%" };
    return { label: "Fort", color: "#22c55e", width: "100%" };
  };

  const strength = getPasswordStrength(newPwd);

  const handleChangePassword = async () => {
    setPwdStatus(null);

    if (!oldPwd || !newPwd || !confPwd) {
      return setPwdStatus({ type: "error", message: "Veuillez remplir tous les champs." });
    }
    if (newPwd !== confPwd) {
      return setPwdStatus({ type: "error", message: "Les nouveaux mots de passe ne correspondent pas." });
    }
    if (newPwd.length < 6) {
      return setPwdStatus({ type: "error", message: "Le mot de passe doit contenir au moins 6 caractères." });
    }
    if (newPwd === oldPwd) {
      return setPwdStatus({ type: "error", message: "Le nouveau mot de passe doit être différent de l'ancien." });
    }

    setSaving(true);
    const result = await window.electron.updateMoniteurPassword({
      moniteurId:  currentUser.id,
      oldPassword: oldPwd,
      newPassword: newPwd,
    });
    setSaving(false);

    if (result.success) {
      setPwdStatus({ type: "success", message: "Mot de passe modifié avec succès !" });
      setOldPwd(""); setNewPwd(""); setConfPwd("");
    } else {
      setPwdStatus({ type: "error", message: result.message || "Erreur inconnue." });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="main">

        {/* HEADER */}
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="" width={40} />
            Tableau de bord — Mon Compte
          </h1>
          <p>Consultez vos informations et gérez votre sécurité</p>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Chargement…</p>
        ) : !profile ? (
          <p style={{ textAlign: "center", color: "#ef4444", padding: 40 }}>
            Impossible de charger le profil.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* ── CARTE PROFIL ── */}
            <div className="card" style={{ height: "fit-content" }}>
              <div className="card-header" style={{ marginBottom: 20 }}>
                <div>
                  <h2>Mon Profil</h2>
                  <p>Vos informations personnelles</p>
                </div>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: AVATAR_BG, color: AVATAR_COLOR,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800,
                }}>
                  {getInitials(profile.prenom, profile.nom)}
                </div>
              </div>

              {/* Badge statut */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: profile.statut === "actif"
                  ? "rgba(22,101,52,0.08)" : "rgba(148,163,184,0.12)",
                border: `1px solid ${profile.statut === "actif"
                  ? "rgba(22,101,52,0.25)" : "#e2e8f0"}`,
                borderRadius: 10, padding: "5px 13px",
                fontSize: "0.75rem", fontWeight: 600,
                color: profile.statut === "actif" ? "#166534" : "#64748b",
                marginBottom: 18,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: profile.statut === "actif" ? "#22c55e" : "#94a3b8",
                  display: "inline-block",
                }} />
                {profile.statut === "actif" ? "Compte actif" : "Compte inactif"}
              </div>

              {/* Infos */}
              <InfoRow
                icon={<User size={16} color="#2b537e" />}
                label="Nom complet"
                value={`${profile.prenom} ${profile.nom}`}
              />
              <InfoRow
                icon={<Mail size={16} color="#2b537e" />}
                label="Adresse e-mail"
                value={profile.email}
              />
              <InfoRow
                icon={<Phone size={16} color="#2b537e" />}
                label="Téléphone"
                value={profile.telephone}
              />
              <InfoRow
                icon={<ShieldCheck size={16} color="#2b537e" />}
                label="Rôle"
                value="Moniteur"
              />

              {/* Note */}
              <div style={{
                marginTop: 16, padding: "10px 14px",
                background: "rgba(43,83,126,0.05)",
                border: "1px solid rgba(43,83,126,0.12)",
                borderRadius: 10, fontSize: 12, color: "#64748b",
              }}>
                💡 Pour modifier vos informations personnelles (nom, téléphone, email),
                contactez l'administrateur de l'auto-école.
              </div>
            </div>

            {/* ── CARTE MOT DE PASSE ── */}
            <div className="card" style={{ height: "fit-content" }}>
              <div className="card-header" style={{ marginBottom: 20 }}>
                <div>
                  <h2>Sécurité</h2>
                  <p>Modifier votre mot de passe</p>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(108,99,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Lock size={22} color="#6c63ff" />
                </div>
              </div>

              <PasswordInput
                label="Ancien mot de passe"
                value={oldPwd}
                onChange={setOldPwd}
                show={showOld}
                onToggle={() => setShowOld(p => !p)}
                placeholder="Votre mot de passe actuel"
              />

              <PasswordInput
                label="Nouveau mot de passe"
                value={newPwd}
                onChange={setNewPwd}
                show={showNew}
                onToggle={() => setShowNew(p => !p)}
                placeholder="Minimum 6 caractères"
              />

              {/* Jauge de force */}
              {newPwd && strength && (
                <div style={{ marginBottom: 14, marginTop: -6 }}>
                  <div style={{
                    height: 4, borderRadius: 4,
                    background: "#e2e8f0", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: strength.width,
                      background: strength.color,
                      transition: "width 0.3s, background 0.3s",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}

              <PasswordInput
                label="Confirmer le nouveau mot de passe"
                value={confPwd}
                onChange={setConfPwd}
                show={showConf}
                onToggle={() => setShowConf(p => !p)}
                placeholder="Répétez le nouveau mot de passe"
              />

              {/* Correspondance */}
              {confPwd && newPwd && (
                <div style={{
                  fontSize: 12, marginBottom: 12, marginTop: -4,
                  color: confPwd === newPwd ? "#22c55e" : "#ef4444",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {confPwd === newPwd
                    ? <><Check size={13} /> Les mots de passe correspondent</>
                    : <><X size={13} /> Les mots de passe ne correspondent pas</>
                  }
                </div>
              )}

              {/* Message feedback */}
              {pwdStatus && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                  fontSize: 13, fontWeight: 500,
                  background: pwdStatus.type === "success"
                    ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${pwdStatus.type === "success"
                    ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  color: pwdStatus.type === "success" ? "#166534" : "#dc2626",
                }}>
                  {pwdStatus.type === "success"
                    ? <Check size={15} />
                    : <AlertCircle size={15} />
                  }
                  {pwdStatus.message}
                </div>
              )}

              {/* Bouton */}
              <button
                onClick={handleChangePassword}
                disabled={saving}
                style={{
                  width: "100%", padding: "11px 0",
                  borderRadius: 10, border: "none",
                  background: saving ? "#94a3b8" : "#2b537e",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  transition: "background 0.2s",
                  boxShadow: saving ? "none" : "0 4px 14px rgba(43,83,126,0.3)",
                }}
              >
                {saving
                  ? "Enregistrement…"
                  : <><Save size={15} /> Changer le mot de passe</>
                }
              </button>

              {/* Conseils sécurité */}
              <div style={{
                marginTop: 18, padding: "12px 14px",
                background: "rgba(108,99,255,0.05)",
                border: "1px solid rgba(108,99,255,0.12)",
                borderRadius: 10, fontSize: 12, color: "#64748b",
                lineHeight: 1.7,
              }}>
                <strong style={{ color: "#6c63ff" }}>🔐 Conseils :</strong><br />
                • Utilisez au moins 8 caractères<br />
                • Mélangez majuscules, chiffres et symboles<br />
                • Ne partagez jamais votre mot de passe
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ParametresMoniteur;