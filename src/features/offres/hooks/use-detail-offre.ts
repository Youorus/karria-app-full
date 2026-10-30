/**
 * Le détail d'une offre : l'offre, son texte, et les actions.
 *
 * ═══ La fiche part de la mémoire du fil, puis se complète ═══
 *
 * Le fil a déjà tout ce qu'il faut pour afficher l'en-tête de l'offre ;
 * seule la description manque (`GET /job-matches/{id}` est la seule
 * route qui la porte). On affiche donc l'offre connue tout de suite et
 * on charge le texte derrière — pas d'écran blanc entre la carte et la
 * fiche. Ouverte par un lien ou une notification, l'offre est inconnue :
 * tout vient du serveur.
 *
 * L'analyse de Karria par offre de la V1 n'existe pas dans la V2
 * (`docs/contrat-api-offres.md`) : il n'y a plus rien à générer ni à
 * sonder.
 *
 * ═══ L'annonce du détail ═══
 *
 * Sous le texte de l'offre, une annonce native **propre au détail**
 * (`use-annonce-detail.ts`) : jamais celle du fil, qui est déjà affichée
 * ailleurs. Aucune quand la personne est sans pub ou qu'aucune ne vient.
 *
 * ═══ Sans compte ═══
 *
 * L'offre se lit, « Voir l'annonce d'origine » s'ouvre — sans rien noter.
 * Garder et écarter passent par la porte : la feuille de connexion monte,
 * et le geste se fait tout seul une fois connecté (`useReprise`).
 *
 * ═══ Le signet attend le serveur ═══
 *
 * La V1 basculait le signet en local et ne l'enregistrait nulle part. Ici,
 * l'état affiché est celui que le serveur confirme.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Share } from "react-native";

import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
import { useAnnonceDetail } from "@/features/publicite/hooks/use-annonce-detail";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { ErreurApi } from "@/lib/http";
import {
  ecarterOffre,
  garderOffre,
  lireOffre,
  noterCandidatureOuverte,
} from "../api/offres.api";
import { messageDePartage } from "../services/presentation";
import type { Offre } from "../types/offres.types";
import { memoriser, offreConnue } from "./memoire-offres";

/** Le texte de l'annonce : en lecture, lu, ou en échec. */
export type EtatDescription = "chargement" | "prete" | "erreur";

export interface DetailOffre {
  offre: Offre | null;
  /** L'annonce native du détail (son propre emplacement), ou rien. */
  annonce: NativeAd | null;
  chargement: boolean;
  erreur: string | null;
  etatDescription: EtatDescription;
  enregistrement: boolean;
  basculerSignet: () => void;
  partager: () => void;
  postuler: () => void;
  ouvrirCarte: () => void;
  /** Écarte l'offre du fil, et revient au fil. */
  ecarter: () => void;
  recharger: () => void;
  /** Revient au fil — ou y mène, si l'offre a été ouverte par un lien. */
  retour: () => void;
}

function messageDErreur(cause: unknown): string {
  if (cause instanceof ErreurApi && cause.statut === 404) {
    return "Cette offre n'est plus disponible : l'entreprise l'a sans doute retirée.";
  }
  return cause instanceof ErreurApi && cause.estReseau
    ? "Pas de connexion. L'offre s'affichera dès que le réseau sera là."
    : "L'offre n'a pas pu être chargée. Réessaie dans un instant.";
}

