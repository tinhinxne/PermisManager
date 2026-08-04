import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";
import "../../styles/condidats.css";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import AddCandidatModal from "../components/addCondidat";
import { useExamenCtx } from "../context/ExamenContext";
import { SquarePen, Trash, Phone, Mail, X, Send, PlusCircle, Filter, FileText, History } from "lucide-react";

const TOUTES_CATEGORIES = [
  "Tous",
  "A1", "A","B", "C1", 
  "C", "D", "F", "BE", 
  "C1E", "CE", "DE",
];

const ENVOI_REF_KEY = "liste_envoi_derniere_date";
const ENVOI_DEFAULTS_KEY = "export_pdf_defaults";
const SESSIONS_NORMALES_MAX = 20;

const getInitials = (prenom, nom) =>
  `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();

function formatDateAr(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  const datePart = str.split(/[T ]/)[0];
  const d = new Date(datePart + "T12:00:00");
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
  const j = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${j}/${m}/${y} à ${h}:${min}`;
}

function toComparableDate(rawDate) {
  if (!rawDate) return "";
  const str = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
  return str.slice(0, 10);
}

function getDateObtention(candidatId, examensList) {
  if (!Array.isArray(examensList)) return null;
  const reussis = examensList
    .filter((e) => String(e.candidatId) === String(candidatId) && e.status === "Passed")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return reussis[0]?.date || null;
}

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

const ENVOI_IDS_KEY = "liste_envoi_ids_envoyes";
const ENVOI_TIMESTAMP_KEY = "liste_envoi_derniere_generation";

