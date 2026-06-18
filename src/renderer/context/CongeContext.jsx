// src/renderer/context/CongeContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const CongeContext = createContext(null);

export function CongeProvider({ children }) {
  const [congesMoniteurs, setCongesMoniteurs] = useState({});
  const [congeAnnuel,     setCongeAnnuel]     = useState(null);
  const [loaded,          setLoaded]          = useState(false);

  // Chargement initial
  useEffect(() => {
    async function loadAll() {
      try {
        const [rows, annuel] = await Promise.all([
          window.electron.getAllConges(),
          window.electron.getCongeAnnuel(),
        ]);
        const map = {};
        for (const row of rows) {
          const mid = String(row.moniteur_id);
          if (!map[mid]) map[mid] = [];
          map[mid].push({
            ...row,
            dateDebut: row.dateDebut instanceof Date
              ? row.dateDebut.toISOString().split("T")[0]
              : String(row.dateDebut).split("T")[0],
            dateFin: row.dateFin instanceof Date
              ? row.dateFin.toISOString().split("T")[0]
              : String(row.dateFin).split("T")[0],
          });
        }
        setCongesMoniteurs(map);
        setCongeAnnuel(annuel || null);
      } catch (err) {
        console.error("CongeContext loadAll:", err);
      } finally {
        setLoaded(true);
      }
    }
    loadAll();
  }, []);

  const refreshMoniteur = useCallback(async (moniteurId) => {
    try {
      const rows = await window.electron.getCongesMoniteur(moniteurId);
      const normalized = rows.map(row => ({
        ...row,
        dateDebut: row.dateDebut instanceof Date
          ? row.dateDebut.toISOString().split("T")[0]
          : String(row.dateDebut).split("T")[0],
        dateFin: row.dateFin instanceof Date
          ? row.dateFin.toISOString().split("T")[0]
          : String(row.dateFin).split("T")[0],
      }));
      setCongesMoniteurs(prev => ({ ...prev, [String(moniteurId)]: normalized }));
    } catch (err) {
      console.error("CongeContext refreshMoniteur:", err);
    }
  }, []);

  const addCongeMoniteur = useCallback(async (moniteurId, conge) => {
    try {
      const result = await window.electron.addCongeMoniteur({
        moniteurId,
        dateDebut:  conge.dateDebut,
        dateFin:    conge.dateFin,
        raison:     conge.raison    || "autre",
        precision:  conge.precision || null,
      });
      if (result?.success) await refreshMoniteur(moniteurId);
    } catch (err) {
      console.error("addCongeMoniteur:", err);
    }
  }, [refreshMoniteur]);

  const removeCongeMoniteur = useCallback(async (moniteurId, congeId) => {
    try {
      await window.electron.removeCongeMoniteur(congeId);
      await refreshMoniteur(moniteurId);
    } catch (err) {
      console.error("removeCongeMoniteur:", err);
    }
  }, [refreshMoniteur]);

  const getCongesMoniteur = useCallback((moniteurId) => {
    return congesMoniteurs[String(moniteurId)] || [];
  }, [congesMoniteurs]);

  const isMoniteurEnConge = useCallback((moniteurId, date = new Date()) => {
    const d = new Date(date);
    return (congesMoniteurs[String(moniteurId)] || []).some(c => {
      const debut = new Date(c.dateDebut); debut.setHours(0, 0, 0, 0);
      const fin   = new Date(c.dateFin);   fin.setHours(23, 59, 59, 999);
      return d >= debut && d <= fin;
    });
  }, [congesMoniteurs]);

  const getCongeActifMoniteur = useCallback((moniteurId, date = new Date()) => {
    const d = new Date(date);
    return (congesMoniteurs[String(moniteurId)] || []).find(c => {
      const debut = new Date(c.dateDebut); debut.setHours(0, 0, 0, 0);
      const fin   = new Date(c.dateFin);   fin.setHours(23, 59, 59, 999);
      return d >= debut && d <= fin;
    }) || null;
  }, [congesMoniteurs]);

  /** Vérifie si une date tombe dans le congé annuel de l'auto-école */
  const isCongeAnnuel = useCallback((date = new Date()) => {
    if (!congeAnnuel?.actif || !congeAnnuel?.dateDebut || !congeAnnuel?.dateFin) return false;
    const d     = new Date(date);
    const debut = new Date(congeAnnuel.dateDebut); debut.setHours(0, 0, 0, 0);
    const fin   = new Date(congeAnnuel.dateFin);   fin.setHours(23, 59, 59, 999);
    return d >= debut && d <= fin;
  }, [congeAnnuel]);

  const saveCongeAnnuel = useCallback(async (data) => {
    try {
      const result = await window.electron.setCongeAnnuel(data);
      if (result?.success) setCongeAnnuel(data);
      return result;
    } catch (err) {
      console.error("saveCongeAnnuel:", err);
      return { success: false };
    }
  }, []);

  return (
    <CongeContext.Provider value={{
      congesMoniteurs,
      congeAnnuel,
      loaded,
      addCongeMoniteur,
      removeCongeMoniteur,
      getCongesMoniteur,
      isMoniteurEnConge,
      getCongeActifMoniteur,
      isCongeAnnuel,
      saveCongeAnnuel,
      refreshMoniteur,
    }}>
      {children}
    </CongeContext.Provider>
  );
}

export const useCongeCtx = () => useContext(CongeContext);