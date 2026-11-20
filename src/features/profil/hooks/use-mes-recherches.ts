/**
 * « Mes recherches » : les recherches que Karria surveille, leur alerte,
 * et leur suppression (ADR-0041 de l'API).
 *
 * ═══ Relu à chaque retour ═══
 *
 * L'alerte de la recherche en cours se règle aussi ailleurs (le serveur
 * tient `PUT /search/criteria/alerts` et `PUT /search/saved/{id}/alerts`
 * en phase), et Karria enregistre une recherche à chaque demande. La
 * liste se relit donc quand l'écran reprend la main, pas une fois au
 * montage.
 *
 * ═══ La bascule est optimiste ═══
 *
 * L'interrupteur change sous le doigt ; l'appel part ensuite. S'il
 * échoue, l'interrupteur revient et une phrase dit pourquoi, quelques
 * secondes. Un `404` veut dire que la recherche n'existe plus (remplacée
 * au-delà du plafond, supprimée sur un autre appareil) : la ligne part et
 * la liste se relit. Deux bascules rapprochées sur la même ligne : seule
 * la réponse de la dernière compte, sinon l'ancienne réponse remettrait
 * l'interrupteur à l'envers.
 *
 * ═══ Supprimer : glisser, puis confirmer ═══
 *
 * Le geste de l'onglet Candidatures (`use-dossiers.ts`) : le glissement
 * révèle « Supprimer », une alerte système confirme, la ligne disparaît
 * aussitôt et revient à sa place si le serveur refuse. Supprimer la
 * recherche en cours rend le fil à « toutes les offres » : on le dit
 * avant, et on prévient le fil après (`recherche-changee.ts`).
 *
 * ═══ Ce que l'écran ne tient pas ═══
 *
 * Aucune règle : le résumé, l'ordre, le plafond et « en cours » viennent
 * du serveur. L'application ne garde par ailleurs aucun état des alertes
 * de la recherche en cours (le fil n'affiche que son résumé) : une
 * bascule ici n'a donc rien d'autre à invalider.
 *
 * ═══ Sans compte ═══
 *
 * La ligne des paramètres n'existe pas pour un invité ; arrivé ici par un
 * lien, rien n'est lu et l'écran dit l'état vide — « Parler à Karria »
 * passe alors par la porte du fil.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import {
  lireRecherchesEnregistrees,
  RECHERCHE_INTROUVABLE,
  reglerAlertesDeRecherche,
  supprimerRechercheEnregistree,
} from "@/features/assistant/api/recherches-enregistrees.api";
import type { RechercheEnregistree } from "@/features/assistant/types/recherches-enregistrees.types";
import { usePorte } from "@/features/auth/hooks/use-porte";
import { signalerRechercheChangee } from "@/features/offres/services/recherche-changee";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import {
  parDerniereUtilisation,
  phraseDeSuppression,
  TEXTES_MES_RECHERCHES as T,
} from "../services/mes-recherches";

/** Le temps que la phrase d'un échec reste lisible. */
const DUREE_NOTE_MS = 3_500;

export interface EcranMesRecherches {
  /** La plus récemment utilisée d'abord : l'ordre du serveur. */
  recherches: RechercheEnregistree[];
  /** Le plafond dit par le serveur ; `null` tant qu'on ne l'a pas lu. */
  maximum: number | null;
  chargement: boolean;
  actualisation: boolean;
  /** La liste n'a pas pu être lue. */
  erreur: string | null;
  /** Une bascule a échoué : une phrase, quelques secondes. */
  note: string | null;
  maintenant: Date;
  actualiser: () => void;
  basculer: (recherche: RechercheEnregistree, actives: boolean) => void;
  supprimer: (recherche: RechercheEnregistree) => void;
  parlerAKarria: () => void;
  retour: () => void;
}

const estReseau = (cause: unknown) => cause instanceof ErreurApi && cause.estReseau;

/** La recherche n'existe plus côté serveur. */
const estIntrouvable = (cause: unknown) =>
  cause instanceof ErreurApi &&
  (cause.raison === RECHERCHE_INTROUVABLE || cause.statut === 404);

