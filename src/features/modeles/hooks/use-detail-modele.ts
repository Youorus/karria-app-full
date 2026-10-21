/**
 * Le détail d'un modèle : le modèle, ses avis, et « Obtenir ce modèle ».
 *
 * ═══ La vue n'est comptée qu'après une seconde ═══
 *
 * Comme la V1 : un aller-retour accidentel ne gonfle pas le compteur de
 * vues que voient les autres.
 *
 * ═══ L'acquisition attend le serveur ═══
 *
 * « Obtenir ce modèle » passe par « Ajout en cours… » puis « Ajouté à ta
 * collection ! » une fois le serveur d'accord — jamais avant. Un modèle
 * payant n'est pas vendable ici tant que l'achat intégré (RevenueCat) n'est
 * pas branché : le bouton le dit au lieu de faire semblant.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Share } from "react-native";

import { ErreurApi } from "@/lib/http";
import {
  lireAvis,
  lireMesModeles,
  lireModele,
  noterVue,
  obtenirModele,
} from "../api/modeles.api";
import type { AvisDuModele, Modele } from "../types/modeles.types";

export type EtatAcquisition = "libre" | "en-cours" | "ajoute" | "possede" | "erreur";

export interface DetailModele {
  modele: Modele | null;
  avis: AvisDuModele | null;
  chargement: boolean;
  erreur: string | null;
  acquisition: EtatAcquisition;
  obtenir: () => void;
  partager: () => void;
  retour: () => void;
  voirLaGalerie: () => void;
  recharger: () => void;
}

export function useDetailModele(): DetailModele {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const [modele, setModele] = useState<Modele | null>(null);
  const [avis, setAvis] = useState<AvisDuModele | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [acquisition, setAcquisition] = useState<EtatAcquisition>("libre");
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let vivant = true;
    Promise.all([
      lireModele(id),
      lireMesModeles().catch(() => new Set<number>()),
      lireAvis(id).catch(() => null),
    ])
      .then(
        ([m, miens, a]) => {
          if (!vivant) return;
          setModele(m);
          setAvis(a);
          setAcquisition(miens.has(id) ? "possede" : "libre");
          setErreur(null);
        },
        (cause: unknown) => {
          console.warn("[karria] modèle indisponible", cause);
          if (!vivant) return;
          setErreur(
            cause instanceof ErreurApi && cause.statut === 404
              ? "Ce modèle n'est plus disponible."
              : "Le modèle n'a pas pu être chargé. Réessaie dans un instant.",
          );
        },
      )
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, [id, tentative]);

  // La vue, comptée après une seconde à l'écran.
  useEffect(() => {
    const minuteur = setTimeout(() => noterVue(id), 1_000);
    return () => clearTimeout(minuteur);
  }, [id]);

  const obtenir = useCallback(() => {
    if (modele === null || modele.premium || acquisition !== "libre") return;
    setAcquisition("en-cours");
    obtenirModele(modele.id).then(
      () => setAcquisition("ajoute"),
      (cause: unknown) => {
        console.warn("[karria] modèle non obtenu", cause);
        setAcquisition("erreur");
      },
    );
  }, [modele, acquisition]);

  const partager = useCallback(() => {
    if (modele === null) return;
    Share.share({
      message: `Découvre ce modèle de CV sur Karria : ${modele.libelle}`,
    }).catch((cause: unknown) => console.warn("[karria] partage impossible", cause));
  }, [modele]);

  const retour = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/modeles");
  }, [router]);

  const voirLaGalerie = useCallback(() => router.replace("/modeles"), [router]);

  const recharger = useCallback(() => {
    setChargement(true);
    setTentative((t) => t + 1);
  }, []);

  return {
    modele,
    avis,
    chargement,
    erreur,
    acquisition,
    obtenir,
    partager,
    retour,
    voirLaGalerie,
    recharger,
  };
}
