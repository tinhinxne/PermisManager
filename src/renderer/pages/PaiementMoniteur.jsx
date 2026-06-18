import React, { useState, useEffect, useCallback } from "react";
import { FaLock } from "react-icons/fa";
import PaymentModal from "../components/PaymentModal";
import { useAuth } from "../context/AuthContext";
import { useMyPermissions } from "../context/PermissionsContext";
import ConnexionImg from "../../assets/Connexion.png";
import SmallCar from "../../assets/SmallCar.png";
import "../../styles/payment.css";

// ── Tooltip verrou ─────────────────────────────────────────────────────────────
function LockedTooltip({ children, message = "Permission requise par l'admin" }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: "absolute", bottom: "110%", left: "50%",
          transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff",
          padding: "7px 13px", borderRadius: 8,
          fontSize: "0.72rem", fontWeight: 500,
          whiteSpace: "nowrap", zIndex: 999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          pointerEvents: "none",
        }}>
          🔒 {message}
          <div style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)", width: 0, height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid #1e293b",
          }} />
        </div>
      )}
    </div>
  );
}

// ── Bannière d'action refusée ─────────────────────────────────────────────────
function LockedBanner({ message, onClose }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 20px",
      background: "linear-gradient(90deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 10, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", color: "#b91c1c" }}>
        <FaLock />
        <strong>Action non autorisée</strong> — {message}
      </div>
      <button onClick={onClose}
        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>
        ✕
      </button>
    </div>
  );
}

