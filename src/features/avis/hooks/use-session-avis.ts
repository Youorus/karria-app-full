/**
 * Le compteur de sessions de la demande d'avis, monté avec l'espace
 * connecté (`app/(app)/_layout.tsx`).
 *
 * Une session se compte au lancement, puis à chaque retour au premier plan
 * après une vraie pause (`PAUSE_DE_SESSION_MS`) — décider n'est pas son
 * rôle : `services/demande-avis.ts` tient l'état, `regles-avis.ts` juge.
 * Il ne rend rien et ne lève rien.
 */

import { useEffect } from "react";
import { AppState } from "react-native";

import { ouvrirSessionAvis, quitterSessionAvis } from "../services/demande-avis";

export function useSessionAvis(): void {
  useEffect(() => {
    void ouvrirSessionAvis();
    const abonnement = AppState.addEventListener("change", (etat) => {
      if (etat === "active") void ouvrirSessionAvis();
      else if (etat === "background") quitterSessionAvis();
    });
    return () => abonnement.remove();
  }, []);
}
