/**
 * Le parcours de connexion par e-mail : adresse, puis code.
 *
 * ═══ Pourquoi un seul hook pour deux écrans ═══
 *
 * Parce que c'est un seul parcours. L'identifiant obtenu à l'adresse est
 * exigé par l'étape du code ; le découper obligerait à le faire transiter
 * par la navigation, où il finirait dans une URL — donc dans
 * l'historique, donc partageable. Il vit ici, partagé par
 * `parcours-connexion.tsx`.
 *
 * ═══ Le décompte vient du serveur ═══
 *
 * `avantRenvoi` est rendu par l'API à chaque étape. On ne recopie pas le
 * délai : une copie diverge, et le bouton s'annoncerait disponible sur
 * une route qui refuse encore.
 *
 * ═══ Il n'y a plus d'étape après le code ═══
 *
 * Dans la V1, un code juste menait à la création d'un mot de passe puis à
 * quinze écrans de profil. Ici, un code juste ouvre la session — c'est
 * tout. Ce que Karria doit savoir de la personne, elle le lui dira en
 * conversation.
 */

import { useCallback, useEffect, useState } from "react";

import { demanderCode as demander, renvoyerCode, verifierCode } from "../api/auth.api";
import { attenteRestante, lire, type ErreurLisible } from "../services/erreurs-auth";
import { estPlausible, normaliser } from "../services/email";
import type { Parcours } from "../types/auth.types";
import { useSession } from "./use-session";

export interface EtatConnexion {
  parcours: Parcours | null;
  enCours: boolean;
  erreur: ErreurLisible | null;
  avantRenvoi: number;
  demanderCode: (email: string) => Promise<boolean>;
  redemanderCode: () => Promise<void>;
  validerCode: (code: string) => Promise<boolean>;
  effacerErreur: () => void;
  recommencer: () => void;
}

export function useConnexion(): EtatConnexion {
  const { ouvrir } = useSession();
  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<ErreurLisible | null>(null);
  const [avantRenvoi, setAvantRenvoi] = useState(0);

  // Le battement ne tourne que pendant un décompte : un intervalle
  // permanent réveillerait l'écran chaque seconde pour rien.
  const decompteEnCours = avantRenvoi > 0;
  useEffect(() => {
    if (!decompteEnCours) return;
    const battement = setInterval(() => {
      setAvantRenvoi((reste) => Math.max(0, reste - 1));
    }, 1_000);
    return () => clearInterval(battement);
  }, [decompteEnCours]);

  const retenir = useCallback((nouveau: Parcours) => {
    setParcours(nouveau);
    setAvantRenvoi(nouveau.avantRenvoi);
  }, []);

  const demanderCode = useCallback(
    async (saisie: string): Promise<boolean> => {
      const email = normaliser(saisie);
      if (!estPlausible(email)) {
        setErreur({
          message:
            "Cette adresse ne ressemble pas à une adresse e-mail. Vérifie la saisie.",
          champ: "email",
          retentable: false,
          recommencer: false,
        });
        return false;
      }
      setEnCours(true);
      setErreur(null);
      try {
        retenir(await demander(email));
        return true;
      } catch (cause) {
        setErreur(
          lire(cause, "Nous n'avons pas pu envoyer le code. Réessaie dans un instant."),
        );
        return false;
      } finally {
        setEnCours(false);
      }
    },
    [retenir],
  );

  const redemanderCode = useCallback(async () => {
    if (parcours === null) return;
    setEnCours(true);
    setErreur(null);
    try {
      retenir(await renvoyerCode(parcours.id));
    } catch (cause) {
      setErreur(
        lire(cause, "Nous n'avons pas pu renvoyer le code. Réessaie dans un instant."),
      );
      // Le serveur dit combien attendre : on l'affiche plutôt que de
      // laisser le bouton actif sur une route qui refusera.
      const attente = attenteRestante(cause);
      if (attente !== null) setAvantRenvoi(attente);
    } finally {
      setEnCours(false);
    }
  }, [parcours, retenir]);

  const validerCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (parcours === null) return false;
      setEnCours(true);
      setErreur(null);
      try {
        const connexion = await verifierCode(parcours.id, code);
        await ouvrir(connexion.jetons, { compteCree: connexion.compteCree });
        return true;
      } catch (cause) {
        setErreur(
          lire(cause, "Nous n'avons pas pu vérifier ce code. Réessaie dans un instant."),
        );
        return false;
      } finally {
        setEnCours(false);
      }
    },
    [parcours, ouvrir],
  );

  const recommencer = useCallback(() => {
    setParcours(null);
    setErreur(null);
    setAvantRenvoi(0);
  }, []);

  const effacerErreur = useCallback(() => setErreur(null), []);

  return {
    parcours,
    enCours,
    erreur,
    avantRenvoi,
    demanderCode,
    redemanderCode,
    validerCode,
    effacerErreur,
    recommencer,
  };
}
