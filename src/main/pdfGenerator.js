// main/pdfGenerator.js
// À importer dans votre fichier principal Electron (main.js / background.js).
//
// Principe : on charge le HTML du document dans une BrowserWindow invisible,
// on attend qu'elle finisse de charger, puis on appelle webContents.printToPDF()
// qui renvoie un Buffer PDF qu'on écrit sur disque (ou qu'on laisse l'utilisateur
// choisir où enregistrer via une boîte de dialogue "Enregistrer sous").

const { BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

/**
 * Génère un PDF à partir d'une chaîne HTML et l'enregistre sur disque.
 * @param {string} htmlContent - Le HTML complet du document (avec <html>, <head>, <body>)
 * @param {string} suggestedFileName - Nom de fichier proposé, ex: "liste_candidats_2026-03-29.pdf"
 * @returns {Promise<string|null>} Le chemin du fichier enregistré, ou null si annulé
 */
async function generatePDFFromHTML(htmlContent, suggestedFileName = "document.pdf") {
  // Fenêtre invisible dédiée au rendu — jamais montrée à l'utilisateur
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
    },
  });

  try {
    // On charge le HTML directement (data URL) — pas besoin de fichier temporaire
    const encodedHtml = encodeURIComponent(htmlContent);
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodedHtml}`);

    // Génère le PDF. landscape:false + format A4 pour matcher les formulaires admin algériens.
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      landscape: false,
      printBackground: true,
      pageSize: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 }, // gérés en CSS via @page
    });

    // Boîte de dialogue "Enregistrer sous" pour laisser l'utilisateur choisir l'emplacement
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Enregistrer le document",
      defaultPath: suggestedFileName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return null;

    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  } finally {
    pdfWindow.destroy();
  }
}

module.exports = { generatePDFFromHTML };
