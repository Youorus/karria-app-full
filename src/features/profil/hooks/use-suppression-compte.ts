/**
 * Supprimer son compte : deux étapes, un appel, et l'au revoir.
 *
 * ═══ Pourquoi deux étapes et pas une alerte ═══
 *
 * Une alerte « Supprimer ? Oui / Non » ne dit ni ce qui disparaît, ni
 * pourquoi la personne part. La première étape demande la raison — c'est
 * ce qui nous permet de nous améliorer — et offre, sur « trop de
 * notifications », une sortie moins radicale. La seconde dit en clair ce
 * qui sera effacé, puis laisse le dernier geste. Ni l'une ni l'autre ne
 * retient : on peut revenir ou annuler à tout moment.
 *
 * ═══ Après le 204 ═══
 *
 * Le serveur a tout effacé et révoqué toutes les sessions. On ne
 * désinscrit rien, on ne révoque rien : `oublierApresSuppression` vide le
 * téléphone et ramène à l'accueil, qui dit au revoir.
 *
 * ═══ Une erreur garde le compte ═══
 *
 * La suppression est transactionnelle côté serveur : si elle échoue, rien
 * n'a bougé. On le dit, on propose de réessayer, et l'on reste sur
 * l'écran — la personne a pris une décision difficile, on ne la renvoie
 * pas au début.
 */

import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Linking } from "react-native";

import { supprimerMonCompte } from "@/features/auth/api/auth.api";
import { useSession } from "@/features/auth/hooks/use-session";
import { lire } from "@/features/auth/services/erreurs-auth";
import type { RaisonDeDepart } from "@/features/auth/types/auth.types";
import { useNavigationUnique } from "@/lib/navigation";

import {
  bornerDetails,
  DETAILS_MAX,
  proposeLesNotifications,
  reactionA,
} from "../services/raisons-depart";

export type Etape = "raison" | "confirmation";

export interface SuppressionCompte {
  etape: Etape;
  raison: RaisonDeDepart | null;
  choisirRaison: (raison: RaisonDeDepart) => void;
  /** Ce que Karria répond à la raison choisie, ou `null`. */
  reaction: string | null;
  /** Vrai quand on propose de régler les notifications plutôt que partir. */
  alternativeNotifications: boolean;
  details: string;
  changerDetails: (texte: string) => void;
  /** Caractères restants dans le mot libre. */
  restant: number;
  continuer: () => void;
  revenir: () => void;
  confirmer: () => Promise<void>;
  enCours: boolean;
  erreur: string | null;
  reglerLesNotifications: () => void;
  /** Quitter l'écran sans rien faire — depuis n'importe quelle étape. */
  annuler: () => void;
}

export function useSuppressionCompte(): SuppressionCompte {
  const { oublierApresSuppression } = useSession();
  const { remplacer } = useNavigationUnique();
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("raison");
  const [raison, setRaison] = useState<RaisonDeDepart | null>(null);
  const [details, setDetails] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const confirmer = useCallback(async () => {
    if (raison === null || enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      await supprimerMonCompte({ raison, details });
      await oublierApresSuppression();
    } catch (cause) {
      console.warn("[karria] suppression du compte impossible", cause);
      const lisible = lire(
        cause,
        "Je n'ai pas pu supprimer ton compte. Rien n'a été effacé — réessaie dans un instant.",
      );
      setErreur(
        lisible.retentable
          ? lisible.message
          : `${lisible.message} Ton compte n'a pas été touché.`,
      );
      setEnCours(false);
    }
  }, [raison, details, enCours, oublierApresSuppression]);

  const annuler = useCallback(() => {
    if (router.canGoBack()) router.back();
    else remplacer("/profil");
  }, [router, remplacer]);

  return {
    etape,
    raison,
    choisirRaison: setRaison,
    reaction: reactionA(raison),
    alternativeNotifications: proposeLesNotifications(raison),
    details,
    changerDetails: useCallback((texte: string) => setDetails(bornerDetails(texte)), []),
    restant: DETAILS_MAX - details.length,
    continuer: useCallback(() => {
      if (raison !== null) setEtape("confirmation");
    }, [raison]),
    revenir: useCallback(() => {
      setErreur(null);
      setEtape("raison");
    }, []),
    confirmer,
    enCours,
    erreur,
    reglerLesNotifications: useCallback(() => {
      void Linking.openSettings().catch((cause: unknown) =>
        console.warn("[karria] réglages inaccessibles", cause),
      );
    }, []),
    annuler,
  };
}
