import React, { useState, useEffect } from "react";
import { FaCalendarDay, FaClock, FaMapMarkerAlt, FaSave, FaTimes } from "react-icons/fa";
import { useExamenCtx } from "../context/ExamenContext";

const typeColor = {
  Code:        { bg: "#e8f5e9", color: "#2e7d32" },
  Créneau:     { bg: "#fff3e0", color: "#e65100" },
  Circulation: { bg: "#fce4ec", color: "#c62828" },
};

const statusConfig = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé"  },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"     },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"     },
};

const ExamenModal = ({ examen, onClose }) => {
  const { updateExamen } = useExamenCtx();

  const [heure, setHeure] = useState("");
  const [lieu,  setLieu]  = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!examen) return;
    setHeure(examen.heure || "");
    setLieu(examen.lieu  || "");
    setSaved(false);
  }, [examen?.id]);

  if (!examen) return null;

  const tp       = typeColor[examen.type]      || { bg: "#eee", color: "#333" };
  const st       = statusConfig[examen.status] || { bg: "#eee", color: "#333", label: examen.status };
  const canEdit  = examen.status === "Scheduled";

  const badge = (bg, color, text) => (
    <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: bg, color }}>
      {text}
    </span>
  );

  const rowView = (label, icon, value) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 0", borderBottom: "1px solid #F3F4F6",
    }}>
      <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 13, color: "#111827" }}>
        {value || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>}
      </span>
    </div>
  );

  const handleSave = () => {
    if (!heure || !lieu.trim()) return;
    updateExamen(examen.id, { heure, lieu: lieu.trim(), manuallyEdited: true });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const canSave = canEdit && heure && lieu.trim() &&
    (heure !== examen.heure || lieu.trim() !== examen.lieu);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "90%", maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
          animation: "modalPop .2s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`@keyframes modalPop{from{transform:translateY(16px) scale(.97);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 22px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Détails de l'examen
            </h3>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {canEdit ? "Vous pouvez modifier l'heure et le lieu" : "Résultat enregistré — lecture seule"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#6B7280" }}>
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px" }}>

          {/* Candidat + badges */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{examen.candidat}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {badge(tp.bg, tp.color, examen.type)}
              {badge(st.bg, st.color, st.label)}
            </div>
          </div>

          {/* Date — toujours en lecture seule */}
          {rowView("Date", <FaCalendarDay color="#4E96E1" size={12} />, examen.date)}

          {/* Séances */}
          {rowView("Séances", null, examen.nbSeances ? `${examen.nbSeances} séances` : "—")}

          {/* Heure */}
          <div style={{ padding: "11px 0", borderBottom: "1px solid #F3F4F6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <FaClock color="#4E96E1" size={12} /> Heure
              </span>
              {canEdit ? (
                <input
                  type="time"
                  value={heure}
                  onChange={e => setHeure(e.target.value)}
                  style={{
                    padding: "5px 10px", border: "1.5px solid #d1d5db", borderRadius: 8,
                    fontSize: 13, color: "#1F2937", outline: "none", background: "#fafafa",
                  }}
                  onFocus={e  => e.target.style.borderColor = "#4E96E1"}
                  onBlur={e   => e.target.style.borderColor = "#d1d5db"}
                />
              ) : (
                <span style={{ fontSize: 13, color: "#111827" }}>{examen.heure || "—"}</span>
              )}
            </div>
          </div>

          {/* Lieu */}
          <div style={{ padding: "11px 0", borderBottom: "1px solid #F3F4F6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <FaMapMarkerAlt color="#4E96E1" size={12} /> Lieu
              </span>
              {canEdit ? (
                <input
                  type="text"
                  value={lieu}
                  onChange={e => setLieu(e.target.value)}
                  placeholder="Ex : Centre d'examen de Béjaïa"
                  style={{
                    flex: 1, padding: "5px 10px", border: "1.5px solid #d1d5db", borderRadius: 8,
                    fontSize: 13, color: "#1F2937", outline: "none", background: "#fafafa",
                    textAlign: "right",
                  }}
                  onFocus={e  => e.target.style.borderColor = "#4E96E1"}
                  onBlur={e   => e.target.style.borderColor = "#d1d5db"}
                />
              ) : (
                <span style={{ fontSize: 13, color: "#111827" }}>{examen.lieu || "—"}</span>
              )}
            </div>
          </div>

          {/* Feedback sauvegarde */}
          {saved && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: "#dcfce7", color: "#166534", fontSize: 13, fontWeight: 600, textAlign: "center",
            }}>
              ✅ Modifications enregistrées
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px", borderRadius: 9, border: "1px solid #E5E7EB",
                background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Fermer
            </button>
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  padding: "9px 20px", borderRadius: 9, border: "none",
                  background: canSave ? "#2b537e" : "#cbd5e1",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: canSave ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 7,
                  transition: "background .2s",
                }}
              >
                <FaSave size={12} /> Enregistrer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamenModal;