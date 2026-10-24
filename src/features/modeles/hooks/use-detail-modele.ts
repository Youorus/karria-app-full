/**
 * Le détail d'un modèle : le modèle, ses avis, et « Obtenir ce modèle ».
 *
 * ═══ La vue n'est comptée qu'après une seconde ═══
 *
 * Comme la V1 : un aller-retour accidentel ne gonfle pas le compteur de
 * vues que voient les autres.
 *
 * ═══ Affiché tout de suite ═══
 *
 * Venu de la galerie, le modèle est déjà connu (`modeleConnu`) : le détail
 * s'affiche aussitôt — c'est sur son aperçu que la vignette vient se
 * déplier — et se complète quand le serveur répond (pages, avis, « à
 * toi »). `chargement` ne couvre donc que le cas d'un lien profond.
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
  modeleConnu,
  noterVue,
  obtenirModele,
} from "../api/modeles.api";
import type { AvisDuModele, Modele } from "../types/modeles.types";

export type EtatAcquisition = "libre" | "en-cours" | "ajoute" | "possede" | "erreur";

export interface DetailModele {
  modele: Modele | null;
  avis: AvisDuModele | null;
  chargement: boolean;
  complet: boolean;
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
  const id = params.id;
  const router = useRouter();
  const [modele, setModele] = useState<Modele | null>(() => modeleConnu(id));
  const [avis, setAvis] = useState<AvisDuModele | null>(null);
  const [chargement, setChargement] = useState(() => modeleConnu(id) === null);
  /** Vrai quand le serveur a répondu : avant, on ne sait pas si le modèle
   *  est déjà à la personne, et le pied d'action attend. */
  const [complet, setComplet] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [acquisition, setAcquisition] = useState<EtatAcquisition>("libre");
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let vivant = true;
    Promise.all([
      lireModele(id),
      lireMesModeles().catch(() => new Set<string>()),
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
        if (!vivant) return;
        setChargement(false);
        setComplet(true);
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
    complet,
    erreur,
    acquisition,
    obtenir,
    partager,
    retour,
    voirLaGalerie,
    recharger,
  };
}
