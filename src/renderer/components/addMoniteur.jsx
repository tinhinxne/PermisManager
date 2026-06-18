import React, { useState, useRef, useEffect } from "react";

/* ── ICONS ───────────────────────── */
const IconUserRound = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const IconCamera = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IconUpload = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);
const IconX = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconTrash = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);
const IconSnap = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
);
const IconKey = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6M15.5 7.5l3 3" />
  </svg>
);
const IconCopy = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconMail = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

// ── Validation helpers ────────────────────────────────────────────────────────
const validatePhone = (tel) => {
  const cleaned = tel.replace(/\s+/g, "");
  if (!cleaned) return { valid: false, msg: "Le numéro de téléphone est requis." };
  if (/[^0-9+]/.test(cleaned))
    return { valid: false, msg: "Le numéro ne doit contenir que des chiffres." };
  const local = /^0[5-7][0-9]{8}$/.test(cleaned);
  const intl  = /^\+213[5-7][0-9]{8}$/.test(cleaned);
  if (!local && !intl)
    return {
      valid: false,
      msg: "Numéro invalide. Utilisez un numéro Djezzy (07), Ooredoo (07) ou Mobilis (06).",
    };
  return { valid: true, msg: "" };
};

const validateEmail = (email) => {
  if (!email) return { valid: false, msg: "L'email est requis." };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return { valid: false, msg: "Adresse email invalide." };
  return { valid: true, msg: "" };
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
  :root {
    --blue: #4E96E1; --blue-dark: #2e7bd4; --blue-light: #EBF3FC;
    --red: #DC2626; --red-light: #FEE2E2;
    --gray-50: #F8FAFC; --gray-100: #F1F5F9; --gray-200: #E2E8F0;
    --gray-400: #94A3B8; --gray-600: #475569; --gray-900: #0F172A;
    --green: #10B981; --green-light: #D1FAE5;
    --orange: #F59E0B; --orange-light: #FEF3C7;
    --purple: #8B5CF6; --purple-light: #EDE9FE;
    --radius: 14px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,23,42,.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn .18s ease;
  }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  .modal {
    background: #fff; border-radius: var(--radius);
    box-shadow: 0 20px 60px rgba(0,0,0,.18);
    width: 680px; max-width: 96vw; max-height: 92vh; overflow-y: auto;
    font-family: 'Sora', sans-serif;
    animation: slideUp .22s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes slideUp { from { transform:translateY(24px);opacity:0 } to { transform:translateY(0);opacity:1 } }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 15px 20px 10px;
  }
  .modal-title-wrap { display: flex; align-items: center; gap: 10px; }
  .modal-header h2 { font-size: 18px; font-weight: 700; color: var(--gray-900); }
  .mode-badge {
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
    letter-spacing: .4px; text-transform: uppercase;
  }
  .mode-badge.edit   { background: var(--orange-light); color: var(--orange); }
  .mode-badge.add    { background: var(--blue-light);   color: var(--blue);   }

  .modal-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--gray-100); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--gray-600); transition: background .15s;
  }
  .modal-close:hover { background: var(--red-light); color: var(--red); }
  .modal-divider { border: none; border-top: 1px solid var(--gray-200); margin: 0 24px; }

  .modal-body { display: flex; gap: 24px; padding: 20px 24px; }

  .form-left { flex: 1; display: flex; flex-direction: column; gap: 14px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 12.5px; font-weight: 600; color: var(--gray-600); }
  .field label span.req { color: var(--red); margin-left: 2px; }

  .field input[type="text"],
  .field input[type="email"] {
    height: 40px; padding: 0 12px;
    border: 1.5px solid var(--gray-200); border-radius: 9px;
    font-family: 'Sora', sans-serif; font-size: 13px; color: var(--gray-900);
    background: var(--gray-50); outline: none; transition: border .15s, background .15s;
  }
  .field input:focus { border-color: var(--blue); background: #fff; }
  .field input.input-error { border-color: var(--red); background: var(--red-light); }

  .field select {
    height: 40px; padding: 0 12px;
    border: 1.5px solid var(--gray-200); border-radius: 9px;
    font-family: 'Sora', sans-serif; font-size: 13px; color: var(--gray-900);
    background: var(--gray-50); outline: none; transition: all .2s; cursor: pointer;
  }
  .field select:focus { border-color: var(--blue); background: #fff; }

  .field-error {
    font-size: 11.5px; color: var(--red); font-weight: 500;
    display: flex; align-items: center; gap: 4px; margin-top: 1px;
  }
  .field-error::before { content: "⚠"; font-size: 11px; }

  .gender-group { display: flex; gap: 20px; align-items: center; }
  .gender-option { display: flex; align-items: center; gap: 7px; cursor: pointer; }
  .gender-option input[type="radio"] { accent-color: var(--blue); width: 16px; height: 16px; cursor: pointer; }
  .gender-option label { font-size: 13px; color: var(--gray-900); cursor: pointer; font-weight: 500; }

  /* ── Nouveau style : Grille des catégories de permis ── */
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: var(--gray-50);
    padding: 12px;
    border-radius: 9px;
    border: 1.5px solid var(--gray-200);
  }
  .category-item {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px;
  }
  .category-item input[type="checkbox"] {
    accent-color: var(--blue);
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
  .category-item label {
    font-size: 12.5px;
    color: var(--gray-900);
    cursor: pointer;
    font-weight: 500;
  }

  /* ── Mot de passe ── */
  .password-block {
    background: var(--green-light); border: 1.5px solid var(--green);
    border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
  }
  .password-block.reset-block { background: var(--purple-light); border-color: var(--purple); }
  .password-block-title {
    font-size: 11.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .5px; color: var(--green);
    display: flex; align-items: center; gap: 6px;
  }
  .reset-block .password-block-title { color: var(--purple); }
  .password-row { display: flex; align-items: center; gap: 8px; }
  .password-value {
    flex: 1; height: 36px; padding: 0 12px;
    background: #fff; border: 1.5px solid var(--green);
    border-radius: 8px; font-family: monospace; font-size: 15px;
    font-weight: 700; color: var(--gray-900); letter-spacing: 1.5px;
    display: flex; align-items: center;
  }
  .reset-block .password-value { border-color: var(--purple); }
  .btn-copy {
    height: 36px; padding: 0 12px; border-radius: 8px;
    background: var(--green); color: #fff; border: none;
    font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s;
    white-space: nowrap;
  }
  .btn-copy:hover { filter: brightness(1.1); }
  .reset-block .btn-copy { background: var(--purple); }
  .password-note { font-size: 11.5px; color: #059669; display: flex; align-items: center; gap: 5px; }
  .reset-block .password-note { color: var(--purple); }

  .btn-reset-pwd {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    width: 100%; padding: 9px 0; border-radius: 9px;
    background: var(--purple-light); color: var(--purple);
    border: 1.5px solid var(--purple); font-family: 'Sora', sans-serif;
    font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s;
  }
  .btn-reset-pwd:hover { background: var(--purple); color: #fff; }
  .btn-reset-pwd:disabled { opacity: .6; cursor: not-allowed; }

  /* ── Photo ── */
  .form-right {
    width: 160px; display: flex; flex-direction: column;
    align-items: center; gap: 12px; padding-top: 4px;
  }
  .avatar-wrap {
    position: relative; width: 110px; height: 110px; border-radius: 50%;
    overflow: hidden; background: var(--blue-light); border: 3px solid var(--gray-200);
    display: flex; align-items: center; justify-content: center;
    color: var(--blue); transition: border-color .2s;
  }
  .avatar-wrap.has-photo { border-color: var(--blue); }
  .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-label {
    font-size: 11px; font-weight: 600; color: var(--gray-400);
    text-align: center; letter-spacing: .3px;
  }
  .avatar-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
  .photo-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 8px 0; border-radius: 9px;
    font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; border: none; transition: all .15s;
  }
  .photo-btn.upload { background: var(--blue-light); color: var(--blue); }
  .photo-btn.upload:hover { background: var(--blue); color: #fff; }
  .photo-btn.webcam { background: var(--gray-100); color: var(--gray-600); }
  .photo-btn.webcam:hover { background: var(--gray-900); color: #fff; }
  .photo-btn.remove { background: var(--red-light); color: var(--red); }
  .photo-btn.remove:hover { background: var(--red); color: #fff; }

  /* ── Webcam ── */
  .webcam-overlay {
    position: fixed; inset: 0; z-index: 1100;
    background: rgba(0,0,0,.85);
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 16px;
  }
  .webcam-container { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 0 0 3px var(--blue); }
  .webcam-container video { display: block; width: 360px; max-width: 90vw; }
  .webcam-controls { display: flex; gap: 12px; }
  .wc-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 22px; border-radius: 10px; border: none;
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
  }
  .wc-btn.snap { background: var(--blue); color: #fff; }
  .wc-btn.snap:hover { background: var(--blue-dark); }
  .wc-btn.cancel-wc { background: rgba(255,255,255,.12); color: #fff; }
  .wc-btn.cancel-wc:hover { background: rgba(255,255,255,.22); }

  /* ── Footer ── */
  .modal-footer {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 11px 24px 14px; border-top: 1px solid var(--gray-200);
  }
  .btn-cancel {
    padding: 10px 22px; border-radius: 10px; background: var(--gray-100);
    color: var(--gray-600); border: none; font-family: 'Sora', sans-serif;
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
  }
  .btn-cancel:hover { background: var(--gray-200); }
  .btn-save {
    padding: 10px 24px; border-radius: 10px; background: var(--blue);
    color: #fff; border: none; font-family: 'Sora', sans-serif;
    font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
  }
  .btn-save:hover { background: var(--blue-dark); }
  .btn-save.edit-mode { background: var(--orange); }
  .btn-save.edit-mode:hover { background: #d97706; }
  .btn-save:disabled { opacity: .6; cursor: not-allowed; }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    color: #fff; padding: 10px 20px; border-radius: 10px;
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,.2); animation: fadeIn .2s ease; z-index: 2000;
  }
  .toast.success { background: var(--green); }
  .toast.error   { background: var(--red); }
  .toast.warn    { background: var(--orange); }
`;

/* Liste complète des catégories de permis en Algérie */
const AVAILABLE_CATEGORIES = ["A1", "A", "B", "BE", "C1", "C", "C1E", "CE", "D", "DE", "F"];

/* ── COMPONENT ───────────────────────── */
export default function AddMoniteurModal({
  showModal,
  setShowModal,
  selectedMoniteur = null,
  onSave,
}) {
  const isEdit = !!selectedMoniteur;

  const emptyForm = {
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    statut: "actif",
    sexe: "homme",
    categories_habilitees: ["B"], // Par défaut coché sur B (Voiture)
  };

  const [form, setForm]             = useState(emptyForm);
  const [errors, setErrors]       = useState({});
  const [touched, setTouched]     = useState({});
  const [photo, setPhoto]         = useState(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  const [generatedPwd, setGeneratedPwd] = useState(null);
  const [resetPwd, setResetPwd]         = useState(null);
  const [resetting, setResetting]       = useState(false);
  const [copied, setCopied]             = useState(false);
  const [toast, setToast]               = useState(null);

  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (f = form) => {
    const errs = {};
    if (!f.nom.trim())    errs.nom    = "Le nom est requis.";
    if (!f.prenom.trim()) errs.prenom = "Le prénom est requis.";

    const emailCheck = validateEmail(f.email);
    if (!emailCheck.valid) errs.email = emailCheck.msg;

    const phoneCheck = validatePhone(f.telephone);
    if (!phoneCheck.valid) errs.telephone = phoneCheck.msg;

    if (!f.categories_habilitees || f.categories_habilitees.length === 0) {
      errs.categories = "Sélectionnez au moins une catégorie de permis.";
    }

    return errs;
  };

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) {
      setErrors(validate(updated));
    }
  };

  // Gérer le clic sur les cases à cocher des permis
  const handleCategoryChange = (cat) => {
    let currentCats = [...form.categories_habilitees];
    if (currentCats.includes(cat)) {
      currentCats = currentCats.filter((c) => c !== cat);
    } else {
      currentCats.push(cat);
    }
    const updated = { ...form, categories_habilitees: currentCats };
    setForm(updated);
    setErrors(validate(updated));
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate());
  };

  // ── Pré-remplissage ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedMoniteur) {
      // Si la base renvoie une chaîne séparée par des virgules "B,C", on la transforme en tableau
      let cats = [];
      if (selectedMoniteur.categories_habilitees) {
        cats = Array.isArray(selectedMoniteur.categories_habilitees)
          ? selectedMoniteur.categories_habilitees
          : selectedMoniteur.categories_habilitees.split(",");
      } else {
        cats = ["B"];
      }

      setForm({
        nom:       selectedMoniteur.nom       || "",
        prenom:    selectedMoniteur.prenom    || "",
        email:     selectedMoniteur.email     || "",
        telephone: selectedMoniteur.telephone || "",
        statut:    selectedMoniteur.statut    || "actif",
        sexe:      selectedMoniteur.sexe      || "homme",
        categories_habilitees: cats,
      });
      setPhoto(selectedMoniteur.photo || null);
    } else {
      setForm(emptyForm);
      setPhoto(null);
    }
    setErrors({});
    setTouched({});
    setGeneratedPwd(null);
    setResetPwd(null);
    setCopied(false);
  }, [selectedMoniteur, showModal]);

  // ── Upload fichier ───────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Webcam ───────────────────────────────────────────────────────────────────
  const openWebcam = async () => {
    setWebcamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Accès à la caméra refusé ou non disponible.");
      setWebcamOpen(false);
    }
  };
  const closeWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamOpen(false);
  };
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg"));
    closeWebcam();
  };

  // ── Copier mot de passe ──────────────────────────────────────────────────────
  const copyToClipboard = (pwd) => {
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const allTouched = { nom: true, prenom: true, email: true, telephone: true };
    setTouched(allTouched);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast("Veuillez corriger les erreurs avant de continuer.", "error");
      return;
    }

    setSaving(true);
    try {
      // Pour l'envoi, on convertit le tableau en chaîne "B,C" conforme au VARCHAR de ton MySQL
      const data = {
        ...form,
        categories_habilitees: form.categories_habilitees.join(","),
        photo,
        ...(isEdit ? { id: selectedMoniteur.id } : {}),
      };
      const result = await onSave(data);

      if (result?.success) {
        if (!isEdit && result.password) {
          setGeneratedPwd(result.password);
          showToast(
            result.emailSent ? "✓ Moniteur ajouté — email envoyé !" : "✓ Moniteur ajouté (notez le mdp)",
            result.emailSent ? "success" : "warn"
          );
        } else if (isEdit) {
          showToast("✓ Moniteur mis à jour avec succès", "success");
          setTimeout(() => setShowModal(false), 1200);
        }
      } else {
        showToast("Erreur : " + (result?.error || "Opération échouée"), "error");
      }
    } catch {
      showToast("Erreur inattendue.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Réinitialiser mot de passe ───────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${form.prenom} ${form.nom} et lui envoyer par email ?`)) return;
    setResetting(true);
    setResetPwd(null);
    try {
      const result = await window.electron.resetMoniteurPassword({
        id: selectedMoniteur.id,
        email: form.email,
        nom: form.nom,
        prenom: form.prenom,
      });
      if (result?.success) {
        setResetPwd(result.password);
        showToast(result.emailSent ? "✓ Nouveau mot de passe envoyé par email" : "Mot de passe réinitialisé (email non envoyé)", result.emailSent ? "success" : "warn");
      } else {
        showToast("Erreur lors de la réinitialisation.", "error");
      }
    } catch {
      showToast("Erreur inattendue.", "error");
    } finally {
      setResetting(false);
    }
  };

  if (!showModal) return null;

  const textFields = [
    { key: "nom",       label: "Nom",       type: "text",  placeholder: "Saisir le nom" },
    { key: "prenom",    label: "Prénom",     type: "text",  placeholder: "Saisir le prénom" },
    { key: "email",     label: "Email",      type: "email", placeholder: "exemple@gmail.com" },
    { key: "telephone", label: "Téléphone",  type: "text",  placeholder: "06XXXXXXXX ou 07XXXXXXXX" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
        <div className="modal">

          {/* Header */}
          <div className="modal-header">
            <div className="modal-title-wrap">
              <h2>{isEdit ? "Modifier le moniteur" : "Ajouter un moniteur"}</h2>
              <span className={`mode-badge ${isEdit ? "edit" : "add"}`}>
                {isEdit ? "Édition" : "Nouveau"}
              </span>
            </div>
            <button className="modal-close" onClick={() => setShowModal(false)}><IconX /></button>
          </div>
          <hr className="modal-divider" />

          {/* Body */}
          <div className="modal-body">
            <div className="form-left">

              {textFields.map(({ key, label, type, placeholder }) => (
                <div className="field" key={key}>
                  <label>
                    {label} <span className="req">*</span>
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    className={touched[key] && errors[key] ? "input-error" : ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleBlur(key)}
                  />
                  {touched[key] && errors[key] && (
                    <span className="field-error">{errors[key]}</span>
                  )}
                </div>
              ))}

              {/* SECTION : Catégories de Permis (Habilitations) */}
              <div className="field">
                <label>Catégories de Permis (Habilitation) <span className="req">*</span></label>
                <div className="categories-grid">
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <div className="category-item" key={cat}>
                      <input
                        type="checkbox"
                        id={`cat-${cat}`}
                        checked={form.categories_habilitees.includes(cat)}
                        onChange={() => handleCategoryChange(cat)}
                      />
                      <label htmlFor={`cat-${cat}`}>{cat}</label>
                    </div>
                  ))}
                </div>
                {errors.categories && (
                  <span className="field-error">{errors.categories}</span>
                )}
              </div>

              <div className="field">
                <label>Statut <span className="req">*</span></label>
                <select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>

              <div className="field">
                <label>Sexe <span className="req">*</span></label>
                <div className="gender-group">
                  {["homme", "femme"].map((s) => (
                    <div className="gender-option" key={s}>
                      <input type="radio" name="sexe" id={s} value={s}
                        checked={form.sexe === s}
                        onChange={() => setForm((f) => ({ ...f, sexe: s }))} />
                      <label htmlFor={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mot de passe généré (mode ajout) */}
              {!isEdit && generatedPwd && (
                <div className="password-block">
                  <div className="password-block-title"><IconKey size={13} /> Mot de passe généré</div>
                  <div className="password-row">
                    <div className="password-value">{generatedPwd}</div>
                    <button className="btn-copy" onClick={() => copyToClipboard(generatedPwd)}>
                      <IconCopy size={13} /> {copied ? "Copié !" : "Copier"}
                    </button>
                  </div>
                  <div className="password-note">
                    <IconMail size={13} /> Email envoyé à {form.email} — conservez ce mot de passe.
                  </div>
                </div>
              )}

              {/* Reset mot de passe (mode édition) */}
              {isEdit && (
                <>
                  <button className="btn-reset-pwd" onClick={handleResetPassword} disabled={resetting}>
                    <IconKey size={14} />
                    {resetting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                  </button>
                  {resetPwd && (
                    <div className="password-block reset-block">
                      <div className="password-block-title"><IconKey size={13} /> Nouveau mot de passe</div>
                      <div className="password-row">
                        <div className="password-value">{resetPwd}</div>
                        <button className="btn-copy" onClick={() => copyToClipboard(resetPwd)}>
                          <IconCopy size={13} /> {copied ? "Copié !" : "Copier"}
                        </button>
                      </div>
                      <div className="password-note">
                        <IconMail size={13} /> Email envoyé à {form.email}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Photo (optionnelle) */}
            <div className="form-right">
              <div className={`avatar-wrap ${photo ? "has-photo" : ""}`}>
                {photo ? <img src={photo} alt="moniteur" /> : <IconUserRound />}
              </div>
              <span className="avatar-label">Photo (optionnelle)</span>
              <div className="avatar-actions">
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                <button className="photo-btn upload" onClick={() => fileInputRef.current.click()}>
                  <IconUpload size={13} /> Télécharger
                </button>
                <button className="photo-btn webcam" onClick={openWebcam}>
                  <IconCamera size={13} /> Prendre photo
                </button>
                {photo && (
                  <button className="photo-btn remove" onClick={() => setPhoto(null)}>
                    <IconTrash size={13} /> Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setShowModal(false)}>
              {generatedPwd ? "Fermer" : "Annuler"}
            </button>
            {!generatedPwd && (
              <button
                className={`btn-save ${isEdit ? "edit-mode" : ""}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "En cours..." : isEdit ? "Mettre à jour" : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>
      </div>

      {webcamOpen && (
        <div className="webcam-overlay">
          <div className="webcam-container">
            <video ref={videoRef} autoPlay playsInline />
          </div>
          <div className="webcam-controls">
            <button className="wc-btn snap" onClick={takeSnapshot}><IconSnap size={16} /> Capturer</button>
            <button className="wc-btn cancel-wc" onClick={closeWebcam}><IconX size={14} /> Annuler</button>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}