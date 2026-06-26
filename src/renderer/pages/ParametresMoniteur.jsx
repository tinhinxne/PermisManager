import React, { useState, useEffect } from "react";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth }     from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import {
  User, Phone, Mail, Lock, Eye, EyeOff,
  Save, X, Check, ShieldCheck, AlertCircle,
} from "lucide-react";
import { MessageCircle } from "lucide-react";

const getInitials = (prenom = "", nom = "") =>
  `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();

const AVATAR_BG    = "#dbeafe";
const AVATAR_COLOR = "#185fa5";

const InfoRow = ({ icon, label, value }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 18px", background: "#f8faff",
    border: "1px solid #e2eaf6", borderRadius: 12, marginBottom: 10,
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "rgba(43,83,126,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>{value || "—"}</div>
    </div>
  </div>
);

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

const CATEGORY_COLORS = {
  A1:  { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  A:   { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  B:   { bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  BE:  { bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD" },
  C1:  { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  C:   { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  C1E: { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  CE:  { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  D:   { bg: "#FCE7F3", color: "#9D174D", border: "#F9A8D4" },
  DE:  { bg: "#FDF2F8", color: "#831843", border: "#F0ABFC" },
  F:   { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
};

const CategoryBadge = ({ cat }) => {
  const colors = CATEGORY_COLORS[cat] || { bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.4px",
      background: colors.bg, color: colors.color,
      border: `1.5px solid ${colors.border}`,
    }}>
      {cat}
    </span>
  );
};

const ParametresMoniteur = () => {
  const { currentUser } = useAuth();
  const location        = useLocation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [oldPwd,  setOldPwd]  = useState("");
  const [newPwd,  setNewPwd]  = useState("");
  const [confPwd, setConfPwd] = useState("");

  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSujet,     setContactSujet]     = useState("");
  const [contactMessage,   setContactMessage]   = useState("");
  const [contactSending,   setContactSending]   = useState(false);
  const [contactStatus,    setContactStatus]    = useState(null);

  const [pwdStatus, setPwdStatus] = useState(null);
  const [saving,    setSaving]    = useState(false);

  // ── Chargement profil ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    window.electron.getMoniteurProfile(currentUser.id)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser?.id]);

  // ── Auto-ouvrir la modale contact si on arrive depuis le dashboard ─────────
  useEffect(() => {
    if (location.state?.openContactModal) {
      setShowContactModal(true);
    }
  }, []);

  // ── Envoi message admin ────────────────────────────────────────────────────
  const handleSendContact = async () => {
    if (!contactMessage.trim())
      return setContactStatus({ type: "error", message: "Veuillez écrire un message." });

    setContactSending(true);
    const result = await window.electron.sendMessageAdmin({
      moniteurId: currentUser.id,
      sujet:      contactSujet.trim(),
      message:    contactMessage.trim(),
    });
    setContactSending(false);

    if (result.success) {
      setContactStatus({ type: "success", message: "Message envoyé à l'administrateur !" });
      setContactSujet("");
      setContactMessage("");
      setTimeout(() => { setShowContactModal(false); setContactStatus(null); }, 1500);
    } else {
      setContactStatus({ type: "error", message: result.message || "Erreur lors de l'envoi." });
    }
  };

  // ── Force mot de passe ─────────────────────────────────────────────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 6)  return { label: "Trop court", color: "#ef4444", width: "25%" };
    if (pwd.length < 10) return { label: "Moyen",      color: "#f59e0b", width: "55%" };
    return                      { label: "Fort",        color: "#22c55e", width: "100%" };
  };

  const strength = getPasswordStrength(newPwd);

  // ── Changement mot de passe ────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwdStatus(null);
    if (!oldPwd || !newPwd || !confPwd)
      return setPwdStatus({ type: "error", message: "Veuillez remplir tous les champs." });
    if (newPwd !== confPwd)
      return setPwdStatus({ type: "error", message: "Les nouveaux mots de passe ne correspondent pas." });
    if (newPwd.length < 6)
      return setPwdStatus({ type: "error", message: "Le mot de passe doit contenir au moins 6 caractères." });
    if (newPwd === oldPwd)
      return setPwdStatus({ type: "error", message: "Le nouveau mot de passe doit être différent de l'ancien." });

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

  return (
    <>
      <div className="container">
        <div className="main">

          {/* HEADER */}
          <div className="header">
            <img src={ConnexionImg} alt="illustration" className="header-img" />
            <h1><img src={SmallCar} alt="" width={40} /> Tableau de bord — Mon Compte</h1>
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

                <InfoRow icon={<User size={16} color="#2b537e" />}       label="Nom complet"    value={`${profile.prenom} ${profile.nom}`} />
                <InfoRow icon={<Mail size={16} color="#2b537e" />}       label="Adresse e-mail" value={profile.email}      />
                <InfoRow icon={<Phone size={16} color="#2b537e" />}      label="Téléphone"      value={profile.telephone}  />
                <InfoRow icon={<ShieldCheck size={16} color="#2b537e" />}label="Rôle"           value="Moniteur"           />

                {/* Catégories permis */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", background: "#f8faff",
                  border: "1px solid #e2eaf6", borderRadius: 12, marginBottom: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(43,83,126,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <ShieldCheck size={16} color="#2b537e" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>
                      HABILITATIONS (PERMIS)
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(profile.categories_habilitees
                        ? profile.categories_habilitees.split(",").map(c => c.trim()).filter(Boolean)
                        : ["B"]
                      ).map(cat => <CategoryBadge key={cat} cat={cat} />)}
                    </div>
                  </div>
                </div>

                {/* Note + bouton contact */}
                <div style={{
                  marginTop: 16, padding: "10px 14px",
                  background: "rgba(43,83,126,0.05)",
                  border: "1px solid rgba(43,83,126,0.12)",
                  borderRadius: 10, fontSize: 12, color: "#64748b",
                }}>
                  💡 Pour modifier vos informations personnelles (nom, téléphone, email), contactez l'administrateur de l'auto-école.
                  <button
                    onClick={() => setShowContactModal(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      marginTop: 10, padding: "7px 14px", borderRadius: 8,
                      border: "1px solid #2b537e", background: "white",
                      color: "#2b537e", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    <MessageCircle size={13} /> Contacter l'administrateur
                  </button>
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
                  value={oldPwd} onChange={setOldPwd}
                  show={showOld} onToggle={() => setShowOld(p => !p)}
                  placeholder="Votre mot de passe actuel"
                />
                <PasswordInput
                  label="Nouveau mot de passe"
                  value={newPwd} onChange={setNewPwd}
                  show={showNew} onToggle={() => setShowNew(p => !p)}
                  placeholder="Minimum 6 caractères"
                />

                {/* Jauge de force */}
                {newPwd && strength && (
                  <div style={{ marginBottom: 14, marginTop: -6 }}>
                    <div style={{ height: 4, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        width: strength.width, background: strength.color,
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
                  value={confPwd} onChange={setConfPwd}
                  show={showConf} onToggle={() => setShowConf(p => !p)}
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

                {/* Feedback */}
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
                    {pwdStatus.type === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
                    {pwdStatus.message}
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  style={{
                    width: "100%", padding: "11px 0",
                    borderRadius: 10, border: "none",
                    background: saving ? "#94a3b8" : "#2b537e",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.2s",
                    boxShadow: saving ? "none" : "0 4px 14px rgba(43,83,126,0.3)",
                  }}
                >
                  {saving ? "Enregistrement…" : <><Save size={15} /> Changer le mot de passe</>}
                </button>

                <div style={{
                  marginTop: 18, padding: "12px 14px",
                  background: "rgba(108,99,255,0.05)",
                  border: "1px solid rgba(108,99,255,0.12)",
                  borderRadius: 10, fontSize: 12, color: "#64748b", lineHeight: 1.7,
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

      {/* ── Modale Contact Admin ── */}
      {showContactModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowContactModal(false)}
        >
          <div style={{
            background: "white", borderRadius: 16, width: 420, maxWidth: "94vw",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden",
          }}>
            <div style={{
              background: "#2b537e", padding: "16px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                Contacter l'administrateur
              </span>
              <button
                onClick={() => setShowContactModal(false)}
                style={{
                  background: "rgba(255,255,255,0.18)", border: "none",
                  borderRadius: 7, width: 26, height: 26, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={14} color="white" />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                Sujet (optionnel)
              </label>
              <input
                type="text"
                value={contactSujet}
                onChange={e => setContactSujet(e.target.value)}
                placeholder="Ex : Demande de modification de téléphone"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 9,
                  border: "1px solid #e2eaf6", fontSize: 13, outline: "none",
                  background: "#f8faff", marginBottom: 14, boxSizing: "border-box",
                }}
              />

              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
                Message
              </label>
              <textarea
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                placeholder="Écrivez votre message ici..."
                rows={5}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 9,
                  border: "1px solid #e2eaf6", fontSize: 13, outline: "none",
                  background: "#f8faff", marginBottom: 14, boxSizing: "border-box",
                  fontFamily: "inherit", resize: "vertical",
                }}
              />

              {contactStatus && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", borderRadius: 9, marginBottom: 14,
                  fontSize: 12, fontWeight: 500,
                  background: contactStatus.type === "success"
                    ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${contactStatus.type === "success"
                    ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  color: contactStatus.type === "success" ? "#166534" : "#dc2626",
                }}>
                  {contactStatus.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                  {contactStatus.message}
                </div>
              )}

              <button
                onClick={handleSendContact}
                disabled={contactSending}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 9, border: "none",
                  background: contactSending ? "#94a3b8" : "#2b537e",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: contactSending ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                <MessageCircle size={14} />
                {contactSending ? "Envoi…" : "Envoyer le message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ParametresMoniteur;