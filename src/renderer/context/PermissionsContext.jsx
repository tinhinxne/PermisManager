import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

// ── VALEURS PAR DÉFAUT (tout à false = moniteur restreint par défaut) ─────────
const PERMS_DEFAUT = {
  CAN_ADD_SESSION:            false,
  CAN_ADD_PAYMENT:            false,
  CAN_TOGGLE_STATUS:          false,
  CAN_REMOVE_CANDIDAT:        false,
  CAN_VIEW_ALL_CANDIDATES:    false,
  CAN_ADD_CANDIDAT:           false,
  CAN_EDIT_CANDIDAT:          false,
  CAN_EXPORT_LISTE_CANDIDATS: false,
  CAN_EXPORT_LISTE_ENVOI:     false,
  CAN_MANAGE_COURS_CODE:      false,
  CAN_MARK_PRESENCE_CODE:     false,
  CAN_VIEW_ALL_COURS_CODE:    false,
  CAN_REQUEST_CONGE:          false,
};

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  // Structure : { "42": { CAN_ADD_SESSION: true, ... }, "17": {...} }
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading]         = useState(true);

  // Hydratation depuis la BDD au démarrage
  useEffect(() => {
    window.electron.getAllPermissions()
      .then(data => setPermissions(data || {}))
      .catch(err => console.error("Erreur chargement permissions:", err))
      .finally(() => setLoading(false));
  }, []);

  // Appelé par l'admin dans Paramètres → écrit en BDD puis met à jour l'état local
  const updatePermissions = async (moniteurId, newPerms) => {
    const merged = { ...PERMS_DEFAUT, ...permissions[moniteurId], ...newPerms };
    const res = await window.electron.updatePermissions(moniteurId, merged);
    if (res?.success) {
      setPermissions(prev => ({ ...prev, [moniteurId]: merged }));
    }
    return res;
  };

  // Retourne les permissions d'un moniteur précis (avec fallback sur les défauts)
  const getPermissions = (moniteurId) =>
    permissions[moniteurId]
      ? { ...PERMS_DEFAUT, ...permissions[moniteurId] }
      : { ...PERMS_DEFAUT };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, updatePermissions, getPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissionsCtx = () => useContext(PermissionsContext);

// ── Hook pour les pages moniteur : lit l'id du connecté automatiquement ───────
export function useMyPermissions() {
  const { currentUser } = useAuth();
  const { getPermissions } = usePermissionsCtx();
  if (!currentUser) return { ...PERMS_DEFAUT };
  return getPermissions(currentUser.id);
}