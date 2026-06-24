import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";
import "../../styles/condidats.css";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import AddCandidatModal from "../components/addCondidat";
import { useExamenCtx } from "../context/ExamenContext";
import { SquarePen, Trash, Phone, Mail, X, Send, PlusCircle, Filter, FileText, History } from "lucide-react";

// ─────────────────────────────────────────────
// LISTE COMPLÈTE DES CATÉGORIES DE PERMIS
// ─────────────────────────────────────────────
const TOUTES_CATEGORIES = [
  "Tous",
  "A1", "A","B", "C1", 
  "C", "D", "F", "BE", 
  "C1E", "CE", "DE",
];

// Clé localStorage utilisée pour mémoriser la dernière date de référence
// de la liste d'envoi (لائحة الإرسال) — voir handleConfirmEnvoiCandidats
const ENVOI_REF_KEY = "liste_envoi_derniere_date";
const ENVOI_DEFAULTS_KEY = "export_pdf_defaults"; // réutilise les mêmes infos wilaya/école que la page Examens

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getInitials = (prenom, nom) =>
  `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();

// Formate une date ISO/Date en YYYY/MM/DD pour le PDF arabe
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

// Formate un timestamp ISO en date + heure lisibles (ex: "24/06/2026 à 14:32")
function formatDateHeure(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return "";
  const j = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${j}/${m}/${y} à ${h}:${min}`;
}

// Convertit une date (Date | string ISO | "YYYY-MM-DD") en string comparable "YYYY-MM-DD"
function toComparableDate(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  return str.slice(0, 10); // garde juste "YYYY-MM-DD"
}

// ─────────────────────────────────────────────
// Modale Contact Email
// ─────────────────────────────────────────────
const SUBJECTS = [
  "Rappel de séance",
  "Convocation à l'examen",
  "Retard de paiement",
  "Félicitations",
  "Autre",
];

function ContactModal({ candidat, onClose }) {
  const [sujet,       setSujet]       = useState(SUBJECTS[0]);
  const [sujetCustom, setSujetCustom] = useState("");
  const [message,     setMessage]     = useState("");
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState("");

  const email = candidat._raw?.email;
  const hasEmail = !!email;
  const nomComplet = `${candidat.prenom} ${candidat.nom}`;

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
      });
      if (result?.success) setSent(true);
      else setError("Erreur lors de l'envoi. Vérifiez votre connexion.");
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

        {/* Header */}
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
              {getInitials(candidat.prenom, candidat.nom)}
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

        {/* Body */}
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

            {/* Sujet */}
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

            {/* Message */}
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

        {/* Footer */}
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
// Modale Historique des examens d'un candidat
// ─────────────────────────────────────────────
const STATUS_CONFIG_HISTO = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé" },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"    },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"    },
};

