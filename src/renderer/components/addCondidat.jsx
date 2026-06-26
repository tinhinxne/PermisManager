import React, { useState, useEffect, useRef } from "react";
import { useRulesCtx } from "../context/RulesContext";

// ── Liste officielle et complète des catégories de permis ────────────────────
const PERMIS_CATEGORIES = [
  { id: "A1", label: "A1 - Moto < 125 cm³ / Scooter" },
  { id: "A",  label: "A - Grosse Cylindrée (> 125 cm³)" },
  { id: "B",  label: "B - Véhicule Léger (Tourisme / < 3.5t)" },
  { id: "BE", label: "BE - Véhicule Léger avec Remorque" },
  { id: "C1", label: "C1 - Camionnette (Entre 3.5t et 7.5t)" },
  { id: "C",  label: "C - Poids Lourd (Camion > 7.5t)" },
  { id: "C1E",label: "C1E - Camionnette (C1) avec Remorque" },
  { id: "CE", label: "CE - Super Lourd (Semi-remorque)" },
  { id: "D",  label: "D - Transport de Personnes (Bus / Autocar)" },
  { id: "DE", label: "DE - Transport de Personnes avec Remorque" },
  { id: "F",  label: "F - Véhicule Aménagé (Handicap / Spécifique)" }
];

// ── Calcul d'âge précis ──────────────────────────────────────────────────────
const calculateAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// ── Règles d'âge ────────────────────────────────────────────────────────────
// Accepte maintenant la catégorie en 3ème paramètre
const evaluateRules = (rules, dob, categorie = "") => {
  const age = calculateAge(dob);
  if (age === null || !rules) return { blocked: false, needsParent: false, age: null };

  // Règles spécifiques catégorie A / A1 : accessible dès 16 ans
  const catUp = (categorie || "").toUpperCase().trim();
  const rulesEffectives = (() => {
    if (catUp === "A" || catUp === "A1") {
      return [
        { min: 0,   max: 15,  action: "block",          enabled: true },
        { min: 16,  max: 18,  action: "require_parent", enabled: true },
        { min: 19,  max: 150, action: "allow",          enabled: true },
      ];
    }
    return rules;
  })();

  let blocked = false;
  let needsParent = false;
  rulesEffectives.forEach((rule) => {
    if (!rule.enabled) return;
    if (age >= rule.min && age <= rule.max) {
      if (rule.action === "block")          blocked = true;
      if (rule.action === "require_parent") needsParent = true;
    }
  });
  return { blocked, needsParent, age };
};

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
      msg: "Numéro invalide. Utilisez un numéro Djezzy (07), Ooredoo (05) ou Mobilis (06).",
    };
  return { valid: true, msg: "" };
};

const validateEmail = (email) => {
  if (!email || !email.trim()) return { valid: false, msg: "L'email est requis." };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return { valid: false, msg: "Adresse email invalide." };
  return { valid: true, msg: "" };
};

