/**
 * La porte de mise à jour : au lancement, et au retour au premier plan
 * après six heures, demander au serveur si cette build est encore servie.
 *
 * ═══ Trois réponses, trois gestes ═══
 *
 * - `requise` → la racine remplace la navigation par l'écran bloquant
 *   (`ecran-version-obsolete.tsx`) ; un seul bouton, vers le magasin ;
 * - `disponible` → la bande au lancement, fermable, pas plus d'une fois
 *   par jour (date retenue localement), et le badge sur le profil tant que
 *   la session dure (`etat-version.ts`) ;
 * - `ok`, route injoignable, build illisible → rien. Une panne ne bloque
 *   jamais personne : la cause part dans les journaux.
 *
 * ═══ Pourquoi ce hook vit à la racine ═══
 *
 * La question concerne tout le monde, invité compris, et la réponse doit
 * pouvoir couvrir **toute** la navigation. Monté plus bas, un écran empilé
 * resterait au-dessus de la porte.
 */

import * as Application from "expo-application";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState, Linking, Platform } from "react-native";

import { ecrireLocal, estUnNombre, lireLocal } from "@/lib/magasin-local";

import { lireVersion } from "../api/version.api";
import {
  abonnerVersion,
  lireVersionConnue,
  poserVersionConnue,
} from "../services/etat-version";
import {
  bandeMontrable,
  fautIlReverifier,
  numeroDeBuild,
  type EtatDeVersion,
} from "../services/version";

const CLE_BANDE = "karria.version.bande";

export interface PorteDeVersion {
  etat: EtatDeVersion;
  urlStore: string | null;
  /** La bande « Une nouvelle version est disponible » est à montrer. */
  bande: boolean;
  fermerBande: () => void;
  /** Ouvre la fiche de l'application sur le magasin. */
  ouvrirStore: () => void;
}

const plateforme: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

export function usePorteDeVersion(): PorteDeVersion {
  const version = useSyncExternalStore(abonnerVersion, lireVersionConnue);
  const [bande, setBande] = useState(false);
  const derniereReponse = useRef<number | null>(null);

  useEffect(() => {
    let vivant = true;
    const build = numeroDeBuild(Application.nativeBuildVersion);
    if (build === null) {
      console.warn("[karria] numéro de build illisible, porte de version ignorée");
      return undefined;
    }

    const verifier = async () => {
      try {
        const reponse = await lireVersion(plateforme, build);
        if (!vivant) return;
        derniereReponse.current = Date.now();
        poserVersionConnue(reponse);
        if (reponse.etat !== "disponible") return;
        const derniereBande = await lireLocal<number | null>(
          CLE_BANDE,
          null,
          estUnNombre,
        );
        if (!vivant || !bandeMontrable(derniereBande, Date.now())) return;
        setBande(true);
        await ecrireLocal(CLE_BANDE, Date.now());
      } catch (cause) {
        // Route absente, réseau coupé : on entre comme si de rien n'était.
        console.warn("[karria] version de l'application non vérifiée", cause);
      }
    };

    void verifier();
    const abonnement = AppState.addEventListener("change", (etatApp) => {
      if (etatApp === "active" && fautIlReverifier(derniereReponse.current, Date.now())) {
        void verifier();
      }
    });
    return () => {
      vivant = false;
      abonnement.remove();
    };
  }, []);

  const urlStore = version?.urlStore ?? null;
  const ouvrirStore = useCallback(() => {
    if (urlStore === null) return;
    Linking.openURL(urlStore).catch((cause: unknown) => {
      console.warn("[karria] magasin impossible à ouvrir", cause);
    });
  }, [urlStore]);

  return {
    etat: version?.etat ?? "ok",
    urlStore,
    bande: bande && version?.etat === "disponible",
    fermerBande: useCallback(() => setBande(false), []),
    ouvrirStore,
  };
}
