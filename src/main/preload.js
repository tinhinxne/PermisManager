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
   generateListeCandidatsPDF: (data) =>
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
});