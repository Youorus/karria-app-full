/**
 * Le profil : la personne, son CV, le soutien à l'équipe — et la porte des
 * paramètres.
 *
 * ═══ Ce qui n'est plus ici ═══
 *
 * L'apparence, les notifications, la déconnexion et la suppression du
 * compte vivent dans `use-parametres.ts`, derrière la roue de l'en-tête.
 * Le profil ne parle que de la personne ; les réglages parlent de
 * l'application. Mélanger les deux faisait de l'onglet une liste de
 * boutons où l'on cherchait son nom.
 *
 * ═══ Sans compte ═══
 *
 * Rien n'est lu : le profil montre l'invitation (l'orbe, ce qu'un compte
 * apporte, « Se connecter ») et laisse les paramètres accessibles.
 *
 * ═══ Relu à chaque retour ═══
 *
 * Le CV peut avoir été créé entre deux visites (onglet CV, ou la carte
 * « Mon CV » d'ici). On relit donc au focus, pas une fois au montage —
 * sinon la carte dirait « à créer » devant un CV qui existe. L'identité
 * et le CV partent ensemble ; une panne du CV n'efface pas l'adresse :
 * on montre ce qu'on a.
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { lireMoi } from "@/features/auth/api/auth.api";
import { usePorte } from "@/features/auth/hooks/use-porte";
import { poserConsentementIa } from "@/features/auth/services/consentement-ia";
import { lireBrouillon, lireMonCv } from "@/features/cv/api/cv.api";
import type { Cv } from "@/features/cv/types/cv.types";
import { useSoutien, type Soutien } from "@/features/soutien/hooks/use-soutien";
import { useNavigationUnique } from "@/lib/navigation";

import {
  etatDuCv,
  identite,
  resumeDuCv,
  type EtatDuCv,
  type Identite,
} from "../services/identite";

export interface Profil {
  /** Sans compte : l'invitation remplace les cartes. */
  invite: boolean;
  /** Ouvre la feuille de connexion. */
  seConnecter: () => void;
  /** `null` tant qu'on charge : la carte montre un squelette. */
  identite: Identite | null;
  email: string | null;
  cv: { etat: EtatDuCv; resume: string } | null;
  /** La carte de soutien — sans pub, café (`features/soutien`). */
  soutien: Soutien;
  ouvrirParametres: () => void;
  /** Vers le CV : la création s'il n'y en a pas, l'onglet sinon. */
  ouvrirCv: () => void;
}

export function useProfil(): Profil {
  const { pousser } = useNavigationUnique();
  const { exiger, invite } = usePorte();
  const soutien = useSoutien(!invite);
  const [email, setEmail] = useState<string | null>(null);
  const [cvLu, setCvLu] = useState<{ cv: Cv | null; brouillon: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (invite) return undefined;
      let vivant = true;
      lireMoi().then(
        (moi) => {
          if (!vivant) return;
          setEmail(moi.email);
          // Le profil relit le compte : l'état du consentement à l'IA suit.
          poserConsentementIa(moi.consentementIa);
        },
        (cause: unknown) => console.warn("[karria] profil indisponible", cause),
      );
      Promise.all([lireMonCv(), lireBrouillon()]).then(
        ([cv, brouillon]) => {
          if (vivant) setCvLu({ cv, brouillon: brouillon !== null });
        },
        (cause: unknown) => {
          console.warn("[karria] CV illisible depuis le profil", cause);
          // Sans CV lisible, le profil se dessine quand même : « à créer »
          // vaut mieux qu'un squelette qui ne finit jamais.
          if (vivant) setCvLu({ cv: null, brouillon: false });
        },
      );
      return () => {
        vivant = false;
      };
    }, [invite]),
  );

  const etat = cvLu === null ? null : etatDuCv(cvLu.cv, cvLu.brouillon);

  const ouvrirCv = useCallback(() => {
    pousser(etat === "pret" ? "/cv" : "/cv/creer");
  }, [etat, pousser]);

  return {
    invite,
    seConnecter: useCallback(() => void exiger("profil"), [exiger]),
    identite: email === null && cvLu === null ? null : identite(email, cvLu?.cv ?? null),
    email,
    cv:
      etat === null || cvLu === null ? null : { etat, resume: resumeDuCv(etat, cvLu.cv) },
    soutien,
    ouvrirParametres: useCallback(() => pousser("/parametres"), [pousser]),
    ouvrirCv,
  };
}
