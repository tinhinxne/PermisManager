// 🔥 MOTEUR DE RÈGLES CENTRALISÉ

export const evaluateCandidatRules = (rules, candidat) => {
  const errors = [];

  const age = candidat.dob
    ? new Date().getFullYear() - new Date(candidat.dob).getFullYear()
    : null;

  rules.forEach(rule => {
    if (!rule.enabled) return;

    switch (rule.type) {

      // 🎯 RÈGLE AGE
      case "age_range":
        if (age >= rule.min && age <= rule.max) {

          if (rule.action === "block") {
            errors.push(`Inscription interdite (${rule.min}-${rule.max} ans)`);
          }

          if (rule.action === "require_parent") {
            errors.push(`Autorisation parentale requise (${rule.min}-${rule.max} ans)`);
          }

        }
        break;

      // 🔥 FUTUR (extensible)
      case "payment_required":
        if (!candidat.hasPaid) {
          errors.push("Paiement requis");
        }
        break;

      default:
        break;
    }
  });

  return errors;
};