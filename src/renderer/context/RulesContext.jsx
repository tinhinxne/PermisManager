import React, { createContext, useContext, useState } from "react";

const RulesContext = createContext(null);

const DEFAULT_RULES = [
  {
    id: 1,
    ageLabel: "<= 16 ans",
    rule: "Inscription interdite",
    icon: "❌",
    enabled: true,
    color: "#f87171",
    min: 0,
    max: 16,
    action: "block",
  },
  {
    id: 2,
    ageLabel: "17 - 18 ans",
    rule: "Autorisation parentale requise",
    icon: "📑",
    enabled: true,
    color: "#fb923c",
    min: 17,
    max: 18,
    action: "require_parent",
  },
  {
    id: 3,
    ageLabel: ">= 19 ans",
    rule: "Inscription libre",
    icon: "✅",
    enabled: true,
    color: "#34d399",
    min: 19,
    max: 150,
    action: "allow",
  },
];

// Vérifie qu'une règle a bien tous les champs requis pour fonctionner
const isValidRule = (rule) =>
  rule &&
  typeof rule.min === "number" &&
  typeof rule.max === "number" &&
  typeof rule.action === "string" &&
  typeof rule.enabled === "boolean";

export function RulesProvider({ children }) {
  const [inscriptionRules, setInscriptionRules] = useState(() => {
    try {
      const saved = localStorage.getItem("inscriptionRules");
      if (!saved) return DEFAULT_RULES;

      const parsed = JSON.parse(saved);

      // Si l'ancien format est détecté (sans min/max/action) → reset
      const allValid = Array.isArray(parsed) && parsed.every(isValidRule);
      if (!allValid) {
        localStorage.removeItem("inscriptionRules");
        return DEFAULT_RULES;
      }

      return parsed;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const saveInscriptionRules = (rules) => {
    setInscriptionRules(rules);
    localStorage.setItem("inscriptionRules", JSON.stringify(rules));
  };

  return (
    <RulesContext.Provider value={{ inscriptionRules, saveInscriptionRules }}>
      {children}
    </RulesContext.Provider>
  );
}

export const useRulesCtx = () => useContext(RulesContext);