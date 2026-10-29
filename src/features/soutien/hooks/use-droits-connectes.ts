/**
 * Le garde des droits, monté avec l'espace connecté : dès qu'une session
 * existe, on demande au serveur si la personne est sans pub, et on le répète
 * à chaque retour au premier plan.
 *
 * ═══ Pourquoi ici et non dans le profil ═══
 *
 * La publicité se prépare 2,5 s après l'affichage du fil, bien avant qu'on
 * ouvre le profil. Si le drapeau n'était recopié que par la carte de soutien,
 * un abonné verrait des annonces jusqu'à sa première visite du profil. Le
 * garde naît avec la session (`app/(app)/_layout.tsx`) et meurt avec elle.
 *
 * ═══ Au premier plan ═══
 *
 * L'abonnement change hors de l'app — portail, prélèvement, résiliation. On
 * relit quand l'application revient au premier plan ; un échec de lecture ne
 * change rien : on garde la dernière réponse connue plutôt que de remettre
 * les annonces à quelqu'un qui a payé.
 */

import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { poserSansPub } from "@/lib/sans-pub";

import { lireFacturation } from "../api/soutien.api";

async function relire(): Promise<void> {
  try {
    const facturation = await lireFacturation(Platform.OS);
    poserSansPub(facturation.sansPub.actif);
  } catch (cause) {
    console.warn("[karria] droits illisibles au démarrage", cause);
  }
}

export function useDroitsConnectes(): void {
  useEffect(() => {
    void relire();
    const abonnement = AppState.addEventListener("change", (etat) => {
      if (etat === "active") void relire();
    });
    return () => abonnement.remove();
  }, []);
}
