import React from "react";
import { FaCalendarDay, FaClock } from "react-icons/fa";

const typeColor = {
  Code:        { bg: "#e8f5e9", color: "#2e7d32" },
  Créneau:     { bg: "#fff3e0", color: "#e65100" },
  Circulation: { bg: "#fce4ec", color: "#c62828" },
};

const statusConfig = {
  Scheduled: { bg: "#e3f2fd", color: "#1565c0", label: "Programmé" },
  Passed:    { bg: "#e8f5e9", color: "#2e7d32", label: "Réussi"    },
  Failed:    { bg: "#ffebee", color: "#c62828", label: "Échoué"    },
};

const ExamenModal = ({ examen, onClose }) => {
  if (!examen) return null;

  const tp = typeColor[examen.type]     || { bg: "#eee", color: "#333" };
  const st = statusConfig[examen.status] || { bg: "#eee", color: "#333", label: examen.status };

  const badge = (bg, color, text) => (
    <span style={{
      padding: "4px 12px", borderRadius: 8, fontSize: 12,
      fontWeight: 700, background: bg, color,
    }}>{text}</span>
  );

  const row = (label, value) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 0", borderBottom: "1px solid #F3F4F6",
    }}>
      <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111827" }}>{value}</span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "90%", maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: "1px solid #E5E7EB",
          background: "#F9FAFB",
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>
            Détails de l'examen
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 18,
              cursor: "pointer", color: "#6B7280",
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#4E96E1", marginBottom: 16 }}>
            {examen.candidat}
          </div>

          {row("Type d'examen", badge(tp.bg, tp.color, examen.type))}
          {row("Date", (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FaCalendarDay color="#4E96E1" size={12} /> {examen.date}
            </span>
          ))}
          {row("Heure", (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FaClock color="#4E96E1" size={12} /> {examen.heure}
            </span>
          ))}
          {row("Statut", badge(st.bg, st.color, st.label))}

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 22px", borderRadius: 10, border: "1px solid #E5E7EB",
                background: "#fff", color: "#374151", fontSize: 13,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamenModal;