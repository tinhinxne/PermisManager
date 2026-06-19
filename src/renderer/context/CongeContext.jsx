import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const CongeContext = createContext(null);

export const useCongeCtx = () => {
  const ctx = useContext(CongeContext);
  if (!ctx) throw new Error("useCongeCtx doit être utilisé à l'intérieur d'un <CongeProvider>");
  return ctx;
};

export const CongeProvider = ({ children }) => {
  // congesMoniteurs = { [moniteurId]: [conge, ...] }
  const [congesMoniteurs, setCongesMoniteurs] = useState({});
  const [congesEnAttente, setCongesEnAttente] = useState([]); // toutes demandes en_attente, tous moniteurs
  const [congeAnnuel, setCongeAnnuel] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Chargement initial : congé annuel + toutes les demandes en attente ──
  useEffect(() => {
    (async () => {
      try {
        const annuel = await window.electron.getCongeAnnuel?.();
        setCongeAnnuel(annuel || null);
      } catch (e) { console.error("getCongeAnnuel:", e); }
      await refreshCongesEnAttente();
      setLoading(false);
    })();
  }, []);

  // ── Charge (ou recharge) les congés d'UN moniteur précis ────────────────
  const refreshMoniteur = useCallback(async (moniteurId) => {
    try {
      const list = await window.electron.getCongesMoniteur(moniteurId);
      setCongesMoniteurs(prev => ({ ...prev, [String(moniteurId)]: list || [] }));
      return list || [];
    } catch (e) {
      console.error("refreshMoniteur:", e);
      return [];
    }
  }, []);

  // ── Recharge la liste globale des demandes en attente (vue admin) ───────
  const refreshCongesEnAttente = useCallback(async () => {
    try {
      const list = await window.electron.getCongesEnAttente?.();
      setCongesEnAttente(list || []);
      return list || [];
    } catch (e) {
      console.error("refreshCongesEnAttente:", e);
      return [];
    }
  }, []);

  // ── Lecture synchrone depuis le cache local (comme avant) ───────────────
  const getCongesMoniteur = (moniteurId) => congesMoniteurs[String(moniteurId)] || [];

  // ── Un moniteur est "en congé" seulement si son congé est VALIDÉ ────────
  const isMoniteurEnConge = (moniteurId, date = new Date()) => {
    const list = getCongesMoniteur(moniteurId);
    return list.some(c =>
      c.statut === "validee" &&
      new Date(c.dateDebut) <= date &&
      date <= new Date(c.dateFin + "T23:59:59")
    );
  };

  const getCongeActifMoniteur = (moniteurId, date = new Date()) => {
    const list = getCongesMoniteur(moniteurId);
    return list.find(c =>
      c.statut === "validee" &&
      new Date(c.dateDebut) <= date &&
      date <= new Date(c.dateFin + "T23:59:59")
    ) || null;
  };

  // ── Vérifie si une date tombe dans le congé annuel de l'auto-école ──────
  const isCongeAnnuel = (date = new Date()) => {
    if (!congeAnnuel?.actif || !congeAnnuel?.dateDebut || !congeAnnuel?.dateFin) return false;
    const d = date instanceof Date ? date : new Date(date);
    return (
      new Date(congeAnnuel.dateDebut + "T00:00:00") <= d &&
      d <= new Date(congeAnnuel.dateFin + "T23:59:59")
    );
  };

  // ── ADMIN : crée un congé directement validé pour un moniteur ───────────
  const addCongeMoniteur = async (moniteurId, payload) => {
    const result = await window.electron.addCongeMoniteur({ moniteurId, ...payload });
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  // ── MONITEUR : crée une DEMANDE (en_attente) ─────────────────────────────
  const requestCongeMoniteur = async (moniteurId, payload) => {
    const result = await window.electron.requestCongeMoniteur({ moniteurId, ...payload });
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  // ── ADMIN : valide une demande ───────────────────────────────────────────
  const validerCongeMoniteur = async (congeId, moniteurId) => {
    const result = await window.electron.validerCongeMoniteur(congeId);
    if (result?.success) {
      if (moniteurId) await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  // ── ADMIN : refuse une demande (motif optionnel) ─────────────────────────
  const refuserCongeMoniteur = async (congeId, moniteurId, motif = "") => {
    const result = await window.electron.refuserCongeMoniteur(congeId, motif);
    if (result?.success) {
      if (moniteurId) await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  // ── ADMIN : suppression libre d'un congé (peu importe le statut) ────────
  const removeCongeMoniteur = async (moniteurId, congeId) => {
    const result = await window.electron.removeCongeMoniteur(congeId);
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  // ── MONITEUR : annule SA PROPRE demande, seulement si encore en_attente ─
  const annulerMaDemandeConge = async (congeId, moniteurId) => {
    const result = await window.electron.annulerMaDemandeConge(congeId, moniteurId);
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  // ── Congé annuel auto-école (inchangé) ───────────────────────────────────
  const saveCongeAnnuel = async (payload) => {
    const result = await window.electron.setCongeAnnuel(payload);
    if (result?.success) setCongeAnnuel(payload);
    return result;
  };

  const value = {
    // état
    congesMoniteurs,
    congesEnAttente,
    congeAnnuel,
    loading,

    // lecture
    getCongesMoniteur,
    isMoniteurEnConge,
    getCongeActifMoniteur,
    isCongeAnnuel,          // ← ajout du fix

    // rafraîchissement
    refreshMoniteur,
    refreshCongesEnAttente,

    // écriture — admin
    addCongeMoniteur,
    validerCongeMoniteur,
    refuserCongeMoniteur,
    removeCongeMoniteur,
    saveCongeAnnuel,

    // écriture — moniteur
    requestCongeMoniteur,
    annulerMaDemandeConge,
  };

  return <CongeContext.Provider value={value}>{children}</CongeContext.Provider>;
};