function EnvoiCandidatsModal({ candidats, onClose, onSent }) {
  const [wilaya,     setWilaya]     = useState("");
  const [nomEcole,   setNomEcole]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [sentIds,    setSentIds]    = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [derniereGeneration, setDerniereGeneration] = useState("");

  useEffect(() => {
    try {
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

  const nouveauxInscrits = candidats
    .filter((c) => !sentIds.includes(c.id))
    .sort((a, b) => new Date(a._raw?.date_inscription || 0) - new Date(b._raw?.date_inscription || 0));

  useEffect(() => {
    setSelectedIds(new Set(nouveauxInscrits.map((c) => c.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentIds.length, candidats.length]);

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === nouveauxInscrits.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nouveauxInscrits.map((c) => c.id)));
    }
  };

  const handleConfirm = async () => {
    setError("");
    if (!wilaya.trim()) { setError("Merci de renseigner la wilaya."); return; }
    if (selectedIds.size === 0) { setError("Sélectionnez au moins un candidat à inclure."); return; }

    const candidatsSelectionnes = nouveauxInscrits.filter((c) => selectedIds.has(c.id));

    setLoading(true);
    try {
      const candidatsPourEnvoi = candidatsSelectionnes.map((c) => {
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
        dateDepot: formatDateAr(new Date()),
        candidats: candidatsPourEnvoi,
      });

      if (savedPath) {
        const nouveauxIds = Array.from(new Set([...sentIds, ...candidatsSelectionnes.map((c) => c.id)]));
        localStorage.setItem(ENVOI_IDS_KEY, JSON.stringify(nouveauxIds));

        const nowIso = new Date().toISOString();
        localStorage.setItem(ENVOI_TIMESTAMP_KEY, nowIso);

        try {
          const prev = JSON.parse(localStorage.getItem(ENVOI_DEFAULTS_KEY) || "{}");
          localStorage.setItem(ENVOI_DEFAULTS_KEY, JSON.stringify({ ...prev, wilaya, nomEcole }));
        } catch { /* ignore */ }

        alert(`لائحة الإرسال enregistrée :\n${savedPath}`);
        onSent?.();
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
        style={{ background: "#fff", borderRadius: 14, padding: 24, width: 480, maxWidth: "92vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>لائحة الإرسال — نوعي الجديد</h3>
          <button onClick={() => !loading && onClose()} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          Nouveaux inscrits jamais envoyés — décochez ceux à exclure de cette liste.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
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

        {derniereGeneration && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#475569" }}>
            Dernière liste générée le <strong>{formatDateHeure(derniereGeneration)}</strong>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
            🆕 Nouveaux inscrits ({nouveauxInscrits.length})
          </span>
          {nouveauxInscrits.length > 0 && (
            <button onClick={toggleAll} style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {selectedIds.size === nouveauxInscrits.length ? "Tout décocher" : "Tout cocher"}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 14 }}>
          {nouveauxInscrits.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
              Aucun nouvel inscrit en attente d'envoi.
            </div>
          ) : (
            nouveauxInscrits.map((c) => (
              <label
                key={c.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderBottom: "1px solid #f1f5f9",
                  cursor: "pointer", fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleOne(c.id)}
                  style={{ width: 15, height: 15, cursor: "pointer" }}
                />
                <span style={{ flex: 1, fontWeight: 600, color: "#1e293b" }}>{c.prenom} {c.nom}</span>
                <span style={{ fontSize: 11, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                  {c.categoriePermis}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {c._raw?.date_inscription ? formatDateAr(c._raw.date_inscription) : "—"}
                </span>
              </label>
            ))
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 10, padding: "9px 13px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
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
            {loading ? "Génération..." : `Générer (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function MatriculesEnAttenteModal({ onClose, onSaved }) {
  const [candidatsTous, setCandidatsTous] = useState([]);
  const [valeurs, setValeurs] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [filtre, setFiltre] = useState("sans"); // "sans" | "avec" | "tous"

  const load = async () => {
    setLoading(true);
    try {
      const rows = await window.electron.getCandidatsMatricules();
      setCandidatsTous(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("Erreur chargement matricules:", e);
      setCandidatsTous([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const candidatsAffiches = candidatsTous.filter((c) => {
    const aMatricule = !!(c.matricule && c.matricule.trim());
    if (filtre === "sans") return !aMatricule;
    if (filtre === "avec") return aMatricule;
    return true; // "tous"
  });

  const nbSans = candidatsTous.filter((c) => !(c.matricule && c.matricule.trim())).length;
  const nbAvec = candidatsTous.length - nbSans;

  const handleSave = async (idCandidat) => {
    const matricule = (valeurs[idCandidat] || "").trim();
    if (!matricule) return;
    setSavingId(idCandidat);
    try {
      const result = await window.electron.updateMatriculeCandidat(idCandidat, matricule);
      if (result?.success) {
        // On met à jour la ligne localement au lieu de la retirer
        setCandidatsTous((prev) =>
          prev.map((c) => (c.idCandidat === idCandidat ? { ...c, matricule } : c))
        );
        setValeurs((prev) => {
          const next = { ...prev };
          delete next[idCandidat];
          return next;
        });
        onSaved?.();
      } else {
        alert("Erreur lors de l'enregistrement du matricule.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement du matricule.");
    }
    setSavingId(null);
  };

  const TabButton = ({ value, label, count }) => (
    <button
      onClick={() => setFiltre(value)}
      style={{
        padding: "7px 14px", borderRadius: 8, border: "none",
        background: filtre === value ? "#7c3aed" : "#f1f5f9",
        color: filtre === value ? "#fff" : "#475569",
        fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {label}
      <span style={{
        background: filtre === value ? "rgba(255,255,255,0.25)" : "#e2e8f0",
        color: filtre === value ? "#fff" : "#64748b",
        borderRadius: 20, padding: "1px 7px", fontSize: 11,
      }}>
        {count}
      </span>
    </button>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={() => onClose()}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, padding: 24, width: 500, maxWidth: "92vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#1F2937" }}>Matricules</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
          Consultez et complétez les matricules officiels des candidats.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <TabButton value="sans" label="Sans matricule" count={nbSans} />
          <TabButton value="avec" label="Avec matricule" count={nbAvec} />
          <TabButton value="tous" label="Tous" count={candidatsTous.length} />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
              Chargement...
            </div>
          ) : candidatsAffiches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
              {filtre === "sans" ? "Aucun candidat en attente de matricule. 🎉" : "Aucun candidat à afficher."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {candidatsAffiches.map((c) => {
                const aMatricule = !!(c.matricule && c.matricule.trim());
                return (
                  <div key={c.idCandidat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      {c.prenom} {c.nom}
                    </span>

                    {aMatricule ? (
                      <span style={{
                        padding: "6px 12px", borderRadius: 7,
                        background: "#dcfce7", color: "#16a34a",
                        fontSize: 12.5, fontWeight: 700, minWidth: 90, textAlign: "center",
                      }}>
                        {c.matricule}
                      </span>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Matricule"
                          value={valeurs[c.idCandidat] || ""}
                          onChange={(e) => setValeurs((prev) => ({ ...prev, [c.idCandidat]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleSave(c.idCandidat)}
                          style={{ width: 130, padding: "6px 9px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 12.5, outline: "none" }}
                        />
                        <button
                          onClick={() => handleSave(c.idCandidat)}
                          disabled={savingId === c.idCandidat || !valeurs[c.idCandidat]?.trim()}
                          style={{
                            padding: "6px 12px", borderRadius: 7, border: "none",
                            background: !valeurs[c.idCandidat]?.trim() ? "#e2e8f0" : "#7c3aed",
                            color: !valeurs[c.idCandidat]?.trim() ? "#94a3b8" : "#fff",
                            fontSize: 12, fontWeight: 600,
                            cursor: !valeurs[c.idCandidat]?.trim() ? "not-allowed" : "pointer",
                          }}
                        >
                          {savingId === c.idCandidat ? "..." : "OK"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 14, padding: "9px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

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
   console.log("URL générée :", url);
  window.open(url, "_blank");
}

// ── MODAL D'ÉDITION — personne externe (perfectionnement) ──────────────────
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

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13,
    outline: "none", color: "#1e293b",
  };
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
          <button
            onClick={onClose}
            disabled={saving}
            style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontWeight: 600 }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ flex: 2, padding: "10px 0", borderRadius: 9, border: "none", background: saving ? "#94a3b8" : "#0369a1", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700 }}
          >
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
            ✓ Inscrire
          </button>
        </div>
      </div>
    </div>
  );
}

const Condidats = () => {
  const [candidats,         setCandidats]        = useState([]);
  const [showModal,         setShowModal]        = useState(false);
  const [editCandidat,     setEditCandidat]     = useState(null);
  const [isReinscription,  setIsReinscription]  = useState(false); 
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedCategorie, setSelectedCategorie] = useState("Tous"); 
  const [contactCandidat,  setContactCandidat]  = useState(null);
  const [showEnvoiModal,   setShowEnvoiModal]   = useState(false);
  const [showMatriculesModal, setShowMatriculesModal] = useState(false);
  const [historiqueCandidat, setHistoriqueCandidat]  = useState(null);

  const [selectedCategorieObtenu, setSelectedCategorieObtenu] = useState("Tous");
  const [dateObtentionDebut, setDateObtentionDebut] = useState("");
  const [dateObtentionFin,   setDateObtentionFin]   = useState("");
  const [nbSeancesMax, setNbSeancesMax] = useState(SESSIONS_NORMALES_MAX); // valeur configurable, défaut 2

  // ── Table "Perfectionnement — Externes" ──────────────────────────────────
  const [selectedCategorieExterne, setSelectedCategorieExterne] = useState("Tous");
  const [editingExterne, setEditingExterne] = useState(null);
  const [auditeursLibres, setAuditeursLibres] = useState([]);
const [selectedCategorieAuditeur, setSelectedCategorieAuditeur] = useState("Tous");
const [convertingId, setConvertingId] = useState(null);
const [confirmAuditeur, setConfirmAuditeur] = useState(null); // candidat en attente de confirmation
  const [deletingExterneId, setDeletingExterneId] = useState(null);

  const { examensList } = useExamenCtx();

  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "14px" };
  const td = { padding: "14px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "14px", color: "#1F2937" };

  const candidatsBase = candidats.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || (
      c.nom.toLowerCase().includes(q) ||
      c.prenom.toLowerCase().includes(q) ||
      c.tel.toLowerCase().includes(q) ||
      (c.status && c.status.toLowerCase().includes(q))
    );
  });

  // Candidats "en cours" : on exclut désormais aussi les externes (perfectionnement uniquement)
  const candidatsEnCours = candidatsBase.filter((c) => {
    if (c.status === "obtenu") return false;
    if (c.externe) return false;
    const matchesCategorie = selectedCategorie === "Tous" || c.categoriePermis === selectedCategorie.toUpperCase();
    return matchesCategorie;
  });

  // Candidats "obtenu" (vrais candidats de l'auto-école) : externes exclus aussi
  const candidatsObtenus = candidatsBase
    .filter((c) => c.status === "obtenu" && !c.externe)
    .map((c) => ({ ...c, dateObtention: getDateObtention(c.id, examensList) }))
    .filter((c) => {
      const matchesCategorie = selectedCategorieObtenu === "Tous" || c.categoriePermis === selectedCategorieObtenu.toUpperCase();
      const d = toComparableDate(c.dateObtention);
      const matchesDate =
        (!dateObtentionDebut || (d && d >= dateObtentionDebut)) &&
        (!dateObtentionFin   || (d && d <= dateObtentionFin));
      return matchesCategorie && matchesDate;
    })
    .sort((a, b) => new Date(b.dateObtention || 0) - new Date(a.dateObtention || 0));

  // Personnes externes (perfectionnement uniquement — permis déjà obtenu ailleurs)
  const candidatsExternes = candidatsBase.filter((c) => {
    if (!c.externe) return false;
    const matchesCategorie = selectedCategorieExterne === "Tous" || c.categoriePermis === selectedCategorieExterne.toUpperCase();
    return matchesCategorie;
  });

  const loadCandidats = async (maxOverride) => {
    const max = maxOverride ?? nbSeancesMax;
    try {
      const data            = await window.electron.getCandidats();
      const seances          = await window.electron.getSeances();
      const inscriptionsCode = await window.electron.getInscriptionsCode();

      const formatted = data.map((c) => {
        const currentCat = (c.categoriePermis || c.categorie || c.categorie_permis || "B")
          .toString().trim().toUpperCase();

        // ── Séances de conduite (hors "code") ──────────────────────────────
        const nbSessionsConduite = seances.filter((s) => {
          if (!s.candidatsIds) return false;
          const ids = String(s.candidatsIds).split(",").map((id) => parseInt(id.trim()));
          const matchCandidat = ids.includes(c.idCandidat);
          const seanceCat = (s.categoriePermis || "").toString().trim().toUpperCase();
          const matchCategorie = seanceCat === currentCat;

          const seanceType = (s.type || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const matchType = !seanceType.includes("code");

          // ── On exclut les séances annulées : présente ET absente comptent, annulée non ──
          const statutNorm = (s.statut || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const matchStatut = statutNorm !== "annulee";

          return matchCandidat && matchCategorie && matchType && matchStatut;
        }).length;

        // ── Cours de code (table séparée SeanceCode / CandidatSeanceCode) ──
        const nbSessionsCode = inscriptionsCode.filter((i) => {
          const cat = (i.categoriePermis || "").toString().trim().toUpperCase();
          return i.idCandidat === c.idCandidat && cat === currentCat;
        }).length;

       const nbSessions      = Math.min(nbSessionsConduite, max);
        const nbSessionsSuppl = Math.max(nbSessionsConduite - max, 0);

        return {
          id: c.idCandidat,
          nom: c.nom || "",
          prenom: c.prenom || "",
          tel: c.telephone || "",
          categoriePermis: currentCat,
          inscription: formatDateAr(c.date_inscription),
          sessions: nbSessions,
          sessionsSuppl: nbSessionsSuppl,
          status: c.statut|| "en cours",
          externe: !!c.externe,
          _raw: c,
        };
      });

      setCandidats(formatted);
    } catch (e) {
      console.error("Erreur lors du chargement des candidats:", e);
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
      await loadCandidats(max);
      await loadAuditeursLibres();
    })();
  }, []);

  useEffect(() => {
    const handler = () => loadCandidats(nbSeancesMax);
    window.addEventListener("seance-updated", handler);
    return () => window.removeEventListener("seance-updated", handler);
  }, [nbSeancesMax]);

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
        // Nouveau candidat uniquement → message de bienvenue WhatsApp
        openWhatsAppBienvenue(cleanData.telephone, cleanData.prenom);
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

  // ── Actions pour la table Externes ───────────────────────────────────────
  const handleDeleteExterne = async (id) => {
    if (!window.confirm("Supprimer cette personne externe ?")) return;
    setDeletingExterneId(id);
    try {
      const ok = await window.electron.deleteCandidatExterne(id);
      if (ok) {
        await loadCandidats();
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
        await loadCandidats();
        setEditingExterne(null);
      } else {
        alert("Erreur lors de la mise à jour.");
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue.");
    }
  };
  // ── Actions pour la table Auditeurs libres ───────────────────────────────
  const auditeursFiltres = auditeursLibres.filter((c) => {
    const cat = (c.categoriePermis || "B").toString().trim().toUpperCase();
    return selectedCategorieAuditeur === "Tous" || cat === selectedCategorieAuditeur.toUpperCase();
  });

 // Étape 1 : ouvre la confirmation maison (au lieu de window.confirm)
  const handleDemandeConversion = (candidat) => {
    setConfirmAuditeur(candidat);
  };

  // Étape 2 : exécutée seulement après confirmation dans la modale maison
  const handleConvertirAuditeur = async (candidat) => {
    setConfirmAuditeur(null);
    setConvertingId(candidat.idCandidat);
    try {
      const result = await window.electron.convertirAuditeurLibre(candidat.idCandidat);
      if (result?.success) {
        await loadAuditeursLibres();
        await loadCandidats();
        setIsReinscription(false);
        setEditCandidat(candidat);
        setShowModal(true);
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
              <h2>Candidats en cours</h2>
              <p>{candidatsEnCours.length} candidat(s) en formation</p>
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
              <button
                onClick={() => setShowMatriculesModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#0369a1", color: "#fff", border: "none",
                  padding: "10px 18px", borderRadius: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                }}
              >
                <FileText size={16} /> Matricules en attente
              </button>
              <Button text="+ Ajouter candidat" onClick={handleAdd} />
            </div>
          </div>

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
                  {candidatsEnCours.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucun candidat trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    candidatsEnCours.map((c, index) => (
                      <tr key={c.id} style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>

                       
<td style={td}>
  <div style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</div>
  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
    <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", display: "inline-block" }}>
      Catégorie {c.categoriePermis}
    </span>
  </div>
</td>

                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone size={15} /> {c.tel}
                          </div>
                        </td>

                        <td style={td}>{c.inscription}</td>

                        <td style={td}>
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

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <div>
              <h2>🎓 Historique — Permis obtenus</h2>
              <p>{candidatsObtenus.length} candidat(s) ayant obtenu leur permis</p>
            </div>
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
                    <th style={th}>Candidat</th>
                    <th style={th}>Catégorie</th>
                    <th style={th}>Date d'obtention</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatsObtenus.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                        Aucun candidat trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    candidatsObtenus.map((c, index) => (
                      <tr key={c.id} style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</div>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermis}
                          </span>
                        </td>
                        <td style={td}>
                          {c.dateObtention ? new Date(c.dateObtention).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <History
                              size={17}
                              color="#7c3aed"
                              style={{ cursor: "pointer" }}
                              title="Historique des examens"
                              onClick={() => setHistoriqueCandidat(c)}
                            />
                            <PlusCircle
                              size={17}
                              color="green"
                              style={{ cursor: "pointer" }}
                              title="Inscrire à une nouvelle catégorie"
                              onClick={() => handleReinscrire(c)}
                            />
                            <Mail
                              size={17}
                              color={c._raw?.email ? "#2b537e" : "#cbd5e1"}
                              style={{ cursor: c._raw?.email ? "pointer" : "default" }}
                              title={c._raw?.email ? `Envoyer un email à ${c.prenom} ${c.nom}` : "Pas d'email enregistré"}
                              onClick={() => { if (c._raw?.email) setContactCandidat(c); }}
                            />
                            <Trash
                              size={17}
                              color="red"
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

        {/* ── NOUVELLE TABLE : Perfectionnement — Externes ────────────────── */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <div>
              <h2>🚗 Perfectionnement — Externes</h2>
              <p>{candidatsExternes.length} personne(s) — permis déjà obtenu hors auto-école</p>
            </div>
          </div>

          <div style={{
            display: "flex", gap: 12, marginBottom: 20,
            background: "#fff", padding: "10px 14px", borderRadius: 12,
            border: "1px solid #E2E8F0", alignItems: "center",
          }}>
            <Filter size={16} color="#64748b" />
            <select
              value={selectedCategorieExterne}
              onChange={(e) => setSelectedCategorieExterne(e.target.value)}
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
              }}
            >
              {TOUTES_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "Tous" ? "Toutes catégories" : `Permis ${cat}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#0369a1" }}>
                    <th style={th}>Personne</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Catégorie</th>
                    <th style={th}>Séances de perfectionnement</th>
                    <th style={th}>Actions</th>
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
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</div>
                          <span style={{ fontSize: "11px", background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", display: "inline-block", marginTop: 4 }}>
                            🆕 Externe
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone size={15} /> {c.tel || "—"}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermis}
                          </span>
                        </td>
                        <td style={td}>
                          {c.sessions}{c.sessionsSuppl > 0 ? ` (+${c.sessionsSuppl})` : ""}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <SquarePen
                              size={17} color="blue"
                              style={{ cursor: "pointer" }}
                              title="Modifier"
                              onClick={() => setEditingExterne(c._raw)}
                            />
                            <Mail
                              size={17}
                              color={c._raw?.email ? "#2b537e" : "#cbd5e1"}
                              style={{ cursor: c._raw?.email ? "pointer" : "default" }}
                              title={c._raw?.email ? `Envoyer un email à ${c.prenom} ${c.nom}` : "Pas d'email enregistré"}
                              onClick={() => { if (c._raw?.email) setContactCandidat(c); }}
                            />
                            <Trash
                              size={17} color="red"
                              style={{ cursor: deletingExterneId === c.id ? "not-allowed" : "pointer" }}
                              onClick={() => { if (deletingExterneId !== c.id) handleDeleteExterne(c.id); }}
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

        {/* ── NOUVELLE TABLE : Auditeurs libres — Cours de code ───────────── */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <div>
              <h2>📖 Auditeurs libres — Cours de code</h2>
              <p>{auditeursFiltres.length} personne(s) ayant suivi le code sans être inscrite(s)</p>
            </div>
          </div>

          <div style={{
            display: "flex", gap: 12, marginBottom: 20,
            background: "#fff", padding: "10px 14px", borderRadius: 12,
            border: "1px solid #E2E8F0", alignItems: "center",
          }}>
            <Filter size={16} color="#64748b" />
            <select
              value={selectedCategorieAuditeur}
              onChange={(e) => setSelectedCategorieAuditeur(e.target.value)}
              style={{
                padding: "10px 32px 10px 14px", fontSize: "14px", fontWeight: "600",
                color: "#1e293b", background: "#F1F5F9", border: "1px solid #E2E8F0",
                borderRadius: "8px", cursor: "pointer", outline: "none", minWidth: "160px",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "14px",
              }}
            >
              {TOUTES_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "Tous" ? "Toutes catégories" : `Permis ${cat}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: "#d97706" }}>
                    <th style={th}>Personne</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Catégorie</th>
                    <th style={th}>Ajouté le</th>
                    <th style={th}>Actions</th>
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
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</div>
                          <span style={{ fontSize: "11px", background: "#fff7ed", color: "#c2410c", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", display: "inline-block", marginTop: 4 }}>
                            📖 Auditeur libre
                          </span>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone size={15} /> {c.telephone || "—"}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {c.categoriePermis}
                          </span>
                        </td>
                        <td style={td}>{formatDateAr(c.date_inscription)}</td>
                        <td style={td}>
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
          onSent={loadCandidats}
        />
      )}

      {showMatriculesModal && (
        <MatriculesEnAttenteModal
          onClose={() => setShowMatriculesModal(false)}
          onSaved={loadCandidats}
        />
      )}

      {historiqueCandidat && (
        <HistoriqueExamensModal
          candidat={historiqueCandidat}
          examensList={examensList}
          onClose={() => setHistoriqueCandidat(null)}
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
    </div>
  );
};

export default Condidats;