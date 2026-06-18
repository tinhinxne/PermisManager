import React, { useState, useEffect, useCallback, useRef } from "react";

const PRIX_PERMIS = 30000;

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDA(n) {
  return `${Number(n || 0).toLocaleString("fr-DZ")} DA`;
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("fr-FR");
}

function methodeLabel(m) {
  const map = { ccp: "CCP", carte: "Carte bancaire", especes: "Espèces" };
  return map[m] ?? m ?? "—";
}

function getMonthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// Numéro de facture auto : FAC-YYYYMM-XXXX
function genInvoiceNumber(year, month, idx) {
  return `FAC-${year}${String(month).padStart(2, "0")}-${String(idx + 1).padStart(4, "0")}`;
}

// ─── Styles partagés ─────────────────────────────────────────────────────────

const colors = {
  primary: "#2b537e",
  accent: "#4E96E1",
  danger: "#b91c1c",
  success: "#166534",
  bg: "#F0F4FA",
  card: "#fff",
  border: "#E2E8F0",
  muted: "#64748b",
  text: "#1e293b",
};

const btn = (extra = {}) => ({
  border: "none",
  borderRadius: "10px",
  padding: "10px 20px",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
  transition: "opacity .15s",
  ...extra,
});

// ─── Composant : Reçu / Facture imprimable ────────────────────────────────────