// ── Page Paiements (vue Moniteur) ──────────────────────────────────────────────
const PaiementsMoniteur = () => {
  const { currentUser } = useAuth();
  const { CAN_ADD_PAYMENT, CAN_VIEW_ALL_CANDIDATES } = useMyPermissions();

  const moniteurId       = currentUser?.id;
  const CURRENT_MONITEUR = currentUser
    ? `${currentUser.prenom} ${currentUser.nom}`
    : "Moniteur";

  const [searchTerm,   setSearchTerm]   = useState("");
  const [startDate,    setStartDate]    = useState("2024-01-01");
  const [endDate,      setEndDate]      = useState("2026-12-31");
  const [paymentsData, setPaymentsData] = useState([]);
  const [showModal,    setShowModal]    = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [lockedBanner, setLockedBanner] = useState(null);

  // ── Chargement ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!moniteurId) return;
    try {
      const payments = CAN_VIEW_ALL_CANDIDATES
        ? await window.electron.getPayments()
        : await window.electron.getPaymentsByMoniteur(moniteurId);
      setPaymentsData(payments || []);
    } catch (err) {
      console.error("Erreur chargement paiements moniteur :", err);
      setPaymentsData([]);
    }
  }, [moniteurId, CAN_VIEW_ALL_CANDIDATES]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Soumission paiement ───────────────────────────────────────────────────
  const handleAddPayment = async (paymentData) => {
    try {
      const result = await window.electron.addPayment(paymentData);
      if (result.success) {
        setShowModal(false);
        setSelected(null);
        await fetchData();
      } else {
        alert("Erreur : " + (result.message || "Action impossible"));
      }
    } catch (err) {
      console.error("Erreur IPC :", err);
      alert("Erreur critique lors de la communication avec le serveur.");
    }
  };

  // ── Ouverture modale ──────────────────────────────────────────────────────
  const handleOpenModal = (candidat = null) => {
    if (!CAN_ADD_PAYMENT) {
      setLockedBanner("L'ajout de paiements est réservé aux administrateurs. Contactez votre admin pour obtenir cette permission.");
      return;
    }
    setSelected(candidat);
    setShowModal(true);
  };

  // ── Filtrage tableau ──────────────────────────────────────────────────────
  const filteredPayments = paymentsData.filter((payment) => {
    const fullName    = `${payment.prenom || ""} ${payment.nom || ""}`.toLowerCase();
    const matchSearch = fullName.includes(searchTerm.toLowerCase());
    const d           = new Date(payment.dateVersement);
    const matchDate   =
      (!startDate || d >= new Date(startDate)) &&
      (!endDate   || d <= new Date(endDate));
    return matchSearch && matchDate;
  });

  // ── Styles ────────────────────────────────────────────────────────────────
  const th = { padding: "15px 16px", textAlign: "left", color: "#fff", fontWeight: "600", fontSize: "14px" };
  const td = { padding: "14px 16px", borderBottom: "1px solid #E5E7EB", fontSize: "14px", color: "#1F2937" };

  return (
    <div className="container">
      <div className="main">

        {/* HEADER */}
        <div className="header">
          <img src={ConnexionImg} alt="illustration" className="header-img" />
          <h1>
            <img src={SmallCar} alt="icon" width={40} style={{ marginRight: "10px" }} />
            Suivi des Paiements
          </h1>
          <p>
            {CAN_VIEW_ALL_CANDIDATES
              ? "Vue complète — tous les candidats de l'auto-école"
              : `Versements de mes candidats — ${CURRENT_MONITEUR}`}
          </p>
        </div>

        {/* Bannière action refusée */}
        {lockedBanner && (
          <LockedBanner message={lockedBanner} onClose={() => setLockedBanner(null)} />
        )}

        {/* FILTRES & BOUTON */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px", marginTop: "20px", alignItems: "center" }}>
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

          {CAN_ADD_PAYMENT ? (
            <button
              onClick={() => handleOpenModal(null)}
              style={{
                background: "#166534", color: "#fff", border: "none",
                padding: "15px 25px", borderRadius: "12px", cursor: "pointer",
                fontWeight: "700", boxShadow: "0 4px 6px rgba(22,101,52,0.2)",
                whiteSpace: "nowrap",
              }}
            >
              + Nouveau Paiement
            </button>
          ) : (
            <LockedTooltip message="Ajout de paiement réservé à l'admin">
              <button
                onClick={() => handleOpenModal(null)}
                style={{
                  background: "#e2e8f0", color: "#94a3b8",
                  border: "1px solid #cbd5e1", padding: "15px 25px",
                  borderRadius: "12px", cursor: "not-allowed", fontWeight: "700",
                  display: "flex", alignItems: "center", gap: 8,
                  filter: "grayscale(1)", userSelect: "none", whiteSpace: "nowrap",
                }}
              >
                <FaLock style={{ fontSize: 12 }} />
                + Nouveau Paiement
              </button>
            </LockedTooltip>
          )}
        </div>

        {/* Badge lecture / écriture */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: CAN_ADD_PAYMENT ? "rgba(22,101,52,0.08)" : "rgba(148,163,184,0.12)",
          border: `1px solid ${CAN_ADD_PAYMENT ? "rgba(22,101,52,0.25)" : "#e2e8f0"}`,
          borderRadius: 10, padding: "6px 14px", fontSize: "0.75rem",
          color: CAN_ADD_PAYMENT ? "#166534" : "#64748b",
          fontWeight: 600, marginBottom: 14,
        }}>
          {CAN_ADD_PAYMENT
            ? <><span>✅</span> Paiements — modification autorisée</>
            : <><FaLock style={{ fontSize: 10 }} /> Vue lecture seule — contactez l'admin pour ajouter des paiements</>
          }
        </div>

        {/* TABLEAU */}
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
                  {CAN_ADD_PAYMENT && <th style={th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((item, index) => (
                    <tr key={item.idVersement || index}
                      style={{ background: index % 2 === 0 ? "#fff" : "#F8FAFC" }}>
                      <td style={td}>{item.prenom} {item.nom}</td>
                      <td style={td}>{new Date(item.dateVersement).toLocaleDateString("fr-FR")}</td>
                      <td style={td}>
                        <strong style={{ color: "#2D3748" }}>
                          {item.montant} DA
                        </strong>
                      </td>
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
                      {CAN_ADD_PAYMENT && (
                        <td style={td}>
                          <button
                            onClick={() => handleOpenModal(item)}
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
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={CAN_ADD_PAYMENT ? 6 : 5}
                      style={{ textAlign: "center", padding: "40px", color: "#A0AEC0" }}>
                      Aucun versement trouvé pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALE */}
        {showModal && CAN_ADD_PAYMENT && (
          <PaymentModal
            candidate={selected}
            allCandidates={[]}
            onClose={() => { setShowModal(false); setSelected(null); }}
            onAddPayment={handleAddPayment}
            moniteurId={moniteurId}
          />
        )}

      </div>
    </div>
  );
};

export default PaiementsMoniteur;