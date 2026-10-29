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
 * collection ! » une fois le serveur d'accord — jamais avant.
 *
 * ═══ Un modèle Premium s'achète chez Stripe ═══
 *
 * « Débloquer ce modèle · 4,99 € » ouvre la page de paiement dans le
 * navigateur (`features/soutien/api`), comme le soutien. Au retour, on
 * relit le serveur jusqu'à ce qu'il dise « livré » : le modèle est alors
 * dans « les miens ». Le prix affiché est celui du serveur (`modele.prix`),
 * jamais un montant écrit ici. Si l'interrupteur des paiements est éteint
 * pour cette plateforme, le bouton le dit et ne fait rien.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Share } from "react-native";

import {
  lireCatalogue,
  lireStatut,
  ouvrirAchatModele,
  RETOUR,
} from "@/features/soutien/api/soutien.api";
import { attendreLaLivraison } from "@/features/soutien/services/attente";
import { SIMULATION } from "@/lib/config";
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

export type EtatAcquisition =
  | "libre"
  | "en-cours"
  /** La page Stripe est ouverte, ou l'on attend sa confirmation. */
  | "paiement"
  | "ajoute"
  | "possede"
  | "erreur"
  /** Payé peut-être, pas encore confirmé par le serveur. */
  | "en-attente";

export interface DetailModele {
  modele: Modele | null;
  avis: AvisDuModele | null;
  chargement: boolean;
  complet: boolean;
  erreur: string | null;
  acquisition: EtatAcquisition;
  /** Faux : les paiements sont éteints pour cette plateforme (serveur). */
  paiementsActifs: boolean;
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
  const [paiementsActifs, setPaiementsActifs] = useState(false);
  const [tentative, setTentative] = useState(0);
  const enVol = useRef(false);

  useEffect(() => {
    let vivant = true;
    Promise.all([
      lireModele(id),
      lireMesModeles().catch(() => new Set<string>()),
      lireAvis(id).catch(() => null),
      lireCatalogue(Platform.OS).catch(() => null),
    ])
      .then(
        ([m, miens, a, catalogue]) => {
          if (!vivant) return;
          setModele(m);
          setAvis(a);
          setAcquisition(miens.has(id) ? "possede" : "libre");
          setPaiementsActifs(catalogue?.actif === true);
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
    if (modele === null || acquisition !== "libre" || enVol.current) return;
    if (!modele.premium) {
      setAcquisition("en-cours");
      obtenirModele(modele.id).then(
        () => setAcquisition("ajoute"),
        (cause: unknown) => {
          console.warn("[karria] modèle non obtenu", cause);
          setAcquisition("erreur");
        },
      );
      return;
    }
    if (!paiementsActifs) return;
    enVol.current = true;
    setAcquisition("paiement");
    void (async () => {
      try {
        const session = await ouvrirAchatModele(modele.id);
        // Comme le soutien : une session du navigateur que la page de retour
        // de l'API referme ; en simulation, le faux serveur livre d'emblée.
        if (!SIMULATION) await WebBrowser.openAuthSessionAsync(session.adresse, RETOUR);
        const issue = await attendreLaLivraison(
          async () => (await lireStatut(session.id)).livre,
        );
        if (issue === "livre") {
          setAcquisition("ajoute");
          return;
        }
        setAcquisition("en-attente");
      } catch (cause) {
        console.warn("[karria] achat du modèle non ouvert", cause);
        // Déjà à la personne (acheté ailleurs) : l'état vrai est au serveur.
        if (cause instanceof ErreurApi && cause.raison === "template_already_owned") {
          setAcquisition("possede");
          return;
        }
        setAcquisition("erreur");
      } finally {
        enVol.current = false;
      }
    })();
  }, [modele, acquisition, paiementsActifs]);

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
    paiementsActifs,
    obtenir,
    partager,
    retour,
    voirLaGalerie,
    recharger,
  };
}
