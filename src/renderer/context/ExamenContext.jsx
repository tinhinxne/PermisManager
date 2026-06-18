// src/renderer/context/ExamenContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useExamenRulesCtx } from "./ExamenRulesContext";

const ExamenContext = createContext(null);

export const EXAM_THRESHOLDS = {
  Code:        5,
  Créneau:    10,
  Circulation: 14,
};

const LS_KEY         = "examens_list";
const LS_REPORTS_KEY = "examens_reports";

export function ExamenProvider({ children }) {
  const { examRules } = useExamenRulesCtx();

  const [examensList, setExamensList] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [candidatsReportes, setCandidatsReportes] = useState(() => {
    try { const s = localStorage.getItem(LS_REPORTS_KEY); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });

  const examensListRef       = useRef(examensList);
  const candidatsReportesRef = useRef(candidatsReportes);

  useEffect(() => {
    examensListRef.current = examensList;
    localStorage.setItem(LS_KEY, JSON.stringify(examensList));
  }, [examensList]);

  useEffect(() => {
    candidatsReportesRef.current = candidatsReportes;
    localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(candidatsReportes));
  }, [candidatsReportes]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Trouve le prochain jour autorisé à partir d'une date + délai
  // fromDate    : string ISO "YYYY-MM-DD" — point de départ (dernière séance ou dernier échec)
  // delaiJours  : nombre de jours à attendre avant de chercher un jour autorisé
  // ─────────────────────────────────────────────────────────────────────────────
  const getNextExamDate = (fromDate, joursAutorises, delaiJours = 0) => {
    const DAY_MAP    = { Dim: 0, Lun: 1, Mar: 2, Mer: 3, Jeu: 4, Ven: 5, Sam: 6 };
    const allowedDays = (joursAutorises || ["Lun", "Mer", "Ven"]).map(d => DAY_MAP[d]);

    const base = new Date(fromDate + "T12:00:00");
    // On avance d'au moins le délai configuré (minimum 1 jour pour ne pas rester le même jour)
    base.setDate(base.getDate() + Math.max(delaiJours, 1));

    // Cherche le prochain jour autorisé dans les 30 prochains jours
    for (let i = 0; i < 30; i++) {
      if (allowedDays.includes(base.getDay())) {
        return base.toISOString().split("T")[0];
      }
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString().split("T")[0];
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Retourne la date de la dernière séance d'un type donné pour un candidat
  // seancesCand : liste des séances du candidat
  // type        : "code" | "creneau" | "circulation" (en minuscule comme dans l'agenda)
  // Retourne un string ISO ou null
  // ─────────────────────────────────────────────────────────────────────────────
  const getLastSeanceDate = (seancesCand, type) => {
    const typeNorm = type.toLowerCase().replace("é", "e").replace("è", "e");
    const matching = seancesCand.filter(s => {
      const t = (s.type || "").toLowerCase().replace("é", "e").replace("è", "e");
      return t === typeNorm;
    });
    if (matching.length === 0) return null;
    // Trie par date décroissante et prend la plus récente
    const sorted = [...matching].sort((a, b) => {
      const da = new Date(a.date || a._raw?.date || "1970-01-01");
      const db = new Date(b.date || b._raw?.date || "1970-01-01");
      return db - da;
    });
    const raw = sorted[0].date || sorted[0]._raw?.date;
    if (!raw) return null;
    // Normalise en YYYY-MM-DD
    const d = new Date(raw);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const j = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${j}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Calcule la date d'examen optimale pour un candidat et un type d'examen
  //
  // Logique :
  //   1. Si le candidat a déjà échoué → base = date du dernier échec + delaiApresEchec
  //   2. Sinon → base = date de la dernière séance du type concerné + delaiApresEchec
  //   3. Si aucune séance trouvée → base = aujourd'hui (fallback)
  //   4. On cherche ensuite le prochain jour autorisé après la base
  // ─────────────────────────────────────────────────────────────────────────────
  const computeExamDate = (type, seancesCand, examsCand) => {
    const today = new Date().toISOString().split("T")[0];

    // Dernier échec pour ce type ?
    const lastFailed = examsCand
      .filter(e => e.type === type && e.status === "Failed")
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (lastFailed) {
      // Base = date du dernier échec + délai règles
      return getNextExamDate(lastFailed.date, examRules.joursAutorises, examRules.delaiApresEchec);
    }

    // Pas d'échec → on se base sur la dernière séance du type correspondant
    // Mapping type d'examen → type de séance dans l'agenda
    const seanceTypeMap = {
      "Code":        "code",
      "Créneau":     "creneau",
      "Circulation": "circulation",
    };
    const seanceType    = seanceTypeMap[type] || type.toLowerCase();
    const lastSeanceDate = getLastSeanceDate(seancesCand, seanceType);

    if (lastSeanceDate) {
      // Base = dernière séance + délai configuré dans les paramètres
      return getNextExamDate(lastSeanceDate, examRules.joursAutorises, examRules.delaiApresEchec);
    }

    // Aucune séance trouvée → fallback aujourd'hui
    return getNextExamDate(today, examRules.joursAutorises, 1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Génération principale des examens
  // seances   : toutes les séances (depuis l'agenda)
  // candidats : liste complète des candidats
  // ─────────────────────────────────────────────────────────────────────────────
  const generateExamens = async (seances, candidats) => {
    const today           = new Date().toISOString().split("T")[0];
    const currentExamens  = examensListRef.current;
    const currentReportes = candidatsReportesRef.current;

    // Groupe les séances par candidat (id → liste de séances)
    const seancesParCandidat = {};
    seances.forEach(s => {
      // Selon la structure de ta DB, les candidatsIds peuvent être une string "1,2,3" ou un seul id
      const ids = s.candidatsIds
        ? String(s.candidatsIds).split(",").map(x => x.trim()).filter(Boolean)
        : s.candidatId ? [String(s.candidatId)] : [];

      ids.forEach(cid => {
        if (!seancesParCandidat[cid]) seancesParCandidat[cid] = [];
        seancesParCandidat[cid].push(s);
      });
    });

    const nouveauxExamens = [];

    candidats.forEach(candidat => {
      const cid         = String(candidat.idCandidat);
      const seancesCand = seancesParCandidat[cid] || [];
      const nbSeances   = seancesCand.length;

      // Bloqué si impayé
      if (examRules.blocageImpaye && candidat.montantRestant > 0) return;

      const examsCand = currentExamens.filter(e => String(e.candidatId) === cid);

      // États réussi
      const aReussiCode    = examsCand.some(e => e.type === "Code"        && e.status === "Passed");
      const aReussiCreneau = examsCand.some(e => e.type === "Créneau"     && e.status === "Passed");

      // Nombre d'échecs par type
      const echecsCode        = examsCand.filter(e => e.type === "Code"        && e.status === "Failed").length;
      const echecsCreneau     = examsCand.filter(e => e.type === "Créneau"     && e.status === "Failed").length;
      const echecsCirculation = examsCand.filter(e => e.type === "Circulation" && e.status === "Failed").length;

      // Déjà un examen programmé ?
      const aExamenCode        = examsCand.some(e => e.type === "Code"        && e.status === "Scheduled");
      const aExamenCreneau     = examsCand.some(e => e.type === "Créneau"     && e.status === "Scheduled");
      const aExamenCirculation = examsCand.some(e => e.type === "Circulation" && e.status === "Scheduled");

      const rapportCandidat = currentReportes[cid];

      // ── CODE ────────────────────────────────────────────────────────────────
      if (
        nbSeances >= EXAM_THRESHOLDS.Code &&
        !aReussiCode && !aExamenCode &&
        echecsCode < examRules.tentativesMax &&
        (!rapportCandidat || rapportCandidat.type !== "Code" || rapportCandidat.nextSuggestedDate <= today)
      ) {
        const nextDate = computeExamDate("Code", seancesCand, examsCand);
        nouveauxExamens.push({
          id:           `auto-${cid}-Code-${Date.now()}-${Math.random()}`,
          candidatId:   cid,
          candidat:     `${candidat.prenom} ${candidat.nom}`,
          email:        candidat.email,
          type:         "Code",
          date:         nextDate,
          heure:        "08:00",
          lieu:         "Centre d'examen",
          status:       "Scheduled",
          autoGenerated: true,
          nbSeances,
          suggested:    rapportCandidat?.type === "Code",
          // Informations de traçabilité pour affichage
          dateBaseCalc: getLastSeanceDate(seancesCand, "code") || today,
          calcSource:   echecsCode > 0 ? "après_échec" : "après_dernière_séance",
        });
      }

      // ── CRÉNEAU ─────────────────────────────────────────────────────────────
      if (
        nbSeances >= EXAM_THRESHOLDS.Créneau &&
        aReussiCode && !aReussiCreneau && !aExamenCreneau &&
        echecsCreneau < examRules.tentativesMax &&
        (!rapportCandidat || rapportCandidat.type !== "Créneau" || rapportCandidat.nextSuggestedDate <= today)
      ) {
        const nextDate = computeExamDate("Créneau", seancesCand, examsCand);
        nouveauxExamens.push({
          id:           `auto-${cid}-Créneau-${Date.now()}-${Math.random()}`,
          candidatId:   cid,
          candidat:     `${candidat.prenom} ${candidat.nom}`,
          email:        candidat.email,
          type:         "Créneau",
          date:         nextDate,
          heure:        "09:00",
          lieu:         "Auto-école",
          status:       "Scheduled",
          autoGenerated: true,
          nbSeances,
          suggested:    rapportCandidat?.type === "Créneau",
          dateBaseCalc: getLastSeanceDate(seancesCand, "creneau") || today,
          calcSource:   echecsCreneau > 0 ? "après_échec" : "après_dernière_séance",
        });
      }

      // ── CIRCULATION ─────────────────────────────────────────────────────────
      if (
        nbSeances >= EXAM_THRESHOLDS.Circulation &&
        aReussiCode && aReussiCreneau && !aExamenCirculation &&
        echecsCirculation < examRules.tentativesMax &&
        (!rapportCandidat || rapportCandidat.type !== "Circulation" || rapportCandidat.nextSuggestedDate <= today)
      ) {
        const nextDate = computeExamDate("Circulation", seancesCand, examsCand);
        nouveauxExamens.push({
          id:           `auto-${cid}-Circulation-${Date.now()}-${Math.random()}`,
          candidatId:   cid,
          candidat:     `${candidat.prenom} ${candidat.nom}`,
          email:        candidat.email,
          type:         "Circulation",
          date:         nextDate,
          heure:        "10:00",
          lieu:         "Circuit principal",
          status:       "Scheduled",
          autoGenerated: true,
          nbSeances,
          suggested:    rapportCandidat?.type === "Circulation",
          dateBaseCalc: getLastSeanceDate(seancesCand, "circulation") || today,
          calcSource:   echecsCirculation > 0 ? "après_échec" : "après_dernière_séance",
        });
      }
    });

    // Fusionne sans écraser les Passed/Failed existants
    setExamensList(prev => {
      const existing = prev.filter(e =>
        !nouveauxExamens.some(
          n => n.candidatId === e.candidatId && n.type === e.type && e.status === "Scheduled"
        )
      );
      return [...existing, ...nouveauxExamens];
    });

    // Envoi emails uniquement pour les vrais nouveaux
    const vraiNouveaux = nouveauxExamens.filter(n =>
      !currentExamens.some(e => e.candidatId === n.candidatId && e.type === n.type)
    );

    for (const examen of vraiNouveaux) {
      if (!examen.email) continue;
      try {
        await window.electron.sendExamenNotification({
          email:    examen.email,
          candidat: examen.candidat,
          type:     examen.type,
          date:     examen.date,
          heure:    examen.heure,
          lieu:     examen.lieu,
        });
      } catch (err) {
        console.error("Erreur envoi notif examen:", err);
      }
    }
  };

  const toggleExamenStatus = (id) => {
    setExamensList(prev => prev.map(e => {
      if (e.id !== id) return e;
      const cycle = ["Scheduled", "Passed", "Failed"];
      const next  = cycle[(cycle.indexOf(e.status) + 1) % cycle.length];
      if (next === "Failed") {
        const today    = new Date().toISOString().split("T")[0];
        const nextDate = getNextExamDate(today, examRules.joursAutorises, examRules.delaiApresEchec);
        setCandidatsReportes(prev2 => ({
          ...prev2,
          [e.candidatId]: { type: e.type, nextSuggestedDate: nextDate, reason: "echec" },
        }));
      }
      return { ...e, status: next };
    }));
  };

  const retirerCandidat = (id) => {
    const examen = examensListRef.current.find(e => e.id === id);
    if (!examen) return;
    const today    = new Date().toISOString().split("T")[0];
    const nextDate = getNextExamDate(today, examRules.joursAutorises, examRules.delaiApresEchec);
    setCandidatsReportes(prev => ({
      ...prev,
      [examen.candidatId]: { type: examen.type, nextSuggestedDate: nextDate, reason: "retire" },
    }));
    setExamensList(prev => prev.filter(e => e.id !== id));
  };

  const updateExamen = (id, changes) =>
    setExamensList(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));

  const getCandidatsReportes = () => candidatsReportesRef.current;

  return (
    <ExamenContext.Provider value={{
      examensList, setExamensList,
      generateExamens, toggleExamenStatus,
      retirerCandidat, updateExamen,
      getCandidatsReportes, candidatsReportes,
      EXAM_THRESHOLDS,
    }}>
      {children}
    </ExamenContext.Provider>
  );
}

export const useExamenCtx = () => useContext(ExamenContext);