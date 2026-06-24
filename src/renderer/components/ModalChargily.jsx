import React, { useState, useEffect } from "react";
import { X, Save, Check, Eye, EyeOff } from "lucide-react";

const ModalChargily = ({ onClose }) => {
  const [key,      setKey]      = useState("");
  const [mode,     setMode]     = useState("test");
  const [showKey,  setShowKey]  = useState(false);
  const [testing,  setTesting]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [testResult, setTestResult] = useState(null); // { success, message }
  const [saved,    setSaved]    = useState(false);

  // Charger la config existante
  useEffect(() => {
    window.electron.getChargilyConfig().then(config => {
      if (config.key)  setKey(config.key);
      if (config.mode) setMode(config.mode);
    });
  }, []);

  const handleTest = async () => {
    if (!key.trim()) return;
    setTesting(true);
    setTestResult(null);
    const result = await window.electron.testChargilyConfig({ key: key.trim(), mode });
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    const result = await window.electron.setChargilyConfig({ key: key.trim(), mode });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => onClose(), 1000);
    }
  };

  const maskedKey = key.length > 12
    ? key.slice(0, 8) + "•".repeat(key.length - 12) + key.slice(-4)
    : key;

  return (
    <div className="modal-overlay">
      <div className="modal new-modal" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div className="new-modal-header" style={{ background: "linear-gradient(135deg,#6c63ff,#4f46e5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>💳</span>
            <div>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 16 }}>Paiement en ligne — Chargily</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: 12 }}>
                Configuration CIB / EDAHABIA
              </p>
            </div>
          </div>
          <span className="close" onClick={onClose} style={{ color: "#fff" }}><X size={16}/></span>
        </div>

        <hr/>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Mode */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>
              Mode
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {[["test", "🧪 Test", "Pour tester sans argent réel"], ["live", "🚀 Production", "Paiements réels"]].map(([val, label, desc]) => (
                <div
                  key={val}
                  onClick={() => { setMode(val); setTestResult(null); }}
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${mode === val ? (val === "live" ? "#22c55e" : "#6c63ff") : "#e2e8f0"}`,
                    background: mode === val ? (val === "live" ? "#f0fdf4" : "#ede9fe") : "#f8fafc",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: mode === val ? (val === "live" ? "#166534" : "#4f46e5") : "#64748b" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Clé API */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
              Clé secrète Chargily {mode === "test" ? "(test_sk_...)" : "(live_sk_...)"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={e => { setKey(e.target.value); setTestResult(null); setSaved(false); }}
                placeholder={mode === "test" ? "test_sk_xxxxxxxxxxxxxxxx" : "live_sk_xxxxxxxxxxxxxxxx"}
                style={{
                  width: "100%", padding: "11px 44px 11px 14px",
                  border: `1.5px solid ${testResult?.success ? "#86efac" : testResult?.success === false ? "#fca5a5" : "#e2e8f0"}`,
                  borderRadius: 10, fontSize: 13, outline: "none",
                  background: "#f8fafc", boxSizing: "border-box",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              Disponible dans <strong>pay.chargily.com → Coin des développeurs</strong>
            </p>
          </div>

          {/* Résultat test */}
          {testResult && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: testResult.success ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${testResult.success ? "#86efac" : "#fca5a5"}`,
              fontSize: 13, fontWeight: 600,
              color: testResult.success ? "#166534" : "#dc2626",
            }}>
              {testResult.success ? "✅ Connexion réussie ! La clé est valide." : `❌ ${testResult.message || "Clé invalide"}`}
            </div>
          )}

          {/* Info */}
          <div style={{ background: "#f0f6ff", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            <strong>Comment ça marche ?</strong><br/>
            Le candidat paie avec sa carte <strong>CIB ou EDAHABIA</strong> directement depuis l'app. L'argent va sur votre compte Chargily.
          </div>

        </div>

        {/* Footer */}
        <div className="new-modal-footer">
          <button className="btn cancel" onClick={onClose}><X size={13}/> Annuler</button>
          <button
            className="btn"
            onClick={handleTest}
            disabled={!key.trim() || testing}
            style={{
              background: "#f0f6ff", color: "#2b537e",
              border: "1px solid #4E96E1", borderRadius: 8,
              padding: "8px 16px", cursor: key.trim() ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {testing ? "⏳ Test..." : "🔌 Tester"}
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={!key.trim() || saving}
            style={{ background: saved ? "#22c55e" : undefined, transition: "background 0.3s" }}
          >
            {saved ? <><Check size={13}/> Sauvegardé !</> : saving ? "⏳..." : <><Save size={13}/> Sauvegarder</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalChargily;