// src/renderer/context/ExamenContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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

const LS_KEY              = "examens_list";
const LS_REPORTS_KEY      = "examens_reports";
const LS_CANDIDATS        = "examens_candidats_map";
const LS_PROPOSITIONS_KEY = "examens_propositions";
const LS_SESSIONS_KEY     = "examens_sessions";

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

  const [examensList, setExamensList] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [candidatsReportes, setCandidatsReportes] = useState(() => {
    try { const s = localStorage.getItem(LS_REPORTS_KEY); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });

  const [candidatsNomMap, setCandidatsNomMap] = useState(() => {
    try { const s = localStorage.getItem(LS_CANDIDATS); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });

  // ── Propositions en attente de validation/rejet ─────────────────────────
  const [propositions, setPropositions] = useState(() => {
    try { const s = localStorage.getItem(LS_PROPOSITIONS_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  // ── Sessions d'examen (date/heure/lieu/catégorie) créées à l'avance, sans candidat ──
  const [sessionsExamens, setSessionsExamens] = useState(() => {
    try { const s = localStorage.getItem(LS_SESSIONS_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const examensListRef       = useRef(examensList);
  const candidatsReportesRef = useRef(candidatsReportes);
  const candidatsNomMapRef   = useRef(candidatsNomMap);
  const propositionsRef      = useRef(propositions);
  const sessionsExamensRef   = useRef(sessionsExamens);
  // ✅ pour éviter de lancer 2 générations en même temps
  const isGeneratingRef      = useRef(false);

  useEffect(() => {
    examensListRef.current = examensList;
    localStorage.setItem(LS_KEY, JSON.stringify(examensList));
  }, [examensList]);

  useEffect(() => {
    candidatsReportesRef.current = candidatsReportes;
    localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(candidatsReportes));
  }, [candidatsReportes]);

  useEffect(() => {
    candidatsNomMapRef.current = candidatsNomMap;
    localStorage.setItem(LS_CANDIDATS, JSON.stringify(candidatsNomMap));
  }, [candidatsNomMap]);

  useEffect(() => {
    propositionsRef.current = propositions;
    localStorage.setItem(LS_PROPOSITIONS_KEY, JSON.stringify(propositions));
  }, [propositions]);

  useEffect(() => {
    sessionsExamensRef.current = sessionsExamens;
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessionsExamens));
  }, [sessionsExamens]);

  // ── Chargement depuis la DB au montage ──────────────────────────────────
  useEffect(() => {
    async function loadFromDB() {
      try {
        if (!window.electron?.getCandidats || !window.electron?.getExamensCandidat) return;

        const candidats = await window.electron.getCandidats();
        if (!candidats?.length) return;

        const nomMap = {};
        candidats.forEach(c => {
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

        const allExamens = await Promise.all(
          candidats.map(c =>
            window.electron.getExamensCandidat(c.idCandidat).catch(() => [])
          )
        );

        const flat = allExamens.flat();
        if (flat.length === 0) return;

        setExamensList(prev => {
          const dbIds = new Set(flat.map(e => String(e.id)));
          const localOnly = prev.filter(
            e => e.id && String(e.id).startsWith("auto-") && !dbIds.has(String(e.id))
          );
          return [...flat, ...localOnly];
        });

      } catch (e) {
        console.error("ExamenContext loadFromDB:", e);
      }
    }
    loadFromDB();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Recheck automatique des reportés ─────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  const recheckReportes = async () => {
    // Évite les appels simultanés
    if (isGeneratingRef.current) return;

    const today   = new Date().toISOString().split("T")[0];
    const reportes = candidatsReportesRef.current;

    // Y a-t-il au moins un reporté dont la date est arrivée ?
    const aDebloquer = Object.entries(reportes).some(
      ([, info]) => info.nextSuggestedDate <= today
    );

    if (!aDebloquer) return; // rien à faire

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

  // ── Vérification au démarrage + toutes les heures ────────────────────────
  useEffect(() => {
    // Au démarrage (léger délai pour laisser loadFromDB se terminer)
    const timeout = setTimeout(() => {
      recheckReportes();
    }, 3000); // 3 secondes après le montage

    // Toutes les heures
    const interval = setInterval(() => {
      recheckReportes();
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  const getNextExamDate = (fromDate, joursAutorises, delaiJours = 0) => {
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
      .filter(e => e.type === type && e.status === "Failed")
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

  // ── Extrait les ids candidats rattachés à une séance (multi-formats) ─────
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

  // ── Compte le nombre de séances d'un candidat pour un type d'examen donné ─
  const countSeancesPourType = (seances, candidatId, type) => {
    const seanceTypeMap = { "Code": "code", "Créneau": "creneau", "Circulation": "circulation" };
    const typeNorm = normalizeType(seanceTypeMap[type] || type);
    const cid = String(candidatId);
    return (seances || []).filter(s =>
      extractCandidatIds(s).includes(cid) && normalizeType(s.type) === typeNorm
    ).length;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // generateExamens
  // ✅ Ne pousse PLUS directement dans examensList : calcule les candidats
  // éligibles et les place dans `propositions`, en attente de validation par
  // un admin / moniteur autorisé. Retourne la liste calculée pour que l'UI
  // sache si elle doit ouvrir la modal de review.
  // ─────────────────────────────────────────────────────────────────────────
  const generateExamens = async (seances, candidats) => {
    // ✅ Empêche les générations simultanées
    if (isGeneratingRef.current) return [];
    isGeneratingRef.current = true;

    try {
      // ── Auto-fetch si appelée sans arguments ──────────────────────────
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

      const today           = new Date().toISOString().split("T")[0];
      const currentExamens  = examensListRef.current;
      const currentReportes = candidatsReportesRef.current;

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
        const nbSeancesCode        = seancesCand.filter(s => normalizeType(s.type) === "code").length;
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
      // ✅ Toujours libérer le verrou même en cas d'erreur
      isGeneratingRef.current = false;
    }
  };

  // ── setExamenResult, retirerCandidat, updateExamen — inchangés ────────────
  const setExamenResult = (id, newStatus) => {
    setExamensList(prev => prev.map(e => {
      if (e.id !== id) return e;
      if (newStatus === "Failed" || newStatus === "Absent") {
        const baseDate = e.date || new Date().toISOString().split("T")[0];
        const nextDate = getNextExamDate(baseDate, examRules.joursAutorises, examRules.delaiApresEchec);
        setCandidatsReportes(prev2 => ({
          ...prev2,
          [e.candidatId]: {
            type: e.type, nextSuggestedDate: nextDate,
            reason: newStatus === "Absent" ? "absence" : "echec",
            nomCandidat: e.candidat,
          },
        }));
      } else if (newStatus === "Passed") {
        setCandidatsReportes(prev2 => {
          const entry = prev2[e.candidatId];
          if (entry && entry.type === e.type) {
            const { [e.candidatId]: _omit, ...rest } = prev2;
            return rest;
          }
          return prev2;
        });
      }
      return { ...e, status: newStatus };
    }));
  };

  const retirerCandidat = (id, reason = "retire") => {
    const examen = examensListRef.current.find(e => e.id === id);
    if (!examen) return;
    const baseDate = examen.date || new Date().toISOString().split("T")[0];
    const nextDate = getNextExamDate(baseDate, examRules.joursAutorises, examRules.delaiApresEchec);
    setCandidatsReportes(prev => ({
      ...prev,
      [examen.candidatId]: {
        type: examen.type, nextSuggestedDate: nextDate,
        reason, nomCandidat: examen.candidat,
      },
    }));
    setExamensList(prev => prev.filter(e => e.id !== id));
  };

  const updateExamen = (id, changes) =>
    setExamensList(prev => prev.map(e => e.id === id ? { ...e, ...changes } : e));

  // ─────────────────────────────────────────────────────────────────────────
  // ── Validation / Rejet des propositions ──────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  // Valide une proposition : elle quitte `propositions` et rejoint la vraie
  // liste des examens (status "Scheduled"), avec envoi de la notification
  // au candidat, exactement comme le faisait l'ancien generateExamens.
  const validerProposition = async (id) => {
    const prop = propositionsRef.current.find(p => p.id === id);
    if (!prop) return null;

    setPropositions(prev => prev.filter(p => p.id !== id));
    const nouvelExamen = { ...prop, status: "Scheduled" };
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

  // Rejette une proposition : elle quitte `propositions` et est enregistrée
  // dans candidatsReportes → elle sera re-proposée automatiquement après le
  // délai configuré (examRules.delaiApresEchec), comme un échec/absence.
  const rejeterProposition = (id, motif = "") => {
    const prop = propositionsRef.current.find(p => p.id === id);
    if (!prop) return;

    setPropositions(prev => prev.filter(p => p.id !== id));
    const nextDate = getNextExamDate(prop.date, examRules.joursAutorises, examRules.delaiApresEchec);
    setCandidatsReportes(prev => ({
      ...prev,
      [prop.candidatId]: {
        type: prop.type, nextSuggestedDate: nextDate,
        reason: "rejet", nomCandidat: prop.candidat, motif: motif || undefined,
      },
    }));
  };

  const validerToutesPropositions = async () => {
    const all = [...propositionsRef.current];
    for (const p of all) { await validerProposition(p.id); }
  };

  const rejeterToutesPropositions = () => {
    const all = [...propositionsRef.current];
    all.forEach(p => rejeterProposition(p.id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── Sessions d'examen (date/heure/lieu/catégorie, créées avant tout candidat) ──
  // ─────────────────────────────────────────────────────────────────────────

  // Crée une session vide — aucun candidat pour l'instant.
  // Apparaît immédiatement dans la liste des sessions (SessionsExamenList).
  // `categoriePermis` : "Tous" (par défaut) = ouverte à toutes les catégories,
  // sinon une catégorie précise (ex. "B") — utilisée pour filtrer les
  // candidats proposables dans AjouterCandidatsModal.
  const creerSessionExamen = ({ date, heure, lieu, categoriePermis }) => {
    const nouvelleSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date, heure, lieu: (lieu || "").trim(),
      categoriePermis: (categoriePermis || "Tous").trim() || "Tous",
      createdAt: new Date().toISOString(),
    };
    setSessionsExamens(prev => [...prev, nouvelleSession]);
    return nouvelleSession;
  };

  // Supprime une session de la liste (les examens déjà créés dessus restent
  // intacts dans examensList, seule la "vitrine" de la session disparaît).
  const supprimerSessionExamen = (id) => {
    setSessionsExamens(prev => prev.filter(s => s.id !== id));
  };

  const ajouterExamenManuel = async ({
    candidatId, candidat, type, date, heure, lieu,
    email, dateNaissance, categoriePermis, sessionId,
  }) => {
    const cid = String(candidatId);

    // ── Calcule le vrai nombre de séances effectuées par ce candidat pour
    // ce type d'examen, pour affichage cohérent avec les propositions
    // auto-générées (au lieu de laisser nbSeances à null). ──
    let nbSeances = null;
    try {
      const seances = await window.electron.getSeances();
      nbSeances = countSeancesPourType(seances, cid, type);
    } catch (err) {
      console.error("Erreur calcul nbSeances (ajouterExamenManuel):", err);
    }

    const nouvelExamen = {
      id: `manuel-${cid}-${type}-${Date.now()}`,
      candidatId: cid,
      candidat,
      email,
      type,
      date,
      heure,
      lieu,
      status: "Scheduled",
      autoGenerated: false,
      nbSeances,
      dateNaissance: dateNaissance || "",
      categoriePermis: categoriePermis || "",
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
      examensList, setExamensList,
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