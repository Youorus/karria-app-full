/**
 * Le parcours complet d'une connexion par fournisseur.
 *
 * ═══ Pourquoi un crochet, et pas trois appels dans l'écran ═══
 *
 * La séquence est la même pour Apple et pour Google : obtenir le
 * justificatif, l'échanger contre une session Zoumani, ranger les jetons,
 * naviguer. L'écrire deux fois dans l'écran d'accueil ferait diverger la
 * gestion des annulations — et c'est toujours celle-là qu'on oublie.
 *
 * ═══ Ce qui est délibérément absent ═══
 *
 * Toute vérification de code. Le fournisseur vient d'attester l'identité
 * et l'adresse ; redemander un code serait une étape vide, et les étapes
 * vides sont celles où l'on abandonne.
 *
 * ═══ Les journaux ═══
 *
 * Seul l'échec se consigne (`console.warn`), avec sa cause : celui du
 * fournisseur dans `services/social`, celui de l'échange ici. Les étapes
 * réussies étaient tracées par `console.log` en développement : du bruit,
 * et un `console.log` est interdit dans le dépôt (A24). Et **jamais** de
 * jeton : un `identityToken` dans une trace finit dans un rapport de
 * plantage, puis dans un service tiers.
 *
 * ═══ L'erreur se ferme ═══
 *
 * `effacerErreur` existe pour que le message du fournisseur se referme
 * sans relancer une connexion (A20) : quelqu'un qui décide de passer par
 * l'e-mail n'a pas à garder un reproche sous les yeux.
 *
 * ═══ La disponibilité d'Apple vit ici, pas dans l'écran ═══
 *
 * Apple n'existe que sur iOS, et seulement à partir d'iOS 13. Afficher un
 * bouton qui ne peut pas fonctionner est pire que ne rien afficher : la
 * personne appuie, rien ne se passe, elle en conclut que l'application
 * est cassée. La réponse est asynchrone, donc un effet — et un effet n'a
 * pas sa place dans un écran (§3.1, A09).
 */

import { useCallback, useEffect, useState } from "react";

import { useNavigationUnique } from "@/lib/navigation";

import { connecterAvec } from "../api/auth.api";
import {
  appleDisponible as lireDisponibiliteApple,
  connexionApple,
  connexionGoogle,
} from "../services/social";
import type { FournisseurSocial } from "../services/social.types";
import { useSession } from "./use-session";

export interface ConnexionSociale {
  /** Le fournisseur en cours, pour n'animer que le bon bouton. */
  enCours: FournisseurSocial | null;
  /** Message affichable, ou `null`. Une annulation n'en produit aucun. */
  erreur: string | null;
  connecter: (fournisseur: FournisseurSocial) => Promise<void>;
  /** Vrai quand la plateforme propose « Sign in with Apple ». Faux tant
   *  qu'on ne le sait pas : mieux vaut un bouton qui apparaît qu'un bouton
   *  qui disparaît sous le doigt. */
  appleDisponible: boolean;
  /** Ferme le message d'erreur, sans rien relancer. */
  effacerErreur: () => void;
}

export function useConnexionSociale(): ConnexionSociale {
  const { ouvrir } = useSession();
  const { quitterLeParcours } = useNavigationUnique();
  const [enCours, setEnCours] = useState<FournisseurSocial | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [appleDisponible, setAppleDisponible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void lireDisponibiliteApple().then((disponible) => {
      if (vivant) setAppleDisponible(disponible);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const connecter = useCallback(
    async (fournisseur: FournisseurSocial) => {
      // Un second appui pendant que la feuille s'ouvre ne relance rien.
      if (enCours !== null) return;

      setEnCours(fournisseur);
      setErreur(null);

      try {
        const credential =
          fournisseur === "apple" ? await connexionApple() : await connexionGoogle();

        if (credential.resultat === "annulee") {
          // Fermer la feuille est une réponse, pas une panne : rien à
          // afficher, rien à consigner comme erreur.
          return;
        }
        if (credential.resultat === "echec") {
          setErreur(credential.message);
          return;
        }

        const connexion = await connecterAvec(
          credential.fournisseur,
          credential.jeton,
          credential.nonce,
        );
        await ouvrir(connexion.jetons, { compteCree: connexion.compteCree });
        quitterLeParcours("/");
      } catch (cause) {
        console.warn("[karria] échange de session impossible", cause);
        setErreur("La connexion n'a pas abouti. Réessaie dans un instant.");
      } finally {
        setEnCours(null);
      }
    },
    [enCours, ouvrir, quitterLeParcours],
  );

  const effacerErreur = useCallback(() => setErreur(null), []);

  return { enCours, erreur, connecter, appleDisponible, effacerErreur };
}