// ── Validation du nom arabe : autorise lettres arabes, espaces, tirets ───────
const validateArabicText = (text, fieldLabel) => {
  if (!text || !text.trim()) return { valid: true, msg: "" }; // optionnel, donc vide = ok
  const arabicRegex = /^[\u0600-\u06FF\s'-]+$/;
  if (!arabicRegex.test(text.trim()))
    return { valid: false, msg: `${fieldLabel} doit être saisi en caractères arabes uniquement.` };
  return { valid: true, msg: "" };
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPTED_EXTS  = ".pdf,.jpg,.jpeg,.png";

const validateFile = (file) => {
  if (!file) return { valid: false, msg: "L'autorisation parentale est requise." };
  if (!ACCEPTED_TYPES.includes(file.type))
    return { valid: false, msg: "Format non supporté. Utilisez PDF, JPG ou PNG." };
  if (file.size > MAX_FILE_SIZE)
    return { valid: false, msg: "Le fichier dépasse la limite de 5 Mo." };
  return { valid: true, msg: "" };
};

const formatSize = (bytes) => {
  if (bytes < 1024)       return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const IconX = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Styles CSS injectés ───────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
  :root {
    --blue: #4E96E1; --blue-dark: #2e7bd4; --blue-light: #EBF3FC;
    --red: #DC2626; --red-light: #FEE2E2;
    --orange: #F59E0B; --orange-dark: #d97706; --orange-light: #FEF3C7;
    --green: #10B981; --green-light: #D1FAE5;
    --gray-50: #F8FAFC; --gray-100: #F1F5F9; --gray-200: #E2E8F0;
    --gray-400: #94A3B8; --gray-600: #475569; --gray-900: #0F172A;
    --radius: 14px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,23,42,.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn .18s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }

  .modal {
    background: #fff; border-radius: var(--radius);
    box-shadow: 0 20px 60px rgba(0,0,0,.18);
    width: 500px; max-width: 96vw; max-height: 92vh; overflow-y: auto;
    font-family: 'Sora', sans-serif;
    animation: slideUp .22s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes slideUp {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px 16px;
  }
  .modal-title-wrap { display: flex; align-items: center; gap: 10px; }
  .modal-header h2  { font-size: 18px; font-weight: 700; color: var(--gray-900); }

  .mode-badge {
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
    letter-spacing: .4px; text-transform: uppercase;
  }
  .mode-badge.edit { background: var(--orange-light); color: var(--orange); }
  .mode-badge.add  { background: var(--blue-light);   color: var(--blue);   }

  .modal-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--gray-100); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--gray-600); transition: background .15s;
  }
  .modal-close:hover { background: var(--red-light); color: var(--red); }
  .modal-divider { border: none; border-top: 1px solid var(--gray-200); margin: 0 24px; }

  .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 12.5px; font-weight: 600; color: var(--gray-600); }
  .field label .req { color: var(--red); margin-left: 2px; }
  .field label .opt { color: var(--gray-400); font-weight: 500; font-style: italic; margin-left: 4px; }

  .field input[type="text"],
  .field input[type="date"],
  .field input[type="email"],
  .field select {
    height: 40px; padding: 0 12px;
    border: 1.5px solid var(--gray-200); border-radius: 9px;
    font-family: 'Sora', sans-serif; font-size: 13px; color: var(--gray-900);
    background: var(--gray-50); outline: none; transition: border .15s, background .15s;
  }
  .field input:focus, .field select:focus { border-color: var(--blue);   background: #fff; }
  .field input.input-error, .field select.input-error { border-color: var(--red);    background: var(--red-light); }
  .field input.input-warning { border-color: var(--orange); background: var(--orange-light); }
  .field input.input-arabic {
    direction: rtl; text-align: right; font-family: 'Sora', 'Tahoma', sans-serif;
  }

  .field-error {
    font-size: 11.5px; color: var(--red); font-weight: 500;
    display: flex; align-items: center; gap: 4px; margin-top: 1px;
  }
  .field-error::before { content: "⚠"; font-size: 11px; }

  .field-hint {
    font-size: 11px; color: var(--gray-400); margin-top: 1px;
  }

  .row-2 { display: flex; gap: 12px; }
  .row-2 .field { flex: 1; }

  .gender-group { display: flex; gap: 20px; align-items: center; margin-top: 5px; }
  .gender-option { display: flex; align-items: center; gap: 7px; cursor: pointer; }
  .gender-option input[type="radio"] { accent-color: var(--blue); width: 16px; height: 16px; cursor: pointer; }
  .gender-option label { font-size: 13px; color: var(--gray-900); cursor: pointer; font-weight: 500; }

  .age-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: 10px;
    font-size: 13px; font-weight: 500; line-height: 1.45;
    animation: fadeIn .2s ease;
  }
  .age-banner.blocked { background: var(--red-light);    color: var(--red);         border: 1px solid #fca5a5; }
  .age-banner.warning { background: var(--orange-light); color: var(--orange-dark); border: 1px solid #fcd34d; }
  .age-banner.ok      { background: var(--green-light);  color: #065f46;            border: 1px solid #6ee7b7; }
  .age-banner .banner-icon { font-size: 18px; flex-shrink: 0; }

  .upload-section { display: flex; flex-direction: column; gap: 10px; animation: fadeIn .2s ease; }

  .upload-zone {
    border: 1.5px dashed #fcd34d; border-radius: 10px;
    background: #FFFBEB; padding: 20px 16px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    cursor: pointer; transition: background .15s, border-color .15s;
    position: relative;
  }
  .upload-zone:hover   { background: #FEF9C3; border-color: var(--orange); }
  .upload-zone.drag-over { background: #FEF3C7; border-color: var(--orange-dark); }
  .upload-zone.has-error { border-color: var(--red); background: var(--red-light); }
  .upload-zone input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

  .upload-icon { font-size: 30px; line-height: 1; }
  .upload-label { font-size: 13px; font-weight: 600; color: var(--orange-dark); }
  .upload-hint  { font-size: 11.5px; color: #b45309; }

  .file-preview {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 13px; border-radius: 10px;
    background: var(--green-light); border: 1px solid #6ee7b7;
    animation: fadeIn .2s ease;
  }
  .file-preview-icon { font-size: 22px; flex-shrink: 0; }
  .file-preview-info { flex: 1; min-width: 0; }
  .file-preview-name {
    font-size: 13px; font-weight: 600; color: #065f46;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .file-preview-meta { font-size: 11px; color: #065f46; opacity: .75; margin-top: 2px; }
  .file-preview-remove {
    background: none; border: none; cursor: pointer; color: #065f46;
    opacity: .65; padding: 4px; border-radius: 6px;
    display: flex; align-items: center; transition: opacity .15s;
    flex-shrink: 0;
  }
  .file-preview-remove:hover { opacity: 1; }

  .modal-footer {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 16px 24px 20px; border-top: 1px solid var(--gray-200);
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
  .btn-save:hover:not(:disabled) { background: var(--blue-dark); }
  .btn-save.edit-mode            { background: var(--orange); }
  .btn-save.edit-mode:hover:not(:disabled) { background: var(--orange-dark); }
  .btn-save:disabled { background: var(--gray-200); color: var(--gray-400); cursor: not-allowed; }
`;

export default function AddCandidatModal({ showModal, setShowModal, candidat = null, onSave }) {
  const isEdit = !!candidat;
  const { inscriptionRules } = useRulesCtx();

  // ── AJOUT : nom_ar / prenom_ar dans le formulaire ─────────────────────────
  const emptyForm = { nom: "", prenom: "", nom_ar: "", prenom_ar: "", dob: "", inscription: "", tel: "", sexe: "", email: "", categoriePermis: "" };
  const [form, setForm]           = useState(emptyForm);
  const [errors, setErrors]       = useState({});
  const [touched, setTouched]     = useState({});
  const [parentAuthFile, setParentAuthFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
const { blocked, needsParent, age } = evaluateRules(inscriptionRules, form.dob, form.categoriePermis);
  
  const hasValidationErrors = Object.keys(errors).length > 0;
  const canSave = !blocked && (!needsParent || parentAuthFile !== null) && !hasValidationErrors;

  // ── Validation intégrale ───────────────────────────────────────────────────
  const validate = (f = form, file = parentAuthFile) => {
    const errs = {};

    if (!f.nom.trim())    errs.nom    = "Le nom est requis.";
    if (!f.prenom.trim()) errs.prenom = "Le prénom est requis.";

    // ── AJOUT : validation des champs arabes (optionnels mais doivent être en arabe si remplis) ──
    const nomArCheck = validateArabicText(f.nom_ar, "Le nom en arabe");
    if (!nomArCheck.valid) errs.nom_ar = nomArCheck.msg;

    const prenomArCheck = validateArabicText(f.prenom_ar, "Le prénom en arabe");
    if (!prenomArCheck.valid) errs.prenom_ar = prenomArCheck.msg;

// ICI QUE JAI MODIFIE (MELISSA)
    if (!f.dob) {
      errs.dob = "La date de naissance est requise.";
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const birth = new Date(f.dob);
      const AGE_MAX_REALISTE = 100;
      const dateMin = new Date(today.getFullYear() - AGE_MAX_REALISTE, today.getMonth(), today.getDate());

      if (isNaN(birth.getTime())) {
        errs.dob = "Date de naissance invalide.";
      } else if (birth >= today) {
        errs.dob = "La date de naissance ne peut pas être dans le futur.";
      } else if (birth < dateMin) {
        errs.dob = `Date de naissance invalide (plus de ${AGE_MAX_REALISTE} ans).`;
      }
    }

    if (!f.inscription) {
      errs.inscription = "La date d'inscription est requise.";
    }

    if (!f.categoriePermis) {
      errs.categoriePermis = "Veuillez sélectionner une catégorie de permis.";
    }

    const emailCheck = validateEmail(f.email);
    if (!emailCheck.valid) errs.email = emailCheck.msg;

    const phoneCheck = validatePhone(f.tel);
    if (!phoneCheck.valid) errs.tel = phoneCheck.msg;

    if (!f.sexe) errs.sexe = "Le sexe est requis.";
    const { needsParent: np } = evaluateRules(inscriptionRules, f.dob, f.categoriePermis);
    if (np && !file) {
      errs.parentFile = "L'autorisation parentale est requise.";
    }

    return errs;
  };

  const handleChange = (field, value) => {
    // 🌟 SÉCURITÉ : Si on change la catégorie, on force la valeur en MAJUSCULES
    const cleanValue = field === "categoriePermis" ? String(value).toUpperCase() : value;
    const updated = { ...form, [field]: cleanValue };
    setForm(updated);

    if (field === "dob") {
      setParentAuthFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    if (touched[field] || field === "dob" || field === "categoriePermis") {
      setErrors(validate(updated, field === "dob" ? null : parentAuthFile));
    }
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(form, parentAuthFile));
  };

  const applyFile = (file) => {
    if (!file) return;
    const check = validateFile(file);
    if (!check.valid) {
      setErrors((e) => ({ ...e, parentFile: check.msg }));
      return;
    }
    setParentAuthFile(file);
    setErrors((e) => { const { parentFile, ...rest } = e; return rest; });
  };

  const handleFileChange = (e) => applyFile(e.target.files?.[0]);
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); applyFile(e.dataTransfer.files?.[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = ()  => setIsDragOver(false);

  // ── Écouteur de props / Reset ──────────────────────────────────────────────
  useEffect(() => {
    if (showModal) {
      setParentAuthFile(null);
      setErrors({});
      setTouched({});
      
      if (candidat) {
        // 🌟 SÉCURITÉ EXTRA : Récupération et conversion automatique en Majuscules
        const dbCategory = candidat.categoriePermis || candidat.categorie || candidat.categorie_permis || "";
        
        setForm({
          nom:         candidat.nom         || "",
          prenom:      candidat.prenom      || "",
          nom_ar:      candidat.nom_ar      || "",
          prenom_ar:   candidat.prenom_ar   || "",
          // dob:         candidat.date_naissance ? new Date(candidat.date_naissance).toISOString().split("T")[0] : "",
          // inscription: candidat.date_inscription ? new Date(candidat.date_inscription).toISOString().split("T")[0] : "",
          dob: candidat.date_naissance
  ? new Date(candidat.date_naissance).toLocaleDateString("en-CA") : "",
inscription: candidat.date_inscription
  ? new Date(candidat.date_inscription).toLocaleDateString("en-CA") : "",
          tel:         candidat.telephone    || "",
          sexe:        candidat.sexe === "M" ? "homme" : candidat.sexe === "F" ? "femme" : "",
          email:       candidat.email        || "",
          categoriePermis: String(dbCategory).toUpperCase().trim(), 
        });
      } else {
        const today = new Date().toISOString().split("T")[0];
        setForm({ nom: "", prenom: "", nom_ar: "", prenom_ar: "", dob: "", inscription: today, tel: "", sexe: "", email: "", categoriePermis: "" });
      }
    }
  }, [candidat, showModal]);

  const handleSave = () => {
    const allTouched = { nom: true, prenom: true, nom_ar: true, prenom_ar: true, dob: true, inscription: true, tel: true, sexe: true, email: true, parentFile: true, categoriePermis: true };
    setTouched(allTouched);
    
    const errs = validate();
    setErrors(errs);
    
    if (Object.keys(errs).length > 0 || blocked || (needsParent && !parentAuthFile)) return;

    onSave?.({
      idCandidat:            candidat?.idCandidat,
      nom:                   form.nom,
      prenom:                form.prenom,
      nom_ar:                form.nom_ar    || null,
      prenom_ar:             form.prenom_ar || null,
      telephone:             form.tel,
      date_naissance:        form.dob,
      date_inscription:      form.inscription,
      sexe:                  form.sexe === "homme" ? "M" : "F",
      statut:                candidat?.statut || "actif",
      categoriePermis:       String(form.categoriePermis).toUpperCase(), // Force Majuscules vers l'IpcRenderer !
      autorisationParentale: needsParent && parentAuthFile !== null,
      parentAuthFile:        parentAuthFile ?? null,
      email:                 form.email || null,
    });
  };

  if (!showModal) return null;

  return (
    <>
      <style>{css}</style>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
        <div className="modal">

          {/* Header */}
          <div className="modal-header">
            <div className="modal-title-wrap">
              <h2>{isEdit ? "Fiche Candidat / Apprentissage" : "Ajouter un candidat"}</h2>
              <span className={`mode-badge ${isEdit ? "edit" : "add"}`}>
                {isEdit ? "Dossier Unique" : "Nouveau"}
              </span>
            </div>
            <button className="modal-close" onClick={() => setShowModal(false)}><IconX /></button>
          </div>
          <hr className="modal-divider" />

          {/* Body */}
          <div className="modal-body">

            {/* Sélection de la catégorie de permis exacte */}
            <div className="field">
              <label>Catégorie de permis visée <span className="req">*</span></label>
              <select
                value={form.categoriePermis}
                className={touched.categoriePermis && errors.categoriePermis ? "input-error" : ""}
                onChange={(e) => handleChange("categoriePermis", e.target.value)}
                onBlur={() => handleBlur("categoriePermis")}
              >
                <option value="">-- Sélectionner la catégorie exacte --</option>
                {PERMIS_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              {touched.categoriePermis && errors.categoriePermis && (
                <span className="field-error">{errors.categoriePermis}</span>
              )}
            </div>

            {/* Nom */}
            <div className="field">
              <label>Nom du candidat <span className="req">*</span></label>
              <input type="text" placeholder="Saisir le nom" value={form.nom} className={touched.nom && errors.nom ? "input-error" : ""} onChange={(e) => handleChange("nom", e.target.value)} onBlur={() => handleBlur("nom")} />
              {touched.nom && errors.nom && <span className="field-error">{errors.nom}</span>}
            </div>

            {/* Nom en arabe — AJOUT */}
            <div className="field">
              <label>الاسم (nom en arabe) <span className="opt">— pour les documents officiels</span></label>
              <input
                type="text"
                dir="rtl"
                placeholder="مثال: بنعلي"
                value={form.nom_ar}
                className={`input-arabic ${touched.nom_ar && errors.nom_ar ? "input-error" : ""}`}
                onChange={(e) => handleChange("nom_ar", e.target.value)}
                onBlur={() => handleBlur("nom_ar")}
              />
              {touched.nom_ar && errors.nom_ar
                ? <span className="field-error">{errors.nom_ar}</span>
                : <span className="field-hint">Utilisé pour les listes d'examen et documents administratifs en arabe.</span>}
            </div>

            {/* Prénom */}
            <div className="field">
              <label>Prénom du candidat <span className="req">*</span></label>
              <input type="text" placeholder="Saisir le prénom" value={form.prenom} className={touched.prenom && errors.prenom ? "input-error" : ""} onChange={(e) => handleChange("prenom", e.target.value)} onBlur={() => handleBlur("prenom")} />
              {touched.prenom && errors.prenom && <span className="field-error">{errors.prenom}</span>}
            </div>

            {/* Prénom en arabe — AJOUT */}
            <div className="field">
              <label>الاسم الأول (prénom en arabe) <span className="opt">— pour les documents officiels</span></label>
              <input
                type="text"
                dir="rtl"
                placeholder="مثال: محمد"
                value={form.prenom_ar}
                className={`input-arabic ${touched.prenom_ar && errors.prenom_ar ? "input-error" : ""}`}
                onChange={(e) => handleChange("prenom_ar", e.target.value)}
                onBlur={() => handleBlur("prenom_ar")}
              />
              {touched.prenom_ar && errors.prenom_ar && <span className="field-error">{errors.prenom_ar}</span>}
            </div>

            {/* Dates */}
            <div className="row-2">
              <div className="field">
                <label>Date de naissance <span className="req">*</span></label>
                <input
                  type="date"
                  min={`${new Date().getFullYear() - 100}-01-01`}
                  max={new Date().toISOString().split("T")[0]}
                  value={form.dob}
                  className={(touched.dob && errors.dob) ? "input-error" : blocked ? "input-error" : needsParent ? "input-warning" : ""}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  onBlur={() => handleBlur("dob")}
                />
                {touched.dob && errors.dob && <span className="field-error">{errors.dob}</span>}
              </div>
              <div className="field">
                <label>Date d'inscription <span className="req">*</span></label>
                <input type="date" value={form.inscription} className={touched.inscription && errors.inscription ? "input-error" : ""} onChange={(e) => handleChange("inscription", e.target.value)} onBlur={() => handleBlur("inscription")} />
                {touched.inscription && errors.inscription && <span className="field-error">{errors.inscription}</span>}
              </div>
            </div>

            {/* Bannières réglementaires basées sur l'âge */}
            {(!form.dob || errors.dob) ? null : blocked ? (
              <div className="age-banner blocked"><span className="banner-icon">🚫</span><span>Âge ({age} ans) : Inscription non valide selon les règles.</span></div>
            ) : needsParent ? (
              <div className="age-banner warning"><span className="banner-icon">📑</span><span>Candidat mineur ({age} ans) : Autorisation parentale requise.</span></div>
            ) : (
              <div className="age-banner ok"><span className="banner-icon">✅</span><span>Âge vérifié ({age} ans) : Inscription valide.</span></div>
            )}

            {/* Zone d'autorisation parentale */}
            {needsParent && !blocked && (
              <div className="upload-section">
                {!parentAuthFile ? (
                  <>
                    <div className={`upload-zone${isDragOver ? " drag-over" : ""}${touched.parentFile && errors.parentFile ? " has-error" : ""}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS} onChange={handleFileChange} />
                      <span className="upload-icon">☁️</span>
                      <span className="upload-label">Importer l'autorisation parentale</span>
                    </div>
                    {touched.parentFile && errors.parentFile && <span className="field-error">{errors.parentFile}</span>}
                  </>
                ) : (
                  <div className="file-preview">
                    <span className="file-preview-icon">📄</span>
                    <div className="file-preview-info">
                      <div className="file-preview-name">{parentAuthFile.name}</div>
                      <div className="file-preview-meta">{formatSize(parentAuthFile.size)}</div>
                    </div>
                    <button className="file-preview-remove" onClick={() => setParentAuthFile(null)} type="button"><IconX size={16} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Contact & Profil */}
            <div className="field">
              <label>Email <span className="req">*</span></label>
              <input type="email" placeholder="email@exemple.com" value={form.email} className={touched.email && errors.email ? "input-error" : ""} onChange={(e) => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} />
              {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <label>Numéro de téléphone <span className="req">*</span></label>
              <input type="text" placeholder="06XXXXXXXX ou 07XXXXXXXX" value={form.tel} className={touched.tel && errors.tel ? "input-error" : ""} onChange={(e) => handleChange("tel", e.target.value)} onBlur={() => handleBlur("tel")} />
              {touched.tel && errors.tel && <span className="field-error">{errors.tel}</span>}
            </div>

            {/* Sexe */}
            <div className="field">
              <label>Sexe <span className="req">*</span></label>
              <div className="gender-group">
                {["homme", "femme"].map((s) => (
                  <div className="gender-option" key={s}>
                    <input type="radio" name="sexe" id={`c-${s}`} value={s} checked={form.sexe === s} onChange={() => handleChange("sexe", s)} />
                    <label htmlFor={`c-${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</label>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
            <button
              className={`btn-save ${isEdit ? "edit-mode" : ""}`}
              onClick={handleSave}
              disabled={!canSave}
            >
              {isEdit ? "Enregistrer l'apprentissage" : "Inscrire le candidat"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}