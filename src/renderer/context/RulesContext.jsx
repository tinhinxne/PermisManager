import React, { createContext, useContext, useState } from "react";

const RulesContext = createContext(null);

const DEFAULT_RULES = [
  {
    id: 1,
    ageLabel: "<= 15 ans",
    rule: "Inscription interdite",
    icon: "❌",
    enabled: true,
    color: "#f87171",
    min: 0,
    max: 15,
    action: "block",
  },
  {
    id: 2,
    ageLabel: "16 - 18 ans",
    rule: "Autorisation parentale requise",
    icon: "📑",
    enabled: true,
    color: "#fb923c",
    min: 16,
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

// Règles spécifiques par catégorie — surchargent DEFAULT_RULES si la catégorie correspond
const CATEGORY_RULES = {
  // Catégorie A (moto) : accessible dès 16 ans avec autorisation parentale
  A: [
    { id: 1, ageLabel: "<= 15 ans",  rule: "Inscription interdite",           icon: "❌", enabled: true, color: "#f87171", min: 0,   max: 15,  action: "block"          },
    { id: 2, ageLabel: "16 - 18 ans", rule: "Autorisation parentale requise", icon: "📑", enabled: true, color: "#fb923c", min: 16,  max: 18,  action: "require_parent" },
    { id: 3, ageLabel: ">= 19 ans",  rule: "Inscription libre",               icon: "✅", enabled: true, color: "#34d399", min: 19,  max: 150, action: "allow"          },
  ],
  // Catégorie A1 (petite moto) : accessible dès 16 ans aussi
  A1: [
    { id: 1, ageLabel: "<= 15 ans",  rule: "Inscription interdite",           icon: "❌", enabled: true, color: "#f87171", min: 0,   max: 15,  action: "block"          },
    { id: 2, ageLabel: "16 - 18 ans", rule: "Autorisation parentale requise", icon: "📑", enabled: true, color: "#fb923c", min: 16,  max: 18,  action: "require_parent" },
    { id: 3, ageLabel: ">= 19 ans",  rule: "Inscription libre",               icon: "✅", enabled: true, color: "#34d399", min: 19,  max: 150, action: "allow"          },
  ],
};

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

  // Retourne les règles effectives pour une catégorie donnée
  const getRulesForCategorie = (categorie) => {
    const cat = (categorie || "").toUpperCase().trim();
    return CATEGORY_RULES[cat] || inscriptionRules;
  };

  return (
    <RulesContext.Provider value={{ inscriptionRules, saveInscriptionRules, getRulesForCategorie, CATEGORY_RULES }}>
      {children}
    </RulesContext.Provider>
  );
}

export const useRulesCtx = () => useContext(RulesContext);