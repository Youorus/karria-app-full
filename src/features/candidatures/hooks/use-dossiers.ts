/**
 * L'onglet Candidatures : tous les dossiers, deux segments, et le geste
 * de suppression.
 *
 * ═══ Une seule lecture, deux segments ═══
 *
 * `GET /applications` rend tous les dossiers ; « Candidatées » est un
 * filtre **local** sur cette liste. Basculer de segment est instantané et
 * ne refait pas de requête — la liste tient en mémoire, elle est courte.
 * (`lireDossiers(true)` existe pour qui voudrait ne lire que les
 * candidatées.) Le tri est celui de l'espace : par date de génération.
 *
 * ═══ Relu au focus ═══
 *
 * On revient de l'atelier, d'un détail, de la feuille « As-tu
 * candidaté ? » : la liste doit être juste sans geste. Et un dossier dont
 * l'adaptation court finit par passer « prêt » : la relecture au focus le
 * montre.
 *
 * ═══ Supprimer : glisser, puis confirmer ═══
 *
 * Le glissement révèle « Supprimer » ; le toucher demande confirmation
 * (alerte système : c'est une décision, pas une information). La carte
 * disparaît aussitôt confirmée et revient si le serveur refuse.
 *
 * ═══ Le retour discret ═══
 *
 * La feuille « As-tu candidaté ? » laisse une phrase dans
 * `services/retour-discret.ts` ; l'onglet la dit sous l'en-tête quelques
 * secondes, puis l'oublie.
 *
 * ═══ Sans compte ═══
 *
 * Rien n'est lu ; l'écran invite à se connecter par la porte, et la
 * liste se charge dès que la session s'ouvre (le focus suit).
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { usePorte } from "@/features/auth/hooks/use-porte";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnonceEmplacement } from "@/features/publicite/hooks/use-annonce-emplacement";
import { insererApres } from "@/features/publicite/services/regles-publicite";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import { lireDossiers, supprimerDossier } from "../api/candidatures.api";
import {
  parDateDeGeneration,
  sousTitreDesDossiers,
  TEXTES,
} from "../services/presentation";
import { effacerRetourDiscret, useRetourDiscret } from "../services/retour-discret";
import type { CarteDossier } from "../types/candidatures.types";

export type Segment = "toutes" | "candidatees";

export type ElementDeListe =
  | { type: "dossier"; carte: CarteDossier; rang: number }
  | { type: "annonce"; annonce: NativeAd };

/** L'annonce native se glisse après la troisième carte, jamais en tête. */
const RANG_ANNONCE = 3;
/** Le temps que la phrase du retour discret reste lisible. */
const DUREE_NOTE_MS = 3_500;

export interface EcranCandidatures {
  invite: boolean;
  elements: ElementDeListe[];
  sousTitre: string;
  segment: Segment;
  /** Le nombre de dossiers derrière chaque segment, pour le libellé. */
  effectifs: Record<Segment, number>;
  changerDeSegment: (segment: Segment) => void;
  chargement: boolean;
  actualisation: boolean;
  erreur: string | null;
  /** La phrase du retour discret, ou rien. */
  note: string | null;
  maintenant: Date;
  actualiser: () => void;
  ouvrir: (carte: CarteDossier) => void;
  supprimer: (carte: CarteDossier) => void;
  seConnecter: () => void;
}

function messageDe(cause: unknown): string {
  return cause instanceof ErreurApi && cause.estReseau
    ? TEXTES.erreurReseau
    : TEXTES.erreurListe;
}

export function useDossiers(): EcranCandidatures {
  const { exiger, invite } = usePorte();
  const { pousser } = useNavigationUnique();
  const [cartes, setCartes] = useState<CarteDossier[]>([]);
  const [segment, setSegment] = useState<Segment>("toutes");
  const [chargement, setChargement] = useState(!invite);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());
  const retour = useRetourDiscret();

  const charger = useCallback(
    (silencieux: boolean) => {
      if (invite) {
        setCartes([]);
        setChargement(false);
        return () => undefined;
      }
      let vivant = true;
      if (silencieux) setActualisation(true);
      lireDossiers()
        .then((lues) => {
          if (!vivant) return;
          setCartes(parDateDeGeneration(lues));
          setMaintenant(new Date());
          setErreur(null);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] dossiers illisibles", cause);
          if (vivant) setErreur(messageDe(cause));
        })
        .finally(() => {
          if (!vivant) return;
          setChargement(false);
          setActualisation(false);
        });
      return () => {
        vivant = false;
      };
    },
    [invite],
  );

  useFocusEffect(useCallback(() => charger(false), [charger]));

  // La phrase du retour discret s'efface d'elle-même.
  useEffect(() => {
    if (retour === null) return undefined;
    const minuterie = setTimeout(effacerRetourDiscret, DUREE_NOTE_MS);
    return () => clearTimeout(minuterie);
  }, [retour]);

  const visibles = useMemo(
    () =>
      segment === "candidatees" ? cartes.filter((c) => c.statut === "candidate") : cartes,
    [cartes, segment],
  );
  const annonce = useAnnonceEmplacement(
    "candidatures",
    !invite && visibles.length >= RANG_ANNONCE,
  );

  const elements = useMemo<ElementDeListe[]>(
    () =>
      insererApres<ElementDeListe, ElementDeListe>(
        visibles.map((carte, rang) => ({ type: "dossier", carte, rang })),
        annonce === null ? null : { type: "annonce", annonce },
        RANG_ANNONCE,
      ),
    [visibles, annonce],
  );

  const supprimer = useCallback((carte: CarteDossier) => {
    Alert.alert(TEXTES.supprimerTitre, TEXTES.supprimerPhrase, [
      { text: TEXTES.annuler, style: "cancel" },
      {
        text: TEXTES.supprimer,
        style: "destructive",
        onPress: () => {
          setCartes((courantes) => courantes.filter((c) => c.id !== carte.id));
          supprimerDossier(carte.id).catch((cause: unknown) => {
            console.warn("[karria] dossier non supprimé", cause);
            // Le serveur a refusé : la carte revient, à sa place.
            setCartes((courantes) =>
              courantes.some((c) => c.id === carte.id)
                ? courantes
                : parDateDeGeneration([...courantes, carte]),
            );
            Alert.alert(
              "Le dossier n'a pas été supprimé",
              cause instanceof ErreurApi && cause.estReseau
                ? "Vérifie ta connexion, puis réessaie."
                : "Réessaie dans un instant.",
            );
          });
        },
      },
    ]);
  }, []);

  return {
    invite,
    elements,
    sousTitre: sousTitreDesDossiers(cartes),
    segment,
    effectifs: {
      toutes: cartes.length,
      candidatees: cartes.filter((c) => c.statut === "candidate").length,
    },
    changerDeSegment: setSegment,
    chargement,
    actualisation,
    erreur,
    note: retour,
    maintenant,
    actualiser: useCallback(() => void charger(true), [charger]),
    ouvrir: useCallback(
      (carte: CarteDossier) =>
        pousser({ pathname: "/candidatures/[id]", params: { id: carte.id } }),
      [pousser],
    ),
    supprimer,
    seConnecter: useCallback(() => void exiger("dossiers"), [exiger]),
  };
}