export function useMesRecherches(): EcranMesRecherches {
  const { invite } = usePorte();
  const router = useRouter();
  const { remplacer } = useNavigationUnique();
  const [recherches, setRecherches] = useState<RechercheEnregistree[]>([]);
  const [maximum, setMaximum] = useState<number | null>(null);
  const [chargement, setChargement] = useState(!invite);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());
  // Chaque lecture porte un numéro : une réponse dépassée (écran quitté,
  // relecture lancée entre-temps) n'écrase pas la plus récente.
  const lecture = useRef(0);
  // Le numéro de la dernière bascule de chaque recherche.
  const bascules = useRef(new Map<string, number>());

  const charger = useCallback(
    (silencieux: boolean) => {
      if (invite) {
        setRecherches([]);
        setChargement(false);
        return;
      }
      const numero = ++lecture.current;
      if (silencieux) setActualisation(true);
      lireRecherchesEnregistrees()
        .then((lues) => {
          if (numero !== lecture.current) return;
          setRecherches(lues.recherches);
          setMaximum(lues.maximum);
          setMaintenant(new Date());
          setErreur(null);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] recherches enregistrées illisibles", cause);
          if (numero === lecture.current)
            setErreur(estReseau(cause) ? T.erreurReseau : T.erreurListe);
        })
        .finally(() => {
          if (numero !== lecture.current) return;
          setChargement(false);
          setActualisation(false);
        });
    },
    [invite],
  );

  useFocusEffect(
    useCallback(() => {
      charger(false);
      return () => {
        // L'écran n'a plus la main : la réponse en route ne le concerne plus.
        lecture.current += 1;
        setActualisation(false);
      };
    }, [charger]),
  );

  // La phrase d'un échec s'efface d'elle-même.
  useEffect(() => {
    if (note === null) return undefined;
    const minuterie = setTimeout(() => setNote(null), DUREE_NOTE_MS);
    return () => clearTimeout(minuterie);
  }, [note]);

  const basculer = useCallback(
    (recherche: RechercheEnregistree, actives: boolean) => {
      const { id } = recherche;
      const numero = (bascules.current.get(id) ?? 0) + 1;
      bascules.current.set(id, numero);
      const derniere = () => bascules.current.get(id) === numero;
      const poser = (alertes: boolean) =>
        setRecherches((courantes) =>
          courantes.map((r) => (r.id === id ? { ...r, alertes } : r)),
        );

      poser(actives);
      setNote(null);
      reglerAlertesDeRecherche(id, actives).then(
        (aJour) => {
          if (!derniere()) return;
          setRecherches((courantes) => courantes.map((r) => (r.id === id ? aJour : r)));
        },
        (cause: unknown) => {
          console.warn("[karria] alerte de recherche non modifiée", cause);
          if (!derniere()) return;
          if (estIntrouvable(cause)) {
            setRecherches((courantes) => courantes.filter((r) => r.id !== id));
            setNote(T.rechercheDisparue);
            // Si elle faisait le fil, le fil n'est plus celui qu'on a quitté.
            if (recherche.enCours) signalerRechercheChangee();
            charger(true);
            return;
          }
          poser(recherche.alertes);
          setNote(estReseau(cause) ? T.alerteNonModifieeReseau : T.alerteNonModifiee);
        },
      );
    },
    [charger],
  );

  const supprimer = useCallback(
    (recherche: RechercheEnregistree) => {
      Alert.alert(T.supprimerTitre, phraseDeSuppression(recherche), [
        { text: T.annuler, style: "cancel" },
        {
          text: T.supprimer,
          style: "destructive",
          onPress: () => {
            setRecherches((courantes) => courantes.filter((r) => r.id !== recherche.id));
            supprimerRechercheEnregistree(recherche.id).then(
              () => {
                // Le serveur a rendu le fil à « toutes les offres ».
                if (recherche.enCours) signalerRechercheChangee();
              },
              (cause: unknown) => {
                console.warn("[karria] recherche non supprimée", cause);
                if (estIntrouvable(cause)) {
                  // Déjà partie : la ligne ne revient pas, la liste se relit.
                  if (recherche.enCours) signalerRechercheChangee();
                  charger(true);
                  return;
                }
                // Le serveur a refusé : la ligne revient, à sa place.
                setRecherches((courantes) =>
                  courantes.some((r) => r.id === recherche.id)
                    ? courantes
                    : parDerniereUtilisation([...courantes, recherche]),
                );
                Alert.alert(
                  T.nonSupprimeeTitre,
                  estReseau(cause) ? T.nonSupprimeeReseau : T.nonSupprimee,
                );
              },
            );
          },
        },
      ]);
    },
    [charger],
  );

  // Karria vit dans le rideau du fil : on revient aux onglets, et le
  // paramètre l'ouvre — le chemin d'une notification `assistant`
  // (`routeur-notifications.ts`, `use-centre-notifications.ts`).
  const parlerAKarria = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate({ pathname: "/offres", params: { karria: "1" } });
  }, [router]);

  const retour = useCallback(() => {
    if (router.canGoBack()) router.back();
    else remplacer("/parametres");
  }, [router, remplacer]);

  return {
    recherches,
    maximum,
    chargement,
    actualisation,
    erreur,
    note,
    maintenant,
    actualiser: useCallback(() => charger(true), [charger]),
    basculer,
    supprimer,
    parlerAKarria,
    retour,
  };
}