export function useDetailOffre(): DetailOffre {
  const { id } = useLocalSearchParams<{ id: string }>();
  const connue = offreConnue(id);
  const { exiger, invite } = usePorte();

  const [offre, setOffre] = useState<Offre | null>(connue ?? null);
  const [chargement, setChargement] = useState(connue === undefined);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etatDescription, setEtatDescription] = useState<EtatDescription>(
    connue?.description ? "prete" : "chargement",
  );
  const [tentative, setTentative] = useState(0);
  const [enregistrement, setEnregistrement] = useState(false);
  const annonce = useAnnonceDetail();

  // L'offre complète : toujours lue, sauf si la mémoire a déjà son texte.
  useEffect(() => {
    if (offreConnue(id)?.description && tentative === 0) return;
    let vivant = true;
    lireOffre(id)
      .then(
        (resultat) => {
          if (!vivant) return;
          memoriser([resultat]);
          setOffre(resultat);
          setErreur(null);
          setEtatDescription("prete");
        },
        (cause: unknown) => {
          console.warn("[karria] offre indisponible", cause);
          if (!vivant) return;
          // L'en-tête connu reste ; seul le texte manque.
          if (offreConnue(id) === undefined) setErreur(messageDErreur(cause));
          setEtatDescription("erreur");
        },
      )
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, [id, tentative]);

  const basculerSignet = useCallback(() => {
    if (offre === null || enregistrement) return;
    if (!exiger("garder", { cle: "offre.garder", charge: offre.id })) return;
    setEnregistrement(true);
    garderOffre(offre.id, !offre.enregistree)
      .then((enregistree) => setOffre({ ...offre, enregistree }))
      .catch((cause: unknown) => console.warn("[karria] signet non enregistré", cause))
      .finally(() => setEnregistrement(false));
  }, [offre, enregistrement, exiger]);

  const partager = useCallback(() => {
    if (offre === null) return;
    Share.share({ message: messageDePartage(offre) }).catch((cause: unknown) =>
      console.warn("[karria] partage impossible", cause),
    );
  }, [offre]);

  const postuler = useCallback(() => {
    if (offre?.lienCandidature == null) return;
    if (!invite) noterCandidatureOuverte(offre.id);
    WebBrowser.openBrowserAsync(offre.lienCandidature).catch((cause: unknown) =>
      console.warn("[karria] page de candidature impossible à ouvrir", cause),
    );
  }, [offre, invite]);

  const ouvrirCarte = useCallback(() => {
    if (offre === null) return;
    // Repris de la V1 : Plans sur iOS, l'intention `geo` sur Android. Les
    // coordonnées quand l'API les a, la ville sinon.
    const cible =
      offre.latitude !== null && offre.longitude !== null
        ? `${offre.latitude},${offre.longitude}`
        : encodeURIComponent(`${offre.codePostal ?? ""} ${offre.ville ?? ""}`.trim());
    const url = Platform.OS === "ios" ? `maps:0,0?q=${cible}` : `geo:0,0?q=${cible}`;
    Linking.openURL(url).catch((cause: unknown) =>
      console.warn("[karria] carte impossible à ouvrir", cause),
    );
  }, [offre]);

  const router = useRouter();
  const retour = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/offres");
  }, [router]);

  const ecarter = useCallback(() => {
    if (offre === null) return;
    if (!exiger("ecarter", { cle: "offre.ecarter", charge: offre.id })) return;
    // On repart tout de suite : l'offre quitte le fil côté serveur, et le
    // fil se relit à la prochaine actualisation.
    ecarterOffre(offre.id).catch((cause: unknown) =>
      console.warn("[karria] offre non écartée", cause),
    );
    retour();
  }, [offre, retour, exiger]);

  // Connecté après avoir voulu garder ou écarter cette offre : on le fait.
  useReprise("offre.garder", (charge) => {
    if (charge === id) basculerSignet();
  });
  useReprise("offre.ecarter", (charge) => {
    if (charge === id) ecarter();
  });

  const recharger = useCallback(() => {
    setChargement(offreConnue(id) === undefined);
    setEtatDescription("chargement");
    setTentative((t) => t + 1);
  }, [id]);

  return {
    offre,
    annonce,
    chargement,
    erreur,
    etatDescription,
    enregistrement,
    basculerSignet,
    partager,
    postuler,
    ouvrirCarte,
    ecarter,
    recharger,
    retour,
  };
}
