import React, { useState, useEffect, useCallback } from "react";
import PaymentModal from "../components/PaymentModal";
import InvoiceGenerator from "../components/InvoiceGenerator"; // 1. Import du nouveau composant
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/payment.css";

/**
 * Transforme une ligne retournée par get-payments (JOIN Versement+Paiement+Candidat)
 * en objet compatible avec le tableau et le modal.
 */
function rowToPayment(row) {
  const montantPaye = (row.montantTotal || 0) - (row.montantRestant || 0);

  let formattedDate = '';
  if (row.dateVersement) {
    const d = new Date(row.dateVersement);
    formattedDate = d.toISOString().split('T')[0];
  }

  return {
    idVersement: row.idVersement,
    idPaiement:  row.idPaiement,
    idCandidat:  row.idCandidat,
    name:   (row.name || '').trim(),
    date:   formattedDate,
    amount: `${Number(row.montant).toLocaleString('fr-DZ')} DA`,
    type:   row.typePaiement === 'complet' ? 'Complet' : 'Par tranche',
    method: methodeLabel(row.methode),
    total:  row.montantTotal,
    paid:   montantPaye,
    statutPaiement: row.statutPaiement,
    history: [],
  };
}

function methodeLabel(methode) {
  const map = { ccp: 'CCP', carte: 'Carte', especes: 'Espèces' };
  return map[methode] ?? methode;
}

// ─── Composant Principal ───────────────────────────────────────────────────────

