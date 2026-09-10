// src/main/adminHandlers.js
const { ipcMain } = require('electron');

function registerAdminHandlers(db) {

  // ── get-revenus-mensuels et get-seances-mois sont déjà enregistrés
  // dans main.js — ne pas les redéfinir ici, sinon Electron plante avec
  // "Attempted to register a second handler for '...'"
  // (Si tu veux un jour utiliser la version "12 mois" ou "par semaine"
  // ci-dessous plutôt que celle de main.js, supprime les handlers
  // correspondants dans main.js et remets-les ici.)

}

module.exports = { registerAdminHandlers };