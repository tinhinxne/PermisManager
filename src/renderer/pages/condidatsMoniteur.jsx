import React, { useState, useEffect, useMemo } from "react";
import { Users, Plus, Trash2, FileText, X, Filter, History, SquarePen, Mail, Phone, Send, Paperclip, MoreHorizontal, ChevronDown, ChevronUp, PlusCircle } from "lucide-react";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import { useAuth } from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import { useExamenCtx } from "../context/ExamenContext";
import AddCandidatModal from "../components/addCondidat";

const TOUTES_CATEGORIES = [
  "Tous",
  "A1", "A", "B", "C1",
  "C", "D", "F", "BE",
  "C1E", "CE", "DE",
];

// Taille maximale autorisée pour la pièce jointe PDF (10 Mo)
const MAX_PIECE_JOINTE_BYTES = 10 * 1024 * 1024;

// Types d'examen requis pour considérer une catégorie comme "obtenue"
const TYPES_EXAMEN_REQUIS = ["Code", "Créneau", "Circulation"];

const getInitialsCandidat = (prenom, nom) =>
  `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();

// ── Historique des catégories obtenues, reconstruit depuis les examens ─────
// Une catégorie est "obtenue" dès que Code + Créneau + Circulation sont
// "Passed" pour CETTE catégorie précise. Contrairement à candidat.status
// (un seul champ, écrasé à chaque réinscription), ceci se base sur les
// examens eux-mêmes, qui restent permanents en base — donc réinscrire un
// candidat à une nouvelle catégorie n'efface JAMAIS l'historique des
// catégories déjà obtenues.
function getCategoriesObtenues(candidatId, examensList) {
  if (!Array.isArray(examensList)) return [];

  const examsCandidat = examensList.filter(
    (e) => String(e.candidatId) === String(candidatId)
  );

  const categories = [
    ...new Set(
      examsCandidat
        .map((e) => (e.categoriePermis || "").toString().trim().toUpperCase())
        .filter(Boolean)
    ),
  ];

  return categories
    .map((cat) => {
      const examsCat = examsCandidat.filter(
        (e) => (e.categoriePermis || "").toString().trim().toUpperCase() === cat
      );

      const datesReussite = {};
      TYPES_EXAMEN_REQUIS.forEach((type) => {
        const dernierReussi = examsCat
          .filter((e) => e.type === type && e.status === "Passed")
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (dernierReussi) datesReussite[type] = dernierReussi.date;
      });

      const complet = TYPES_EXAMEN_REQUIS.every((t) => datesReussite[t]);
      if (!complet) return null;

      const dateObtention = Object.values(datesReussite).sort(
        (a, b) => new Date(b) - new Date(a)
      )[0];

      return { categorie: cat, dateObtention };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.dateObtention) - new Date(a.dateObtention));
}

const STATUS_CONFIG_HISTO = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé" },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"    },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"    },
};

const SUBJECTS = [
  "Rappel de séance",
  "Convocation à l'examen",
  "Retard de paiement",
  "Félicitations",
  "Autre",
];

// ─────────────────────────────────────────────
// Clés localStorage
// ─────────────────────────────────────────────
const ENVOI_REF_KEY       = "liste_envoi_derniere_date";
const ENVOI_DEFAULTS_KEY  = "export_pdf_defaults";
const ENVOI_IDS_KEY       = "liste_envoi_ids_envoyes";
const ENVOI_TIMESTAMP_KEY = "liste_envoi_derniere_generation";

// Nombre de séances "normales" avant de basculer en séances supplémentaires
const SESSIONS_NORMALES_MAX = 20;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDateAr(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  const d = new Date(str.includes("T") ? str : str + "T12:00:00");
  if (isNaN(d)) return str;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${j}`;
}

