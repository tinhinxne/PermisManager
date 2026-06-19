// src/main/moniteurHandlers.js
const { ipcMain } = require('electron');

function registerMoniteurHandlers(db) {

  // ── Stats dashboard moniteur ─────────────────────────────────────────────
  ipcMain.handle("get-moniteur-stats", async (event, moniteurId) => {
    return new Promise((resolve) => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = monday.toISOString().split("T")[0];
      const sundayStr = sunday.toISOString().split("T")[0];

      db.query(
        `SELECT COUNT(DISTINCT cs.idCandidat) AS total
         FROM Seance s
         JOIN CandidatSeance cs ON s.idSeance = cs.idSeance
         WHERE s.moniteur_id = ?`,
        [moniteurId],
        (err1, res1) => {
          if (err1) return resolve({ success: false, error: err1.message });

          db.query(
            `SELECT COUNT(*) AS total FROM Seance WHERE moniteur_id = ? AND DATE(date) = ?`,
            [moniteurId, todayStr],
            (err2, res2) => {
              if (err2) return resolve({ success: false, error: err2.message });

              db.query(
                `SELECT COUNT(*) AS total FROM Seance WHERE moniteur_id = ? AND DATE(date) BETWEEN ? AND ?`,
                [moniteurId, mondayStr, sundayStr],
                (err3, res3) => {
                  if (err3) return resolve({ success: false, error: err3.message });

                  db.query(
                    `SELECT COUNT(*) AS total FROM Seance WHERE moniteur_id = ? AND statut = 'terminée'`,
                    [moniteurId],
                    (err4, res4) => {
                      if (err4) return resolve({ success: false, error: err4.message });

                      db.query(
                        `SELECT 
                           s.idSeance, s.date, s.heure, s.type, s.statut,
                           GROUP_CONCAT(CONCAT(c.prenom, ' ', c.nom) SEPARATOR ', ') AS candidatsNoms
                         FROM Seance s
                         LEFT JOIN CandidatSeance cs ON s.idSeance = cs.idSeance
                         LEFT JOIN Candidat c ON cs.idCandidat = c.idCandidat
                         WHERE s.moniteur_id = ? AND DATE(s.date) >= ? AND s.statut != 'annulée'
                         GROUP BY s.idSeance
                         ORDER BY s.date ASC, s.heure ASC
                         LIMIT 5`,
                        [moniteurId, todayStr],
                        (err5, res5) => {
                          if (err5) return resolve({ success: false, error: err5.message });
                          resolve({
                            success: true,
                            data: {
                              totalCandidats:    res1[0]?.total ?? 0,
                              seancesAujourdhui: res2[0]?.total ?? 0,
                              seancesSemaine:    res3[0]?.total ?? 0,
                              seancesTerminees:  res4[0]?.total ?? 0,
                              prochainesSeances: res5 ?? [],
                            },
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });

}

module.exports = { registerMoniteurHandlers };