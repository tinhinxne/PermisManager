// src/renderer/context/ExamenContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useExamenRulesCtx } from "./ExamenRulesContext";

const ExamenContext = createContext(null);

export const EXAM_THRESHOLDS = {
  Code:        5,
  Créneau:    10,
  Circulation: 14,
};

const SESSIONS_NORMALES_MAX = 20; // valeur de repli si pas encore configurée

const computeThresholds = (base) => ({
  Code:        base,
  Créneau:     Math.ceil(base / 2),
  Circulation: Math.ceil(base / 2),
});

export function ExamenProvider({ children }) {
  const { examRules } = useExamenRulesCtx();

  const [nbSeancesConfig, setNbSeancesConfig] = useState(SESSIONS_NORMALES_MAX);
  const nbSeancesConfigRef = useRef(nbSeancesConfig);
  useEffect(() => { nbSeancesConfigRef.current = nbSeancesConfig; }, [nbSeancesConfig]);

  useEffect(() => {
    (async () => {
      try {
        const nb = await window.electron.getNbSeances();
        setNbSeancesConfig(Number(nb) || SESSIONS_NORMALES_MAX);
      } catch (e) {
        console.error("Erreur chargement nombre de séances (ExamenContext):", e);
      }
    })();
  }, []);

  // ── États — plus AUCUN localStorage, tout vient de la DB ──────────────────
  const [examensList, setExamensList]         = useState([]);
  const [candidatsNomMap, setCandidatsNomMap] = useState({});
  const [propositions, setPropositions]       = useState([]); // calculées, jamais persistées
  const [sessionsExamens, setSessionsExamens] = useState([]);
  const [isLoading, setIsLoading]             = useState(true);

  const examensListRef       = useRef(examensList);
  const candidatsNomMapRef   = useRef(candidatsNomMap);
  const propositionsRef      = useRef(propositions);
  const sessionsExamensRef   = useRef(sessionsExamens);
  const isGeneratingRef      = useRef(false);

  useEffect(() => { examensListRef.current = examensList; }, [examensList]);
  useEffect(() => { candidatsNomMapRef.current = candidatsNomMap; }, [candidatsNomMap]);
  useEffect(() => { propositionsRef.current = propositions; }, [propositions]);
  useEffect(() => { sessionsExamensRef.current = sessionsExamens; }, [sessionsExamens]);

  // ── candidatsReportes : DÉRIVÉ de examensList (statuts Failed/Absent/Rejected),
  // plus aucun stockage séparé → toujours cohérent avec la DB, jamais périmé. ──
  const computeReportesFromExamens = (list, joursAutorises, delaiApresEchec) => {
    const map = {};
    list.forEach(e => {
      if (["Failed", "Absent", "Rejected"].includes(e.status)) {
        const existing = map[e.candidatId];
        if (!existing || new Date(e.date) > new Date(existing._date)) {
          map[e.candidatId] = {
            type: e.type,
            nextSuggestedDate: getNextExamDate(e.date, joursAutorises, delaiApresEchec),
            reason: e.status === "Absent" ? "absence" : e.status === "Rejected" ? "rejet" : "echec",
            nomCandidat: e.candidat,
            _date: e.date,
          };
        }
      }
    });
    // si le candidat a depuis réussi ce même type, on retire le report
    list.forEach(e => {
      if (e.status === "Passed" && map[e.candidatId]?.type === e.type) {
        delete map[e.candidatId];
      }
    });
    return map;
  };

  const candidatsReportes = useMemo(
    () => computeReportesFromExamens(examensList, examRules.joursAutorises, examRules.delaiApresEchec),
    [examensList, examRules.joursAutorises, examRules.delaiApresEchec]
  );
  const candidatsReportesRef = useRef(candidatsReportes);
  useEffect(() => { candidatsReportesRef.current = candidatsReportes; }, [candidatsReportes]);

  // ── Chargement depuis la DB au montage — REMPLACE l'état, ne fusionne jamais ──
  useEffect(() => {
    async function loadFromDB() {
      setIsLoading(true);
      try {
        if (!window.electron?.getCandidats) return;

        const candidats = await window.electron.getCandidats();

        const nomMap = {};
        (candidats || []).forEach(c => {
          const key = String(c.idCandidat ?? c.id ?? c.id_candidat ?? "");
          if (!key) return;
          nomMap[key] = {
            nom:       c.nom       ?? "",
            prenom:    c.prenom    ?? "",
            nom_ar:    c.nom_ar    ?? "",
            prenom_ar: c.prenom_ar ?? "",
          };
        });
        setCandidatsNomMap(nomMap);

        if (!candidats?.length) {
          setExamensList([]); // ✅ vide réellement l'affichage si la DB n'a plus de candidats
        } else {
          const allExamens = await Promise.all(
            candidats.map(c =>
              window.electron.getExamensCandidat(c.idCandidat).catch(() => [])
            )
          );
          setExamensList(allExamens.flat()); // ✅ remplace, ne fusionne jamais avec un ancien état
        }

        if (window.electron?.getSessionsExamens) {
          const sessions = await window.electron.getSessionsExamens();
          setSessionsExamens(sessions || []);
        }
      } catch (e) {
        console.error("ExamenContext loadFromDB:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadFromDB();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Recheck automatique des reportés ─────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  const recheckReportes = async () => {
    if (isGeneratingRef.current) return;

    const today    = new Date().toISOString().split("T")[0];
    const reportes = candidatsReportesRef.current;

    const aDebloquer = Object.entries(reportes).some(
      ([, info]) => info.nextSuggestedDate <= today
    );
    if (!aDebloquer) return;

    console.log("🔄 Recheck reportés — des candidats peuvent revenir en proposition");

    try {
      const [seances, candidats] = await Promise.all([
        window.electron.getSeances(),
        window.electron.getCandidats(),
      ]);
      await generateExamens(seances, candidats);
    } catch (e) {
      console.error("Erreur recheck reportés:", e);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => { recheckReportes(); }, 3000);
    const interval = setInterval(() => { recheckReportes(); }, 60 * 60 * 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
function getNextExamDate(fromDate, joursAutorises, delaiJours = 0) {
    const DAY_MAP     = { Dim: 0, Lun: 1, Mar: 2, Mer: 3, Jeu: 4, Ven: 5, Sam: 6 };
    const allowedDays = (joursAutorises || ["Lun", "Mer", "Ven"]).map(d => DAY_MAP[d]);
    const base = new Date(fromDate + "T12:00:00");
    base.setDate(base.getDate() + Math.max(delaiJours, 1));
    for (let i = 0; i < 30; i++) {
      if (allowedDays.includes(base.getDay())) {
        return base.toISOString().split("T")[0];
      }
      base.setDate(base.getDate() + 1);
    }
    return base.toISOString().split("T")[0];
  };

  const getLastSeanceDate = (seancesCand, type) => {
    const typeNorm = type.toLowerCase().replace(/é/g, "e").replace(/è/g, "e").replace(/ê/g, "e");
    const matching = seancesCand.filter(s => {
      const t = (s.type || "").toLowerCase().replace(/é/g, "e").replace(/è/g, "e").replace(/ê/g, "e");
      return t === typeNorm;
    });
    if (matching.length === 0) return null;
    const sorted = [...matching].sort((a, b) => {
      const da = new Date(a.date || a._raw?.date || "1970-01-01");
      const db = new Date(b.date || b._raw?.date || "1970-01-01");
      return db - da;
    });
    const raw = sorted[0].date || sorted[0]._raw?.date;
    if (!raw) return null;
    const d = new Date(raw);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const computeExamDate = (type, seancesCand, examsCand) => {
    const today = new Date().toISOString().split("T")[0];
    const lastFailed = examsCand
      .filter(e => e.type === type && (e.status === "Failed" || e.status === "Absent" || e.status === "Rejected"))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (lastFailed) {
      return getNextExamDate(lastFailed.date, examRules.joursAutorises, examRules.delaiApresEchec);
    }
    const seanceTypeMap = { "Code": "code", "Créneau": "creneau", "Circulation": "circulation" };
    const seanceType     = seanceTypeMap[type] || type.toLowerCase();
    const lastSeanceDate = getLastSeanceDate(seancesCand, seanceType);
    if (lastSeanceDate) {
      return getNextExamDate(lastSeanceDate, examRules.joursAutorises, examRules.delaiApresEchec);
    }
    return getNextExamDate(today, examRules.joursAutorises, 1);
  };

  const normalizeType = (str) =>
    (str || "").toLowerCase()
      .replace(/é/g, "e").replace(/è/g, "e").replace(/ê/g, "e");

  const extractCandidatIds = (s) => {
    const rawIds = s.candidatsIds ?? s.candidats_ids ?? s.candidat_id ?? null;
    let ids = [];
    if (rawIds !== null && rawIds !== undefined) {
      const str = String(rawIds).trim();
      if (str.startsWith("[")) {
        try { ids = JSON.parse(str).map(x => String(x).trim()).filter(Boolean); }
        catch { ids = str.replace(/[\[\]]/g, "").split(",").map(x => x.trim()).filter(Boolean); }
      } else {
        ids = str.split(",").map(x => x.trim()).filter(Boolean);
      }
    }
    if (ids.length === 0) {
      const single = s.candidatId ?? s.candidat_id;
      if (single != null) ids = [String(single).trim()];
    }
    return ids;
  };

  const countSeancesPourType = (seances, candidatId, type) => {
    const seanceTypeMap = { "Code": "code", "Créneau": "creneau", "Circulation": "circulation" };
    const typeNorm = normalizeType(seanceTypeMap[type] || type);
    const cid = String(candidatId);
    return (seances || []).filter(s =>
      extractCandidatIds(s).includes(cid) && normalizeType(s.type) === typeNorm
    ).length;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // generateExamens — inchangé dans sa logique de calcul, calcule `propositions`
  // (état 100% en mémoire, jamais persisté : recalculé à chaque appel depuis
  // seances + candidats + examensList qui, eux, viennent de la DB).
  // ─────────────────────────────────────────────────────────────────────────
 const generateExamens = async (seances, candidats) => {
    if (isGeneratingRef.current) return [];
    isGeneratingRef.current = true;

    try {
      if (!seances || !candidats) {
        try {
          const [fetchedSeances, fetchedCandidats] = await Promise.all([
            window.electron.getSeances(),
            window.electron.getCandidats(),
          ]);
          seances   = fetchedSeances   || [];
          candidats = fetchedCandidats || [];
        } catch (fetchErr) {
          console.error("generateExamens: erreur auto-fetch seances/candidats:", fetchErr);
          seances   = seances   || [];
          candidats = candidats || [];
        }
      }

      // ← AJOUT : récupération du nombre de présences en cours de code, par candidat
      let nbCodeParCandidat = {};
      try {
        const rows = await window.electron.getNbCodePresentCandidats();
        rows.forEach(r => { nbCodeParCandidat[String(r.idCandidat)] = Number(r.nb) || 0; });
      } catch (e) {
        console.error("Erreur récupération présences code:", e);
      }

      const today           = new Date().toISOString().split("T")[0];
      const currentExamens  = examensListRef.current;
      const currentReportes = computeReportesFromExamens(currentExamens, examRules.joursAutorises, examRules.delaiApresEchec);

      const seancesParCandidat = {};
      seances.forEach(s => {
        const ids = extractCandidatIds(s);
        ids.forEach(cid => {
          if (!seancesParCandidat[cid]) seancesParCandidat[cid] = [];
          seancesParCandidat[cid].push(s);
        });
      });

      const thresholds = computeThresholds(nbSeancesConfigRef.current);
      const nouveauxPropositions = [];
      const nomMapLocal = {};

      candidats.forEach(candidat => {
        const cid = String(candidat.idCandidat ?? candidat.id_candidat ?? candidat.id ?? "");
        if (!cid) return;

        nomMapLocal[cid] = {
          nom: candidat.nom ?? "", prenom: candidat.prenom ?? "",
          nom_ar: candidat.nom_ar ?? "", prenom_ar: candidat.prenom_ar ?? "",
        };

        const seancesCand = seancesParCandidat[cid] || [];
        // ← AJOUT : on remplace le comptage sur "Seance" par le vrai comptage de présences code
        const nbSeancesCode        = nbCodeParCandidat[cid] || 0;
        const nbSeancesCreneau     = seancesCand.filter(s => normalizeType(s.type) === "creneau").length;
        const nbSeancesCirculation = seancesCand.filter(s => normalizeType(s.type) === "circulation").length;

        if (examRules.blocageImpaye && candidat.montantRestant > 0) return;

        const examsCand = currentExamens.filter(e => String(e.candidatId) === cid);

        const aReussiCode    = examsCand.some(e => e.type === "Code"    && e.status === "Passed");
        const aReussiCreneau = examsCand.some(e => e.type === "Créneau" && e.status === "Passed");

        const echecsCode        = examsCand.filter(e => e.type === "Code"        && e.status === "Failed").length;
        const echecsCreneau     = examsCand.filter(e => e.type === "Créneau"     && e.status === "Failed").length;
        const echecsCirculation = examsCand.filter(e => e.type === "Circulation" && e.status === "Failed").length;

        const aExamenCode        = examsCand.some(e => e.type === "Code"        && e.status === "Scheduled");
        const aExamenCreneau     = examsCand.some(e => e.type === "Créneau"     && e.status === "Scheduled");
        const aExamenCirculation = examsCand.some(e => e.type === "Circulation" && e.status === "Scheduled");

        const rapportCandidat = currentReportes[cid];
        const dateNaissance   = candidat.date_naissance  ?? candidat.dateNaissance   ?? "";
        const categoriePermis = candidat.categoriePermis ?? candidat.categorie_permis ?? "";
        const nomComplet      = [candidat.prenom, candidat.nom].filter(Boolean).join(" ") || `Candidat #${cid}`;

        // ── CODE ──
        if (
          nbSeancesCode >= thresholds.Code &&
          !aReussiCode && !aExamenCode &&
          echecsCode < examRules.tentativesMax &&
          (!rapportCandidat || rapportCandidat.type !== "Code" || rapportCandidat.nextSuggestedDate <= today)
        ) {
          const nextDate = computeExamDate("Code", seancesCand, examsCand);
          nouveauxPropositions.push({
            id: `prop-${cid}-Code-${Date.now()}-${Math.random()}`,
            candidatId: cid, candidat: nomComplet, email: candidat.email,
            type: "Code", date: nextDate, heure: "08:00", lieu: "Centre d'examen",
            status: "Proposition", autoGenerated: true, nbSeances: nbSeancesCode,
            suggested: rapportCandidat?.type === "Code",
            dateBaseCalc: getLastSeanceDate(seancesCand, "code") || today,
            calcSource: echecsCode > 0 ? "après_échec" : "après_dernière_séance",
            dateNaissance, categoriePermis,
          });
        }

        // ── CRÉNEAU ──
        if (
          nbSeancesCreneau >= thresholds.Créneau &&
          aReussiCode && !aReussiCreneau && !aExamenCreneau &&
          echecsCreneau < examRules.tentativesMax &&
          (!rapportCandidat || rapportCandidat.type !== "Créneau" || rapportCandidat.nextSuggestedDate <= today)
        ) {
          const nextDate = computeExamDate("Créneau", seancesCand, examsCand);
          nouveauxPropositions.push({
            id: `prop-${cid}-Créneau-${Date.now()}-${Math.random()}`,
            candidatId: cid, candidat: nomComplet, email: candidat.email,
            type: "Créneau", date: nextDate, heure: "09:00", lieu: "Auto-école",
            status: "Proposition", autoGenerated: true, nbSeances: nbSeancesCreneau,
            suggested: rapportCandidat?.type === "Créneau",
            dateBaseCalc: getLastSeanceDate(seancesCand, "creneau") || today,
            calcSource: echecsCreneau > 0 ? "après_échec" : "après_dernière_séance",
            dateNaissance, categoriePermis,
          });
        }

        // ── CIRCULATION ──
        if (
          nbSeancesCirculation >= thresholds.Circulation &&
          aReussiCode && aReussiCreneau && !aExamenCirculation &&
          echecsCirculation < examRules.tentativesMax &&
          (!rapportCandidat || rapportCandidat.type !== "Circulation" || rapportCandidat.nextSuggestedDate <= today)
        ) {
          const nextDate = computeExamDate("Circulation", seancesCand, examsCand);
          nouveauxPropositions.push({
            id: `prop-${cid}-Circulation-${Date.now()}-${Math.random()}`,
            candidatId: cid, candidat: nomComplet, email: candidat.email,
            type: "Circulation", date: nextDate, heure: "10:00", lieu: "Circuit principal",
            status: "Proposition", autoGenerated: true, nbSeances: nbSeancesCirculation,
            suggested: rapportCandidat?.type === "Circulation",
            dateBaseCalc: getLastSeanceDate(seancesCand, "circulation") || today,
            calcSource: echecsCirculation > 0 ? "après_échec" : "après_dernière_séance",
            dateNaissance, categoriePermis,
          });
        }
      });

      setPropositions(nouveauxPropositions);
      setCandidatsNomMap(nomMapLocal);

      return nouveauxPropositions;
    } finally {
      isGeneratingRef.current = false;
    }
  };

  // ── setExamenResult, retirerCandidat, updateExamen — persistés en DB ──────

  const setExamenResult = async (id, newStatus) => {
    const result = await window.electron.updateResultatExamen({ idInscription: id, newStatus });
    if (!result?.success) {
      console.error("Erreur update résultat examen:", result?.error);
      return;
    }
    setExamensList(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
  };

  // Retirer un candidat = marquer l'examen "Rejected" en DB (garde l'historique
  // et le délai de re-proposition), plutôt que supprimer la ligne.
  const retirerCandidat = async (id) => {
    const result = await window.electron.updateResultatExamen({ idInscription: id, newStatus: "Rejected" });
    if (!result?.success) {
      console.error("Erreur retrait candidat examen:", result?.error);
      return;
    }
    setExamensList(prev => prev.map(e => e.id === id ? { ...e, status: "Rejected" } : e));
  };

  const updateExamen = async (id, changes) => {
    const examen = examensListRef.current.find(e => e.id === id);
    if (examen?.idExamen && window.electron?.updateDetailsExamen) {
      const result = await window.electron.updateDetailsExamen({
        idExamen: examen.idExamen,
        date: changes.date, heure: changes.heure,
        lieu: changes.lieu, categoriePermis: changes.categoriePermis,
      });
      if (!result?.success) {
        console.error("Erreur update détails examen:", result?.error);
        return;
      }
    }
    setExamensList(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── Validation / Rejet des propositions — écrivent maintenant en DB ──────
  // ─────────────────────────────────────────────────────────────────────────
  const validerProposition = async (id) => {
    const prop = propositionsRef.current.find(p => p.id === id);
    if (!prop) return null;

    setPropositions(prev => prev.filter(p => p.id !== id));

    const result = await window.electron.addExamen({
      candidatId: prop.candidatId, type: prop.type,
      date: prop.date, heure: prop.heure, lieu: prop.lieu,
      categoriePermis: prop.categoriePermis, sessionId: prop.sessionId || null,
    });
    if (!result?.success) {
      console.error("Erreur validation proposition:", result?.error);
      return null;
    }

    const nouvelExamen = {
      id: String(result.idInscription), idExamen: result.idExamen,
      candidatId: prop.candidatId, candidat: prop.candidat, email: prop.email,
      type: prop.type, date: prop.date, heure: prop.heure, lieu: prop.lieu,
      status: "Scheduled", nbSeances: prop.nbSeances,
    };
    setExamensList(prev => [...prev, nouvelExamen]);

    if (prop.email) {
      try {
        await window.electron.sendExamenNotification({
          email: prop.email, candidat: prop.candidat,
          type: prop.type, date: prop.date, heure: prop.heure, lieu: prop.lieu,
        });
      } catch (err) {
        console.error("Erreur envoi notif proposition validée:", err);
      }
    }
    return nouvelExamen;
  };

  // Rejette une proposition : crée directement en DB un examen "Rejected"
  // (elle n'existait pas encore en DB, contrairement à retirerCandidat).
  const rejeterProposition = async (id, motif = "") => {
    const prop = propositionsRef.current.find(p => p.id === id);
    if (!prop) return;

    setPropositions(prev => prev.filter(p => p.id !== id));

    const result = await window.electron.addExamen({
      candidatId: prop.candidatId, type: prop.type,
      date: prop.date, heure: prop.heure, lieu: prop.lieu,
      categoriePermis: prop.categoriePermis, sessionId: null,
    });
    if (!result?.success) {
      console.error("Erreur rejet proposition:", result?.error);
      return;
    }
    await window.electron.updateResultatExamen({ idInscription: result.idInscription, newStatus: "Rejected" });

    setExamensList(prev => [...prev, {
      id: String(result.idInscription), idExamen: result.idExamen,
      candidatId: prop.candidatId, candidat: prop.candidat,
      type: prop.type, date: prop.date, status: "Rejected", motif: motif || undefined,
    }]);
  };

  const validerToutesPropositions = async () => {
    const all = [...propositionsRef.current];
    for (const p of all) { await validerProposition(p.id); }
  };

  const rejeterToutesPropositions = async () => {
    const all = [...propositionsRef.current];
    for (const p of all) { await rejeterProposition(p.id); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── Sessions d'examen — désormais persistées via SessionExamen ───────────
  // ─────────────────────────────────────────────────────────────────────────
  const creerSessionExamen = async ({ date, heure, lieu, categoriePermis }) => {
    const payload = {
      date, heure, lieu: (lieu || "").trim(),
      categoriePermis: (categoriePermis || "Tous").trim() || "Tous",
    };
    const result = await window.electron.createSessionExamen(payload);
    if (!result?.success) {
      console.error("Erreur création session:", result?.error);
      return null;
    }
    const nouvelleSession = { id: String(result.id), ...payload };
    setSessionsExamens(prev => [...prev, nouvelleSession]);
    return nouvelleSession;
  };

  const supprimerSessionExamen = async (id) => {
    const result = await window.electron.deleteSessionExamen(id);
    if (!result?.success) {
      console.error("Erreur suppression session:", result?.error);
      return;
    }
    setSessionsExamens(prev => prev.filter(s => s.id !== id));
  };

  const ajouterExamenManuel = async ({
    candidatId, candidat, type, date, heure, lieu,
    email, dateNaissance, categoriePermis, sessionId,
  }) => {
    const cid = String(candidatId);

    let nbSeances = null;
    try {
      // ← AJOUT : branchement différent selon le type d'examen
      if (type === "Code") {
        const rows = await window.electron.getNbCodePresentCandidats();
        const found = rows.find(r => String(r.idCandidat) === cid);
        nbSeances = found ? Number(found.nb) : 0;
      } else {
        const seances = await window.electron.getSeances();
        nbSeances = countSeancesPourType(seances, cid, type);
      }
    } catch (err) {
      console.error("Erreur calcul nbSeances (ajouterExamenManuel):", err);
    }

    const result = await window.electron.addExamen({
      candidatId: cid, type, date, heure, lieu, categoriePermis, sessionId: sessionId || null,
    });
    if (!result?.success) {
      console.error("Erreur ajout examen manuel:", result?.error);
      return null;
    }

    const nouvelExamen = {
      id: String(result.idInscription), idExamen: result.idExamen,
      candidatId: cid, candidat, email, type, date, heure, lieu,
      status: "Scheduled", nbSeances,
      dateNaissance: dateNaissance || "", categoriePermis: categoriePermis || "",
      sessionId: sessionId || null,
    };

    setExamensList(prev => [...prev, nouvelExamen]);

    if (email) {
      try {
        await window.electron.sendExamenNotification({ email, candidat, type, date, heure, lieu });
      } catch (err) {
        console.error("Erreur envoi notif examen manuel:", err);
      }
    }
    return nouvelExamen;
  };

  const getCandidatsReportes = () => candidatsReportesRef.current;

  const getNomCandidatReporte = (cid, info) => {
    if (info?.nomCandidat) return info.nomCandidat;
    const c = candidatsNomMapRef.current[String(cid)];
    if (c) {
      const full = [c.prenom, c.nom].filter(Boolean).join(" ");
      if (full.trim()) return full;
    }
    return `Candidat #${cid}`;
  };

  return (
    <ExamenContext.Provider value={{
      examensList, setExamensList, isLoading,
      generateExamens, setExamenResult,
      retirerCandidat, updateExamen,
      ajouterExamenManuel,
      getCandidatsReportes, candidatsReportes,
      candidatsNomMap, getNomCandidatReporte,
      propositions, validerProposition, rejeterProposition,
      validerToutesPropositions, rejeterToutesPropositions,
      sessionsExamens, creerSessionExamen, supprimerSessionExamen,
      EXAM_THRESHOLDS: computeThresholds(nbSeancesConfigRef.current),
    }}>
      {children}
    </ExamenContext.Provider>
  );
}

export const useExamenCtx = () => useContext(ExamenContext);