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

  // ── Normalise un objet congé annuel (dateDebut/dateFin) avant de le stocker ──
  const normalizeCongeAnnuel = (raw) => {
    if (!raw) return null;
    return {
      ...raw,
      dateDebut: raw.dateDebut ? String(raw.dateDebut).split("T")[0] : raw.dateDebut,
      dateFin:   raw.dateFin   ? String(raw.dateFin).split("T")[0]   : raw.dateFin,
    };
  };

  // ── Chargement initial ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const annuel = await window.electron.getCongeAnnuel?.();
        setCongeAnnuel(normalizeCongeAnnuel(annuel));
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
      setCongeAnnuel(normalizeCongeAnnuel(updatedConge));
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
      setCongeAnnuel(normalizeCongeAnnuel(annuel));
    } catch (e) {
      console.error("refreshCongeAnnuel:", e);
    }
  }, []);

  // ── Lecture cache local ─────────────────────────────────────────────────
  const getCongesMoniteur = (moniteurId) => congesMoniteurs[String(moniteurId)] || [];

  // ── Normalise une date (string pure, ISO complet, ou objet Date) en "YYYY-MM-DD" ──
  // Déplacée AVANT son utilisation pour éviter tout problème d'ordre de déclaration.
  const normDateStr = (val) => {
    if (!val) return "";
    if (val instanceof Date) {
      return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,"0")}-${String(val.getDate()).padStart(2,"0")}`;
    }
    // string ISO complète ("...T00:00:00.000Z") ou pure "YYYY-MM-DD" → on garde juste la partie date
    return String(val).split("T")[0];
  };

  // ── Helper interne : convertit une date (Date ou "YYYY-MM-DD") en Date à midi local ──
  const toMidday = (date) => {
    const d = date instanceof Date ? date : new Date(date + "T12:00:00");
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  };

  // ── Vérification congé validé pour un moniteur (booléen) ────────────────
  const isMoniteurEnConge = (moniteurId, date = new Date()) => {
    const list = getCongesMoniteur(moniteurId);
    const test = toMidday(date);

    return list.some(c => {
      if (c.statut !== "validee") return false;

      const debut = new Date(normDateStr(c.dateDebut) + "T00:00:00");
      const fin   = new Date(normDateStr(c.dateFin)   + "T23:59:59");

      return test >= debut && test <= fin;
    });
  };

  // ── Récupère le congé actif (objet complet) pour un moniteur à une date donnée ──
  // BUGFIX : utilise désormais normDateStr() comme isMoniteurEnConge, pour éviter
  // qu'une dateDebut/dateFin au format ISO complet ("...T00:00:00.000Z") ne produise
  // une Date invalide une fois concaténée avec "T00:00:00" / "T23:59:59".
  // Sans cette normalisation, getCongeActifMoniteur retournait toujours null alors
  // que isMoniteurEnConge (qui normalise) détectait correctement le congé — d'où
  // l'incohérence entre le hachurage visuel (correct) et le blocage de création /
  // bandeau d'alerte (qui restaient inactifs).
  const getCongeActifMoniteur = (moniteurId, date = new Date()) => {
    const list = getCongesMoniteur(moniteurId);
    const test = toMidday(date);

    const found = list.find(c => {
      if (c.statut !== "validee") return false;

      const debut = new Date(normDateStr(c.dateDebut) + "T00:00:00");
      const fin   = new Date(normDateStr(c.dateFin)   + "T23:59:59");

      return test >= debut && test <= fin;
    });

    if (!found) return null;

    // On retourne une copie avec dateDebut/dateFin normalisées en "YYYY-MM-DD".
    // Sans ça, le code d'affichage en aval (AgendaMoniteur.jsx fait par ex.
    // `new Date(congeBloquant.dateDebut + "T12:00:00")`) reçoit la valeur brute
    // de la BDD — qui peut être un ISO complet ("...T00:00:00.000Z") — et la
    // concaténation produit une Date invalide ("Invalid Date" affiché à l'écran),
    // même si la détection du congé elle-même fonctionne correctement.
    return {
      ...found,
      dateDebut: normDateStr(found.dateDebut),
      dateFin:   normDateStr(found.dateFin),
    };
  };

  // ── Congé annuel ────────────────────────────────────────────────────────
  const isCongeAnnuel = (date = new Date()) => {
    if (!congeAnnuel?.actif || !congeAnnuel?.dateDebut || !congeAnnuel?.dateFin) return false;
    const d = date instanceof Date ? date : new Date(date);
    return (
      new Date(normDateStr(congeAnnuel.dateDebut) + "T00:00:00") <= d &&
      d <= new Date(normDateStr(congeAnnuel.dateFin) + "T23:59:59")
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
    if (result?.success) setCongeAnnuel(normalizeCongeAnnuel(payload));
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
    refreshCongeAnnuel,
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
