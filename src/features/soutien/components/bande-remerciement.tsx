/**
 * La bande du merci qui arrive plus tard : « Merci pour le café. » —
 * « Ton modèle de CV est à toi. » — « Karria sans pub est actif. »
 *
 * ═══ Quand ═══
 *
 * Seulement quand un achat laissé « en attente » est confirmé par le
 * serveur **hors** de l'écran d'achat (`services/achat-en-attente.ts`) :
 * au retour au premier plan, au lancement suivant. Sur l'écran d'achat
 * lui-même, c'est l'écran qui dit merci (le cœur caramel du café, « Ajouté
 * à ta collection ! ») ; la bande ne double rien.
 *
 * ═══ La forme ═══
 *
 * La même bande que « Une amélioration est prête » (`bande-demarrage.tsx`)
 * : le langage de l'application pour « quelque chose à savoir, pas à
 * subir ». Une phrase, une action (« Voir » le profil, « Ouvrir » le
 * modèle), une croix. Elle se retire d'elle-même après un moment : un
 * merci n'est pas une injonction.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";

import { BandeDemarrage } from "@/features/demarrage/components/bande-demarrage";

import { effacerRemerciement, useRemerciement } from "../services/achat-en-attente";
import { TEXTES } from "../services/presentation";

/** Le temps de lire, puis la bande se retire seule. */
export const DUREE_BANDE_MS = 8_000;

export function BandeRemerciement() {
  const remerciement = useRemerciement();
  const router = useRouter();

  useEffect(() => {
    if (remerciement === null) return undefined;
    const minuterie = setTimeout(effacerRemerciement, DUREE_BANDE_MS);
    return () => clearTimeout(minuterie);
  }, [remerciement]);

  const ouvrir = useCallback(() => {
    if (remerciement === null) return;
    effacerRemerciement();
    if (remerciement.type === "template" && remerciement.modeleId !== null) {
      router.push(`/modele/${remerciement.modeleId}`);
      return;
    }
    router.push("/profil");
  }, [remerciement, router]);

  if (remerciement === null) return null;
  const modele = remerciement.type === "template";
  return (
    <BandeDemarrage
      visible
      phrase={
        remerciement.type === "coffee"
          ? TEXTES.remerciementCafe
          : modele
            ? TEXTES.remerciementModele
            : TEXTES.remerciementSansPub
      }
      libelleAction={modele ? TEXTES.remerciementOuvrir : TEXTES.remerciementVoir}
      onAction={ouvrir}
      onFermer={effacerRemerciement}
    />
  );
}