const InvoicePrint = React.forwardRef(({ invoice, school }, ref) => {
  const { candidate, versements, month, year, invoiceNumber } = invoice;
  const totalVersement = versements.reduce((s, v) => s + Number(v.montant || 0), 0);
  const totalPaye      = PRIX_PERMIS - Number(candidate.montantRestant || 0);
  const reste          = Number(candidate.montantRestant || 0);

  return (
    <div ref={ref} style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: "#fff",
      color: "#111",
      padding: "40px 48px",
      maxWidth: "720px",
      margin: "0 auto",
      boxSizing: "border-box",
    }}>
      {/* EN-TÊTE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #2b537e", paddingBottom: "20px", marginBottom: "24px" }}>
        <div>
          <div style={{ fontWeight: "900", fontSize: "22px", color: "#2b537e", letterSpacing: ".5px" }}>
            {school?.nom || "Auto-École"}
          </div>
          <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
            {school?.adresse || ""}{school?.telephone ? ` · Tél : ${school.telephone}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Reçu de paiement</div>
          <div style={{ fontWeight: "800", fontSize: "16px", color: "#2b537e", marginTop: "2px" }}>{invoiceNumber}</div>
          <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
            {getMonthLabel(year, month)}
          </div>
        </div>
      </div>

      {/* CANDIDAT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#F0F4FA", borderRadius: "10px", padding: "14px 18px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Candidat</div>
          <div style={{ fontWeight: "700", fontSize: "16px", color: "#1e293b" }}>{candidate.prenom} {candidate.nom}</div>
          {candidate.telephone && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Tél : {candidate.telephone}</div>}
        </div>
        <div style={{ background: "#F0F4FA", borderRadius: "10px", padding: "14px 18px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Récapitulatif</div>
          <div style={{ fontSize: "13px", color: "#475569" }}>Total formation : <strong style={{ color: "#1e293b" }}>{formatDA(PRIX_PERMIS)}</strong></div>
          <div style={{ fontSize: "13px", color: "#475569" }}>Total payé : <strong style={{ color: "#166534" }}>{formatDA(totalPaye)}</strong></div>
          <div style={{ fontSize: "13px", color: "#475569" }}>Reste à payer : <strong style={{ color: reste > 0 ? "#b91c1c" : "#166534" }}>{formatDA(reste)}</strong></div>
        </div>
      </div>

      {/* TABLEAU VERSEMENTS DU MOIS */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b537e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Versements — {getMonthLabel(year, month)}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#2b537e", color: "#fff" }}>
              {["Date", "Montant", "Méthode", "Remarque"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "600" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {versements.map((v, i) => (
              <tr key={v.idVersement || i} style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB" }}>{formatDate(v.dateVersement)}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB", fontWeight: "700", color: "#166534" }}>{formatDA(v.montant)}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB" }}>{methodeLabel(v.methode)}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB", color: "#64748b" }}>{v.remarque || "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#F0F4FA" }}>
              <td style={{ padding: "10px 14px", fontWeight: "800", color: "#1e293b" }}>Total du mois</td>
              <td style={{ padding: "10px 14px", fontWeight: "900", fontSize: "15px", color: "#2b537e" }} colSpan={3}>
                {formatDA(totalVersement)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* BARRE PROGRESSION */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ height: "8px", background: "#CBD5E0", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, Math.round((totalPaye / PRIX_PERMIS) * 100))}%`,
            background: reste <= 0 ? "#166534" : "#4E96E1",
            borderRadius: "6px"
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
          <span>Payé : {formatDA(totalPaye)}</span>
          <span>{Math.min(100, Math.round((totalPaye / PRIX_PERMIS) * 100))}%</span>
        </div>
      </div>

      {/* PIED DE PAGE */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
        <span>Document généré le {new Date().toLocaleDateString("fr-FR")}</span>
        <span>{invoiceNumber}</span>
      </div>
    </div>
  );
});

// ─── Modal Historique Candidat ────────────────────────────────────────────────

const HistoryModal = ({ candidate, allPayments, onClose, onPrint }) => {
  const printRef = useRef();

  const payments = allPayments
    .filter(p => p.idCandidat === candidate.idCandidat)
    .sort((a, b) => new Date(a.dateVersement) - new Date(b.dateVersement));

  const totalPaye = payments.reduce((s, p) => s + Number(p.montant || 0), 0);
  const reste     = Number(candidate.montantRestant ?? PRIX_PERMIS);
  const pct       = Math.min(100, Math.round((totalPaye / PRIX_PERMIS) * 100));

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Historique — ${candidate.prenom} ${candidate.nom}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 9px 14px; text-align: left; }
        thead tr { background: #2b537e; color: white; }
        tbody tr:nth-child(even) { background: #F8FAFC; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px", width: "90%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", background: colors.primary, borderRadius: "20px 20px 0 0" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: "800", fontSize: "17px" }}>{candidate.prenom} {candidate.nom}</div>
            <div style={{ color: "#93C5FD", fontSize: "12px", marginTop: "2px" }}>Historique complet des paiements</div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={handlePrint} style={btn({ background: "#fff", color: colors.primary })}>
              🖨 Imprimer
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "24px" }} ref={printRef}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "22px" }}>
            {[
              { label: "Total formation", value: formatDA(PRIX_PERMIS), color: colors.primary },
              { label: "Total versé", value: formatDA(totalPaye), color: colors.success },
              { label: "Reste à payer", value: formatDA(reste), color: reste > 0 ? colors.danger : colors.success },
            ].map((s, i) => (
              <div key={i} style={{ background: colors.bg, borderRadius: "12px", padding: "14px", borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: "10px", color: colors.muted, textTransform: "uppercase", letterSpacing: ".8px" }}>{s.label}</div>
                <div style={{ fontWeight: "800", fontSize: "16px", color: s.color, marginTop: "4px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Barre */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ height: "10px", background: "#CBD5E0", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#166534" : colors.accent, borderRadius: "6px", transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: "12px", color: colors.muted, marginTop: "5px", textAlign: "right" }}>{pct}% payé</div>
          </div>

          {/* Tableau */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: colors.primary, color: "#fff" }}>
                {["#", "Date", "Montant", "Méthode", "Remarque"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "600" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: colors.muted }}>Aucun versement enregistré</td></tr>
              ) : payments.map((v, i) => (
                <tr key={v.idVersement || i} style={{ background: i % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB", color: colors.muted }}>{i + 1}</td>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB" }}>{formatDate(v.dateVersement)}</td>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB", fontWeight: "700", color: colors.success }}>{formatDA(v.montant)}</td>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB" }}>{methodeLabel(v.methode)}</td>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #E5E7EB", color: colors.muted }}>{v.remarque || "—"}</td>
                </tr>
              ))}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr style={{ background: "#F0F4FA" }}>
                  <td colSpan={2} style={{ padding: "10px 14px", fontWeight: "800" }}>Total</td>
                  <td style={{ padding: "10px 14px", fontWeight: "900", fontSize: "15px", color: colors.primary }} colSpan={3}>{formatDA(totalPaye)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const InvoiceGenerator = () => {
  const now        = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab,   setTab]   = useState("monthly"); // "monthly" | "candidates"

  const [allPayments,   setAllPayments]   = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [school,        setSchool]        = useState(null);

  const [previewInvoice,  setPreviewInvoice]  = useState(null);
  const [historyCandidat, setHistoryCandidat] = useState(null);
  const [searchCand,      setSearchCand]      = useState("");

  const printRef = useRef();

  // Chargement
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [payments, candidates, schoolInfo] = await Promise.all([
        window.electron.getPayments?.()           ?? [],
        window.electron.getCandidats?.()          ?? [],
        window.electron.getSchoolInfo?.()         ?? null,
      ]);
      setAllPayments(payments   || []);
      setAllCandidates(candidates || []);
      setSchool(schoolInfo);
    } catch (err) {
      console.error("Erreur chargement InvoiceGenerator :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Factures du mois ──────────────────────────────────────────────────────

  // Groupe les versements du mois sélectionné par candidat
  const monthlyInvoices = (() => {
    const monthPayments = allPayments.filter(p => {
      const d = new Date(p.dateVersement);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    const byCandidat = {};
    for (const p of monthPayments) {
      const id = p.idCandidat;
      if (!byCandidat[id]) {
        byCandidat[id] = { candidate: null, versements: [] };
      }
      byCandidat[id].versements.push(p);
      // Prend les infos candidat depuis le versement
      if (!byCandidat[id].candidate) {
        byCandidat[id].candidate = {
          idCandidat:     p.idCandidat,
          nom:            p.nom || "",
          prenom:         p.prenom || "",
          telephone:      p.telephone || "",
          montantRestant: p.montantRestant ?? 0,
        };
      }
    }

    return Object.values(byCandidat).map((entry, idx) => ({
      ...entry,
      month,
      year,
      invoiceNumber: genInvoiceNumber(year, month, idx),
    }));
  })();

  // ── Candidats ─────────────────────────────────────────────────────────────

  // Tous les candidats avec stats calculées depuis allPayments
  const candidatesWithStats = allCandidates.map(c => {
    const payments = allPayments.filter(p => p.idCandidat === (c.idCandidat || c.id));
    const totalPaye = payments.reduce((s, p) => s + Number(p.montant || 0), 0);
    const reste     = Number(c.montantRestant ?? PRIX_PERMIS);
    return {
      ...c,
      idCandidat:     c.idCandidat || c.id,
      totalPaye,
      montantRestant: reste,
      nbVersements:   payments.length,
    };
  }).filter(c =>
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchCand.toLowerCase())
  );

  // ── Impression d'une facture ──────────────────────────────────────────────

  const handlePrintInvoice = (invoice) => {
    const content = document.getElementById("invoice-print-area").innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Reçu ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 14px; text-align: left; }
        thead tr { background: #2b537e; color: white; }
        tbody tr:nth-child(even) { background: #F8FAFC; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  const years  = [2023, 2024, 2025, 2026, 2027];
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i).toLocaleDateString("fr-FR", { month: "long" }) }));

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px", color: colors.muted, fontSize: "15px" }}>
        ⏳ Chargement des données...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", fontFamily: "'Segoe UI', sans-serif", background: colors.bg, minHeight: "100vh", boxSizing: "border-box" }}>

      {/* TITRE */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, color: colors.primary, fontWeight: "900", fontSize: "22px" }}>
          📄 Factures & Historiques
        </h2>
        <p style={{ margin: "4px 0 0", color: colors.muted, fontSize: "13px" }}>
          Générez les reçus mensuels ou consultez l'historique de chaque candidat
        </p>
      </div>

      {/* ONGLETS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {[
          { id: "monthly",    label: "📅 Factures du mois" },
          { id: "candidates", label: "👤 Historique par candidat" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={btn({
            background: tab === t.id ? colors.primary : "#fff",
            color:      tab === t.id ? "#fff" : colors.primary,
            border:     `1.5px solid ${colors.primary}`,
          })}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ONGLET FACTURES MENSUELLES ─────────────────────────────────────── */}
      {tab === "monthly" && (
        <>
          {/* Sélecteurs mois/année */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", background: "#fff", padding: "14px 20px", borderRadius: "14px", border: `1px solid ${colors.border}` }}>
            <select value={month} onChange={e => setMonth(+e.target.value)}
              style={{ padding: "9px 14px", borderRadius: "8px", border: `1px solid ${colors.border}`, fontSize: "14px", color: colors.text, fontWeight: "600", cursor: "pointer" }}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)}
              style={{ padding: "9px 14px", borderRadius: "8px", border: `1px solid ${colors.border}`, fontSize: "14px", color: colors.text, fontWeight: "600", cursor: "pointer" }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ color: colors.muted, fontSize: "13px" }}>
              {monthlyInvoices.length} facture(s) pour <strong>{getMonthLabel(year, month)}</strong>
            </span>
          </div>

          {/* Liste des factures */}
          {monthlyInvoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "14px", color: colors.muted, fontSize: "15px" }}>
              Aucun versement pour ce mois.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {monthlyInvoices.map((inv, i) => {
                const total = inv.versements.reduce((s, v) => s + Number(v.montant || 0), 0);
                return (
                  <div key={i} style={{
                    background: "#fff", borderRadius: "14px", padding: "18px 22px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: `1px solid ${colors.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "15px", color: colors.text }}>{inv.candidate.prenom} {inv.candidate.nom}</div>
                      <div style={{ fontSize: "12px", color: colors.muted, marginTop: "3px" }}>
                        {inv.invoiceNumber} · {inv.versements.length} versement(s)
                      </div>
                      <div style={{ fontSize: "12px", color: colors.muted, marginTop: "2px" }}>
                        Reste : <span style={{ color: Number(inv.candidate.montantRestant) > 0 ? colors.danger : colors.success, fontWeight: "700" }}>{formatDA(inv.candidate.montantRestant)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div style={{ textAlign: "right", marginRight: "12px" }}>
                        <div style={{ fontWeight: "900", fontSize: "18px", color: colors.success }}>{formatDA(total)}</div>
                        <div style={{ fontSize: "11px", color: colors.muted }}>versé ce mois</div>
                      </div>
                      <button onClick={() => setPreviewInvoice(inv)}
                        style={btn({ background: colors.bg, color: colors.primary, border: `1px solid ${colors.primary}` })}>
                        👁 Aperçu
                      </button>
                      <button onClick={() => { setPreviewInvoice(inv); setTimeout(() => handlePrintInvoice(inv), 100); }}
                        style={btn({ background: colors.primary, color: "#fff" })}>
                        🖨 Imprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── ONGLET HISTORIQUE PAR CANDIDAT ────────────────────────────────── */}
      {tab === "candidates" && (
        <>
          <div style={{ marginBottom: "16px", background: "#fff", borderRadius: "14px", padding: "12px 18px", border: `1px solid ${colors.border}` }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un candidat..."
              value={searchCand}
              onChange={e => setSearchCand(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {candidatesWithStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "14px", color: colors.muted }}>
              Aucun candidat trouvé.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {candidatesWithStats.map((c, i) => {
                const pct = Math.min(100, Math.round(((PRIX_PERMIS - c.montantRestant) / PRIX_PERMIS) * 100));
                return (
                  <div key={c.idCandidat || i} style={{
                    background: "#fff", borderRadius: "14px", padding: "18px 22px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: colors.text }}>{c.prenom} {c.nom}</div>
                        <div style={{ fontSize: "12px", color: colors.muted, marginTop: "2px" }}>
                          {c.nbVersements} versement(s) · Versé : <strong style={{ color: colors.success }}>{formatDA(c.totalPaye)}</strong>
                          {" · "}Reste : <strong style={{ color: c.montantRestant > 0 ? colors.danger : colors.success }}>{formatDA(c.montantRestant)}</strong>
                        </div>
                      </div>
                      <button onClick={() => setHistoryCandidat(c)}
                        style={btn({ background: colors.primary, color: "#fff" })}>
                        📋 Voir historique
                      </button>
                    </div>
                    {/* Mini barre de progression */}
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ height: "5px", background: "#CBD5E0", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? colors.success : colors.accent, borderRadius: "4px" }} />
                      </div>
                      <div style={{ fontSize: "10px", color: colors.muted, marginTop: "3px" }}>{pct}% payé</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Zone d'impression cachée */}
      {previewInvoice && (
        <div style={{ display: "none" }}>
          <div id="invoice-print-area">
            <InvoicePrint invoice={previewInvoice} school={school} />
          </div>
        </div>
      )}

      {/* Modal aperçu facture */}
      {previewInvoice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}
          onClick={() => setPreviewInvoice(null)}>
          <div style={{ background: "#fff", borderRadius: "20px", width: "90%", maxWidth: "760px", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${colors.border}` }}>
              <span style={{ fontWeight: "700", color: colors.primary }}>Aperçu — {previewInvoice.invoiceNumber}</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => handlePrintInvoice(previewInvoice)}
                  style={btn({ background: colors.primary, color: "#fff" })}>
                  🖨 Imprimer
                </button>
                <button onClick={() => setPreviewInvoice(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <InvoicePrint invoice={previewInvoice} school={school} />
          </div>
        </div>
      )}

      {/* Modal historique candidat */}
      {historyCandidat && (
        <HistoryModal
          candidate={historyCandidat}
          allPayments={allPayments}
          onClose={() => setHistoryCandidat(null)}
        />
      )}
    </div>
  );
};

export default InvoiceGenerator;