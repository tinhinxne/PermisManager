import React, { useState, useEffect } from "react";
import Button from "./Button";
import Input from "./Input";
import Select from "./Select";

const PRIX_PERMIS  = 30000;
const SERVEUR_URL  = "https://lesser-flashcard-unfazed.ngrok-free.dev"; // ← remplace après déploiement Render
const CHARGILY_MODE = "test"; // ← passe à "live" quand tu as les vraies clés

const PaymentModal = ({ candidate, allCandidates, onClose, onAddPayment, moniteurId = null }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(candidate || null);
  const [candidatesList, setCandidatesList]       = useState([]);
  const [paymentType, setPaymentType]             = useState("");
  const [amount, setAmount]                       = useState("");
  const [date, setDate]                           = useState(new Date().toISOString().split("T")[0]);
  const [remark, setRemark]                       = useState("");
  const [errors, setErrors]                       = useState({});
  const [loading, setLoading]                     = useState(false);
  const [searchQuery, setSearchQuery]             = useState("");

  // ── États SATIM ────────────────────────────────────────────────────────────
  const [satimLoading,  setSatimLoading]  = useState(false); // appel en cours
  const [satimStatus,   setSatimStatus]   = useState(null);  // "waiting" | "success" | "failed"
  const [checkoutId,  setCheckoutId]  = useState(null);  // checkoutId retourné par le serveur
  const [pollingRef,    setPollingRef]    = useState(null);   // ref interval polling

  // ── État CCP ───────────────────────────────────────────────────────────────
  const [referenceCCP, setReferenceCCP]  = useState("");

  // Nettoyage polling si le modal se ferme
  useEffect(() => {
    return () => { if (pollingRef) clearInterval(pollingRef); };
  }, [pollingRef]);

  const filteredCandidates = candidatesList.filter(c =>
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Chargement candidats ───────────────────────────────────────────────────
  useEffect(() => {
    const loadCandidates = async () => {
      setLoading(true);
      try {
        let debiteurs = [];
        if (moniteurId && window.electron.getCandidatsDebiteursMoniteur) {
          debiteurs = await window.electron.getCandidatsDebiteursMoniteur(moniteurId);
        } else if (window.electron.getCandidatsDebiteurs) {
          debiteurs = await window.electron.getCandidatsDebiteurs();
        }
        if (debiteurs && debiteurs.length > 0) {
          setCandidatesList(debiteurs);
          setLoading(false);
          return;
        }
        if (window.electron.getCandidats) {
          const tous = await window.electron.getCandidats();
          const normalises = (tous || []).map(c => ({
            idCandidat:     c.idCandidat || c.id,
            nom:            c.nom,
            prenom:         c.prenom,
            telephone:      c.telephone || c.tel,
            montantRestant: c.montantRestant ?? PRIX_PERMIS,
            statutPaiement: c.statutPaiement || "en_attente",
          }));
          setCandidatesList(normalises);
        }
      } catch (err) {
        console.error("Erreur chargement candidats :", err);
        setCandidatesList(allCandidates || []);
      } finally {
        setLoading(false);
      }
    };
    if (!candidate) loadCandidates();
  }, [moniteurId]);

  const currentRemaining = selectedCandidate
    ? parseFloat(selectedCandidate.montantRestant ?? PRIX_PERMIS)
    : 0;
  const liveRemaining = Math.max(0, currentRemaining - (parseFloat(amount) || 0));
  const pctPaye       = PRIX_PERMIS > 0
    ? Math.round(((PRIX_PERMIS - currentRemaining) / PRIX_PERMIS) * 100)
    : 0;

  const paymentMethods = [
    { value: "",        label: "Méthode de paiement" },
    { value: "especes", label: "Espèces"              },
    { value: "ccp",     label: "CCP"                  },
    { value: "carte",   label: "Carte CIB / EDAHABIA" },
  ];

  const handleCandidateSelect = (c) => {
    setSelectedCandidate(c);
    setSearchQuery(`${c.prenom} ${c.nom}`);
    setErrors({});
    setAmount("");
    setSatimStatus(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedCandidate)                    newErrors.candidate   = "Veuillez choisir un candidat";
    if (!paymentType)                          newErrors.paymentType = "La méthode est requise";
    if (!amount || parseFloat(amount) <= 0)    newErrors.amount      = "Montant invalide";
    if (parseFloat(amount) > currentRemaining) newErrors.amount      = `Maximum autorisé : ${currentRemaining} DA`;
    if (!date)                                 newErrors.date        = "La date est requise";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Soumission normale (espèces / CCP) ────────────────────────────────────
  const handleSubmit = () => {
    if (validateForm()) {
      // Pour CCP : on ajoute la référence virement dans la remarque
      const remarqueFinal = paymentType === "ccp" && referenceCCP.trim()
        ? `Réf. virement : ${referenceCCP.trim()}${remark ? " — " + remark : ""}`
        : remark;

      onAddPayment({
        idCandidat:    selectedCandidate.idCandidat,
        montant:       parseFloat(amount),
        methode:       paymentType,
        dateVersement: date,
        remarque:      remarqueFinal,
        typeVersement: "seance",
      });
    }
  };

  // ── Paiement SATIM (carte) ─────────────────────────────────────────────────
  const handlePayerCarte = async () => {
    if (!validateForm()) return;

    setSatimLoading(true);
    setSatimStatus(null);


    try {
  // 1. Créer la commande via Electron (évite la CSP)
  const data = await window.electron.payerChargily({
    idCandidat:  selectedCandidate.idCandidat,
    montant:     parseFloat(amount),
    nomCandidat: `${selectedCandidate.prenom} ${selectedCandidate.nom}`,
  });

      if (!data.success) {
        alert("Erreur SATIM : " + data.message);
        setSatimLoading(false);
        return;
      }

      const checkoutId = data.checkoutId;
      setCheckoutId(checkoutId);
      setSatimStatus("waiting");
      setSatimLoading(false);

      // 2. Ouvrir la fenêtre SATIM (Electron)
      await window.electron.ouvrirFenetrePaiement(data.checkoutUrl);

      // 3. Polling toutes les 5s (max 5 min)
      let tentatives = 0;
      const interval = setInterval(async () => {
        tentatives++;
        try {
const stat = await window.electron.statutChargily(checkoutId);

          if (stat.status === "success") {
            clearInterval(interval);
            setPollingRef(null);
            setSatimStatus("success");
            await window.electron.fermerFenetrePaiement();

            // Enregistrer le versement dans la base
            onAddPayment({
              idCandidat:    selectedCandidate.idCandidat,
              montant:       parseFloat(amount),
              methode:       "carte",
              dateVersement: date,
              remarque:      remark || `Paiement Chargily — réf. ${checkoutId}`,
              typeVersement: "seance",
            });

          } else if (stat.status === "failed") {
            clearInterval(interval);
            setPollingRef(null);
            setSatimStatus("failed");
            await window.electron.fermerFenetrePaiement();
          }
        } catch (err) {
          console.error("Erreur polling SATIM:", err);
        }

        if (tentatives >= 60) { // 60 × 5s = 5 minutes
          clearInterval(interval);
          setPollingRef(null);
          setSatimStatus("failed");
        }
      }, 5000);

      setPollingRef(interval);

    } catch (err) {
      console.error("Erreur SATIM:", err);
      alert("Impossible de contacter le serveur de paiement.");
      setSatimLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    overlay:  { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    modal:    { background: "#fff", borderRadius: "20px", width: "90%", maxWidth: "550px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
    header:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", borderRadius: "20px 20px 0 0" },
    body:     { padding: "24px" },
    title:    { fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px", marginTop: "24px" },
    badge:    { padding: "14px", background: "#EBF5FF", borderRadius: "12px", border: "1px solid #4E96E1", marginBottom: "15px" },
    closeBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer" },
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={s.header}>
          <h3 style={{ margin: 0 }}>{candidate ? "Détails du paiement" : "Nouveau Versement"}</h3>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>

          {/* RECHERCHE CANDIDAT */}
          {!candidate && (
            <div style={{ marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", color: "#64748B", fontWeight: "500", display: "block", marginBottom: "5px" }}>
                Candidat *
              </label>
              <div style={{ position: "relative", marginBottom: "4px" }}>
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); if (e.target.value === "") setSelectedCandidate(null); }}
                  placeholder="Rechercher un candidat..."
                  style={{ width: "100%", padding: "9px 32px 9px 34px", border: `1px solid ${errors.candidate ? "#EF4444" : "#D1D5DB"}`, borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSelectedCandidate(null); }} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: "14px" }}>✕</button>
                )}
              </div>
              {!selectedCandidate && (
                <div style={{ border: "1px solid #D1D5DB", borderRadius: "8px", maxHeight: "160px", overflowY: "auto", background: "#fff", marginBottom: "4px" }}>
                  {loading ? (
                    <div style={{ padding: "10px 12px", fontSize: "13px", color: "#94A3B8", textAlign: "center" }}>⏳ Chargement...</div>
                  ) : filteredCandidates.length === 0 ? (
                    <div style={{ padding: "10px 12px", fontSize: "13px", color: "#94A3B8", textAlign: "center" }}>Aucun candidat trouvé</div>
                  ) : (
                    filteredCandidates.map(c => (
                      <div key={c.idCandidat} onClick={() => handleCandidateSelect(c)}
                        style={{ padding: "9px 12px", fontSize: "13px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontWeight: "500" }}>{c.prenom} {c.nom}</span>
                        <span style={{ fontSize: "11px", color: "#b91c1c" }}>Reste : {parseFloat(c.montantRestant ?? PRIX_PERMIS).toLocaleString("fr-DZ")} DA</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {errors.candidate && <p style={{ fontSize: "11px", color: "#EF4444", marginTop: "2px" }}>{errors.candidate}</p>}
              <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                {loading ? "⏳ Chargement..." : `${candidatesList.length} candidat(s) avec solde en attente${moniteurId ? " (vos candidats)" : ""}`}
              </p>
            </div>
          )}

          {/* BADGE CANDIDAT */}
          {selectedCandidate && (
            <div style={s.badge}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "700", color: "#2b537e", fontSize: "15px" }}>{selectedCandidate.prenom} {selectedCandidate.nom}</div>
                  <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                    Reste actuel :&nbsp;
                    <strong style={{ color: "#b91c1c" }}>{currentRemaining.toLocaleString("fr-DZ")} DA</strong>
                    &nbsp;/&nbsp;
                    <span style={{ color: "#64748b" }}>Total : {PRIX_PERMIS.toLocaleString("fr-DZ")} DA</span>
                  </div>
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Après versement :</div>
                    <div style={{ fontWeight: "800", fontSize: "18px", color: liveRemaining <= 0 ? "#166534" : "#b91c1c" }}>{liveRemaining.toLocaleString("fr-DZ")} DA</div>
                    {liveRemaining <= 0 && <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>✅ Dossier soldé !</div>}
                  </div>
                )}
              </div>
              <div style={{ marginTop: "12px" }}>
                <div style={{ height: "6px", background: "#CBD5E0", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctPaye}%`, background: pctPaye >= 100 ? "#166534" : "#4E96E1", borderRadius: "4px", transition: "width 0.3s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                  <span>Déjà payé : {(PRIX_PERMIS - currentRemaining).toLocaleString("fr-DZ")} DA</span>
                  <span>{pctPaye}%</span>
                </div>
              </div>
            </div>
          )}

          {/* FORMULAIRE */}
          <div style={s.title}>Informations du versement</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <Select label="Méthode *" value={paymentType} onChange={e => { setPaymentType(e.target.value); setSatimStatus(null); }} options={paymentMethods} error={errors.paymentType} />
            <Input label="Montant (DA) *" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={selectedCandidate ? `Max : ${currentRemaining.toLocaleString("fr-DZ")} DA` : "0"} error={errors.amount} />
          </div>
          <Input label="Date du versement *" type="date" value={date} onChange={e => setDate(e.target.value)} error={errors.date} />
          <Input label="Remarque" type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="Ex: Tranche 2, règlement partiel..." textarea rows={2} />

          {/* ── BLOC CCP — affiché uniquement si méthode = ccp ── */}
          {paymentType === "ccp" && (
            <div style={{ marginTop: 16, padding: "14px 16px", background: "#f0fdf4", borderRadius: 12, border: "1.5px solid #86efac" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>📮</span>
                <span style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>Virement CCP / BaridiMob</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 12, lineHeight: 1.6 }}>
                Vérifiez le <strong>reçu de virement</strong> du candidat avant d'enregistrer. Vous pouvez noter la référence pour archivage.
              </div>
              <Input
                label="Référence virement (optionnel)"
                type="text"
                value={referenceCCP}
                onChange={e => setReferenceCCP(e.target.value)}
                placeholder="Ex: VIR-2024-00123 ou réf. BaridiMob"
              />
            </div>
          )}

          {/* ── BLOC SATIM — affiché uniquement si méthode = carte ── */}
          {paymentType === "carte" && (
            <div style={{ marginTop: 20, padding: "16px", background: "#f0f6ff", borderRadius: 12, border: "1.5px solid #4E96E1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <span style={{ fontWeight: 700, color: "#2b537e", fontSize: 14 }}>💳 Paiement sécurisé Chargily Pay</span>
              </div>

              {/* Statut en attente */}
              {satimStatus === "waiting" && (
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: "#c2410c", fontSize: 13, marginBottom: 4 }}>
                    ⏳ En attente du paiement…
                  </div>
                  <div style={{ fontSize: 12, color: "#92400e" }}>
                    Une fenêtre de paiement Chargily s'est ouverte. Le candidat peut entrer sa carte. Cette fenêtre se mettra à jour automatiquement.
                  </div>
                  <button
                    onClick={() => {
                      if (pollingRef) clearInterval(pollingRef);
                      setSatimStatus(null);
                      setCheckoutId(null);
                      window.electron.fermerFenetrePaiement();
                    }}
                    style={{ marginTop: 10, padding: "6px 14px", borderRadius: 8, border: "1px solid #fed7aa", background: "#fff", color: "#c2410c", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                  >
                    Annuler le paiement
                  </button>
                </div>
              )}

              {/* Succès */}
              {satimStatus === "success" && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: "#166534", fontSize: 13 }}>
                    ✅ Paiement confirmé ! Le versement a été enregistré.
                  </div>
                </div>
              )}

              {/* Échec */}
              {satimStatus === "failed" && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 13, marginBottom: 4 }}>
                    ❌ Paiement échoué ou expiré.
                  </div>
                  <div style={{ fontSize: 12, color: "#991b1b" }}>Vous pouvez réessayer ou choisir une autre méthode.</div>
                </div>
              )}

              {/* Info carte */}
              {!satimStatus && (
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                  Le candidat sera redirigé vers la page de paiement Chargily sécurisée. Il entre sa carte CIB ou EDAHABIA et valide avec son code OTP SMS.
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Button>
                {satimStatus !== "waiting" && satimStatus !== "success" && (
                  <button
                    onClick={handlePayerCarte}
                    disabled={satimLoading || !selectedCandidate || !amount}
                    style={{
                      flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                      background: satimLoading || !selectedCandidate || !amount ? "#94a3b8" : "#2b537e",
                      color: "#fff", fontWeight: 700, fontSize: 14,
                      cursor: satimLoading || !selectedCandidate || !amount ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {satimLoading ? "⏳ Connexion à Chargily…" : "💳 Payer par carte"}
                  </button>
                )}
                {satimStatus === "success" && (
                  <Button variant="primary" onClick={onClose} style={{ flex: 2 }}>Fermer</Button>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS normales — espèces / CCP uniquement */}
          {paymentType !== "carte" && (
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Button>
              <Button variant="primary" onClick={handleSubmit} style={{ flex: 2 }} disabled={!selectedCandidate || loading}>
                Enregistrer le paiement
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;