const Payments = () => {
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false); // 2. État pour afficher/masquer InvoiceGenerator
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");

  const [paymentsData, setPaymentsData] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const payments   = await window.electron.getPayments();
      const candidates = await window.electron.getCandidats();
      setPaymentsData(payments   || []);
      setAllCandidates(candidates || []);
    } catch (err) {
      console.error("Erreur lors du rafraîchissement des données :", err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddPayment = async (paymentData) => {
    try {
      const result = await window.electron.addPayment(paymentData);
      if (result.success) {
        setShowModal(false);
        setSelected(null);
        await fetchData();
      } else {
        alert("Erreur de la base de données : " + (result.message || "Action impossible"));
      }
    } catch (err) {
      console.error("Erreur lors de l'appel IPC :", err);
      alert("Erreur critique lors de la communication avec le serveur.");
    }
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filteredPayments = paymentsData.filter((payment) => {
    const fullName = `${payment.prenom || ""} ${payment.nom || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const paymentDate = new Date(payment.dateVersement);
    const matchesDate =
      (!startDate || paymentDate >= new Date(startDate)) &&
      (!endDate   || paymentDate <= new Date(endDate));
    return matchesSearch && matchesDate;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalEncaisse = paymentsData.reduce((acc, p) => acc + (Number(p.montant) || 0), 0);

  const totalRestant = (() => {
    const seen = new Map();
    for (const row of paymentsData) {
      if (row.idPaiement !== undefined && row.idPaiement !== null) {
        if (!seen.has(row.idPaiement)) {
          seen.set(row.idPaiement, Number(row.montantRestant) || 0);
        }
      }
    }
    return Array.from(seen.values()).reduce((acc, v) => acc + v, 0);
  })();

  // ── Styles inline temporaires ─────────────────────────────────────────────
  const th = { padding: '15px 16px', textAlign: 'left', color: '#fff', fontWeight: '600', fontSize: '14px' };
  const td = { padding: '14px 16px', borderBottom: '1px solid #E5E7EB', fontSize: '14px', color: '#1F2937' };

  return (
    <div className="container">
      <div className="main">

        {/* HEADER */}
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="icon" width={40} style={{ marginRight: "10px" }} />
            Gestion des Encaissements
          </h1>
          <p>Suivi en temps réel des versements et soldes candidats</p>
        </div>

        {/* SECTION STATS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
          marginBottom: "30px",
          marginTop: "20px",
        }}>
          {[
            {
              title: "Total Encaissé",
              value: `${totalEncaisse.toLocaleString("fr-DZ")} DA`,
              color: "#2b537e",
              detail: "Somme de tous les versements",
            },
            {
              title: "Reste à Recouvrer",
              value: `${totalRestant.toLocaleString("fr-DZ")} DA`,
              color: totalRestant > 0 ? "#b91c1c" : "#166534",
              detail: "Soldes impayés (tous candidats)",
            },
          ].map((card, i) => (
            <div key={i} style={{
              background: "#DDE2EF",
              borderRadius: "16px",
              padding: "24px",
              borderLeft: `6px solid ${card.color}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                {card.title}
              </p>
              <h2 style={{ margin: "8px 0", fontSize: "26px", fontWeight: "800", color: "#1e293b" }}>
                {card.value}
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: card.color, fontWeight: "600" }}>
                {card.detail}
              </p>
            </div>
          ))}
        </div>

        {/* FILTRES & ACTIONS — 3. Version modifiée incluant le bouton Factures */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
          <div style={{
            flex: 1, background: "#fff", padding: "12px 20px",
            borderRadius: "15px", display: "flex", gap: "15px",
            alignItems: "center", border: "1px solid #E2E8F0",
          }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un candidat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: "10px", border: "1px solid #CBD5E0", borderRadius: "10px", outline: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#4A5568" }}>
              <span>Du</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "8px", border: "1px solid #CBD5E0", borderRadius: "8px" }} />
              <span>au</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: "8px", border: "1px solid #CBD5E0", borderRadius: "8px" }} />
            </div>
          </div>

          {/* Bouton Factures & Historiques */}
          <button
            onClick={() => setShowInvoices(true)}
            style={{
              background: "#2b537e", color: "#fff", border: "none",
              padding: "15px 25px", borderRadius: "12px", cursor: "pointer",
              fontWeight: "700", boxShadow: "0 4px 6px rgba(43,83,126,0.2)",
            }}
          >
            📄 Factures & Historiques
          </button>

          {/* Bouton Nouveau Paiement */}
          <button
            onClick={() => { setSelected(null); setShowModal(true); }}
            style={{
              background: "#166534", color: "#fff", border: "none",
              padding: "15px 25px", borderRadius: "12px", cursor: "pointer",
              fontWeight: "700", boxShadow: "0 4px 6px rgba(22,101,52,0.2)",
            }}
          >
            + Nouveau Paiement
          </button>
        </div>

        {/* TABLEAU DES DONNÉES */}
        <div style={{ background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" }}>
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: "#2b537e" }}>
                  <th style={th}>Candidat</th>
                  <th style={th}>Date versement</th>
                  <th style={th}>Montant</th>
                  <th style={th}>Reste à payer</th>
                  <th style={th}>Méthode</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((item, index) => (
                    <tr key={item.idVersement || index}
                      style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                      <td style={td}>{item.prenom} {item.nom}</td>
                      <td style={td}>{new Date(item.dateVersement).toLocaleDateString("fr-FR")}</td>
                      <td style={td}><strong style={{ color: "#2D3748" }}>{item.montant} DA</strong></td>
                      <td style={td}>
                        <span style={{
                          color: item.montantRestant > 0 ? "#b91c1c" : "#059669",
                          fontWeight: "bold",
                          background: item.montantRestant > 0 ? "#FEF2F2" : "#ECFDF5",
                          padding: "4px 10px", borderRadius: "20px",
                        }}>
                          {item.montantRestant} DA
                        </span>
                      </td>
                      <td style={{ ...td, textTransform: "capitalize" }}>{item.methode}</td>
                      <td style={td}>
                        <button
                          onClick={() => { setSelected(item); setShowModal(true); }}
                          style={{
                            background: "#EDF2F7", color: "#2b537e",
                            border: "1px solid #2b537e", padding: "6px 12px",
                            borderRadius: "6px", cursor: "pointer",
                            fontSize: "12px", fontWeight: "600",
                          }}
                        >
                          + Versement
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                      Aucun versement trouvé pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALE REÇUS DE PAIEMENTS EXISTANTE */}
        {showModal && (
          <PaymentModal
            candidate={selected}
            allCandidates={allCandidates}
            onClose={() => { setShowModal(false); setSelected(null); }}
            onAddPayment={handleAddPayment}
          />
        )}

        {/* 4. MODALE INVOICE GENERATOR (FACTURES & HISTORIQUES) */}
        {showInvoices && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1500, overflowY: "auto" }}>
            <div style={{ background: "#F0F4FA", minHeight: "100vh", maxWidth: "960px", margin: "0 auto", position: "relative" }}>
              <button
                onClick={() => setShowInvoices(false)}
                style={{
                  position: "fixed", top: "20px", right: "calc(50% - 460px)",
                  background: "#2b537e", color: "#fff", border: "none",
                  borderRadius: "50%", width: "40px", height: "40px",
                  fontSize: "18px", cursor: "pointer", zIndex: 1600,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                ✕
              </button>
              <InvoiceGenerator />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;