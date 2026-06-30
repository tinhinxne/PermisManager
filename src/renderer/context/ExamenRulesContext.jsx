// src/renderer/context/ExamenRulesContext.jsx
import React, { createContext, useContext, useState } from "react";

const ExamenRulesContext = createContext(null);

const DEFAULT_EXAM_RULES = {
  delaiApresEchec: 14,
  tentativesMax: 3,
  joursAutorises: ["Lun", "Mer", "Ven"],
  // ── Congé annuel ──────────────────────────────────────────────
  congeActif: true,        // Le blocage est-il activé ?
  congeMoisDebut: 8,       // Août (1 = Janvier … 12 = Décembre)
  congeMoisFin: 8,         // Par défaut : tout le mois d'août
};

export function ExamenRulesProvider({ children }) {
  const [examRules, setExamRules] = useState(() => {
    try {
      const saved = localStorage.getItem("examRules");
      return saved
        ? { ...DEFAULT_EXAM_RULES, ...JSON.parse(saved) }
        : DEFAULT_EXAM_RULES;
    } catch {
      return DEFAULT_EXAM_RULES;
    }
  });

  const saveExamRules = (rules) => {
    setExamRules(rules);
    localStorage.setItem("examRules", JSON.stringify(rules));
  };

  /** Utilitaire : renvoie true si la date passée est dans la période de congé */
  const isConge = (date = new Date()) => {
    if (!examRules.congeActif) return false;
    const mois = date.getMonth() + 1; // getMonth() est 0-indexé
    return mois >= examRules.congeMoisDebut && mois <= examRules.congeMoisFin;
  };

  return (
    <ExamenRulesContext.Provider value={{ examRules, saveExamRules, isConge }}>
      {children}
    </ExamenRulesContext.Provider>
  );
}

export const useExamenRulesCtx = () => useContext(ExamenRulesContext);