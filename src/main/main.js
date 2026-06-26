const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');

// ── SÉCURISATION : colonnes de verrouillage de compte sur Utilisateur ─────
const colonnesVerrouillage = [
  { nom: "tentatives_echouees", sql: "ALTER TABLE Utilisateur ADD COLUMN tentatives_echouees INT NOT NULL DEFAULT 0" },
  { nom: "verrouille_jusqua",   sql: "ALTER TABLE Utilisateur ADD COLUMN verrouille_jusqua DATETIME NULL DEFAULT NULL" },
];

colonnesVerrouillage.forEach(({ nom, sql }) => {
  db.query(sql, (err) => {
    if (err) {
      console.log(`ℹ️ Colonne '${nom}' déjà présente sur Utilisateur (ou erreur ignorée) :`, err.code || err.message);
    } else {
      console.log(`✅ Colonne '${nom}' ajoutée avec succès à Utilisateur !`);
    }
  });
});
db.query(`
  ALTER TABLE Candidat ADD COLUMN created_by_moniteur_id INT NULL DEFAULT NULL
`, (err) => {
  if (err) {
    console.log("ℹ️ Colonne 'created_by_moniteur_id' déjà présente sur Candidat :", err.code || err.message);
  } else {
    console.log("✅ Colonne 'created_by_moniteur_id' ajoutée à la table Candidat !");
  }
});
// ── SÉCURISATION FORCE DE LA BASE DE DONNÉES ───────────────────────────────
db.query(`
  ALTER TABLE Candidat 
  MODIFY COLUMN categoriePermis VARCHAR(10) NOT NULL DEFAULT 'B'
`, (err) => {
  if (err) {
    db.query(`ALTER TABLE Candidat ADD COLUMN categoriePermis VARCHAR(10) NOT NULL DEFAULT 'B'`, (err2) => {
      if (err2) {
        console.log("ℹ️ Structure de la table Candidat déjà en place ou gérée.");
      } else {
        console.log("✅ Colonne 'categoriePermis' ajoutée avec succès à la table Candidat !");
      }
    });
  } else {
    console.log("✅ Structure de la colonne 'categoriePermis' synchronisée avec succès !");
  }
});

// ── SÉCURISATION : colonnes nom_ar / prenom_ar pour le nom en arabe ────────
db.query(`
  ALTER TABLE Candidat
  ADD COLUMN nom_ar VARCHAR(150) NULL
`, (err) => {
  if (err) {
    console.log("ℹ️ Colonne 'nom_ar' déjà présente sur Candidat (ou erreur ignorée) :", err.code || err.message);
  } else {
    console.log("✅ Colonne 'nom_ar' ajoutée avec succès à la table Candidat !");
  }
});

db.query(`
  ALTER TABLE Candidat
  ADD COLUMN prenom_ar VARCHAR(150) NULL
`, (err) => {
  if (err) {
    console.log("ℹ️ Colonne 'prenom_ar' déjà présente sur Candidat (ou erreur ignorée) :", err.code || err.message);
  } else {
    console.log("✅ Colonne 'prenom_ar' ajoutée avec succès à la table Candidat !");
  }
});

// ── SÉCURISATION : colonne categories_habilitees pour les moniteurs ────────
db.query(`
  ALTER TABLE Moniteur 
  ADD COLUMN categories_habilitees VARCHAR(100) NOT NULL DEFAULT 'B'
`, (err) => {
  if (err) {
    console.log("ℹ️ Colonne 'categories_habilitees' déjà présente sur Moniteur (ou erreur ignorée) :", err.code || err.message);
  } else {
    console.log("✅ Colonne 'categories_habilitees' ajoutée avec succès à la table Moniteur !");
  }
});

// ── SÉCURISATION : colonnes manquantes sur CongeMoniteur ──────────────────
db.query(`
  ALTER TABLE CongeMoniteur
    ADD COLUMN statut      ENUM('en_attente','validee','refusee') NOT NULL DEFAULT 'en_attente' AFTER \`precision\`,
    ADD COLUMN motif_refus VARCHAR(255) DEFAULT NULL AFTER statut,
    ADD COLUMN created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER motif_refus,
    ADD COLUMN demande_par ENUM('admin','moniteur') NOT NULL DEFAULT 'admin' AFTER created_at,
    ADD COLUMN traite_at   TIMESTAMP NULL DEFAULT NULL AFTER demande_par
`, (err) => {
  if (err) {
    console.log("ℹ️ Colonnes CongeMoniteur déjà présentes :", err.code || err.message);
  } else {
    console.log("✅ Colonnes CongeMoniteur ajoutées !");
  }
});

// ──────────────────────────────────────────────────────────────────────────
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { registerMoniteurHandlers } = require('./moniteurHandlers');
const { registerAdminHandlers } = require('./adminHandlers');

const { generatePDFFromHTML } = require("./pdfGenerator");
const { buildListeCandidatsHTML } = require("./templates/listeCandidatsTemplate");
const { buildListeEnvoiHTML } = require("./templates/listeEnvoiTemplate");
 

// ── CONFIG EMAIL ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'tinhinanethequeen@gmail.com',
    pass: 'gjgw vqfa qzkp wbfa',
  },
});

function buildSeanceEmailHtml({ prenomCandidat, nomCandidat, prenomMoniteur, nomMoniteur, date, heure, duree, type }) {
  const typeLabel = type === "code" ? "Code" : type === "circulation" ? "Circulation" : "Créneau";
  const [h, m] = heure.split(":");
  const startH = parseInt(h) + parseInt(m) / 60;
  const endH   = startH + parseFloat(duree);
  const endHH  = String(Math.floor(endH)).padStart(2, "0");
  const endMM  = String(Math.round((endH % 1) * 60)).padStart(2, "0");

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#2563eb;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
      </div>
      <div style="padding:28px;">
        <h2 style="color:#0F172A;margin-bottom:8px;">Nouvelle séance planifiée !</h2>
        <p style="color:#475569;margin-bottom:20px;">
          Bonjour <strong>${prenomCandidat} ${nomCandidat}</strong>, une nouvelle séance vous a été assignée.
        </p>
        <div style="background:#F1F5F9;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:6px 0;color:#475569;">
            <strong>📅 Date :</strong> ${new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
          <p style="margin:6px 0;color:#475569;">
            <strong>🕐 Heure :</strong> ${heure} – ${endHH}:${endMM}
          </p>
          <p style="margin:6px 0;color:#475569;">
            <strong>⏱ Durée :</strong> ${parseFloat(duree) === 0.5 ? "30 min" : parseFloat(duree) === 0.75 ? "45 min" : parseFloat(duree) === 1 ? "1h" : parseFloat(duree) === 1.5 ? "1h30" : parseFloat(duree) + "h"}
          </p>
          <p style="margin:6px 0;color:#475569;">
            <strong>📋 Type :</strong> ${typeLabel}
          </p>
          <p style="margin:6px 0;color:#475569;">
            <strong>👤 Moniteur :</strong> ${prenomMoniteur} ${nomMoniteur}
          </p>
        </div>
        <p style="color:#94A3B8;font-size:12px;">
          Merci d'être présent(e) à l'heure. En cas d'empêchement, contactez votre auto-école.
        </p>
      </div>
    </div>
  `;
}

const RAISON_LABELS = {
  maladie:  "🤒 Maladie",
  voyage:   "✈️ Voyage",
  familial: "👨‍👩‍👧 Raison familiale",
  autre:    "📋 Autre",
};

function buildCongeRequestEmailHtml({ prenom, nom, dateDebut, dateFin, raison, precision }) {
  const raisonLabel = RAISON_LABELS[raison] || raison;
  const titreRaison = raison === "autre" && precision ? precision : raisonLabel;

  const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#f97316;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
        <p style="color:#fed7aa;margin:6px 0 0;font-size:13px;">Nouvelle demande de congé</p>
      </div>
      <div style="padding:28px;">
        <p style="color:#475569;font-size:15px;margin-bottom:20px;">
          <strong>${prenom} ${nom}</strong> a soumis une demande de congé qui nécessite votre validation.
        </p>
        <div style="background:#F8FAFC;border-radius:10px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;width:35%;">📋 Raison</td>
              <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:600;">${titreRaison}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;">📅 Début</td>
              <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:600;">${fmt(dateDebut)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;">📅 Fin</td>
              <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:600;">${fmt(dateFin)}</td>
            </tr>
          </table>
        </div>
        <p style="color:#94A3B8;font-size:12px;">
          Connectez-vous à l'application pour valider ou refuser cette demande depuis le tableau de bord ou la page Moniteurs.
        </p>
      </div>
      <div style="background:#F1F5F9;padding:14px 28px;text-align:center;">
        <p style="color:#94A3B8;font-size:11px;margin:0;">Auto-École — Ce message est envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  `;
}

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(length))
    .map((b) => chars[b % chars.length])
    .join("");
}

