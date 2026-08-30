  const { contextBridge, ipcRenderer } = require('electron');
  contextBridge.exposeInMainWorld('electron', {
  // Auth
  login: (creds) => ipcRenderer.invoke('login', creds),
  

   // Candidats
  getCandidats:    ()       => ipcRenderer.invoke('get-candidats'),
  forgotPasswordSendOtp:   (data) => ipcRenderer.invoke("forgot-password-send-otp",   data),
  forgotPasswordVerifyOtp: (data) => ipcRenderer.invoke("forgot-password-verify-otp", data),
  forgotPasswordReset:     (data) => ipcRenderer.invoke("forgot-password-reset",       data),
  addCandidat:     (data)   => ipcRenderer.invoke('add-candidat', data),
  reinscrireCandidat: (data) => ipcRenderer.invoke('reinscrire-candidat', data),
  updateCandidat:  (data)   => ipcRenderer.invoke('update-candidat', data),
  deleteCandidat:  (id)     => ipcRenderer.invoke('delete-candidat', id),
  // Moniteurs
  getMoniteurs: () => ipcRenderer.invoke('get-moniteurs'),
  addMoniteur: (data) => ipcRenderer.invoke('add-moniteur', data),
  resetMoniteurPassword: (data) => ipcRenderer.invoke('reset-moniteur-password', data),
  updateMoniteur: (data) => ipcRenderer.invoke('update-moniteur', data),
  deleteMoniteur: (id) => ipcRenderer.invoke('delete-moniteur', id),
  getMoniteurStats: (moniteurId) => ipcRenderer.invoke('get-moniteur-stats', moniteurId),
updateStatutCandidat: (data) => ipcRenderer.invoke('update-statut-candidat', data),

  // Ajouter dans contextBridge.exposeInMainWorld('electron', { ... })
  getMoniteurProfile:     (id)    => ipcRenderer.invoke('get-moniteur-profile', id),
  updateMoniteurPassword: (data)  => ipcRenderer.invoke('update-moniteur-password', data),
  
  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  // Stats Admin
  getRevenusMensuels: () => ipcRenderer.invoke('get-revenus-mensuels'),
  getSeancesMois:     () => ipcRenderer.invoke('get-seances-mois'),
  
  //Seances
  getSeances: () => ipcRenderer.invoke('get-seances'),
  addSeance:  (data) => ipcRenderer.invoke('add-seance', data),
  deleteSeance: (id)   => ipcRenderer.invoke('delete-seance', id),
  updateSeance: (data) => ipcRenderer.invoke('update-seance', data),
updateStatutSeance: (data) => ipcRenderer.invoke('update-statut-seance', data),
updatePresenceSeance: (data) => ipcRenderer.invoke('update-presence-seance', data),
  
  // Paiements
  getPayments: () => ipcRenderer.invoke('get-payments'),
  addPayment: (data) => ipcRenderer.invoke('add-payment', data),
  getCandidatsDebiteurs:  ()     => ipcRenderer.invoke('get-candidats-debiteurs'),
  
  
  getPaymentsByMoniteur:       (moniteurId) => ipcRenderer.invoke('get-payments-by-moniteur', moniteurId),
  getCandidatsDebiteursMoniteur: (moniteurId) => ipcRenderer.invoke('get-candidats-debiteurs-moniteur', moniteurId),
  sendExamenNotification: (data) => ipcRenderer.invoke("send-examen-notification", data),
  sendCandidatMessage: (data) => ipcRenderer.invoke("send-candidat-message", data),

// Congés moniteurs
  getCongesMoniteur:   (moniteurId) => ipcRenderer.invoke("get-conges-moniteur", moniteurId),
   getCongesEnAttente:    ()              => ipcRenderer.invoke("get-conges-en-attente"),
  getAllConges:         ()           => ipcRenderer.invoke("get-all-conges"),
  addCongeMoniteur:    (data)       => ipcRenderer.invoke("add-conge-moniteur", data),
  requestCongeMoniteur:  (data)          => ipcRenderer.invoke("request-conge-moniteur", data),
   validerCongeMoniteur:  (congeId)            => ipcRenderer.invoke("valider-conge-moniteur", congeId),
  removeCongeMoniteur: (congeId)    => ipcRenderer.invoke("remove-conge-moniteur", congeId),
refuserCongeMoniteur: (congeId, motif) => ipcRenderer.invoke("refuser-conge-moniteur", congeId, motif),
annulerMaDemandeConge: (congeId, moniteurId) => ipcRenderer.invoke("annuler-ma-demande-conge", congeId, moniteurId),  
   getDemandesCongeAttente: () => ipcRenderer.invoke("get-demandes-conge-attente"),
updateStatutConge: (congeId, statut, motifRefus) => ipcRenderer.invoke("update-statut-conge", congeId, statut, motifRefus),
sendMessageAdmin: (data) => ipcRenderer.invoke("send-message-admin", data),

  // Congé annuel
  getCongeAnnuel: ()     => ipcRenderer.invoke("get-conge-annuel"),
  setCongeAnnuel: (data) => ipcRenderer.invoke("set-conge-annuel", data),

  sendRappelPaiement: (data) => ipcRenderer.invoke("send-rappel-paiement", data),
    generateListeCandidatsPdf: (data) =>
    ipcRenderer.invoke("generate-liste-candidats-pdf", data),
   

  generateListeEnvoiPDF: (data) =>
    ipcRenderer.invoke("generate-liste-envoi-pdf", data),

ouvrirFenetrePaiement: (url) => ipcRenderer.invoke("ouvrir-fenetre-paiement", url),
fermerFenetrePaiement: ()    => ipcRenderer.invoke("fermer-fenetre-paiement"),
payerChargily:   (data)       => ipcRenderer.invoke("payer-chargily", data),
statutChargily:  (checkoutId) => ipcRenderer.invoke("statut-chargily", checkoutId),
getChargilyConfig:  ()     => ipcRenderer.invoke("get-chargily-config"),
setChargilyConfig:  (data) => ipcRenderer.invoke("set-chargily-config", data),
testChargilyConfig: (data) => ipcRenderer.invoke("test-chargily-config", data),
// Paiements
  getPayments: () => ipcRenderer.invoke('get-payments'),
  addPayment: (data) => ipcRenderer.invoke('add-payment', data),
  getCandidatsDebiteurs:  ()     => ipcRenderer.invoke('get-candidats-debiteurs'),
  getCreditSeancesSup: (candidatId) => ipcRenderer.invoke('get-credit-seances-sup', candidatId),
  getPrixFormation: () => ipcRenderer.invoke('get-prix-formation'),
setPrixFormation: (prix) => ipcRenderer.invoke('set-prix-formation', prix),
// EXAMENS 
getExamensCandidat: (candidatId) => ipcRenderer.invoke("get-examens-candidat", candidatId),
getCandidatsMatricules: () => ipcRenderer.invoke('get-candidats-matricules'),

updateMatriculeCandidat: (idCandidat, matricule) =>
  ipcRenderer.invoke('update-matricule-candidat', { idCandidat, matricule }),

// Cours de Code
getSeancesCode:            (filters) => ipcRenderer.invoke('get-seances-code', filters),
addSeanceCode:              (data)   => ipcRenderer.invoke('add-seance-code', data),
addSeanceCodeSerie:         (data)   => ipcRenderer.invoke('add-seance-code-serie', data),
updateSeanceCode:           (id, data) => ipcRenderer.invoke('update-seance-code', id, data),
deleteSeanceCode:           (id)     => ipcRenderer.invoke('delete-seance-code', id),
getSeancesCandidatCode: (idCandidat, categoriePermis, moniteur_id) =>
ipcRenderer.invoke('get-seances-candidat-code', idCandidat, categoriePermis, moniteur_id),
openExternal: (url) => ipcRenderer.invoke('open-external', url),
getInscritsSeanceCode:      (seanceId) => ipcRenderer.invoke('get-inscrits-seance-code', seanceId),
getCandidatsEligiblesCode:  (categoriePermis, seanceId) => ipcRenderer.invoke('get-candidats-eligibles-code', categoriePermis, seanceId),
inscrireCandidatCode:       (idCandidat, seanceId) => ipcRenderer.invoke('inscrire-candidat-code', idCandidat, seanceId),
desinscrireCandidatCode:    (idCandidat, seanceId) => ipcRenderer.invoke('desinscrire-candidat-code', idCandidat, seanceId),
updatePresenceCode:         (idCandidat, seanceId, statut, updatedBy) => ipcRenderer.invoke('update-presence-code', idCandidat, seanceId, statut, updatedBy),
getSeancesCodeDisponibles:  (categoriePermis, excludeSeanceId) => ipcRenderer.invoke('get-seances-code-disponibles', categoriePermis, excludeSeanceId),
replanifierCandidatCode:    (idCandidat, oldSeanceId, newSeanceId) => ipcRenderer.invoke('replanifier-candidat-code', idCandidat, oldSeanceId, newSeanceId),
getNbSeances: () => ipcRenderer.invoke('get-nb-seances'),
setNbSeances: (val) => ipcRenderer.invoke('set-nb-seances', val),
getInscriptionsCode: () => ipcRenderer.invoke('get-inscriptions-code'),
addCandidatExterne: (data) => ipcRenderer.invoke("add-candidat-externe", data),
updateCandidatExterne: (data) => ipcRenderer.invoke("update-candidat-externe", data),
deleteCandidatExterne: (idCandidat) => ipcRenderer.invoke("delete-candidat-externe", idCandidat),
addCandidatAuditeurLibre: (data) => ipcRenderer.invoke('add-candidat-auditeur-libre', data),
getAuditeursLibres: () => ipcRenderer.invoke('get-auditeurs-libres'),
convertirAuditeurLibre: (idCandidat) => ipcRenderer.invoke('convertir-auditeur-libre', idCandidat),
getProgressionCode: () => ipcRenderer.invoke('get-progression-code'),
getProgressionCodeMoniteur: (moniteurId) => ipcRenderer.invoke('get-progression-code-moniteur', moniteurId),
});

