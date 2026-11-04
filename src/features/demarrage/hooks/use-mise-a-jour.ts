/**
 * Les mises à jour « toutes seules » — EAS Update, sans rien demander.
 *
 * ═══ Ce qui se passe sans ce hook ═══
 *
 * `app.json` règle `expo-updates` sur `checkAutomatically: ON_LOAD` et
 * `fallbackToCacheTimeout: 0` : à chaque lancement à froid, l'application
 * démarre **tout de suite** avec ce qu'elle a, et le natif va voir en
 * arrière-plan s'il existe une version plus récente du JavaScript pour ce
 * runtime. S'il y en a une, il la télécharge ; elle s'applique au
 * **prochain** lancement. C'est le comportement de WhatsApp ou Instagram :
 * la personne ne voit jamais de « mise à jour en cours ».
 *
 * ═══ Ce que ce hook ajoute ═══
 *
 * 1. Au retour au premier plan après `REVERIFICATION_MS`, une vérification
 *    de plus : une application laissée ouverte des jours entiers ne passe
 *    jamais par un lancement à froid et resterait sinon en arrière.
 * 2. Quand une mise à jour est téléchargée et que l'application **reste
 *    ouverte longtemps** (`DELAI_BANDE_MS`), une bande discrète : « Une
 *    amélioration est prête — Relancer ». Fermable ; on ne la remontre
 *    pas dans la session. Jamais de rechargement forcé : couper quelqu'un
 *    au milieu d'une réponse de Karria est précisément ce qu'on refuse.
 *
 * ═══ En développement ═══
 *
 * `expo-updates` est désactivé (`isEnabled` faux) : le hook ne fait rien.
 * Appeler `checkForUpdateAsync` lèverait une erreur.
 */

import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { fautIlReverifier } from "../services/version";

/** « Longtemps » : au-delà, la personne a sûrement une pause où relancer. */
export const DELAI_BANDE_MS = 20 * 60 * 1000;

export interface MiseAJour {
  /** Une mise à jour est téléchargée et s'appliquera au prochain lancement. */
  prete: boolean;
  /** La bande « Une amélioration est prête » est à montrer. */
  bande: boolean;
  fermerBande: () => void;
  /** Applique la mise à jour maintenant : l'application se relance. */
  relancer: () => void;
}

/** Va voir, et télécharge s'il y a : la version suivante est prête au prochain lancement. */
async function verifierEtTelecharger(): Promise<void> {
  try {
    const verification = await Updates.checkForUpdateAsync();
    if (verification.isAvailable) await Updates.fetchUpdateAsync();
  } catch (cause) {
    // Réseau coupé, serveur EAS indisponible : on réessaiera au prochain
    // passage. Une mise à jour manquée n'est pas une panne.
    console.warn("[karria] mise à jour non vérifiée", cause);
  }
}

export function useMiseAJour(): MiseAJour {
  const { isUpdatePending } = Updates.useUpdates();
  const [bande, setBande] = useState(false);
  const fermee = useRef(false);
  const derniereVerification = useRef<number | null>(null);

  useEffect(() => {
    if (!Updates.isEnabled) return undefined;
    // Le natif vient de vérifier au lancement (`ON_LOAD`) : on compte à
    // partir de maintenant. Posé dans l'effet, pas au rendu — lire
    // l'horloge pendant le rendu rendrait le composant impur.
    derniereVerification.current ??= Date.now();
    const abonnement = AppState.addEventListener("change", (etatApp) => {
      if (etatApp !== "active") return;
      if (!fautIlReverifier(derniereVerification.current, Date.now())) return;
      derniereVerification.current = Date.now();
      void verifierEtTelecharger();
    });
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (!isUpdatePending || fermee.current) return undefined;
    const minuterie = setTimeout(() => setBande(true), DELAI_BANDE_MS);
    return () => clearTimeout(minuterie);
  }, [isUpdatePending]);

  const relancer = useCallback(() => {
    Updates.reloadAsync().catch((cause: unknown) => {
      // La mise à jour s'appliquera au prochain lancement de toute façon.
      console.warn("[karria] relance impossible, la mise à jour attendra", cause);
      setBande(false);
    });
  }, []);

  const fermerBande = useCallback(() => {
    fermee.current = true;
    setBande(false);
  }, []);

  return { prete: isUpdatePending, bande, fermerBande, relancer };
}
