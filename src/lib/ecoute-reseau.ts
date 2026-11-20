/**
 * L'écoute de l'appareil : a-t-il un réseau ? (`expo-network`)
 *
 * ═══ Ce qu'elle fait ═══
 *
 * Une lecture au démarrage, un abonnement aux changements, et une relecture
 * à chaque retour au premier plan — un changement survenu pendant que
 * l'application dormait n'est pas toujours rejoué. Tout part dans
 * `etat-connexion.ts` ; ce fichier ne décide rien.
 *
 * ═══ Sans le module natif, on s'en passe ═══
 *
 * `expo-network` est un module natif, ajouté le 2026-11-20. Une build
 * antérieure qui recevrait ce code par mise à jour EAS ne l'a pas : un
 * `import` en tête de fichier lèverait au chargement de la racine. Il est
 * donc chargé à la demande (`require`, la forme de `demande-avis.ts`), et
 * son absence est journalisée une fois. L'application garde alors la seule
 * autre source — les échecs du client HTTP : elle sait dire « connexion
 * instable », pas « pas de connexion ».
 */

import { AppState } from "react-native";

import { lireAppareil } from "./connexion";
import { auMomentDeRelireAppareil, noterAppareil } from "./etat-connexion";

/** Deux relectures demandées coup sur coup n'en font qu'une. */
const ECART_RELECTURES_MS = 1_000;

function chargerLeModule(): typeof import("expo-network") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargé à la demande, voir l'en-tête : un `import` lèverait sans le module natif
  return require("expo-network") as typeof import("expo-network");
}

type ModuleReseau = Pick<
  typeof import("expo-network"),
  "addNetworkStateListener" | "getNetworkStateAsync"
>;

/**
 * Démarre l'écoute ; rend de quoi l'arrêter. `charger` ne se passe que dans
 * les tests, pour rejouer une build sans le module natif.
 */
export function surveillerLeReseau(
  charger: () => ModuleReseau = chargerLeModule,
): () => void {
  let reseau: ModuleReseau;
  let abonnement: { remove: () => void };
  try {
    reseau = charger();
    abonnement = reseau.addNetworkStateListener((etat) =>
      noterAppareil(lireAppareil(etat)),
    );
  } catch (cause) {
    console.warn(
      "[karria] état du réseau illisible sur cette build : seuls les échecs des requêtes renseignent la connexion",
      cause,
    );
    return () => undefined;
  }

  let vivant = true;
  let derniereLecture = 0;
  const relire = () => {
    const maintenant = Date.now();
    if (maintenant - derniereLecture < ECART_RELECTURES_MS) return;
    derniereLecture = maintenant;
    reseau.getNetworkStateAsync().then(
      (etat) => {
        if (vivant) noterAppareil(lireAppareil(etat));
      },
      (cause: unknown) => console.warn("[karria] état du réseau non relu", cause),
    );
  };

  relire();
  auMomentDeRelireAppareil(relire);
  const premierPlan = AppState.addEventListener("change", (etat) => {
    if (etat === "active") relire();
  });

  return () => {
    vivant = false;
    auMomentDeRelireAppareil(null);
    premierPlan.remove();
    abonnement.remove();
  };
}
