import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const CongeContext = createContext(null);

export const useCongeCtx = () => {
  const ctx = useContext(CongeContext);
  if (!ctx) throw new Error("useCongeCtx doit être utilisé à l'intérieur d'un <CongeProvider>");
  return ctx;
};

export const CongeProvider = ({ children }) => {
  const [congesMoniteurs, setCongesMoniteurs] = useState({});
  const [congesEnAttente, setCongesEnAttente] = useState([]);
  const [congeAnnuel, setCongeAnnuel] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Chargement initial ───────────────────────────────────────────────────
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

  // ── Écoute IPC pour mise à jour temps réel du congé annuel (optionnel) ──
  useEffect(() => {
    if (!window.electron?.on) return;
    const handler = (updatedConge) => {
      console.log("📡 Congé annuel mis à jour depuis l'admin :", updatedConge);
      setCongeAnnuel(updatedConge || null);
    };
    window.electron.on("conge-annuel-updated", handler);
    return () => {
      try { window.electron.removeListener?.("conge-annuel-updated", handler); } catch {}
    };
  }, []);

  // ── Refresh moniteur ────────────────────────────────────────────────────
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

  // ── Refresh demandes en attente ─────────────────────────────────────────
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

  // ── Refresh congé annuel (à jour depuis la BDD) ─────────────────────────
  const refreshCongeAnnuel = useCallback(async () => {
    try {
      const annuel = await window.electron.getCongeAnnuel?.();
      setCongeAnnuel(annuel || null);
    } catch (e) {
      console.error("refreshCongeAnnuel:", e);
    }
  }, []);

  // ── Lecture cache local ─────────────────────────────────────────────────
  const getCongesMoniteur = (moniteurId) => congesMoniteurs[String(moniteurId)] || [];

  // ── Vérification congé validé pour un moniteur ──────────────────────────
 const isMoniteurEnConge = (moniteurId, date = new Date()) => {
  const list = getCongesMoniteur(moniteurId);
  const test = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return list.some(c =>
    c.statut === "validee" &&
    new Date(c.dateDebut + "T12:00:00") <= test &&
    test <= new Date(c.dateFin + "T23:59:59")
  );
};
 const getCongeActifMoniteur = (moniteurId, date = new Date()) => {
  const list = getCongesMoniteur(moniteurId);
  // Date de test normalisée à midi du jour local
  const test = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

  return list.find(c => {
    if (c.statut !== "validee") return false;
    const debut = new Date(c.dateDebut + "T12:00:00");
    const fin   = new Date(c.dateFin + "T23:59:59");
    return debut <= test && test <= fin;
  }) || null;
};
  // ── Congé annuel ────────────────────────────────────────────────────────
  const isCongeAnnuel = (date = new Date()) => {
    if (!congeAnnuel?.actif || !congeAnnuel?.dateDebut || !congeAnnuel?.dateFin) return false;
    const d = date instanceof Date ? date : new Date(date);
    return (
      new Date(congeAnnuel.dateDebut + "T00:00:00") <= d &&
      d <= new Date(congeAnnuel.dateFin + "T23:59:59")
    );
  };

  // ── Actions admin/moniteurs (inchangé) ──────────────────────────────────
  const addCongeMoniteur = async (moniteurId, payload) => {
    const result = await window.electron.addCongeMoniteur({ moniteurId, ...payload });
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  const requestCongeMoniteur = async (moniteurId, payload) => {
    const result = await window.electron.requestCongeMoniteur({ moniteurId, ...payload });
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  const validerCongeMoniteur = async (congeId, moniteurId) => {
    const result = await window.electron.validerCongeMoniteur(congeId);
    if (result?.success) {
      if (moniteurId) await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  const refuserCongeMoniteur = async (congeId, moniteurId, motif = "") => {
    const result = await window.electron.refuserCongeMoniteur(congeId, motif);
    if (result?.success) {
      if (moniteurId) await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  const removeCongeMoniteur = async (moniteurId, congeId) => {
    const result = await window.electron.removeCongeMoniteur(congeId);
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  const annulerMaDemandeConge = async (congeId, moniteurId) => {
    const result = await window.electron.annulerMaDemandeConge(congeId, moniteurId);
    if (result?.success) {
      await refreshMoniteur(moniteurId);
      await refreshCongesEnAttente();
    }
    return result;
  };

  const saveCongeAnnuel = async (payload) => {
    const result = await window.electron.setCongeAnnuel(payload);
    if (result?.success) setCongeAnnuel(payload);
    return result;
  };

  const value = {
    congesMoniteurs,
    congesEnAttente,
    congeAnnuel,
    loading,
    getCongesMoniteur,
    isMoniteurEnConge,
    getCongeActifMoniteur,
    isCongeAnnuel,
    refreshMoniteur,
    refreshCongesEnAttente,
    refreshCongeAnnuel,          // ← ajouté ici
    addCongeMoniteur,
    validerCongeMoniteur,
    refuserCongeMoniteur,
    removeCongeMoniteur,
    saveCongeAnnuel,
    requestCongeMoniteur,
    annulerMaDemandeConge,
  };

  return <CongeContext.Provider value={value}>{children}</CongeContext.Provider>;
};