function HistoriqueExamensModal({ candidat, examensList, onClose }) {
  const nomComplet = `${candidat.prenom} ${candidat.nom}`;

  const historique = examensList
    .filter((e) => String(e.candidatId) === String(candidat.id))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16,
        width: 560, maxWidth: "95vw", maxHeight: "80vh",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px 14px", borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#ede9fe", color: "#6d28d9",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>
              {getInitials(candidat.prenom, candidat.nom)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                Historique des examens — {nomComplet}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {historique.length} session{historique.length !== 1 ? "s" : ""} d'examen
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

        {/* Body */}
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
                  <div key={ex.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 10,
                    border: "1px solid #e2e8f0", background: "#f8fafc",
                  }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>
                        {ex.type}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {ex.date} {ex.heure ? `· ${ex.heure}` : ""} {ex.lieu ? `· ${ex.lieu}` : ""}
                      </div>
                    </div>
                    <span style={{
                      background: st.bg, color: st.color,
                      padding: "4px 12px", borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end",
          padding: "14px 22px 18px", borderTop: "1px solid #e2e8f0",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 22px", borderRadius: 10,
            background: "#2b537e", border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sous-composant champ formulaire (réutilisé par la modale لائحة الإرسال)
// ─────────────────────────────────────────────
const FormField = ({ label, value, onChange, placeholder, type = "text", required = false, disabled = false }) => (
  <div>
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
      {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid #d1d5db", fontSize: 13.5,
        color: disabled ? "#94a3b8" : "#1F2937",
        background: disabled ? "#f1f5f9" : "#fff",
        outline: "none", boxSizing: "border-box",
      }}
    />
  </div>
);


// ─────────────────────────────────────────────
// Nouvelle clé : liste des IDs déjà envoyés (le vrai garde-fou anti-oubli)
// ENVOI_REF_KEY et ENVOI_DEFAULTS_KEY sont déjà déclarés en haut du fichier
// ─────────────────────────────────────────────
const ENVOI_IDS_KEY = "liste_envoi_ids_envoyes";
const ENVOI_TIMESTAMP_KEY = "liste_envoi_derniere_generation"; // date+heure ISO de la dernière génération réussie
// ─────────────────────────────────────────────
// Modale لائحة الإرسال — filtrée par date, mais sans jamais oublier
// un candidat (suivi par ID en plus de la date)
// ─────────────────────────────────────────────
function EnvoiCandidatsModal({ candidats, onClose }) {
  const [dateDebut, setDateDebut] = useState(""); // pré-rempli avec la référence, modifiable
  const [dateFin,   setDateFin]   = useState("");
  const [wilaya,    setWilaya]    = useState("");
  const [nomEcole,  setNomEcole]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [sentIds,   setSentIds]   = useState([]); // IDs déjà inclus dans une liste précédente
  const [derniereGeneration, setDerniereGeneration] = useState(""); // date+heure ISO de la dernière liste générée

  useEffect(() => {
    try {
      const ref = localStorage.getItem(ENVOI_REF_KEY);
      if (ref) setDateDebut(ref);

      const ids = JSON.parse(localStorage.getItem(ENVOI_IDS_KEY) || "[]");
      setSentIds(Array.isArray(ids) ? ids : []);

      const defaults = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
      setWilaya(defaults.wilaya || "");
      setNomEcole(defaults.nomEcole || "");

      const ts = localStorage.getItem(ENVOI_TIMESTAMP_KEY);
      if (ts) setDerniereGeneration(ts);
    } catch {
      setSentIds([]);
    }
  }, []);

  // ✅ Tous les candidats DONT la date d'inscription tombe dans la période choisie
  //    (bornes INCLUSIVES des deux côtés). Le PDF inclura TOUS ces candidats,
  //    qu'ils aient déjà été envoyés avant ou non.
  const candidatsFiltres = candidats.filter((c) => {
    const insc = toComparableDate(c._raw?.date_inscription);
    if (!insc) return false;
    if (!dateDebut || !dateFin) return false;
    return insc >= dateDebut && insc <= dateFin; // bornes inclusives
  });

  const periodeVide =
    !!dateDebut && !!dateFin &&
    candidatsFiltres.length === 0;

  const handleConfirm = async () => {
    setError("");

    if (!dateDebut) { setError("Merci de renseigner la date de début.");                    return; }
    if (!dateFin)   { setError("Merci de choisir la date jusqu'à laquelle inclure les inscrits."); return; }
    if (!wilaya.trim()) { setError("Merci de renseigner la wilaya.");                        return; }

    if (candidatsFiltres.length === 0) {
      setError("Aucun candidat inscrit sur cette période.");
      return;
    }
    // La génération inclut toujours tous les candidats inscrits sur la période,
    // qu'ils aient déjà été envoyés avant ou non.

    setLoading(true);
    try {
      const candidatsPourEnvoi = candidatsFiltres.map((c) => {
        const nomAr    = c._raw?.nom_ar    || "";
        const prenomAr = c._raw?.prenom_ar || "";
        const nomPrenomAr = (nomAr || prenomAr) ? `${nomAr} ${prenomAr}`.trim() : "";

        return {
          nomPrenom:     `${c.prenom} ${c.nom}`,
          nomPrenomAr,
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
        // La date de fin choisie devient la nouvelle référence (pour pré-remplir la prochaine fois)
        localStorage.setItem(ENVOI_REF_KEY, dateFin);

        // ✅ On AJOUTE les IDs qu'on vient d'inclure (jamais on ne remplace), dédupliqués
        const nouveauxIds = Array.from(new Set([...sentIds, ...candidatsFiltres.map((c) => c.id)]));
        localStorage.setItem(ENVOI_IDS_KEY, JSON.stringify(nouveauxIds));

        // ✅ On mémorise la date et l'heure exactes de cette génération
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
      console.error("Erreur génération لائحة الإرسال (candidats):", e);
      alert("Erreur lors de la génération du document.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "90vw", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>لائحة الإرسال — نوعي الجديد</h3>
          <button onClick={() => !loading && onClose()} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
          Liste de tous les candidats inscrits sur la période choisie — المندوبية الولائية للأمن في الطرق
        </p>

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#475569" }}>
          {derniereGeneration
            ? <>Dernière liste générée le <strong>{formatDateHeure(derniereGeneration)}</strong></>
            : "Aucune liste générée pour le moment."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <FormField
            label="Depuis le"
            value={dateDebut}
            onChange={setDateDebut}
            type="date"
            required
          />

          <FormField
            label="Jusqu'au"
            value={dateFin}
            onChange={setDateFin}
            type="date"
            required
          />

          <FormField
            label="الولاية (Wilaya)"
            value={wilaya}
            onChange={setWilaya}
            placeholder="Ex : بجاية / Béjaïa"
            required
          />

          <FormField
            label="Nom de l'auto-école (optionnel)"
            value={nomEcole}
            onChange={setNomEcole}
            placeholder="Ex : Auto-École Essalem"
          />
        </div>

        {/* ── Bandeau d'état : période vide / total trouvé ── */}
        {periodeVide ? (
          <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
            Aucun candidat inscrit sur cette période.
          </div>
        ) : (
          <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569" }}>
            <strong style={{ color: "#1f2937" }}>Candidats trouvés sur cette période :</strong> {candidatsFiltres.length}
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
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: "#7c3aed",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: 13.5,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Génération..." : "Générer لائحة الإرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────
const Condidats = () => {
  const [candidats,         setCandidats]        = useState([]);
  const [showModal,         setShowModal]        = useState(false);
  const [editCandidat,     setEditCandidat]     = useState(null);
  const [isReinscription,  setIsReinscription]  = useState(false); 
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedCategorie, setSelectedCategorie] = useState("Tous"); 
  const [contactCandidat,  setContactCandidat]  = useState(null);
  const [showEnvoiModal,   setShowEnvoiModal]   = useState(false);
  const [historiqueCandidat, setHistoriqueCandidat]  = useState(null); // ← nouveau

  const { examensList } = useExamenCtx(); // ← nouveau

  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "14px" };
  const td = { padding: "14px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "14px", color: "#1F2937" };

  // ── LOGIQUE DE FILTRAGE ULTRA PRÉCISE ──────────────────────────────────────
  const candidatsFiltres = candidats.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      c.nom.toLowerCase().includes(q) ||
      c.prenom.toLowerCase().includes(q) ||
      c.tel.toLowerCase().includes(q) ||
      (c.status && c.status.toLowerCase().includes(q))
    );

    const dbCategorie = (
      c._raw?.categoriePermis || 
      c._raw?.categorie || 
      c._raw?.categorie_permis || 
      "B"
    ).toString().trim().toUpperCase();

    const matchesCategorie = selectedCategorie === "Tous" || dbCategorie === selectedCategorie.toUpperCase();

    return matchesSearch && matchesCategorie;
  });

  const loadCandidats = async () => {
    try {
      const data    = await window.electron.getCandidats();
      const seances = await window.electron.getSeances();

      const formatted = data.map((c) => {
        const currentCat = (c.categoriePermis || c.categorie || c.categorie_permis || "B").toString().trim().toUpperCase();

        const nbSessions = seances.filter((s) => {
          if (!s.candidatsIds) return false;
          const ids = String(s.candidatsIds).split(",").map((id) => parseInt(id.trim()));
          const matchCandidat = ids.includes(c.idCandidat);
          const seanceCat = (s.categoriePermis || "").toString().trim().toUpperCase();
          const matchCategorie = seanceCat === currentCat; 
          
          return matchCandidat && matchCategorie;
        }).length;

        return {
          id:              c.idCandidat,
          nom:             c.nom,
          prenom:          c.prenom,
          tel:             c.telephone,
          categoriePermis: currentCat, 
          inscription: c.date_inscription
            ? new Date(c.date_inscription).toISOString().split("T")[0]
            : "",
          dob: c.date_naissance
            ? new Date(c.date_naissance).toISOString().split("T")[0]
            : "",
          sessions: nbSessions,
          status:   c.statut, 
          sexe:     c.sexe,
          photo:    c.photo || null,
          _raw:     c,
        };
      });

      setCandidats(formatted);
    } catch (error) {
      console.error("Erreur lors du chargement des candidats :", error);
      setCandidats([]);
    }
  };

  useEffect(() => { loadCandidats(); }, []);

  const handleEdit = (candidat) => {
    setIsReinscription(false); 
    setEditCandidat(candidat._raw);
    setShowModal(true);
  };

  const handleReinscrire = (candidat) => {
    setIsReinscription(true); 
    setEditCandidat(candidat._raw);
    setShowModal(true);
  };

  const handleAdd = () => {
    setIsReinscription(false);
    setEditCandidat(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce candidat ?")) {
      const result = await window.electron.deleteCandidat(id);
      if (result?.success) {
        await loadCandidats();
      } else {
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const handleSave = async (data) => {
    const categorieSelectionnee = data.categoriePermis || data.categorie || data.categorie_permis || "B";
    const cleanData = {
      ...data,
      categoriePermis: categorieSelectionnee.toString().trim().toUpperCase()
    };

    try {
      if (data.isReinscription) {
        await window.electron.reinscrireCandidat(cleanData);
      } else if (data.idCandidat) {
        await window.electron.updateCandidat(cleanData);
      } else {
        await window.electron.addCandidat(cleanData);
      }
      await loadCandidats();
      setShowModal(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      alert("Une erreur est survenue.");
    }
  };

  const handleOpenEnvoiModal = () => {
    if (candidats.length === 0) {
      alert("Aucun candidat enregistré pour le moment.");
      return;
    }
    setShowEnvoiModal(true);
  };

  return (
    <div className="container">
      <div className="main">

        <div className="header">
          <img src={ConnexionImg} alt="" className="header-img" />
          <h1>
            <img src={SmallCar} alt="" width={40} />
            Panneau de contrôle de l'auto-école
          </h1>
          <p>Gérer les étudiants, les leçons et les examens</p>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Candidats</h2>
              <p>Gérer et suivre tous les candidats</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
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
              <Button text="+ Ajouter candidat" onClick={handleAdd} />
            </div>
          </div>

          {/* ── DESIGN ULTRA COMPACT : RECHERCHE + SELECT SUR UNE SEULE LIGNE ──────────────────────── */}
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            marginBottom: "20px",
            background: "#fff", 
            padding: "10px 14px",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            alignItems: "center"
          }}>
            {/* Input recherche principale */}
            <input
              type="text"
              placeholder="🔍 Rechercher un candidat (Nom, prénom, téléphone...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, 
                padding: "10px 14px", 
                border: "1px solid #E2E8F0",
                borderRadius: "8px", 
                outline: "none", 
                fontSize: "14px",
                background: "#F8FAFC"
              }}
            />

            {/* Dropdown de Filtrage Propre pour le permis */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
              <Filter size={16} color="#64748b" style={{ marginLeft: "4px" }} />
              <select
                value={selectedCategorie}
                onChange={(e) => setSelectedCategorie(e.target.value)}
                style={{
                  padding: "10px 32px 10px 14px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1e293b",
                  background: "#F1F5F9",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  cursor: "pointer",
                  outline: "none",
                  minWidth: "160px",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  backgroundSize: "14px",
                  transition: "all 0.15s ease",
                }}
              >
                {TOUTES_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "Tous" ? "Tous les permis" : `Permis ${cat}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TABLEAU */}
          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#2b537e" }}>
                    <th style={th}>Candidat</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Date d'inscription</th>
                    <th style={th}>Progression</th>
                    <th style={th}>Statut</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatsFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucun candidat trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    candidatsFiltres.map((c, index) => (
                      <tr key={c.id} style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>

                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</div>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", marginTop: "4px", display: "inline-block" }}>
                            Catégorie {c.categoriePermis}
                          </span>
                        </td>

                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone size={15} /> {c.tel}
                          </div>
                        </td>

                        <td style={td}>{c.inscription}</td>

                        <td style={td}>
                          <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${Math.min((c.sessions / 20) * 100, 100)}%` }} />
                          </div>
                          <span className="progress-text">{c.sessions}/20 sessions</span>
                        </td>

                        <td style={td}>
                          <span className={`status ${c.status}`}>{c.status}</span>
                        </td>

                        <td style={td}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <SquarePen
                              size={17} color="blue"
                              style={{ cursor: "pointer" }}
                              title="Modifier la fiche"
                              onClick={() => handleEdit(c)}
                            />

                            {c.status === "obtenu" && (
                              <PlusCircle
                                size={17} color="green"
                                style={{ cursor: "pointer" }}
                                title="Inscrire à une nouvelle catégorie"
                                onClick={() => handleReinscrire(c)}
                              />
                            )}

                            <Mail
                              size={17}
                              color={c._raw?.email ? "#2b537e" : "#cbd5e1"}
                              style={{ cursor: c._raw?.email ? "pointer" : "default" }}
                              title={c._raw?.email ? `Envoyer un email à ${c.prenom} ${c.nom}` : "Pas d'email enregistré"}
                              onClick={() => { if (c._raw?.email) setContactCandidat(c); }}
                            />
                            <History
                              size={17}
                              color="#7c3aed"
                              style={{ cursor: "pointer" }}
                              title="Historique des examens"
                              onClick={() => setHistoriqueCandidat(c)}
                            />

                            <Trash
                              size={17} color="red"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleDelete(c.id)}
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
      </div>

      <AddCandidatModal
        showModal={showModal}
        setShowModal={setShowModal}
        candidat={editCandidat}
        isReinscription={isReinscription} 
        onSave={handleSave}
      />

      {contactCandidat && (
        <ContactModal
          candidat={contactCandidat}
          onClose={() => setContactCandidat(null)}
        />
      )}

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
    </div>
  );
};

export default Condidats;