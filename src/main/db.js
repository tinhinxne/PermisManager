const mysql = require("mysql2");

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Fitmanager@2026',
  database: 'auto_ecole_db'
});

db.connect((err) => {
  if (err) {
    console.error("❌ Erreur de connexion à MySQL:", err.message);
  } else {
    console.log("✅ Connecté à la base de données Auto-École !");
  }
});

module.exports = db;   // ← on garde l'export original, main.js ne change pas
