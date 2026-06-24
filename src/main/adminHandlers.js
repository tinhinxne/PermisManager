// src/main/adminHandlers.js
const { ipcMain } = require('electron');

function registerAdminHandlers(db) {

  // ── Revenus par mois (12 derniers mois) ──────────────────────────────────
  ipcMain.handle("get-revenus-mensuels", async () => {
    return new Promise((resolve) => {
      db.query(
        `SELECT 
           DATE_FORMAT(dateVersement, '%b') AS n,
           MONTH(dateVersement)             AS mois,
           YEAR(dateVersement)              AS annee,
           COALESCE(SUM(montant), 0)        AS v
         FROM Versement
         WHERE dateVersement >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY annee, mois, n
         ORDER BY annee ASC, mois ASC`,
        (err, res) => {
          if (err) { console.error(err); return resolve([]); }
          resolve(res);
        }
      );
    });
  });

  // ── Séances par semaine du mois courant ──────────────────────────────────
  ipcMain.handle("get-seances-mois", async () => {
    return new Promise((resolve) => {
      db.query(
        `SELECT 
           CONCAT('S', CEIL(DAY(date) / 7)) AS n,
           COUNT(*)                          AS v
         FROM Seance
         WHERE MONTH(date) = MONTH(CURDATE())
           AND YEAR(date)  = YEAR(CURDATE())
         GROUP BY n
         ORDER BY MIN(date) ASC`,
        (err, res) => {
          if (err) { console.error(err); return resolve([]); }
          resolve(res);
        }
      );
    });
  });

}

module.exports = { registerAdminHandlers };