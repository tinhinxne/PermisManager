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
  getAllConges:         ()           => ipcRenderer.invoke("get-all-conges"),
  addCongeMoniteur:    (data)       => ipcRenderer.invoke("add-conge-moniteur", data),
  removeCongeMoniteur: (congeId)    => ipcRenderer.invoke("remove-conge-moniteur", congeId),

  // Congé annuel
  getCongeAnnuel: ()     => ipcRenderer.invoke("get-conge-annuel"),
  setCongeAnnuel: (data) => ipcRenderer.invoke("set-conge-annuel", data),

  sendRappelPaiement: (data) => ipcRenderer.invoke("send-rappel-paiement", data),
});