function buildEmailHtml({ prenom, nom, email, password, isReset = false }) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#4E96E1;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
      </div>
      <div style="padding:28px;">
        <h2 style="color:#0F172A;margin-bottom:8px;">
          ${isReset ? "Réinitialisation de votre mot de passe" : `Bienvenue, ${prenom} !`}
        </h2>
        <p style="color:#475569;margin-bottom:20px;">
          ${isReset
            ? "Votre mot de passe a été réinitialisé par l'administrateur."
            : 'Votre compte moniteur vient d\'être créé. Voici vos identifiants de connexion :'}
        </p>
        <div style="background:#F1F5F9;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:4px 0;color:#475569;"><strong>Nom :</strong> ${prenom} ${nom}</p>
          <p style="margin:4px 0;color:#475569;"><strong>Email :</strong> ${email}</p>
          <p style="margin:8px 0 4px;color:#0F172A;font-size:15px;">
            <strong>Mot de passe :</strong>
            <span style="background:#4E96E1;color:#fff;padding:3px 10px;border-radius:6px;font-family:monospace;font-size:16px;margin-left:8px;">${password}</span>
          </p>
        </div>
        <p style="color:#94A3B8;font-size:12px;">Pensez à changer votre mot de passe après votre première connexion.</p>
      </div>
    </div>
  `;
}

function buildLockoutEmailHtml({ prenom, nom, dateDeblocage }) {
  const heureDeblocage = dateDeblocage.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#c0392b;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
      </div>
      <div style="padding:28px;">
        <h2 style="color:#0F172A;margin-bottom:8px;">Compte temporairement bloqué</h2>
        <p style="color:#475569;margin-bottom:20px;">
          Bonjour <strong>${prenom} ${nom}</strong>, votre compte a été bloqué après 3 tentatives de connexion échouées.
        </p>
        <div style="background:#F1F5F9;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:6px 0;color:#475569;">
            <strong>🔓 Vous pourrez réessayer à partir de :</strong> ${heureDeblocage}
          </p>
        </div>
        <p style="color:#94A3B8;font-size:12px;">
          Si ce n'est pas vous qui avez tenté de vous connecter, contactez immédiatement l'administrateur.
        </p>
      </div>
    </div>
  `;
}


// ── FENÊTRE ──────────────────────────────────────────────────────────────────
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      plugins: true
    },
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

