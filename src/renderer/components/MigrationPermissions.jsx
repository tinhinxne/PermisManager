// src/renderer/components/MigrationPermissions.jsx
import React, { useState } from "react";
import { usePermissionsCtx } from "../context/PermissionsContext";
import { Upload, Check, AlertTriangle } from "lucide-react";

export default function MigrationPermissions() {
  const { updatePermissions, reload } = usePermissionsCtx();
  const [status, setStatus] = useState(null); // null | "running" | "done" | "empty" | "error"
  const [detail, setDetail] = useState("");

  const handleMigrate = async () => {
    setStatus("running");
    try {
      const raw = localStorage.getItem("moniteur_permissions");
      const old = raw ? JSON.parse(raw) : {};
      const entries = Object.entries(old);

      if (entries.length === 0) {
        setStatus("empty");
        return;
      }

      let migrated = 0;
      const errors = [];

      for (const [moniteurId, perms] of entries) {
        const res = await updatePermissions(moniteurId, perms);
        if (res?.success) {
          migrated++;
        } else {
          errors.push(moniteurId);
        }
      }

      if (errors.length > 0) {
        setStatus("error");
        setDetail(`${migrated}/${entries.length} migrés. Échec pour moniteur(s) id: ${errors.join(", ")}`);
      } else {
        setStatus("done");
        setDetail(`${migrated} moniteur(s) migré(s) avec succès.`);
        localStorage.removeItem("moniteur_permissions");
        await reload();
      }
    } catch (e) {
      console.error("Erreur migration:", e);
      setStatus("error");
      setDetail("Erreur inattendue — voir la console.");
    }
  };

  return (
    <div style={{
      border: "1px solid #fbbf24", background: "#fffbeb", borderRadius: 12,
      padding: 16, display: "flex", flexDirection: "column", gap: 10, maxWidth: 460,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={16} color="#b45309" />
        <span style={{ fontWeight: 600, fontSize: 13, color: "#92400e" }}>
          Migration ponctuelle des permissions (localStorage → base de données)
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#78350f", margin: 0 }}>
        À exécuter une seule fois par poste ayant des permissions déjà configurées.
        Ce composant est temporaire — à retirer une fois tous les postes migrés.
      </p>

      <button
        onClick={handleMigrate}
        disabled={status === "running"}
        style={{
          alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: 8, border: "none",
          background: "#b45309", color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: status === "running" ? "default" : "pointer",
          opacity: status === "running" ? 0.6 : 1,
        }}
      >
        <Upload size={14} />
        {status === "running" ? "Migration en cours…" : "Migrer maintenant"}
      </button>

      {status === "done" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#166534" }}>
          <Check size={14} /> {detail}
        </div>
      )}
      {status === "empty" && (
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Aucune donnée trouvée dans localStorage sur ce poste — rien à migrer.
        </div>
      )}
      {status === "error" && (
        <div style={{ fontSize: 12, color: "#dc2626" }}>{detail}</div>
      )}
    </div>
  );
}