function formatDateHeure(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return "";
  const j   = String(d.getDate()).padStart(2, "0");
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const y   = d.getFullYear();
  const h   = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${j}/${m}/${y} à ${h}:${min}`;
}

function toComparableDate(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  return str.slice(0, 10);
}

// Formatte une taille en octets en texte lisible
function formatTailleFichier(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─────────────────────────────────────────────
// Sous-composant champ formulaire
// ─────────────────────────────────────────────
const FormField = ({ label, value, onChange, placeholder, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid #d1d5db", fontSize: 13.5,
        color: "#1F2937", background: "#fff",
        outline: "none", boxSizing: "border-box",
      }}
    />
  </div>
);

// ─────────────────────────────────────────────
// Modale Contact par email (+ pièce jointe PDF)
// ─────────────────────────────────────────────
function ContactModal({ candidat, onClose }) {
  const [sujet,       setSujet]       = useState(SUBJECTS[0]);
  const [sujetCustom, setSujetCustom] = useState("");
  const [message,     setMessage]     = useState("");
  const [pieceJointe, setPieceJointe] = useState(null); // { nom, taille, type, data(base64) }
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState("");

  const email = candidat._raw?.email;
  const hasEmail = !!email;
  const nomComplet = candidat.nom; // déjà "prénom nom" formaté dans candidatsMoniteur

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Seuls les fichiers PDF sont acceptés.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PIECE_JOINTE_BYTES) {
      setError(`Le fichier est trop volumineux (max ${formatTailleFichier(MAX_PIECE_JOINTE_BYTES)}).`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] || "";
      setPieceJointe({
        nom: file.name,
        taille: file.size,
        type: file.type,
        data: base64,
      });
      setError("");
    };
    reader.onerror = () => {
      setError("Impossible de lire le fichier sélectionné.");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleRemovePieceJointe = () => setPieceJointe(null);

  const handleSend = async () => {
    const sujetFinal = sujet === "Autre" ? sujetCustom.trim() : sujet;
    if (!message.trim())                          { setError("Le message ne peut pas être vide."); return; }
    if (sujet === "Autre" && !sujetCustom.trim()) { setError("Veuillez saisir un sujet."); return; }
    if (!hasEmail)                                { setError("Ce candidat n'a pas d'adresse email enregistrée."); return; }
    setSending(true);
    setError("");
    try {
      const result = await window.electron.sendCandidatMessage({
        email,
        nomCandidat: nomComplet,
        sujet: sujetFinal,
        message,
        pieceJointe: pieceJointe
          ? { nom: pieceJointe.nom, type: pieceJointe.type, data: pieceJointe.data }
          : null,
      });
      if (result?.success) setSent(true);
      else setError(result?.message || "Erreur lors de l'envoi. Vérifiez votre connexion.");
    } catch (err) {
      setError("Erreur inattendue : " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "inherit",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16,
        width: 480, maxWidth: "95vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "slideUp .22s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <style>{`
          @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
          @keyframes spin    { to{transform:rotate(360deg)} }
        `}</style>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px 14px", borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#dbeafe", color: "#185fa5",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>
              {getInitialsCandidat(candidat.prenom, candidat.nomSeul)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                Contacter {nomComplet}
              </div>
              <div style={{ fontSize: 12, color: hasEmail ? "#64748b" : "#ef4444" }}>
                {hasEmail ? email : "⚠ Pas d'email enregistré"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#64748b",
          }}>
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Send size={24} color="#16a34a" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Email envoyé !</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Le message a été transmis à <strong>{email}</strong>.
            </div>
            <button onClick={onClose} style={{
              marginTop: 8, padding: "10px 28px", borderRadius: 10,
              background: "#2b537e", border: "none", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Fermer
            </button>
          </div>
        ) : (
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Sujet <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={sujet}
                onChange={(e) => { setSujet(e.target.value); setSujetCustom(""); setError(""); }}
                style={{
                  padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9,
                  fontFamily: "inherit", fontSize: 13, color: "#1e293b",
                  background: "#f8fafc", outline: "none",
                }}
              >
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>

              {sujet === "Autre" && (
                <input
                  type="text"
                  value={sujetCustom}
                  onChange={(e) => { setSujetCustom(e.target.value); setError(""); }}
                  placeholder="Saisissez votre sujet…"
                  style={{
                    padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9,
                    fontFamily: "inherit", fontSize: 13, color: "#1e293b",
                    background: "#f8fafc", outline: "none", marginTop: 4,
                  }}
                />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Message <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(""); }}
                placeholder="Saisissez votre message ici…"
                rows={5}
                style={{
                  padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9,
                  fontFamily: "inherit", fontSize: 13, color: "#1e293b",
                  background: "#f8fafc", outline: "none", resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
            </div>

            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: -8 }}>
              {message.length} caractère{message.length !== 1 ? "s" : ""}
            </div>

            {/* ── Pièce jointe PDF ─────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Pièce jointe (PDF, optionnel)
              </label>

              {!pieceJointe ? (
                <label style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", border: "1.5px dashed #cbd5e1", borderRadius: 9,
                  fontSize: 13, color: "#64748b", cursor: "pointer", background: "#f8fafc",
                }}>
                  <Paperclip size={15} />
                  Joindre un fichier PDF…
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", border: "1.5px solid #bbf7d0", borderRadius: 9,
                  fontSize: 13, background: "#f0fdf4",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534", fontWeight: 600, overflow: "hidden" }}>
                    <FileText size={15} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pieceJointe.nom}
                    </span>
                    <span style={{ color: "#4d7c0f", fontWeight: 500, flexShrink: 0 }}>
                      ({formatTailleFichier(pieceJointe.taille)})
                    </span>
                  </span>
                  <X
                    size={15}
                    style={{ cursor: "pointer", color: "#64748b", flexShrink: 0, marginLeft: 8 }}
                    onClick={handleRemovePieceJointe}
                  />
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: "9px 13px", borderRadius: 9,
                background: "#fef2f2", border: "1px solid #fca5a5",
                color: "#dc2626", fontSize: 12, fontWeight: 500,
              }}>
                ⚠ {error}
              </div>
            )}

            {!hasEmail && (
              <div style={{
                padding: "9px 13px", borderRadius: 9,
                background: "#fff7ed", border: "1px solid #fed7aa",
                color: "#c2410c", fontSize: 12, fontWeight: 500,
              }}>
                ⚠ Ce candidat n'a pas d'adresse email. Ajoutez-en une dans sa fiche pour pouvoir le contacter.
              </div>
            )}
          </div>
        )}

        {!sent && (
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 10,
            padding: "14px 22px 18px", borderTop: "1px solid #e2e8f0",
          }}>
            <button onClick={onClose} style={{
              padding: "9px 20px", borderRadius: 10,
              background: "#f1f5f9", border: "none", color: "#64748b",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !hasEmail}
              style={{
                padding: "9px 22px", borderRadius: 10,
                background: sending || !hasEmail ? "#94a3b8" : "#2b537e",
                border: "none", color: "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: sending || !hasEmail ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 7,
                transition: "background .15s",
              }}
            >
              {sending ? (
                <>
                  <div style={{
                    width: 13, height: 13, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTop: "2px solid #fff",
                    animation: "spin .7s linear infinite",
                  }} />
                  Envoi…
                </>
              ) : (
                <><Send size={14} /> Envoyer</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modale لائحة الإرسال
// ─────────────────────────────────────────────
function EnvoiCandidatsModal({ candidats, onClose }) {
  const [dateDebut,          setDateDebut]          = useState("");
  const [dateFin,            setDateFin]            = useState("");
  const [wilaya,             setWilaya]             = useState("");
  const [nomEcole,           setNomEcole]           = useState("");
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");
  const [sentIds,            setSentIds]            = useState([]);
  const [derniereGeneration, setDerniereGeneration] = useState("");

  useEffect(() => {
    try {
      const ref = localStorage.getItem(ENVOI_REF_KEY);
      if (ref) setDateDebut(ref);

      const ids = JSON.parse(localStorage.getItem(ENVOI_IDS_KEY) || "[]");
      setSentIds(Array.isArray(ids) ? ids : []);

      const defaults = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
      setWilaya(defaults.wilaya   || "");
      setNomEcole(defaults.nomEcole || "");

      const ts = localStorage.getItem(ENVOI_TIMESTAMP_KEY);
      if (ts) setDerniereGeneration(ts);
    } catch {
      setSentIds([]);
    }
  }, []);

  const candidatsFiltres = candidats.filter((c) => {
    const insc = toComparableDate(c._raw?.date_inscription);
    if (!insc || !dateDebut || !dateFin) return false;
    return insc >= dateDebut && insc <= dateFin;
  });

  const periodeVide = !!dateDebut && !!dateFin && candidatsFiltres.length === 0;

  const handleConfirm = async () => {
    setError("");
    if (!dateDebut)       { setError("Merci de renseigner la date de début.");                           return; }
    if (!dateFin)         { setError("Merci de choisir la date jusqu'à laquelle inclure les inscrits."); return; }
    if (!wilaya.trim())   { setError("Merci de renseigner la wilaya.");                                  return; }
    if (candidatsFiltres.length === 0) { setError("Aucun candidat inscrit sur cette période.");          return; }

    setLoading(true);
    try {
      const candidatsPourEnvoi = candidatsFiltres.map((c) => {
        const nomAr    = c._raw?.nom_ar    || "";
        const prenomAr = c._raw?.prenom_ar || "";
        return {
          nomPrenom:     `${c.prenom} ${c.nom}`,
          nomPrenomAr:   (nomAr || prenomAr) ? `${nomAr} ${prenomAr}`.trim() : "",
          dateNaissance: formatDateAr(c._raw?.date_naissance),
          categorie:     c.categoriePermis || "",
        };
      });

      const savedPath = await window.electron.generateListeEnvoiPDF({
        wilaya,
        nomEcole,
        dateDepot: formatDateAr(dateFin),
        candidats: candidatsPourEnvoi,
      });

      if (savedPath) {
        localStorage.setItem(ENVOI_REF_KEY, dateFin);

        const nouveauxIds = Array.from(
          new Set([...sentIds, ...candidatsFiltres.map((c) => c.id)])
        );
        localStorage.setItem(ENVOI_IDS_KEY, JSON.stringify(nouveauxIds));

        const nowIso = new Date().toISOString();
        localStorage.setItem(ENVOI_TIMESTAMP_KEY, nowIso);
        setDerniereGeneration(nowIso);

        try {
          const prev = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
          localStorage.setItem(ENVOI_DEFAULTS_KEY, JSON.stringify({ ...prev, wilaya, nomEcole }));
        } catch { /* ignore */ }

        alert(`لائحة الإرسال enregistrée :\n${savedPath}`);
        onClose();
      }
    } catch (e) {
      console.error("Erreur génération لائحة الإرسال :", e);
      alert("Erreur lors de la génération du document.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, padding: 24,
          width: 420, maxWidth: "90vw",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>لائحة الإرسال — نوعي الجديد</h3>
          <button
            onClick={() => !loading && onClose()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
          Liste de mes candidats inscrits sur la période choisie — المندوبية الولائية للأمن في الطرق
        </p>

        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 8, padding: "8px 12px", marginBottom: 14,
          fontSize: 12, color: "#475569",
        }}>
          {derniereGeneration
            ? <>Dernière liste générée le <strong>{formatDateHeure(derniereGeneration)}</strong></>
            : "Aucune liste générée pour le moment."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <FormField label="Depuis le"               value={dateDebut} onChange={setDateDebut} type="date" required />
          <FormField label="Jusqu'au"                value={dateFin}   onChange={setDateFin}   type="date" required />
          <FormField label="الولاية (Wilaya)"        value={wilaya}    onChange={setWilaya}    placeholder="Ex : بجاية / Béjaïa" required />
          <FormField label="Nom de l'auto-école (optionnel)" value={nomEcole} onChange={setNomEcole} placeholder="Ex : Auto-École Essalem" />
        </div>

        {periodeVide ? (
          <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
            Aucun de mes candidats inscrit sur cette période.
          </div>
        ) : (
          <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
            <strong style={{ color: "#1f2937" }}>Mes candidats trouvés sur cette période :</strong> {candidatsFiltres.length}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 10, padding: "9px 13px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13.5, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Génération..." : "Générer لائحة الإرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers cartes
// ─────────────────────────────────────────────
const getInitials = (nom) =>
  nom.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  { color: "#dbeafe", textColor: "#185fa5" },
  { color: "#dcfce7", textColor: "#3b6d11" },
  { color: "#faeeda", textColor: "#854f0b" },
  { color: "#fbeaf0", textColor: "#993556" },
  { color: "#eeedfe", textColor: "#534ab7" },
];
function openWhatsAppBienvenue(telephone, prenom) {
  if (!telephone) return;
  // Garde uniquement les chiffres
  let numero = telephone.replace(/\D/g, "");
  // Ajoute l'indicatif Algérie (213) si le numéro commence par 0
  if (numero.startsWith("0")) {
    numero = "213" + numero.slice(1);
  }
  const message = `Bonjour ${prenom}, bienvenue à l'auto-école ! 🚗 Nous sommes ravis de vous compter parmi nos candidats.`;
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ── Contact WhatsApp manuel (sans message pré-rempli de bienvenue) ──
function openWhatsAppContact(telephone) {
  if (!telephone) return;
  let numero = telephone.replace(/\D/g, "");
  if (numero.startsWith("0")) {
    numero = "213" + numero.slice(1);
  }
  window.open(`https://wa.me/${numero}`, "_blank");
}

function HistoriqueExamensModal({ candidat, examensList, onClose }) {
  const nomComplet = `${candidat.prenom} ${candidat.nom}`;
  const historique = examensList
    .filter((e) => String(e.candidatId) === String(candidat.id))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 560, maxWidth: "95vw", maxHeight: "80vh", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ede9fe", color: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
              {getInitialsCandidat(candidat.prenom, candidat.nom)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Historique des examens — {nomComplet}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{historique.length} session{historique.length !== 1 ? "s" : ""} d'examen</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px 22px", overflowY: "auto" }}>
          {historique.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 13 }}>
              Aucun examen enregistré pour ce candidat.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historique.map((ex) => {
                const st = STATUS_CONFIG_HISTO[ex.status] || STATUS_CONFIG_HISTO.Scheduled;
                return (
                  <div key={ex.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>
                        {ex.type}
                        {ex.categoriePermis && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#0369a1", background: "#e0f2fe", padding: "1px 7px", borderRadius: 10 }}>
                            {ex.categoriePermis}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {ex.date} {ex.heure ? `· ${ex.heure}` : ""} {ex.lieu ? `· ${ex.lieu}` : ""}
                      </div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 22px 18px", borderTop: "1px solid #e2e8f0" }}>
          <button onClick={onClose} style={{ padding: "9px 22px", borderRadius: 10, background: "#2b537e", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function EditExterneModal({ candidat, onClose, onSave }) {
  const [form, setForm] = useState({
    idCandidat: candidat.idCandidat,
    prenom: candidat.prenom || "",
    nom: candidat.nom || "",
    telephone: candidat.telephone || "",
    date_naissance: candidat.date_naissance ? String(candidat.date_naissance).slice(0, 10) : "",
    sexe: candidat.sexe || "M",
    categoriePermis: candidat.categoriePermis || "B",
    email: candidat.email || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", color: "#1e293b" };
  const lbl = { fontSize: 11.5, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 };

  const handleSubmit = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.date_naissance) {
      setError("Prénom, nom et date de naissance sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 460, maxWidth: "94vw", padding: 22, boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
          Modifier — personne externe (perfectionnement)
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Prénom *</label>
            <input style={inp} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Nom *</label>
            <input style={inp} value={form.nom} onChange={(e) => set("nom", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Date de naissance *</label>
            <input type="date" style={inp} value={form.date_naissance} onChange={(e) => set("date_naissance", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Sexe *</label>
            <select style={inp} value={form.sexe} onChange={(e) => set("sexe", e.target.value)}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Catégorie</label>
            <select style={inp} value={form.categoriePermis} onChange={(e) => set("categoriePermis", e.target.value)}>
              {TOUTES_CATEGORIES.filter((c) => c !== "Tous").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Téléphone</label>
            <input style={inp} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Email</label>
          <input type="email" style={inp} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>

        {error && (
          <div style={{ marginBottom: 12, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600 }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 9, border: "none", background: saving ? "#94a3b8" : "#0369a1", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700 }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmAuditeurModal({ candidat, onConfirm, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 400, maxWidth: "92vw", padding: 24, boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
          Inscrire à l'auto-école ?
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
          <strong>{candidat.prenom} {candidat.nom}</strong> va devenir un candidat officiel de l'auto-école. Vous pourrez ensuite compléter son dossier.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Annuler
          </button>
          <button onClick={() => onConfirm(candidat)} style={{ flex: 2, padding: "10px 0", borderRadius: 9, border: "none", background: "#166534", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            ✓ Inscrire
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL de sélection : quel candidat réinscrire à une nouvelle catégorie ──
// Permet de rechercher parmi tous les candidats du moniteur ayant déjà
// obtenu un permis, quels que soient les filtres actifs sur l'onglet.
function SelectReinscriptionModal({ candidats, onSelect, onClose }) {
  const [query, setQuery] = useState("");

  const resultats = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = !q
      ? candidats
      : candidats.filter((c) =>
          c.nom.toLowerCase().includes(q) ||
          c.prenom.toLowerCase().includes(q) ||
          (c._raw?.matricule && c._raw.matricule.toLowerCase().includes(q)) ||
          c.categoriePermisObtenue.toLowerCase().includes(q)
        );
    return base.slice(0, 50);
  }, [candidats, query]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 520, maxWidth: "94vw", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Réinscrire un candidat</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Recherchez parmi vos candidats ayant déjà obtenu un permis</div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px 22px 12px" }}>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Nom, prénom, matricule ou catégorie…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 14px",
              border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13.5,
              color: "#1e293b", background: "#f8fafc", outline: "none",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
          {resultats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 13 }}>
              Aucun candidat trouvé.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {resultats.map((c) => (
                <button
                  key={`${c.id}-${c.categoriePermisObtenue}`}
                  onClick={() => onSelect(c)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0",
                    background: "#fff", cursor: "pointer", textAlign: "left", width: "100%",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.nom}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                      {c._raw?.matricule ? `Mat. ${c._raw.matricule} · ` : ""}
                      Obtenu le {c.dateObtention ? new Date(c.dateObtention).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, background: "#e0f2fe", color: "#0369a1", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                    {c.categoriePermisObtenue}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MODAL confirmation de réinscription à une nouvelle catégorie ───────────
// Rassure explicitement que l'historique de l'ancienne catégorie n'est pas
// perdu — juste masqué de "Mes candidats" puisqu'elle est déjà obtenue.
function ConfirmReinscriptionModal({ candidat, onConfirm, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "92vw", padding: 24, boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
          Inscrire à une nouvelle catégorie ?
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.55 }}>
          <strong>{candidat.nom}</strong> repassera au statut "en formation" pour la nouvelle catégorie choisie.
        </div>
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
          padding: "10px 12px", marginBottom: 20, fontSize: 12.5, color: "#166534",
        }}>
          <span style={{ fontSize: 15, marginTop: 1 }}>🛡️</span>
          <span>
            Son historique — y compris <strong>{candidat.categoriePermisObtenue}</strong> déjà obtenu le{" "}
            {candidat.dateObtention ? new Date(candidat.dateObtention).toLocaleDateString("fr-FR") : "—"} —
            reste conservé et consultable dans l'onglet <strong>Permis obtenus</strong>. Rien n'est effacé.
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(candidat)}
            style={{ flex: 2, padding: "10px 0", borderRadius: 9, border: "none", background: "#166534", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            ✓ Continuer la réinscription
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Menu d'actions dépliable pour une card candidat
// ─────────────────────────────────────────────
function CandidateActions({ candidat, canEdit, canRemove, onEdit, onHistorique, onEmail, onWhatsapp, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hasEmail = !!candidat._raw?.email;
  const wrapRef = React.useRef(null);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setExpanded(false);
    };
    const handleEscape = (e) => { if (e.key === "Escape") setExpanded(false); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [expanded]);

  const actions = [];
  if (canEdit) {
    actions.push({ key: "edit", icon: <SquarePen size={15} />, label: "Modifier", onClick: onEdit, color: "#2563eb", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)" });
  }
  actions.push({ key: "histo", icon: <History size={15} />, label: "Historique", onClick: onHistorique, color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.25)" });
  actions.push({
    key: "email", icon: <Mail size={15} />, label: "Email", onClick: onEmail, disabled: !hasEmail,
    color: hasEmail ? "#2b537e" : "#94a3b8",
    bg: hasEmail ? "rgba(43,83,126,0.08)" : "rgba(148,163,184,0.08)",
    border: hasEmail ? "rgba(43,83,126,0.25)" : "rgba(148,163,184,0.25)",
  });
  if (candidat.tel) {
    actions.push({ key: "wa", icon: <Phone size={15} />, label: "WhatsApp", onClick: onWhatsapp, color: "#128c4a", bg: "rgba(37,211,102,0.1)", border: "rgba(37,211,102,0.3)" });
  }
  if (canRemove) {
    actions.push({ key: "delete", icon: <Trash2 size={15} />, label: "Supprimer", onClick: onDelete, color: "#dc2626", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" });
  }

  return (
    <div ref={wrapRef} style={{ marginTop: 10, position: "relative" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", padding: "8px 0", borderRadius: 8,
          background: expanded ? "#2b537e" : "rgba(43,83,126,0.08)",
          border: `1px solid ${expanded ? "#2b537e" : "rgba(43,83,126,0.22)"}`,
          color: expanded ? "#fff" : "#2b537e",
          fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          transition: "background .15s, color .15s",
        }}
      >
        <MoreHorizontal size={14} />
        Actions
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40,
          display: "flex", flexDirection: "column", gap: 5,
          background: "#fff", border: "1px solid #e6ebf2", borderRadius: 10,
          padding: 5, boxShadow: "0 10px 26px rgba(15,23,42,0.16)",
        }}>
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.disabled ? "Pas d'email enregistré" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 9px", borderRadius: 7,
                background: "transparent", border: "none", textAlign: "left",
                cursor: a.disabled ? "not-allowed" : "pointer",
                opacity: a.disabled ? 0.55 : 1,
                transition: "background .12s",
              }}
              onMouseEnter={(e) => { if (!a.disabled) e.currentTarget.style.background = a.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: a.bg, border: `1px solid ${a.border}`, color: a.color,
              }}>
                {a.icon}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
           {a.label}
                {a.disabled && (
                  <span style={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "#94a3b8" }}>
                    Pas d'email enregistré
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
const condidatsMoniteur = () => {
  const { currentUser } = useAuth();
  const {
    CAN_VIEW_ALL_CANDIDATES,
    CAN_REMOVE_CANDIDAT,
    CAN_ADD_CANDIDAT,
    CAN_EDIT_CANDIDAT, 
    CAN_EXPORT_LISTE_ENVOI,
  } = useMyPermissions();

  const [search,         setSearch]         = useState("");
  const [candidats,      setCandidats]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [editCandidat,   setEditCandidat]   = useState(null);
  const [isReinscription, setIsReinscription] = useState(false);
  const [showEnvoiModal, setShowEnvoiModal] = useState(false);
  const [nbSeancesMax,   setNbSeancesMax]   = useState(SESSIONS_NORMALES_MAX);
  const [contactCandidat, setContactCandidat] = useState(null);

  const [activeTab, setActiveTab] = useState("encours");
  const { examensList } = useExamenCtx();
  const [historiqueCandidat, setHistoriqueCandidat] = useState(null);

  const [selectedCategorieExterne, setSelectedCategorieExterne] = useState("Tous");
  const [editingExterne, setEditingExterne] = useState(null);
  const [deletingExterneId, setDeletingExterneId] = useState(null);

  const [auditeursLibres, setAuditeursLibres] = useState([]);
  const [selectedCategorieAuditeur, setSelectedCategorieAuditeur] = useState("Tous");
  const [convertingId, setConvertingId] = useState(null);
  const [confirmAuditeur, setConfirmAuditeur] = useState(null);

  // ── Filtres pour l'onglet "Permis obtenus" ──────────────────────────────
  const [selectedCategorieObtenu, setSelectedCategorieObtenu] = useState("Tous");
  const [dateObtentionDebut, setDateObtentionDebut] = useState("");
  const [dateObtentionFin,   setDateObtentionFin]   = useState("");

  // ── Réinscription à une nouvelle catégorie ──────────────────────────────
  const [confirmReinscription, setConfirmReinscription] = useState(null);
  const [showSelectReinscriptionModal, setShowSelectReinscriptionModal] = useState(false);

  // ── Chargement ───────────────────────────────────────────────────────────────
const loadData = async (maxOverride) => {
    const max = maxOverride ?? nbSeancesMax;
    try {
      setLoading(true);
      const [rawCandidats, rawSeances] = await Promise.all([
        window.electron.getCandidats(),
        window.electron.getSeances(),
      ]);

      const moniteurId = currentUser?.id;

      const mesSeances = moniteurId
        ? rawSeances.filter((s) => s.moniteur_id === moniteurId)
        : [];

      const mesCandidatIdSet = new Set();
      mesSeances.forEach((s) => {
        if (!s.candidatsIds) return;
        String(s.candidatsIds).split(",")
          .forEach((id) => mesCandidatIdSet.add(parseInt(id.trim())));
      });

      const mesCreationSet = new Set(
        rawCandidats
          .filter((c) => c.created_by_moniteur_id != null && c.created_by_moniteur_id === moniteurId)
          .map((c) => c.idCandidat)
      );

      const seancesPourCalcul = CAN_VIEW_ALL_CANDIDATES ? rawSeances : mesSeances;

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const formatted = rawCandidats
        .filter((c) =>
          CAN_VIEW_ALL_CANDIDATES ||
          mesCandidatIdSet.has(c.idCandidat) ||
          mesCreationSet.has(c.idCandidat)
        )
        .map((c, index) => {
          const currentCat = (
            c.categoriePermis || c.categorie || c.categorie_permis || "B"
          ).toString().trim().toUpperCase();

          const seancesDuCandidat = seancesPourCalcul.filter((s) => {
            if (!s.candidatsIds) return false;
            const matchCandidat = String(s.candidatsIds).split(",")
              .map((id) => parseInt(id.trim()))
              .includes(c.idCandidat);
            if (!matchCandidat) return false;

            const typeNorm = (s.type || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (typeNorm.includes("code")) return false; // compté à part

            const statutNorm = (s.statut || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return statutNorm !== "annulee";
          });

          // ── Les cours de code ne comptent pas dans le total de séances : ──
          // ── on ne compte qu'à partir du circuit/circulation (code déjà réussi) ──
          const nbSessions      = Math.min(seancesDuCandidat.length, max);
          const nbSessionsSuppl = Math.max(seancesDuCandidat.length - max, 0);

          const nextSeance = seancesDuCandidat
            .map((s) => {
              const dateObj = s.date instanceof Date ? s.date : new Date(s.date);
              const [h, m, sec] = (s.heure || "08:00").split(":");
              const dt = new Date(dateObj);
              dt.setHours(parseInt(h), parseInt(m), parseInt(sec || 0), 0);
              return { ...s, _dt: dt };
            })
            .filter((s) => {
              const seanceMidnight = new Date(s._dt);
              seanceMidnight.setHours(0, 0, 0, 0);
              const isToday  = seanceMidnight.getTime() === todayMidnight.getTime();
              const isFuture = seanceMidnight > todayMidnight;
              const isDone   = s.statut === "terminée" || s.statut === "annulée";
              return (isToday || isFuture) && !isDone;
            })
            .sort((a, b) => a._dt - b._dt)[0];

          const nextSession = nextSeance
            ? `${new Date(nextSeance._dt).toLocaleDateString("fr-FR")} ${nextSeance.heure}`
            : "—";

          const isMien = mesCandidatIdSet.has(c.idCandidat) || mesCreationSet.has(c.idCandidat);
          const isNouveauInscrit = mesCreationSet.has(c.idCandidat) && !mesCandidatIdSet.has(c.idCandidat);

              return {
            id:              c.idCandidat,
            nom:             `${c.prenom} ${c.nom}`,
            prenomSeul:      c.prenom,
            nomSeul:         c.nom,
            prenom:          c.prenom,
            tel:             c.telephone,
            categoriePermis: currentCat,
            sessions:        nbSessions,
            sessionsSuppl:   nbSessionsSuppl,
            total:           max,
            nextSession,
            status:          c.statut,
            externe:         !!c.externe,
            isMien,
            isNouveauInscrit,
            _raw:            c,
            ...AVATAR_COLORS[index % AVATAR_COLORS.length],
          };
        });

      setCandidats(formatted);
    } catch (error) {
      console.error("Erreur lors du chargement des candidats :", error);
      setCandidats([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditeursLibres = async () => {
    try {
      const rows = await window.electron.getAuditeursLibres();
      setAuditeursLibres(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("Erreur chargement auditeurs libres:", e);
    }
  };

 useEffect(() => {
  (async () => {
    let max = SESSIONS_NORMALES_MAX;
    try {
      const nb = await window.electron.getNbSeances();
      max = Number(nb) || SESSIONS_NORMALES_MAX;
      setNbSeancesMax(max);
    } catch (e) {
      console.error("Erreur chargement nombre de séances configuré:", e);
    }
    await loadData(max);
    await loadAuditeursLibres();
  })();
}, [currentUser?.id, CAN_VIEW_ALL_CANDIDATES]);

  // ── Rafraîchit dès qu'une séance est créée/modifiée/annulée (Agenda) ──
  useEffect(() => {
    const handlerSeance = () => loadData();
    const handlerNbSeances = async () => {
      try {
        const nb = await window.electron.getNbSeances();
        const max = Number(nb) || SESSIONS_NORMALES_MAX;
        setNbSeancesMax(max);
        await loadData(max);
      } catch (e) {
        console.error("Erreur rechargement nombre de séances:", e);
      }
    };
    window.addEventListener("seance-updated", handlerSeance);
    window.addEventListener("nb-seances-updated", handlerNbSeances);
    return () => {
      window.removeEventListener("seance-updated", handlerSeance);
      window.removeEventListener("nb-seances-updated", handlerNbSeances);
    };
  }, [nbSeancesMax]);


  // ── Ajouter / Modifier ──────────────────────────────────────────────────
  const handleAdd = () => {
    if (!CAN_ADD_CANDIDAT) return;
    setIsReinscription(false);
    setEditCandidat(null);
    setShowModal(true);
  };
  const handleEdit = (candidat) => {
    if (!CAN_EDIT_CANDIDAT) return;
    setIsReinscription(false);
    setEditCandidat(candidat);
    setShowModal(true);
  };

  // Demande de réinscription : passe d'abord par une confirmation explicite
  // qui rassure sur la conservation de l'historique (voir ConfirmReinscriptionModal).
  const handleDemandeReinscription = (candidat) => {
    setShowSelectReinscriptionModal(false);
    setConfirmReinscription(candidat);
  };

  const handleConfirmerReinscription = (candidat) => {
    setConfirmReinscription(null);
    setIsReinscription(true);
    setEditCandidat(candidat._raw);
    setShowModal(true);
  };

const handleSave = async (data) => {
  if (!CAN_ADD_CANDIDAT) return;
  if (data.isReinscription) {
    // reinscrireCandidat ne modifie QUE categoriePermis et statut (retour à
    // "en cours") — les examens déjà passés pour l'ancienne catégorie ne
    // sont jamais touchés côté base, donc l'historique reconstruit via
    // getCategoriesObtenues reste intact après cet appel.
    await window.electron.reinscrireCandidat(data);
  } else if (data.idCandidat) {
    await window.electron.updateCandidat(data);
  } else {
    // ── On passe l'id du moniteur connecté comme créateur ──
    await window.electron.addCandidat({
      ...data,
      created_by_moniteur_id: currentUser?.id ?? null,
    });
    // Nouveau candidat uniquement → message de bienvenue WhatsApp
    openWhatsAppBienvenue(data.telephone, data.prenom);
  }
  await loadData();
  setShowModal(false);
};

  // ── Supprimer ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!CAN_REMOVE_CANDIDAT) return;
    const confirmed = window.confirm("Supprimer ce candidat définitivement ? Cette action est irréversible.");
    if (!confirmed) return;
    const result = await window.electron.deleteCandidat(id);
    if (result?.success) {
      await loadData();
    } else {
      alert("Erreur lors de la suppression du candidat.");
    }
  };

  // ── Bordereau ────────────────────────────────────────────────────────────────
  const handleOpenEnvoiModal = () => {
    if (!CAN_EXPORT_LISTE_ENVOI) return;
    if (candidats.length === 0) {
      alert("Aucun candidat enregistré pour le moment.");
      return;
    }
    setShowEnvoiModal(true);
  };

  // ── Stats + filtre ────────────────────────────────────────────────────────────

  const filtered = candidats.filter(
    (c) =>
      (c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.tel?.toLowerCase().includes(search.toLowerCase())) &&
      !c.externe
  );

  // ── Base pour "Permis obtenus" / "Réinscrits" — tous mes candidats internes,
  // indépendamment de la barre de recherche "Mes candidats" ──────────────────
  const candidatsBaseSansExterne = useMemo(
    () => candidats.filter((c) => !c.externe),
    [candidats]
  );

  // ── Réinscrits — en formation pour une NOUVELLE catégorie ──────────────────
  // = possède déjà ≥1 catégorie obtenue dans le passé (historique des
  // examens) MAIS n'a pas encore obtenu sa catégorie ACTUELLE. Basé
  // uniquement sur les examens, jamais sur le champ brut c.status.
  const candidatsReinscrits = useMemo(() => {
    return candidatsBaseSansExterne
      .map((c) => {
        const categoriesObtenues = getCategoriesObtenues(c.id, examensList);
        const categoriesNoms = categoriesObtenues.map((co) => co.categorie);
        const dejaObtenueCategorieActuelle = categoriesNoms.includes(c.categoriePermis);
        const anciennesCategories = categoriesNoms.filter((cat) => cat !== c.categoriePermis);
        return anciennesCategories.length > 0 && !dejaObtenueCategorieActuelle
          ? { ...c, anciennesCategories }
          : null;
      })
      .filter(Boolean);
  }, [candidatsBaseSansExterne, examensList]);

  // IDs des réinscrits, pour ne pas les afficher en double dans "Mes candidats"
  const reinscritsIds = useMemo(
    () => new Set(candidatsReinscrits.map((c) => c.id)),
    [candidatsReinscrits]
  );

  // ── Permis obtenus — reconstruit depuis examensList, PAS depuis c.status ──
  // Une ligne par catégorie effectivement obtenue ; réinscrire ce candidat à
  // une nouvelle catégorie ne fait disparaître AUCUNE de ces lignes.
  const candidatsObtenusTous = useMemo(() => {
    return candidatsBaseSansExterne
      .flatMap((c) => {
        const categoriesObtenues = getCategoriesObtenues(c.id, examensList);
        return categoriesObtenues.map((co) => ({
          ...c,
          categoriePermisObtenue: co.categorie,
          dateObtention: co.dateObtention,
          estCategorieActive: c.status === "obtenu" && c.categoriePermis === co.categorie,
        }));
      })
      .sort((a, b) => new Date(b.dateObtention || 0) - new Date(a.dateObtention || 0));
  }, [candidatsBaseSansExterne, examensList]);

  const candidatsObtenus = useMemo(() => {
    return candidatsObtenusTous.filter((row) => {
      const matchesCategorie =
        selectedCategorieObtenu === "Tous" ||
        row.categoriePermisObtenue === selectedCategorieObtenu.toUpperCase();
      const d = toComparableDate(row.dateObtention);
      const matchesDate =
        (!dateObtentionDebut || (d && d >= dateObtentionDebut)) &&
        (!dateObtentionFin   || (d && d <= dateObtentionFin));
      return matchesCategorie && matchesDate;
    });
  }, [candidatsObtenusTous, selectedCategorieObtenu, dateObtentionDebut, dateObtentionFin]);

  // ── Split : candidats en cours vs permis obtenus vs réinscrits ────────────
  const filteredEnCours = filtered.filter(
    (c) => c.status !== "obtenu" && !reinscritsIds.has(c.id)
  );

  // ── Personnes externes (perfectionnement) ──────────────────────────────
  const candidatsExternes = candidats.filter((c) => {
    if (!c.externe) return false;
    const matchesCategorie = selectedCategorieExterne === "Tous" || c.categoriePermis === selectedCategorieExterne.toUpperCase();
    return matchesCategorie;
  });

  const handleDeleteExterne = async (id) => {
    if (!window.confirm("Supprimer cette personne externe ?")) return;
    setDeletingExterneId(id);
    try {
      const ok = await window.electron.deleteCandidatExterne(id);
      if (ok) {
        await loadData();
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression.");
    } finally {
      setDeletingExterneId(null);
    }
  };

  const handleSaveExterne = async (payload) => {
    try {
      const result = await window.electron.updateCandidatExterne(payload);
      if (result) {
        await loadData();
        setEditingExterne(null);
      } else {
        alert("Erreur lors de la mise à jour.");
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue.");
    }
  };

  // ── Auditeurs libres ────────────────────────────────────────────────────
  const auditeursFiltres = auditeursLibres.filter((c) => {
    const cat = (c.categoriePermis || "B").toString().trim().toUpperCase();
    return selectedCategorieAuditeur === "Tous" || cat === selectedCategorieAuditeur.toUpperCase();
  });

  const handleDemandeConversion = (candidat) => {
    setConfirmAuditeur(candidat);
  };

  const handleConvertirAuditeur = async (candidat) => {
    setConfirmAuditeur(null);
    setConvertingId(candidat.idCandidat);
    try {
      const result = await window.electron.convertirAuditeurLibre(candidat.idCandidat);
      if (result?.success) {
        await loadAuditeursLibres();
        await loadData();
      } else {
        alert("Erreur : " + (result?.error || "impossible d'inscrire ce candidat"));
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'inscription.");
    } finally {
      setConvertingId(null);
    }
  };

  const TABS = [
    { key: "encours",    label: "Mes candidats",       count: filteredEnCours.length },
    { key: "reinscrits", label: "🔄 Réinscrits",       count: candidatsReinscrits.length },
    { key: "obtenus",    label: "Permis obtenus",      count: candidatsObtenus.length },
    { key: "externes",   label: "Externes",            count: candidatsExternes.length },
    { key: "auditeurs",  label: "Auditeurs libres",    count: auditeursFiltres.length },
  ];

  // ── Styles table réutilisés (Réinscrits / Permis obtenus) ────────────────
  const thM = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "14px" };
  const tdM = { padding: "14px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "14px", color: "#1F2937" };

  // ── Rendu d'une card (factorisé : utilisé pour "Mes candidats") ──────────────
  const renderCard = (c) => {
    const pct = Math.min(Math.round((c.sessions / c.total) * 100), 100);
    return (
      <div
        key={c.id}
        style={{
          ...candidateCard,
          ...(CAN_VIEW_ALL_CANDIDATES && c.isMien ? candidateCardMien : {}),
          ...(c.isNouveauInscrit ? candidateCardNouveau : {}),
        }}
      >

        {/* Avatar + nom */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: c.color, color: c.textColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {getInitials(c.nom)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{c.nom}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{c.tel}</div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{
            fontSize: "11px", background: "#e0f2fe", color: "#0369a1",
            padding: "2px 8px", borderRadius: "4px", fontWeight: "bold",
            display: "inline-block",
          }}>
            Catégorie {c.categoriePermis}
          </span>

          {/* ── Badge "Mon candidat" / "Autre moniteur" en vue complète ── */}
          {CAN_VIEW_ALL_CANDIDATES && (
            c.isMien ? (
              <span style={{
                fontSize: 10.5, background: "#dcfce7", color: "#166534",
                padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                display: "inline-flex", alignItems: "center",
              }}>
                Mon candidat
              </span>
            ) : (
              <span style={{
                fontSize: 10.5, background: "#f1f5f9", color: "#64748b",
                padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                display: "inline-flex", alignItems: "center",
              }}>
                Autre moniteur
              </span>
            )
          )}

          {/* ── Badge "Nouvel inscrit" si pas encore de séance ── */}
          {c.isNouveauInscrit && (
            <span style={{
              fontSize: 10, background: "#fef9c3", color: "#854d0e",
              padding: "2px 8px", borderRadius: 10, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 3,
              border: "1px solid #fde68a",
            }}>
              🆕 Nouvel inscrit
            </span>
          )}
        </div>

        {/* Progress */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span className="progress-text">Progression</span>
          <span className="progress-text">
            {c.sessions}/{c.total} sessions
            {c.sessionsSuppl > 0 && (
              <span style={{ color: "#7c3aed", fontWeight: 700, marginLeft: 4 }}>
                (+{c.sessionsSuppl} suppl.)
              </span>
            )}
          </span>
        </div>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>

        {/* Status */}
        <div style={{ marginTop: 8 }}>
          <span className={`status ${c.status}`}>{c.status}</span>
        </div>

        {/* Prochaine session */}
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>
          Prochaine session :{" "}
          <span style={{ color: "#1e293b", fontWeight: 600 }}>
            {c.isNouveauInscrit ? "Aucune séance planifiée" : c.nextSession}
          </span>
        </div>

        {/* ── Menu d'actions dépliable (Modifier / Historique / Email / WhatsApp / Supprimer) ── */}
        <CandidateActions
          candidat={c}
          canEdit={CAN_EDIT_CANDIDAT}
          canRemove={CAN_REMOVE_CANDIDAT}
          onEdit={() => handleEdit(c._raw)}
          onHistorique={() => setHistoriqueCandidat(c)}
          onEmail={() => { if (c._raw?.email) setContactCandidat(c); }}
          onWhatsapp={() => openWhatsAppContact(c.tel)}
          onDelete={() => handleDelete(c.id)}
        />

      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="main">

        {/* HEADER */}
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="" width={40} />
            Panneau de contrôle de l'auto-école
          </h1>
          <p>
            {CAN_VIEW_ALL_CANDIDATES
              ? "Vue complète — tous les candidats de l'auto-école"
              : "Mes candidats — vue lecture seule"}
          </p>
        </div>

        {/* Badge mode */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: CAN_VIEW_ALL_CANDIDATES ? "rgba(22,101,52,0.08)" : "rgba(148,163,184,0.12)",
          border: `1px solid ${CAN_VIEW_ALL_CANDIDATES ? "rgba(22,101,52,0.25)" : "#e2e8f0"}`,
          borderRadius: 10, padding: "6px 14px",
          fontSize: "0.75rem",
          color: CAN_VIEW_ALL_CANDIDATES ? "#166534" : "#64748b",
          fontWeight: 600, marginBottom: 14,
        }}>
          {CAN_VIEW_ALL_CANDIDATES
            ? "👥 Accès complet — vous pouvez voir tous les candidats"
            : "🔒 Vue lecture seule — contactez l'admin pour voir les candidats"}
        </div>

        {/* STATS */}
        <div className="stats-row-layout">
          <div className="interactive-stat-card-small large-stat">
            <div className="stat-data">
              <p className="stat-label-small">
                {CAN_VIEW_ALL_CANDIDATES ? "Total Candidats" : "Mes Candidats"}
              </p>
              <h3 className="stat-number-small">{candidats.length}</h3>
            </div>
            <div className="stat-icon-circle-small large-icon" style={{ backgroundColor: "rgba(77,163,255,0.15)" }}>
              <Users size={24} color="#4da3ff" />
            </div>
          </div>

          {/* Stat bonus : nombre de "mes candidats" — visible seulement en vue complète */}
          {CAN_VIEW_ALL_CANDIDATES && (
            <div className="interactive-stat-card-small large-stat">
              <div className="stat-data">
                <p className="stat-label-small">Mes Candidats</p>
                <h3 className="stat-number-small">{candidats.filter((c) => c.isMien).length}</h3>
              </div>
              <div className="stat-icon-circle-small large-icon" style={{ backgroundColor: "rgba(22,163,74,0.15)" }}>
                <Users size={24} color="#16a34a" />
              </div>
            </div>
          )}
        </div>

            {/* ── BARRE D'ONGLETS ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#fff", padding: 6, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8, border: "none",
                background: activeTab === tab.key ? "#2b537e" : "transparent",
                color: activeTab === tab.key ? "#fff" : "#475569",
                fontWeight: 600, fontSize: 13.5, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: activeTab === tab.key ? "#fff" : "#64748b",
                borderRadius: 20, padding: "1px 8px", fontSize: 11.5,
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* SECTION CANDIDATS EN COURS */}
        {activeTab === "encours" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>{CAN_VIEW_ALL_CANDIDATES ? "Tous les Candidats" : "Mes Candidats"}</h2>
              <p>
                {CAN_VIEW_ALL_CANDIDATES
                  ? "Voir et suivre tous les candidats"
                  : "Suivi de la progression de vos candidats"}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {CAN_EXPORT_LISTE_ENVOI && (
                <button
                  onClick={handleOpenEnvoiModal}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#7c3aed", color: "#fff", border: "none",
                    padding: "10px 18px", borderRadius: 10, cursor: "pointer",
                    fontSize: 14, fontWeight: 600,
                  }}
                >
                  <FileText size={16} /> لائحة الإرسال (نوعي)
                </button>
              )}

              {CAN_ADD_CANDIDAT && (
                <button
                  onClick={handleAdd}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 20px", borderRadius: 10,
                    background: "#2b537e", border: "none", color: "#fff",
                    fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 700,
                    cursor: "pointer", boxShadow: "0 4px 14px rgba(43,83,126,0.3)",
                  }}
                >
                  <Plus size={15} /> Ajouter candidat
                </button>
              )}
            </div>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div style={{
            display: "flex", gap: "12px", marginBottom: "20px",
            background: "#fff", padding: "10px 14px",
            borderRadius: "12px", border: "1px solid #E2E8F0", alignItems: "center",
          }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un candidat (Nom, téléphone...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, padding: "10px 14px",
                border: "1px solid #E2E8F0", borderRadius: "8px",
                outline: "none", fontSize: "14px", background: "#F8FAFC",
              }}
            />
          </div>

          {/* CARDS */}
          {loading ? (
            <p style={{ textAlign: "center", color: "#888", padding: "20px" }}>Chargement…</p>
          ) : filteredEnCours.length === 0 ? (
            <p style={{ textAlign: "center", color: "#888", padding: "20px" }}>Aucun candidat trouvé</p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}>
              {filteredEnCours.map(renderCard)}
            </div>
          )}
        </div>
        )}

        {/* ── ONGLET RÉINSCRITS ── */}
        {activeTab === "reinscrits" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>🔄 Réinscrits — Progression sur une nouvelle catégorie</h2>
              <p>{candidatsReinscrits.length} candidat(s) titulaire(s) d'un permis, en formation pour un autre</p>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#7c3aed" }}>
                    <th style={thM}>Candidat</th>
                    <th style={thM}>Déjà titulaire de</th>
                    <th style={thM}>Nouvelle catégorie</th>
                    <th style={thM}>Progression</th>
                    <th style={thM}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatsReinscrits.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucun candidat réinscrit pour une nouvelle catégorie actuellement.
                      </td>
                    </tr>
                  ) : (
                    candidatsReinscrits.map((c, index) => (
                      <tr key={c.id} style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                        <td style={tdM}>
                          <div style={{ fontWeight: 600 }}>{c.nom}</div>
                          {c._raw?.matricule && (
                            <span style={{ fontSize: "11px", background: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", display: "inline-block", marginTop: 4 }}>
                              Mat. {c._raw.matricule}
                            </span>
                          )}
                        </td>
                        <td style={tdM}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {c.anciennesCategories.map((cat) => (
                              <span key={cat} style={{ fontSize: "11px", background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                                🎓 {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={tdM}>
                          <span style={{ fontSize: "11px", background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermis}
                          </span>
                        </td>
                        <td style={tdM}>
                          <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${(c.sessions / nbSeancesMax) * 100}%` }} />
                          </div>
                          <span className="progress-text">
                            {c.sessions}/{nbSeancesMax} sessions
                            {c.sessionsSuppl > 0 && (
                              <span style={{ color: "#7c3aed", fontWeight: 700, marginLeft: 4 }}>
                                (+{c.sessionsSuppl} suppl.)
                              </span>
                            )}
                          </span>
                        </td>
                        <td style={tdM}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            {CAN_EDIT_CANDIDAT && (
                              <SquarePen size={17} color="blue" style={{ cursor: "pointer" }} title="Modifier la fiche" onClick={() => handleEdit(c._raw)} />
                            )}
                            <History size={17} color="#7c3aed" style={{ cursor: "pointer" }} title="Historique des examens" onClick={() => setHistoriqueCandidat(c)} />
                            <Phone size={17} color={c.tel ? "#128c4a" : "#cbd5e1"} style={{ cursor: c.tel ? "pointer" : "default" }} title="Contacter via WhatsApp" onClick={() => { if (c.tel) openWhatsAppContact(c.tel); }} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* ── ONGLET PERMIS OBTENUS ── */}
        {activeTab === "obtenus" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>🎓 Historique — Permis obtenus</h2>
              <p>{candidatsObtenus.length} attestation(s) de réussite — une ligne par catégorie obtenue</p>
            </div>
            {CAN_ADD_CANDIDAT && (
              <button
                onClick={() => setShowSelectReinscriptionModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#166534", color: "#fff", border: "none",
                  padding: "10px 18px", borderRadius: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                <PlusCircle size={16} /> Réinscrire un candidat
              </button>
            )}
          </div>

          <div style={{
            display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap",
            background: "#fff", padding: "10px 14px", borderRadius: 12,
            border: "1px solid #E2E8F0", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={16} color="#64748b" />
              <select
                value={selectedCategorieObtenu}
                onChange={(e) => setSelectedCategorieObtenu(e.target.value)}
                style={{
                  padding: "10px 14px", fontSize: "14px", fontWeight: "600",
                  color: "#1e293b", background: "#F1F5F9", border: "1px solid #E2E8F0",
                  borderRadius: "8px", cursor: "pointer", outline: "none", minWidth: "160px",
                }}
              >
                {TOUTES_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "Tous" ? "Toutes catégories" : `Permis ${cat}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Du</span>
              <input
                type="date"
                value={dateObtentionDebut}
                onChange={(e) => setDateObtentionDebut(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13.5, color: "#1e293b" }}
              />
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>au</span>
              <input
                type="date"
                value={dateObtentionFin}
                onChange={(e) => setDateObtentionFin(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13.5, color: "#1e293b" }}
              />
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#2b537e" }}>
                    <th style={thM}>Candidat</th>
                    <th style={thM}>Matricule</th>
                    <th style={thM}>Catégorie obtenue</th>
                    <th style={thM}>Date d'obtention</th>
                    <th style={thM}>Situation actuelle</th>
                    <th style={thM}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatsObtenus.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucun candidat trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    candidatsObtenus.map((c) => (
                      <tr key={`${c.id}-${c.categoriePermisObtenue}`} style={{ background: "#fff" }}>
                        <td style={tdM}>
                          <div style={{ fontWeight: 600 }}>{c.nom}</div>
                        </td>
                        <td style={tdM}>
                          {c._raw?.matricule ? (
                            <span style={{ fontSize: 12, background: "#f1f5f9", color: "#334155", padding: "3px 9px", borderRadius: 6, fontWeight: 700 }}>
                              {c._raw.matricule}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic" }}>
                              Non attribué
                            </span>
                          )}
                        </td>
                        <td style={tdM}>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermisObtenue}
                          </span>
                        </td>
                        <td style={tdM}>
                          {c.dateObtention ? new Date(c.dateObtention).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={tdM}>
                          {c.estCategorieActive ? (
                            <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "3px 9px", borderRadius: 20, fontWeight: 700 }}>
                              ✓ Situation actuelle
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "3px 9px", borderRadius: 20, fontWeight: 700 }}>
                              🕘 Depuis réinscrit — {c.categoriePermis}
                            </span>
                          )}
                        </td>
                        <td style={tdM}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <History
                              size={17}
                              color="#7c3aed"
                              style={{ cursor: "pointer" }}
                              title="Historique complet des examens"
                              onClick={() => setHistoriqueCandidat(c)}
                            />
                            <Mail
                              size={17}
                              color={c._raw?.email ? "#2b537e" : "#cbd5e1"}
                              style={{ cursor: c._raw?.email ? "pointer" : "default" }}
                              title={c._raw?.email ? `Envoyer un email à ${c.nom}` : "Pas d'email enregistré"}
                              onClick={() => { if (c._raw?.email) setContactCandidat(c); }}
                            />
                            <Phone
                              size={17}
                              color={c.tel ? "#128c4a" : "#cbd5e1"}
                              style={{ cursor: c.tel ? "pointer" : "default" }}
                              title={c.tel ? "Contacter via WhatsApp" : "Pas de téléphone enregistré"}
                              onClick={() => { if (c.tel) openWhatsAppContact(c.tel); }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* ── ONGLET EXTERNES ── */}
        {activeTab === "externes" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>🚗 Perfectionnement — Externes</h2>
              <p>{candidatsExternes.length} personne(s) — permis déjà obtenu hors auto-école</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20, background: "#fff", padding: "10px 14px", borderRadius: 12, border: "1px solid #E2E8F0", alignItems: "center" }}>
            <Filter size={16} color="#64748b" />
            <select
              value={selectedCategorieExterne}
              onChange={(e) => setSelectedCategorieExterne(e.target.value)}
              style={{ padding: "10px 14px", fontSize: "14px", fontWeight: "600", color: "#1e293b", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "8px", cursor: "pointer", outline: "none", minWidth: "160px" }}
            >
              {TOUTES_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === "Tous" ? "Toutes catégories" : `Permis ${cat}`}</option>
              ))}
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#0369a1" }}>
                    <th style={thM}>Personne</th>
                    <th style={thM}>Contact</th>
                    <th style={thM}>Catégorie</th>
                    <th style={thM}>Séances</th>
                    <th style={thM}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatsExternes.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucune personne externe pour l'instant.
                      </td>
                    </tr>
                  ) : (
                    candidatsExternes.map((c, index) => (
                      <tr key={c.id} style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                        <td style={tdM}>
                          <div style={{ fontWeight: 600 }}>{c.nom}</div>
                          <span style={{ fontSize: "11px", background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", display: "inline-block", marginTop: 4 }}>
                            🆕 Externe
                          </span>
                        </td>
                        <td style={tdM}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone size={15} /> {c.tel || "—"}
                          </div>
                        </td>
                        <td style={tdM}>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermis}
                          </span>
                        </td>
                        <td style={tdM}>
                          {c.sessions}{c.sessionsSuppl > 0 ? ` (+${c.sessionsSuppl})` : ""}
                        </td>
                        <td style={tdM}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <SquarePen size={17} color="blue" style={{ cursor: "pointer" }} title="Modifier" onClick={() => setEditingExterne(c._raw)} />
                            <History size={17} color="#7c3aed" style={{ cursor: "pointer" }} title="Historique des examens" onClick={() => setHistoriqueCandidat(c)} />
                            <Mail
                              size={17}
                              color={c._raw?.email ? "#2b537e" : "#cbd5e1"}
                              style={{ cursor: c._raw?.email ? "pointer" : "default" }}
                              title={c._raw?.email ? `Envoyer un email à ${c.nom}` : "Pas d'email enregistré"}
                              onClick={() => { if (c._raw?.email) setContactCandidat(c); }}
                            />
                            <Phone
                              size={17}
                              color={c.tel ? "#128c4a" : "#cbd5e1"}
                              style={{ cursor: c.tel ? "pointer" : "default" }}
                              title={c.tel ? "Contacter via WhatsApp" : "Pas de téléphone enregistré"}
                              onClick={() => { if (c.tel) openWhatsAppContact(c.tel); }}
                            />
                            {CAN_REMOVE_CANDIDAT && (
                              <Trash2
                                size={17} color="red"
                                style={{ cursor: deletingExterneId === c.id ? "not-allowed" : "pointer" }}
                                onClick={() => { if (deletingExterneId !== c.id) handleDeleteExterne(c.id); }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* ── ONGLET AUDITEURS LIBRES ── */}
        {activeTab === "auditeurs" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2>📖 Auditeurs libres — Cours de code</h2>
              <p>{auditeursFiltres.length} personne(s) ayant suivi le code sans être inscrite(s)</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20, background: "#fff", padding: "10px 14px", borderRadius: 12, border: "1px solid #E2E8F0", alignItems: "center" }}>
            <Filter size={16} color="#64748b" />
            <select
              value={selectedCategorieAuditeur}
              onChange={(e) => setSelectedCategorieAuditeur(e.target.value)}
              style={{ padding: "10px 14px", fontSize: "14px", fontWeight: "600", color: "#1e293b", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "8px", cursor: "pointer", outline: "none", minWidth: "160px" }}
            >
              {TOUTES_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === "Tous" ? "Toutes catégories" : `Permis ${cat}`}</option>
              ))}
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#d97706" }}>
                    <th style={thM}>Personne</th>
                    <th style={thM}>Contact</th>
                    <th style={thM}>Catégorie</th>
                    <th style={thM}>Ajouté le</th>
                    <th style={thM}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditeursFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucun auditeur libre pour l'instant.
                      </td>
                    </tr>
                  ) : (
                    auditeursFiltres.map((c, index) => (
                      <tr key={c.idCandidat} style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                        <td style={tdM}>
                          <div style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</div>
                          <span style={{ fontSize: "11px", background: "#fff7ed", color: "#c2410c", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", display: "inline-block", marginTop: 4 }}>
                            📖 Auditeur libre
                          </span>
                        </td>
                        <td style={tdM}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone size={15} /> {c.telephone || "—"}
                          </div>
                        </td>
                        <td style={tdM}>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermis}
                          </span>
                        </td>
                        <td style={tdM}>{formatDateAr(c.date_inscription)}</td>
                        <td style={tdM}>
                          {CAN_ADD_CANDIDAT && (
                            <button
                              onClick={() => handleDemandeConversion(c)}
                              disabled={convertingId === c.idCandidat}
                              style={{
                                padding: "7px 14px", borderRadius: 8, border: "none",
                                background: convertingId === c.idCandidat ? "#94a3b8" : "#166534",
                                color: "#fff", fontWeight: 700, fontSize: 12.5,
                                cursor: convertingId === c.idCandidat ? "not-allowed" : "pointer",
                              }}
                            >
                              {convertingId === c.idCandidat ? "..." : "✓ Inscrire à l'auto-école"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* MODALE AJOUT / MODIFICATION / RÉINSCRIPTION */}
      {CAN_ADD_CANDIDAT && (
        <AddCandidatModal
          showModal={showModal}
          setShowModal={setShowModal}
          candidat={editCandidat}
          isReinscription={isReinscription}
          onSave={handleSave}
        />
      )}

      {/* MODALE لائحة الإرسال */}
      {showEnvoiModal && (
        <EnvoiCandidatsModal
          candidats={candidats}
          onClose={() => setShowEnvoiModal(false)}
        />
      )}

      {historiqueCandidat && (
        <HistoriqueExamensModal
          candidat={historiqueCandidat}
          examensList={examensList}
          onClose={() => setHistoriqueCandidat(null)}
        />
      )}

      {contactCandidat && (
        <ContactModal
          candidat={contactCandidat}
          onClose={() => setContactCandidat(null)}
        />
      )}

      {editingExterne && (
        <EditExterneModal
          candidat={editingExterne}
          onClose={() => setEditingExterne(null)}
          onSave={handleSaveExterne}
        />
      )}

      {confirmAuditeur && (
        <ConfirmAuditeurModal
          candidat={confirmAuditeur}
          onConfirm={handleConvertirAuditeur}
          onClose={() => setConfirmAuditeur(null)}
        />
      )}

      {confirmReinscription && (
        <ConfirmReinscriptionModal
          candidat={confirmReinscription}
          onConfirm={handleConfirmerReinscription}
          onClose={() => setConfirmReinscription(null)}
        />
      )}

      {showSelectReinscriptionModal && (
        <SelectReinscriptionModal
          candidats={candidatsObtenusTous}
          onSelect={handleDemandeReinscription}
          onClose={() => setShowSelectReinscriptionModal(false)}
        />
      )}
    </div>
  );
};

const candidateCard = {
  background: "#f0f6ff",
  border: "1px solid #e2eaf6",
  borderRadius: 10,
  padding: "1rem 1.25rem",
};

const candidateCardMien = {
  border: "1px solid #86efac",
  boxShadow: "0 0 0 1px rgba(22,163,74,0.12)",
};

// ── Style carte pour candidat inscrit sans séance encore ──
const candidateCardNouveau = {
  border: "1px solid #fde68a",
  boxShadow: "0 0 0 1px rgba(234,179,8,0.15)",
  background: "#fffef0",
};

export default condidatsMoniteur;