app.whenReady().then(() => {
  createWindow();
  registerMoniteurHandlers(db);
  registerAdminHandlers(db);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ══════════════════════════════════════════════════════════════════════════════
//  IPC HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

// Map temporaire : email → { code, expiry }
const otpStore = new Map();

// Étape 1 : envoyer le code OTP
ipcMain.handle("forgot-password-send-otp", async (event, { email }) => {
  return new Promise((resolve) => {
    db.query(
      "SELECT id, nom, prenom, type_utilisateur, recovery_email FROM Utilisateur WHERE mail = ?",
      [email],
      async (err, res) => {
        if (err || !res.length)
          return resolve({ success: false, message: "Aucun compte trouvé avec cet email." });

        const user = res[0];
        const isAdmin = user.type_utilisateur === 'administrateur';

        if (isAdmin && !user.recovery_email)
          return resolve({ success: false, message: "Aucun email de récupération configuré." });

        const sendTo = isAdmin ? user.recovery_email : email;
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000;
        otpStore.set(email, { code, expiry });

        try {
          await transporter.sendMail({
            from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
            to: sendTo,
            subject: "Code de réinitialisation – Auto-École",
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
                <div style="background:#4E96E1;padding:24px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
                </div>
                <div style="padding:28px;">
                  <h2 style="color:#0F172A;">Bonjour ${user.prenom} !</h2>
                  <p style="color:#475569;margin-bottom:20px;">Votre code de réinitialisation (valable 10 min) :</p>
                  <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4E96E1;text-align:center;padding:16px;background:#F1F5F9;border-radius:8px;margin:20px 0;">${code}</div>
                  <p style="color:#94A3B8;font-size:12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                </div>
              </div>`,
          });
          resolve({ success: true, isAdmin, recoveryEmail: sendTo });
        } catch (emailErr) {
          resolve({ success: false, message: "Erreur lors de l'envoi de l'email." });
        }
      }
    );
  });
});

// Étape 2 : vérifier le code OTP
ipcMain.handle("forgot-password-verify-otp", async (event, { email, code }) => {
  const entry = otpStore.get(email);
  if (!entry) return { success: false, message: "Aucun code demandé pour cet email." };
  if (Date.now() > entry.expiry) { otpStore.delete(email); return { success: false, message: "Code expiré. Veuillez recommencer." }; }
  if (entry.code !== code) return { success: false, message: "Code incorrect." };
  return { success: true };
});

// Étape 3 : mettre à jour le mot de passe
ipcMain.handle("forgot-password-reset", async (event, { email, newPassword }) => {
  const entry = otpStore.get(email);
  if (!entry) return { success: false, message: "Session expirée." };

  return new Promise((resolve) => {
    db.query(
      "UPDATE Utilisateur SET mot_de_passe = ? WHERE mail = ?",
      [newPassword, email],
      (err, result) => {
        if (err)
          return resolve({ success: false, message: "Erreur base de données." });

        if (result.affectedRows === 0)
          return resolve({ success: false, message: "Aucun compte trouvé avec cet email." });

        otpStore.delete(email);
        resolve({ success: true });
      }
    );
  });
});

ipcMain.handle("login", async (event, credentials) => {
  const { email, password } = credentials;

  return new Promise((resolve) => {
    db.query(
      `SELECT u.id, u.nom, u.prenom, u.mail, u.mot_de_passe, u.type_utilisateur, 
              u.tentatives_echouees, u.verrouille_jusqua, m.actif
       FROM Utilisateur u
       LEFT JOIN Moniteur m ON u.id = m.id
       WHERE u.mail = ? AND u.deleted_at IS NULL`,
      [email],
      (err, result) => {
        if (err) return resolve({ success: false, message: "Erreur Base de données" });
        if (!result || result.length === 0) {
          return resolve({ success: false, message: "Identifiants incorrects" });
        }

        const user = result[0];
        const now = new Date();

        // ── Compte actuellement verrouillé ? ──
        if (user.verrouille_jusqua && new Date(user.verrouille_jusqua) > now) {
          const minutesRestantes = Math.ceil((new Date(user.verrouille_jusqua) - now) / 60000);
          return resolve({ success: false, locked: true, minutesRestantes });
        }

        // ── Mauvais mot de passe ──
        if (user.mot_de_passe !== password) {
          const nouvellesTentatives = (user.tentatives_echouees || 0) + 1;

          if (nouvellesTentatives >= 3) {
            const deblocage = new Date(now.getTime() + 10 * 60 * 1000);

            db.query(
              `UPDATE Utilisateur SET tentatives_echouees = ?, verrouille_jusqua = ? WHERE id = ?`,
              [nouvellesTentatives, deblocage, user.id],
              async () => {
                try {
                  await transporter.sendMail({
                    from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
                    to: user.mail,
                    subject: "Compte temporairement bloqué – Auto-École",
                    html: buildLockoutEmailHtml({ prenom: user.prenom, nom: user.nom, dateDeblocage: deblocage }),
                  });
                } catch (e) {
                  console.error("Erreur envoi mail verrouillage:", e.message);
                }
                resolve({ success: false, locked: true, minutesRestantes: 10 });
              }
            );
          } else {
            db.query(
              `UPDATE Utilisateur SET tentatives_echouees = ? WHERE id = ?`,
              [nouvellesTentatives, user.id],
              () => {
                resolve({
                  success: false,
                  message: `Identifiants incorrects (${3 - nouvellesTentatives} tentative(s) restante(s))`,
                });
              }
            );
          }
          return;
        }

        // ── Mot de passe correct ──
        if (user.type_utilisateur === 'moniteur' && user.actif === 0) {
          return resolve({ success: false, inactive: true });
        }

        db.query(
          `UPDATE Utilisateur SET tentatives_echouees = 0, verrouille_jusqua = NULL WHERE id = ?`,
          [user.id],
          () => {
            resolve({
              success: true,
              user: { id: user.id, nom: user.nom, prenom: user.prenom, type_utilisateur: user.type_utilisateur },
            });
          }
        );
      }
    );
  });
});

// ── 2. CANDIDATS ──────────────────────────────────────────────────────────────
ipcMain.handle("get-candidats", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT 
        c.*, 
        MAX(p.montantTotal) AS montantTotal, 
        MAX(p.montantRestant) AS montantRestant, 
        MAX(p.statutPaiement) AS statutPaiement,
        GROUP_CONCAT(s.idSeance) AS seanceIds,
        GROUP_CONCAT(CONCAT(s.date, ' ', s.heure)) AS seanceDates
      FROM Candidat c
      LEFT JOIN Paiement p ON c.idCandidat = p.idCandidat
      LEFT JOIN CandidatSeance cs ON c.idCandidat = cs.idCandidat
      LEFT JOIN Seance s ON cs.idSeance = s.idSeance
      WHERE c.deleted_at IS NULL
      GROUP BY c.idCandidat
      ORDER BY c.idCandidat DESC`;

    db.query(sql, (err, res) => {
      if (err) {
        console.error(err);
        resolve([]);
      } else {
        const formattedRes = res.map(row => ({
          ...row,
          seanceIds: row.seanceIds ? row.seanceIds.split(',').map(Number) : [],
          seanceDates: row.seanceDates ? row.seanceDates.split(',') : []
        }));
        resolve(formattedRes);
      }
    });
  });
});

ipcMain.handle("add-candidat", async (event, data) => {
  const { nom, prenom, nom_ar, prenom_ar, telephone, date_naissance, sexe, photo, statut, email, created_by_moniteur_id } = data;

  let categoriePermis = 'B';
  if (data.categoriePermis && data.categoriePermis.trim() !== "") {
    categoriePermis = data.categoriePermis.trim().toUpperCase();
  }

  let photoBuffer = null;
  if (photo && photo.startsWith("data:image")) {
    photoBuffer = Buffer.from(photo.split(",")[1], "base64");
  }

    const sql = `
    INSERT INTO Candidat (nom, prenom, nom_ar, prenom_ar, telephone, date_naissance, date_inscription, sexe, photo, statut, email, categoriePermis, created_by_moniteur_id)
    VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)
  `;
  return new Promise((resolve) => {
    db.query(sql, [
      nom, prenom,
      nom_ar || null, prenom_ar || null,
      telephone, date_naissance || null, sexe, photoBuffer, statut, email || null, categoriePermis, created_by_moniteur_id 
   ||null], (err) => {
      if (err) { console.error('add-candidat error:', err); resolve(false); }
      else resolve(true);
    });
  });
});

ipcMain.handle("update-candidat", async (event, c) => {
  console.log("📝 update-candidat reçu:", c);
  return new Promise((resolve) => {
    let categorieNettoyee = 'B';
    if (c.categoriePermis && String(c.categoriePermis).trim() !== "") {
      categorieNettoyee = String(c.categoriePermis).trim().toUpperCase();
    }

    const sql = `UPDATE Candidat 
      SET nom=?, prenom=?, nom_ar=?, prenom_ar=?, telephone=?, date_naissance=?, sexe=?, photo=?, statut=?, email=?, categoriePermis=?
      WHERE idCandidat=?`;
    db.query(sql, [
      c.nom,
      c.prenom,
      c.nom_ar    || null,
      c.prenom_ar || null,
      c.telephone     || null,
      c.date_naissance && c.date_naissance !== "" ? c.date_naissance : null,
      c.sexe,
      c.photo         || null,
      c.statut,
      c.email         || null,
      categorieNettoyee,
      c.idCandidat,
    ], (err) => {
      if (err) {
        console.error("❌ update-candidat error:", err.message);
        resolve({ success: false, error: err.message });
      } else {
        console.log("✅ update-candidat OK en BDD avec Categorie:", categorieNettoyee);
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle("delete-candidat", async (event, id) => {
  return new Promise((resolve) => {
    db.query(
      `UPDATE Candidat SET deleted_at = NOW() WHERE idCandidat = ?`,
      [id],
      (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      }
    );
  });
});

// ── 3. MONITEURS ──────────────────────────────────────────────────────────────
ipcMain.handle("get-moniteurs", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT u.id, u.nom, u.prenom, u.mail as email, m.numeroTelephone as telephone, 
             m.photo, IF(m.actif, 'actif', 'inactif') as statut,
             m.categories_habilitees
      FROM Utilisateur u
      JOIN Moniteur m ON u.id = m.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.nom ASC`;
    db.query(sql, (err, res) => {
      if (err) resolve([]);
      else resolve(res);
    });
  });
});

ipcMain.handle("add-moniteur", async (event, m) => {
  const password = generatePassword();

  const categoriesHabilitees = (m.categories_habilitees && m.categories_habilitees.trim() !== "")
    ? m.categories_habilitees.trim()
    : 'B';

  return new Promise((resolve) => {
    const sqlUser = `
      INSERT INTO Utilisateur (nom, prenom, mail, mot_de_passe, type_utilisateur)
      VALUES (?, ?, ?, ?, 'moniteur')
    `;

    db.query(sqlUser, [m.nom, m.prenom, m.email, password], (err, res) => {
      if (err) {
        console.error("User Insert Error:", err.message);
        return resolve({ success: false, error: err.message });
      }

      const newId = res.insertId;

      const sqlMoniteur = `
        INSERT INTO Moniteur (id, numeroTelephone, actif, photo, categories_habilitees)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        sqlMoniteur,
        [newId, m.telephone, m.statut === "actif" ? 1 : 0, m.photo, categoriesHabilitees],
        async (err2) => {
          if (err2) {
            console.error("Moniteur Insert Error:", err2.message);
            return resolve({ success: false, error: err2.message });
          }

          console.log("✅ Moniteur créé avec catégories:", categoriesHabilitees);

          let emailSent = false;
          try {
            await transporter.sendMail({
              from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
              to: m.email,
              subject: "Vos identifiants de connexion – Auto-École",
              html: buildEmailHtml({
                prenom: m.prenom,
                nom: m.nom,
                email: m.email,
                password,
              }),
            });
            emailSent = true;
          } catch (emailErr) {
            console.error("Erreur envoi email:", emailErr.message);
          }

          resolve({ success: true, id: newId, password, emailSent });
        }
      );
    });
  });
});

ipcMain.handle("reset-moniteur-password", async (event, data) => {
  const { id, email, prenom, nom } = data;
  const newPassword = generatePassword();
  return new Promise((resolve) => {
    db.query(
      'UPDATE Utilisateur SET mot_de_passe = ? WHERE id = ?',
      [newPassword, id],
      async (err) => {
        if (err) return resolve({ success: false });
        try {
          await transporter.sendMail({
            from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
            to: email,
            subject: "Réinitialisation de votre mot de passe – Auto-École",
            html: buildEmailHtml({ prenom, nom, email, password: newPassword, isReset: true }),
          });
        } catch (emailErr) {
          console.error("Erreur envoi email reset:", emailErr.message);
        }
        resolve({ success: true });
      }
    );
  });
});

ipcMain.handle("update-moniteur", async (event, m) => {
  const categoriesHabilitees = (m.categories_habilitees && m.categories_habilitees.trim() !== "")
    ? m.categories_habilitees.trim()
    : 'B';

  return new Promise((resolve) => {
    const sqlUser = `UPDATE Utilisateur SET nom=?, prenom=?, mail=? WHERE id=?`;
    db.query(sqlUser, [m.nom, m.prenom, m.email, m.id], (err) => {
      if (err) return resolve({ success: false });

      const sqlMon = `UPDATE Moniteur SET numeroTelephone=?, actif=?, photo=?, categories_habilitees=? WHERE id=?`;
      db.query(sqlMon, [
        m.telephone,
        m.statut === 'actif' ? 1 : 0,
        m.photo || null,
        categoriesHabilitees,
        m.id
      ], (err2) => {
        if (err2) {
          console.error("❌ update-moniteur error:", err2.message);
          resolve({ success: false });
        } else {
          console.log("✅ Moniteur mis à jour avec catégories:", categoriesHabilitees);
          resolve({ success: true });
        }
      });
    });
  });
});

ipcMain.handle("delete-moniteur", async (event, id) => {
  return new Promise((resolve) => {
    db.query(
      `UPDATE Utilisateur SET deleted_at = NOW() WHERE id = ?`,
      [id],
      (err) => {
        if (err) resolve({ success: false });
        else resolve({ success: true });
      }
    );
  });
});

// ── 4. DASHBOARD ──────────────────────────────────────────────────────────────
ipcMain.handle("get-dashboard-stats", async () => {
  return new Promise((resolve) => {
    db.query('SELECT COUNT(*) as total FROM Candidat', (err1, res1) => {
      if (err1) return resolve({ totalCandidats: 0, sessionsToday: 0, revenuMois: 0 });

      const totalCandidats = res1[0].total;

      db.query('SELECT COUNT(*) as total FROM Seance WHERE date = CURDATE()', (err2, res2) => {
        if (err2) return resolve({ totalCandidats, sessionsToday: 0, revenuMois: 0 });

        const sessionsToday = res2[0].total;

        db.query(
          `SELECT COALESCE(SUM(montant), 0) as total 
           FROM Versement 
           WHERE MONTH(dateVersement) = MONTH(CURDATE()) 
           AND YEAR(dateVersement) = YEAR(CURDATE())`,
          (err3, res3) => {
            const revenuMois = err3 ? 0 : res3[0].total;
            resolve({ totalCandidats, sessionsToday, revenuMois });
          }
        );
      });
    });
  });
});

// ── 5. PAIEMENTS ──────────────────────────────────────────────────────────────
ipcMain.handle('add-payment', async (event, data) => {
  const { idCandidat, montant, methode, dateVersement, remarque, typeVersement } = data;
  const PRIX_PERMIS = 30000;
  const versement = parseFloat(montant);

  // ── Séances supplémentaires : paiement indépendant du forfait ─────────────
  if (typeVersement === 'seance_supplementaire') {
    return new Promise((resolve) => {
      db.query('SELECT * FROM Paiement WHERE idCandidat = ? LIMIT 1', [idCandidat], (err, rows) => {
        if (err) return resolve({ success: false, message: "Erreur DB: " + err.message });
        if (!rows || rows.length === 0)
          return resolve({ success: false, message: "Aucun dossier de paiement trouvé pour ce candidat." });

        const idPaiement = rows[0].idPaiement;
        db.query(
          `INSERT INTO Versement (montant, typeVersement, datePaiement, methode, numeroTranche, remarque, dateVersement, idPaiement)
           VALUES (?, 'seance_supplementaire', NOW(), ?, NULL, ?, ?, ?)`,
          [versement, methode, remarque || null, dateVersement, idPaiement],
          (err2) => {
            if (err2) return resolve({ success: false, message: "Erreur Versement: " + err2.message });
            resolve({ success: true, montantRestant: rows[0].montantRestant });
          }
        );
      });
    });
  }

  // ── Paiement forfait normal ───────────────────────────────────────────────
  return new Promise((resolve) => {
    db.query('SELECT * FROM Paiement WHERE idCandidat = ? LIMIT 1', [idCandidat], (err, rows) => {
      if (err) return resolve({ success: false, message: "Erreur DB: " + err.message });

      const enregistrer = (idPaiement, restantActuel, numeroTranche) => {
        if (restantActuel <= 0) {
          return resolve({ success: false, message: "Action bloquée : ce candidat a déjà soldé son compte." });
        }
        if (versement > restantActuel) {
          return resolve({ success: false, message: `Le montant (${versement} DA) dépasse le reste à payer (${restantActuel} DA).` });
        }
        const nouveauRestant = Math.max(0, restantActuel - versement);
        const nouveauStatut = nouveauRestant <= 0 ? 'payé' : 'en_cours';

        db.query('UPDATE Paiement SET montantRestant = ?, statutPaiement = ? WHERE idPaiement = ?',
          [nouveauRestant, nouveauStatut, idPaiement], (err2) => {
            if (err2) return resolve({ success: false, message: "Erreur Update: " + err2.message });
            db.query(
              `INSERT INTO Versement (montant, typeVersement, datePaiement, methode, numeroTranche, remarque, dateVersement, idPaiement)
               VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
              [versement, typeVersement || 'seance', methode, numeroTranche, remarque || null, dateVersement, idPaiement],
              (err3) => {
                if (err3) return resolve({ success: false, message: "Erreur Versement: " + err3.message });
                resolve({ success: true, montantRestant: nouveauRestant });
              }
            );
          }
        );
      };

      if (rows && rows.length > 0) {
        const p = rows[0];
        db.query('SELECT COUNT(*) as nb FROM Versement WHERE idPaiement = ?', [p.idPaiement], (errTranche, countRes) => {
          const tranche = (countRes?.[0]?.nb || 0) + 1;
          enregistrer(p.idPaiement, parseFloat(p.montantRestant), tranche);
        });
      } else {
        const typePaiement = versement >= PRIX_PERMIS ? 'complet' : 'tranche';
        db.query(
          `INSERT INTO Paiement (montantTotal, montantRestant, typePaiement, statutPaiement, idCandidat)
           VALUES (?, ?, ?, 'en_cours', ?)`,
          [PRIX_PERMIS, PRIX_PERMIS, typePaiement, idCandidat],
          (errInsert, resInsert) => {
            if (errInsert) return resolve({ success: false, message: "Erreur Création Paiement" });
            enregistrer(resInsert.insertId, PRIX_PERMIS, 1);
          }
        );
      }
    });
  });
});

ipcMain.handle("get-payments", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT 
        v.idVersement, v.montant, v.methode, v.dateVersement,
        v.remarque, v.typeVersement, v.numeroTranche,
        c.nom, c.prenom, c.idCandidat,
        p.montantTotal, p.montantRestant, p.statutPaiement, p.idPaiement
      FROM Versement v
      JOIN Paiement p ON v.idPaiement = p.idPaiement
      JOIN Candidat c ON p.idCandidat = c.idCandidat
      ORDER BY v.dateVersement DESC
    `;
    db.query(sql, (err, res) => {
      if (err) resolve([]);
      else resolve(res);
    });
  });
});

ipcMain.handle('get-candidats-debiteurs', async () => {
  return new Promise((resolve) => {
    console.log("Calling this guy!");
    const sql = `
      SELECT 
        c.idCandidat, 
        c.nom, 
        c.prenom, 
        c.telephone,
        MAX(COALESCE(p.montantTotal, 30000)) AS montantTotal,
        MAX(COALESCE(p.montantRestant, 30000)) AS montantRestant,
        MAX(COALESCE(p.statutPaiement, 'en_attente')) AS statutPaiement,
        GROUP_CONCAT(s.idSeance) AS seanceIds,
        GROUP_CONCAT(CONCAT(s.date, ' à ', s.heure)) AS seanceDetails
      FROM Candidat c
      LEFT JOIN Paiement p ON c.idCandidat = p.idCandidat
      LEFT JOIN CandidatSeance cs ON c.idCandidat = cs.idCandidat
      LEFT JOIN Seance s ON cs.idSeance = s.idSeance
      WHERE p.idPaiement IS NULL OR p.montantRestant > 0
      GROUP BY c.idCandidat
      ORDER BY c.nom ASC
    `;

    db.query(sql, (err, res) => {
      if (err) {
        console.error('get-candidats-debiteurs error:', err);
        resolve([]);
      } else {
        const formattedRes = res.map(row => ({
          ...row,
          seanceIds: row.seanceIds ? row.seanceIds.split(',').map(Number) : [],
          seanceDetails: row.seanceDetails ? row.seanceDetails.split(',') : []
        }));
        resolve(formattedRes);
        console.log(formattedRes);
      }
    });
  });
});

// ── 6. SÉANCES ────────────────────────────────────────────────────────────────
ipcMain.handle("get-seances", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT 
        s.idSeance, s.date, s.heure, s.duree, s.type, s.statut, s.moniteur_id, s.categoriePermis,
        CONCAT(u.prenom, ' ', u.nom) AS moniteurNom,
        GROUP_CONCAT(CONCAT(c.prenom, ' ', c.nom) SEPARATOR ', ') AS candidatsNoms,
        GROUP_CONCAT(c.idCandidat SEPARATOR ',') AS candidatsIds
      FROM Seance s
      JOIN Moniteur m ON s.moniteur_id = m.id
      JOIN Utilisateur u ON m.id = u.id
      LEFT JOIN CandidatSeance cs ON s.idSeance = cs.idSeance
      LEFT JOIN Candidat c ON cs.idCandidat = c.idCandidat
      GROUP BY s.idSeance
      ORDER BY s.date DESC, s.heure ASC`;
    db.query(sql, (err, res) => {
      if (err) resolve([]);
      else resolve(res);
    });
  });
});

ipcMain.handle("add-seance", async (event, seanceData) => {
  const { date, heure, type, statut, moniteur_id, candidatIds, duree, categoriePermis } = seanceData;
  return new Promise((resolve) => {
    const sqlSeance = `INSERT INTO Seance (date, heure, type, statut, moniteur_id, duree, categoriePermis) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sqlSeance, [date, heure, type, statut || 'planifiée', moniteur_id, duree || 1, categoriePermis || 'B'], (err, res) => {
      if (err) { console.error("❌ Erreur INSERT Seance:", err); return resolve({ success: false }); }
      const newSeanceId = res.insertId;
      console.log("✅ Séance créée ID:", newSeanceId);
      if (!candidatIds || candidatIds.length === 0) {
        console.log("⚠️ Aucun candidat — mail non envoyé");
        return resolve({ success: true, id: newSeanceId });
      }

      const values = candidatIds.map(cid => [cid, newSeanceId]);
      db.query(`INSERT INTO CandidatSeance (idCandidat, idSeance) VALUES ?`, [values], async (err2) => {
        if (err2) { console.error("❌ Erreur INSERT CandidatSeance:", err2); return resolve({ success: false, id: newSeanceId }); }

        console.log("✅ CandidatSeance inséré, candidatIds:", candidatIds);

        try {
          const candidatId = candidatIds[0];
          console.log("📧 Recherche candidat ID:", candidatId);

          const candidatRows = await new Promise((res, rej) =>
            db.query(
              `SELECT nom, prenom, email FROM Candidat WHERE idCandidat = ?`,
              [candidatId],
              (e, r) => e ? rej(e) : res(r)
            )
          );
          const candidat = candidatRows?.[0];
          console.log("📧 Candidat trouvé:", candidat);

          const moniteurRows = await new Promise((res, rej) =>
            db.query(
              `SELECT u.nom, u.prenom FROM Utilisateur u WHERE u.id = ?`,
              [moniteur_id],
              (e, r) => e ? rej(e) : res(r)
            )
          );
          const moniteur = moniteurRows?.[0];
          console.log("📧 Moniteur trouvé:", moniteur);

          if (!candidat?.email) {
            console.log("⚠️ Pas d'email pour ce candidat — mail non envoyé");
          } else {
            console.log("📤 Envoi mail à:", candidat.email);
            await transporter.sendMail({
              from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
              to: candidat.email,
              subject: "Nouvelle séance planifiée – Auto-École",
              html: buildSeanceEmailHtml({
                prenomCandidat: candidat.prenom,
                nomCandidat:    candidat.nom,
                prenomMoniteur: moniteur?.prenom || "",
                nomMoniteur:    moniteur?.nom    || "",
                date,
                heure,
                duree,
                type,
              }),
            });
            console.log("✅ Mail envoyé avec succès à:", candidat.email);
          }
        } catch (mailErr) {
          console.error("❌ Erreur envoi mail:", mailErr.message);
        }

        resolve({ success: true, id: newSeanceId });
      });
    });
  });
});


ipcMain.handle("delete-seance", async (event, id) => {
  return new Promise((resolve) => {
    db.query("DELETE FROM Seance WHERE idSeance = ?", [id], (err) => {
      resolve(!err);
    });
  });
});

ipcMain.handle("update-seance", async (event, data) => {
  const { id, date, heure, type, statut, moniteur_id, duree, candidatId, categoriePermis } = data;
  return new Promise((resolve) => {
    db.query(
      "UPDATE Seance SET date=?, heure=?, type=?, statut=?, moniteur_id=?, duree=?, categoriePermis=? WHERE idSeance=?",
      [date, heure, type, statut, moniteur_id, duree || 1, categoriePermis || 'B', id],
      (err) => {
        if (err) return resolve(false);
        if (!candidatId) return resolve(true);
        db.query('DELETE FROM CandidatSeance WHERE idSeance = ?', [id], (err2) => {
          if (err2) return resolve(false);
          db.query('INSERT INTO CandidatSeance (idCandidat, idSeance) VALUES (?, ?)', [parseInt(candidatId), id], (err3) => {
            resolve(!err3);
          });
        });
      }
    );
  });
});


// ── 7. PAIEMENTS PAR MONITEUR ─────────────────────────────────────────────────
ipcMain.handle('get-payments-by-moniteur', async (event, moniteurId) => {
  return new Promise((resolve) => {
    const sql = `
      SELECT 
        v.idVersement, v.montant, v.methode, v.dateVersement,
        v.remarque, v.typeVersement, v.numeroTranche,
        c.nom, c.prenom, c.idCandidat,
        p.montantTotal, p.montantRestant, p.statutPaiement, p.idPaiement
      FROM Versement v
      JOIN Paiement p     ON v.idPaiement     = p.idPaiement
      JOIN Candidat c     ON p.idCandidat      = c.idCandidat
      JOIN CandidatSeance cs ON cs.idCandidat  = c.idCandidat
      JOIN Seance s        ON cs.idSeance       = s.idSeance
      WHERE s.moniteur_id = ?
      GROUP BY v.idVersement
      ORDER BY v.dateVersement DESC
    `;
    db.query(sql, [moniteurId], (err, res) => {
      if (err) { console.error('get-payments-by-moniteur:', err); resolve([]); }
      else resolve(res);
    });
  });
});

ipcMain.handle('get-candidats-debiteurs-moniteur', async (event, moniteurId) => {
  return new Promise((resolve) => {
    const sql = `
      SELECT DISTINCT
        c.idCandidat, c.nom, c.prenom, c.telephone,
        COALESCE(p.montantTotal,  30000) AS montantTotal,
        COALESCE(p.montantRestant, 30000) AS montantRestant,
        COALESCE(p.statutPaiement, 'en_attente') AS statutPaiement
      FROM Candidat c
      JOIN CandidatSeance cs ON cs.idCandidat = c.idCandidat
      JOIN Seance s           ON cs.idSeance   = s.idSeance
      LEFT JOIN Paiement p   ON p.idCandidat   = c.idCandidat
      WHERE s.moniteur_id = ?
        AND (p.idPaiement IS NULL OR p.montantRestant > 0)
      ORDER BY c.nom ASC
    `;
    db.query(sql, [moniteurId], (err, res) => {
      if (err) { console.error('get-candidats-debiteurs-moniteur:', err); resolve([]); }
      else resolve(res);
    });
  });
});

// ── 8. PROFIL MONITEUR ────────────────────────────────────────────────────────
ipcMain.handle('get-moniteur-profile', async (event, moniteurId) => {
  return new Promise((resolve) => {
    const sql = `
      SELECT u.id, u.nom, u.prenom, u.mail as email,
             m.numeroTelephone as telephone, m.photo,
             IF(m.actif, 'actif', 'inactif') as statut,
             m.categories_habilitees
      FROM Utilisateur u
      JOIN Moniteur m ON u.id = m.id
      WHERE u.id = ?
    `;
    db.query(sql, [moniteurId], (err, res) => {
      if (err || !res.length) resolve(null);
      else resolve(res[0]);
    });
  });
});

ipcMain.handle('update-moniteur-password', async (event, { moniteurId, oldPassword, newPassword }) => {
  return new Promise((resolve) => {
    db.query(
      'SELECT id FROM Utilisateur WHERE id = ? AND mot_de_passe = ?',
      [moniteurId, oldPassword],
      (err, res) => {
        if (err) return resolve({ success: false, message: "Erreur base de données." });
        if (!res.length) return resolve({ success: false, message: "Ancien mot de passe incorrect." });

        db.query(
          'UPDATE Utilisateur SET mot_de_passe = ? WHERE id = ?',
          [newPassword, moniteurId],
          (err2) => {
            if (err2) resolve({ success: false, message: "Erreur lors de la mise à jour." });
            else resolve({ success: true });
          }
        );
      }
    );
  });
});

// ── 9. NOTIFICATIONS EXAMEN ───────────────────────────────────────────────────
ipcMain.handle("send-examen-notification", async (event, { email, candidat, type, date, heure, lieu }) => {
  const dateFormatee = new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const typeColors = {
    Code:        { bg: "#e8f5e9", color: "#2e7d32" },
    Créneau:     { bg: "#fff3e0", color: "#e65100" },
    Circulation: { bg: "#fce4ec", color: "#c62828" },
  };
  const tc = typeColors[type] || { bg: "#eee", color: "#333" };

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#2b537e;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
        <p style="color:#c7d7f0;margin:6px 0 0;font-size:13px;">Convocation à l'examen</p>
      </div>
      <div style="padding:28px;">
        <p style="color:#475569;font-size:15px;margin-bottom:20px;">
          Bonjour <strong>${candidat}</strong>,<br/>
          Vous êtes convoqué(e) à votre prochain examen. Voici les détails :
        </p>
        <div style="background:#F8FAFC;border-radius:10px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;">📋 Type d'examen</td>
              <td style="padding:8px 0;">
                <span style="background:${tc.bg};color:${tc.color};padding:3px 12px;border-radius:6px;font-size:13px;font-weight:700;">
                  ${type}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;">📅 Date</td>
              <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:600;">${dateFormatee}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;">🕐 Heure</td>
              <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:600;">${heure}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;">📍 Lieu</td>
              <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:600;">${lieu}</td>
            </tr>
          </table>
        </div>
        <p style="color:#94A3B8;font-size:12px;">
          Veuillez vous présenter 15 minutes avant l'heure indiquée avec votre pièce d'identité.<br/>
          En cas d'empêchement, contactez votre auto-école dès que possible.
        </p>
      </div>
      <div style="background:#F1F5F9;padding:14px 28px;text-align:center;">
        <p style="color:#94A3B8;font-size:11px;margin:0;">Auto-École — Ce message est envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
      to: email,
      subject: `Convocation examen ${type} – Auto-École`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("Erreur envoi notif examen:", err.message);
    return { success: false };
  }
});

ipcMain.handle("send-candidat-message", async (event, { email, nomCandidat, sujet, message }) => {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#2b537e;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
      </div>
      <div style="padding:28px;">
        <p style="color:#475569;font-size:15px;margin-bottom:16px;">
          Bonjour <strong>${nomCandidat}</strong>,
        </p>
        <div style="background:#F8FAFC;border-radius:10px;padding:20px;color:#1e293b;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
        <p style="color:#94A3B8;font-size:12px;margin-top:20px;">
          Ce message vous a été envoyé par votre auto-école. Merci de ne pas y répondre directement.
        </p>
      </div>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
      to: email,
      subject: sujet || "Message de votre auto-école",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("Erreur envoi message candidat:", err.message);
    return { success: false, message: err.message };
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  CONGÉS MONITEURS
// ══════════════════════════════════════════════════════════════════════════════

// Tous les congés (admin)
ipcMain.handle("get-all-conges", async () => {
  return new Promise((resolve) => {
    db.query(
      "SELECT * FROM CongeMoniteur ORDER BY created_at DESC",
      (err, res) => {
        if (err) { console.error("get-all-conges:", err); resolve([]); }
        else resolve(res);
      }
    );
  });
});

// Congés d'un moniteur (avec nom du moniteur)
ipcMain.handle("get-conges-moniteur", async (event, moniteurId) => {
  return new Promise((resolve) => {
    db.query(
      `SELECT cm.*,
              CONCAT(u.prenom, ' ', u.nom) AS moniteurNom
       FROM CongeMoniteur cm
       JOIN Moniteur m    ON m.id = cm.moniteur_id
       JOIN Utilisateur u ON u.id = m.id
       WHERE cm.moniteur_id = ?
       ORDER BY cm.dateDebut DESC`,
      [moniteurId],
      (err, res) => {
        if (err) { console.error("get-conges-moniteur:", err); resolve([]); }
        else resolve(res);
      }
    );
  });
});

// Toutes les demandes en attente (vue admin) — avec moniteurNom
ipcMain.handle("get-conges-en-attente", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT cm.*,
             CONCAT(u.prenom, ' ', u.nom) AS moniteurNom
      FROM CongeMoniteur cm
      JOIN Moniteur m    ON m.id = cm.moniteur_id
      JOIN Utilisateur u ON u.id = m.id
      WHERE cm.statut = 'en_attente'
      ORDER BY cm.created_at ASC
    `;
    db.query(sql, (err, res) => {
      if (err) { console.error("get-conges-en-attente:", err); resolve([]); }
      else resolve(res);
    });
  });
});

// Admin crée un congé directement validé
ipcMain.handle("add-conge-moniteur", async (event, data) => {
  const { moniteurId, dateDebut, dateFin, raison, precision } = data;
  return new Promise((resolve) => {
    db.query(
      `INSERT INTO CongeMoniteur
        (moniteur_id, dateDebut, dateFin, raison, \`precision\`, statut, demande_par, traite_at)
       VALUES (?, ?, ?, ?, ?, 'validee', 'admin', NOW())`,
      [moniteurId, dateDebut, dateFin, raison || "autre", precision || null],
      (err, res) => {
        if (err) { console.error("add-conge-moniteur:", err); resolve({ success: false, error: err.message }); }
        else resolve({ success: true, id: res.insertId });
      }
    );
  });
});
ipcMain.handle("request-conge-moniteur", async (event, data) => {
  console.log("📥 [1] request-conge-moniteur appelé avec:", data);

  const { moniteurId, dateDebut, dateFin, raison, precision } = data;

  return new Promise(async (resolve) => {

    // ── Vérification chevauchement AVANT l'insert ──────────────────────────
    const checkQuery = `
      SELECT id, dateDebut, dateFin FROM CongeMoniteur
      WHERE moniteur_id = ?
        AND statut IN ('validee', 'en_attente')
        AND dateDebut <= ?
        AND dateFin   >= ?
      LIMIT 1
    `;

    db.query(checkQuery, [moniteurId, dateFin, dateDebut], async (errCheck, rows) => {
      if (errCheck) {
        console.error("❌ Erreur vérification chevauchement:", errCheck.message);
        return resolve({ success: false, error: errCheck.message });
      }

      if (rows.length > 0) {
        const conflit = rows[0];
        const d = (v) => new Date(v).toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" });
        console.warn("⚠️ Chevauchement détecté avec congé id:", conflit.id);
        return resolve({
          success: false,
          error: `Vous avez déjà un congé du ${d(conflit.dateDebut)} au ${d(conflit.dateFin)}.`,
        });
      }

      // ── Pas de conflit → INSERT ───────────────────────────────────────────
      db.query(
        `INSERT INTO CongeMoniteur
          (moniteur_id, dateDebut, dateFin, raison, \`precision\`, statut, demande_par)
         VALUES (?, ?, ?, ?, ?, 'en_attente', 'moniteur')`,
        [moniteurId, dateDebut, dateFin, raison || "autre", precision || null],
        async (err, res) => {
          if (err) {
            console.error("❌ [2] Erreur INSERT CongeMoniteur:", err.message);
            return resolve({ success: false, error: err.message });
          }

          const congeId = res.insertId;
          console.log("✅ [2] Congé inséré en BDD, id:", congeId);

          db.query(
            `SELECT u.nom, u.prenom FROM Utilisateur u WHERE u.id = ?`,
            [moniteurId],
            async (err2, rows) => {
              console.log("📋 [3] Résultat lookup moniteur:", { err2: err2?.message, rows });

              if (err2 || !rows.length) {
                console.error("❌ [3] Erreur ou moniteur introuvable, id:", moniteurId);
                return resolve({ success: true, id: congeId });
              }

              const moniteur = rows[0];
              console.log("👤 [4] Moniteur trouvé:", moniteur);

              try {
                console.log("📤 [5] Tentative envoi email à tinhinanethequeen@gmail.com...");

                const infoMail = await transporter.sendMail({
                  from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
                  to: "tinhinanethequeen@gmail.com",
                  subject: `Nouvelle demande de congé — ${moniteur.prenom} ${moniteur.nom}`,
                  html: buildCongeRequestEmailHtml({
                    prenom: moniteur.prenom,
                    nom: moniteur.nom,
                    dateDebut,
                    dateFin,
                    raison: raison || "autre",
                    precision: precision || "",
                  }),
                });

                console.log("✅ [6] Email envoyé avec succès ! Réponse SMTP:", infoMail.response);

              } catch (emailErr) {
                console.error("❌ [6] ÉCHEC envoi email demande congé:", emailErr.message);
              }

              resolve({ success: true, id: congeId });
            }
          );
        }
      );
    });
  });
});
// Récupère toutes les demandes en attente avec infos du moniteur (alias legacy)
ipcMain.handle("get-demandes-conge-attente", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT cm.id, cm.moniteur_id, cm.dateDebut, cm.dateFin, cm.raison, cm.\`precision\`,
             u.prenom, u.nom, u.mail AS email
      FROM CongeMoniteur cm
      JOIN Moniteur m     ON m.id = cm.moniteur_id
      JOIN Utilisateur u  ON u.id = m.id
      WHERE cm.statut = 'en_attente'
      ORDER BY cm.dateDebut ASC
    `;
    db.query(sql, (err, res) => {
      if (err) { console.error("get-demandes-conge-attente:", err); resolve([]); }
      else resolve(res);
    });
  });
});

// Valider ou refuser une demande (handler générique)
ipcMain.handle("update-statut-conge", async (event, congeId, statut, motifRefus = null) => {
  return new Promise((resolve) => {
    db.query(
      `UPDATE CongeMoniteur SET statut = ?, motif_refus = ? WHERE id = ?`,
      [statut, motifRefus, congeId],
      (err) => {
        if (err) { console.error("update-statut-conge:", err); resolve({ success: false, error: err.message }); }
        else resolve({ success: true });
      }
    );
  });
});

// Admin valide une demande
ipcMain.handle("valider-conge-moniteur", async (event, congeId) => {
  return new Promise((resolve) => {
    db.query(
      "UPDATE CongeMoniteur SET statut = 'validee', traite_at = NOW(), motif_refus = NULL WHERE id = ?",
      [congeId],
      (err) => {
        if (err) { console.error("valider-conge-moniteur:", err); resolve({ success: false }); }
        else resolve({ success: true });
      }
    );
  });
});

// Admin refuse une demande — args séparés (event, congeId, motif)
ipcMain.handle("refuser-conge-moniteur", async (event, congeId, motif) => {
  return new Promise((resolve) => {
    db.query(
      "UPDATE CongeMoniteur SET statut = 'refusee', traite_at = NOW(), motif_refus = ? WHERE id = ?",
      [motif || null, congeId],
      (err) => {
        if (err) { console.error("refuser-conge-moniteur:", err); resolve({ success: false }); }
        else resolve({ success: true });
      }
    );
  });
});

ipcMain.handle("send-message-admin", async (event, { moniteurId, sujet, message }) => {
  return new Promise((resolve) => {
    db.query(
      `SELECT u.nom, u.prenom, u.mail FROM Utilisateur u WHERE u.id = ?`,
      [moniteurId],
      async (err, rows) => {
        if (err || !rows.length) {
          return resolve({ success: false, message: "Profil moniteur introuvable." });
        }

        const moniteur = rows[0];
        const html = `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
            <div style="background:#2b537e;padding:24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
              <p style="color:#c7d7f0;margin:6px 0 0;font-size:13px;">Message d'un moniteur</p>
            </div>
            <div style="padding:28px;">
              <p style="color:#475569;font-size:15px;margin-bottom:16px;">
                <strong>${moniteur.prenom} ${moniteur.nom}</strong> (${moniteur.mail}) vous a envoyé un message :
              </p>
              <div style="background:#F8FAFC;border-radius:10px;padding:20px;color:#1e293b;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
              <p style="color:#94A3B8;font-size:12px;margin-top:20px;">
                Vous pouvez répondre directement à ce moniteur à l'adresse ${moniteur.mail}.
              </p>
            </div>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
            to: "tinhinanethequeen@gmail.com",
            replyTo: moniteur.mail,
            subject: sujet || `Message de ${moniteur.prenom} ${moniteur.nom}`,
            html,
          });
          resolve({ success: true });
        } catch (emailErr) {
          console.error("Erreur envoi message admin:", emailErr.message);
          resolve({ success: false, message: "Erreur lors de l'envoi." });
        }
      }
    );
  });
});

// Supprimer un congé (admin)
ipcMain.handle("remove-conge-moniteur", async (event, congeId) => {
  return new Promise((resolve) => {
    db.query("DELETE FROM CongeMoniteur WHERE id = ?", [congeId], (err) => {
      if (err) resolve({ success: false });
      else resolve({ success: true });
    });
  });
});

// Moniteur annule SA propre demande (seulement si encore en_attente)
// args séparés (event, congeId, moniteurId)
ipcMain.handle("annuler-ma-demande-conge", async (event, congeId, moniteurId) => {
  return new Promise((resolve) => {
    db.query(
      "DELETE FROM CongeMoniteur WHERE id = ? AND moniteur_id = ? AND statut = 'en_attente'",
      [congeId, moniteurId],
      (err, result) => {
        if (err) return resolve({ success: false, error: err.message });
        if (result.affectedRows === 0)
          return resolve({ success: false, error: "Impossible d'annuler : demande déjà traitée ou introuvable." });
        resolve({ success: true });
      }
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  CONGÉ ANNUEL AUTO-ÉCOLE
// ══════════════════════════════════════════════════════════════════════════════

ipcMain.handle("get-conge-annuel", async () => {
  return new Promise((resolve) => {
    db.query(
      "SELECT valeurParametre FROM ConfigurationSysteme WHERE cleParametre = 'CONGE_ANNUEL'",
      (err, res) => {
        if (err || !res.length) return resolve(null);
        try { resolve(JSON.parse(res[0].valeurParametre)); }
        catch { resolve(null); }
      }
    );
  });
});

ipcMain.handle("set-conge-annuel", async (event, data) => {
  const val = JSON.stringify(data);
  return new Promise((resolve) => {
    db.query(
      `INSERT INTO ConfigurationSysteme (cleParametre, valeurParametre)
       VALUES ('CONGE_ANNUEL', ?)
       ON DUPLICATE KEY UPDATE valeurParametre = ?`,
      [val, val],
      (err) => {
        if (err) { console.error("set-conge-annuel:", err); resolve({ success: false }); }
        else resolve({ success: true });
      }
    );
  });
});
ipcMain.handle("generate-liste-envoi-pdf", async (event, data) => {
  const html = buildListeEnvoiHTML(data);
  const fileName = `liste_envoi_${(data.dateDepot || "").replace(/\//g, "-")}.pdf`;
  const savedPath = await generatePDFFromHTML(html, fileName);
  return savedPath;
});

ipcMain.handle("generate-liste-candidats-pdf", async (event, data) => {
  // data = { wilaya, centreExamen, dateDepot, dateExamen, nomEcole, candidats }
  const html = buildListeCandidatsHTML(data);
  const fileName = `liste_candidats_${(data.dateExamen || "").replace(/\//g, "-")}.pdf`;
  const savedPath = await generatePDFFromHTML(html, fileName);
  return savedPath; // null si l'utilisateur a annulé, sinon le chemin du fichier
});

function buildRappelEmailHtml({ nomCandidat, montantRestant, montantTotal, telephone, messagePersonnalise }) {
  const message = messagePersonnalise || `Un solde de ${montantRestant} DA reste à régler sur votre dossier de formation.`;
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#f97316;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">🚗 Auto-École</h1>
        <p style="color:#fed7aa;margin:6px 0 0;font-size:13px;">Rappel de paiement</p>
      </div>
      <div style="padding:28px;">
        <p style="color:#475569;white-space:pre-line;margin-bottom:20px;">${message}</p>
        <div style="background:#F1F5F9;border-radius:8px;padding:16px;">
          <p style="margin:4px 0;color:#475569;"><strong>Reste à payer :</strong> ${montantRestant} DA / ${montantTotal} DA</p>
          <p style="margin:4px 0;color:#475569;"><strong>Téléphone :</strong> ${telephone}</p>
        </div>
      </div>
    </div>
  `;
}

ipcMain.handle("send-rappel-paiement", async (event, data) => {
  const { email, nomCandidat, montantRestant, montantTotal, telephone, messagePersonnalise } = data;
  try {
    await transporter.sendMail({
      from: '"Auto-École 🚗" <tinhinanethequeen@gmail.com>',
      to: email,
      subject: "Rappel de paiement – Auto-École",
      html: buildRappelEmailHtml({ nomCandidat, montantRestant, montantTotal, telephone, messagePersonnalise }),
    });
    return { success: true };
  } catch (err) {
    console.error("Erreur envoi rappel paiement:", err.message);
    return { success: false, error: err.message };
  }
});
// ── Revenus mensuels (pour le graphique du dashboard) ──────────────────────
ipcMain.handle("get-revenus-mensuels", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT 
        DATE_FORMAT(dateVersement, '%Y-%m') AS ym,
        DATE_FORMAT(dateVersement, '%b')    AS n,
        SUM(montant) AS v
      FROM Versement
      WHERE dateVersement >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(dateVersement, '%Y-%m'), DATE_FORMAT(dateVersement, '%b')
      ORDER BY ym ASC
    `;
    db.query(sql, (err, res) => {
      if (err) { console.error("get-revenus-mensuels:", err); resolve([]); }
      else resolve(res.map(r => ({ n: r.n, v: Number(r.v) })));
    });
  });
});

// ── Séances par jour, mois en cours (pour le graphique du dashboard) ───────
ipcMain.handle("get-seances-mois", async () => {
  return new Promise((resolve) => {
    const sql = `
      SELECT 
        DAY(date) AS n,
        COUNT(*) AS v
      FROM Seance
      WHERE MONTH(date) = MONTH(CURDATE())
        AND YEAR(date) = YEAR(CURDATE())
      GROUP BY DAY(date)
      ORDER BY DAY(date) ASC
    `;
    db.query(sql, (err, res) => {
      if (err) { console.error("get-seances-mois:", err); resolve([]); }
      else resolve(res.map(r => ({ n: String(r.n), v: Number(r.v) })));
    });
  });
});
// ipcMain.handle("generate-liste-envoi-pdf", async (event, data) => {
//   const html = buildListeEnvoiHTML(data);
//   const fileName = `liste_envoi_${(data.dateDepot || "").replace(/\//g, "-")}.pdf`;
//   const savedPath = await generatePDFFromHTML(html, fileName);
//   return savedPath;
// });

// ── CHARGILY PAY ─────────────────────────────────────────────────────────────
const SERVEUR_URL_CHARGILY = "http://localhost:5000";

// Fonction pour lire la config Chargily depuis la base
function getChargilyKeyFromDB() {
  return new Promise((resolve) => {
    db.query(
      "SELECT cleParametre, valeurParametre FROM ConfigurationSysteme WHERE cleParametre IN ('CHARGILY_KEY', 'CHARGILY_MODE')",
      (err, res) => {
        if (err || !res.length) return resolve({ key: null, mode: "test" });
        const config = {};
        res.forEach(r => { config[r.cleParametre] = r.valeurParametre; });
        resolve({ key: config.CHARGILY_KEY || null, mode: config.CHARGILY_MODE || "test" });
      }
    );
  });
}

ipcMain.handle("payer-chargily", async (event, data) => {
  const { key, mode } = await getChargilyKeyFromDB();
  const res = await fetch(`${SERVEUR_URL_CHARGILY}/chargily/payer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, chargilyKey: key, chargilyMode: mode }),
  });
  return await res.json();
});

ipcMain.handle("statut-chargily", async (event, checkoutId) => {
  const { key, mode } = await getChargilyKeyFromDB();
  const res = await fetch(`${SERVEUR_URL_CHARGILY}/chargily/statut/${checkoutId}`, {
    headers: { "x-chargily-key": key, "x-chargily-mode": mode },
  });
  return await res.json();
});
let paymentWindow = null;

// Ouvrir la fenêtre de paiement SATIM
ipcMain.handle("ouvrir-fenetre-paiement", (event, url) => {
  if (paymentWindow && !paymentWindow.isDestroyed()) {
    paymentWindow.focus();
    return;
  }
  paymentWindow = new BrowserWindow({
    width:  850,
    height: 700,
    title:  "Paiement sécurisé SATIM",
    modal:  false,
    webPreferences: { nodeIntegration: false },
  });
  paymentWindow.loadURL(url);
  paymentWindow.on("closed", () => { paymentWindow = null; });
});

// Fermer la fenêtre de paiement SATIM
ipcMain.handle("fermer-fenetre-paiement", () => {
  if (paymentWindow && !paymentWindow.isDestroyed()) {
    paymentWindow.close();
    paymentWindow = null;
  }
});

// ── CONFIG CHARGILY ──────────────────────────────────────────────────────────
ipcMain.handle("get-chargily-config", async () => {
  return new Promise((resolve) => {
    db.query(
      "SELECT cleParametre, valeurParametre FROM ConfigurationSysteme WHERE cleParametre IN ('CHARGILY_KEY', 'CHARGILY_MODE')",
      (err, res) => {
        if (err || !res.length) return resolve({ key: "", mode: "test" });
        const config = {};
        res.forEach(r => { config[r.cleParametre] = r.valeurParametre; });
        resolve({
          key:  config.CHARGILY_KEY  || "",
          mode: config.CHARGILY_MODE || "test",
        });
      }
    );
  });
});

ipcMain.handle("set-chargily-config", async (event, { key, mode }) => {
  return new Promise((resolve) => {
    const upsert = (cle, val) => new Promise((res) => {
      db.query(
        `INSERT INTO ConfigurationSysteme (cleParametre, valeurParametre)
         VALUES (?, ?) ON DUPLICATE KEY UPDATE valeurParametre = ?`,
        [cle, val, val],
        (err) => res(!err)
      );
    });
    Promise.all([upsert("CHARGILY_KEY", key), upsert("CHARGILY_MODE", mode)])
      .then(() => resolve({ success: true }))
      .catch(() => resolve({ success: false }));
  });
});

ipcMain.handle("test-chargily-config", async (event, { key, mode }) => {
  const baseUrl = mode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";
  try {
    const res = await fetch(`${baseUrl}/balance`, {
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
if (data.wallets || data.entity === "balance") return { success: true };    return { success: false, message: data.message || "Clé invalide" };
  } catch (err) {
    return { success: false, message: err.message };
  }
});