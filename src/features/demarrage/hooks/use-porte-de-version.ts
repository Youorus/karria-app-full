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
 * ═══ Tant que l'écran bloquant est là, on redemande ═══
 *
 * La règle des six heures vaut pour une app qui fonctionne. Devant l'écran
 * bloquant, elle enfermait : un `LATEST_BUILD` mal réglé côté serveur, corrigé
 * dans la minute, laissait les gens dehors six heures. Désormais, tant que
 * la réponse connue bloque, **chaque** retour au premier plan redemande, et
 * l'écran porte « J'ai mis à jour, vérifier » (`reverifier`). La règle de
 * blocage, elle, ne change pas : seul le serveur ouvre la porte — une
 * vérification qui échoue laisse l'écran en place et le dit.
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
  estBloquante,
  fautIlReverifier,
  numeroDeBuild,
  type EtatDeVersion,
  type Version,
} from "../services/version";

const CLE_BANDE = "karria.version.bande";

/** Où en est « J'ai mis à jour, vérifier ». */
export type VerificationDeVersion =
  /** Rien demandé, ou la porte vient de s'ouvrir. */
  | "repos"
  | "en-cours"
  /** Le serveur a répondu : cette build est toujours en retard. */
  | "toujours"
  /** Pas de réponse (réseau, serveur) : on ne sait pas. */
  | "echec";

export interface PorteDeVersion {
  etat: EtatDeVersion;
  /** La réponse du serveur telle quelle (numéro de version, builds). */
  version: Version | null;
  /** L'écran de mise à jour obligatoire prend toute la place. */
  bloquante: boolean;
  urlStore: string | null;
  /** La bande « Une nouvelle version est disponible » est à montrer. */
  bande: boolean;
  fermerBande: () => void;
  /** Ouvre la fiche de l'application sur le magasin. */
  ouvrirStore: () => void;
  /** « J'ai mis à jour, vérifier » : redemande au serveur, tout de suite. */
  reverifier: () => void;
  verification: VerificationDeVersion;
}

const plateforme: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";

export function usePorteDeVersion(): PorteDeVersion {
  const version = useSyncExternalStore(abonnerVersion, lireVersionConnue);
  const [bande, setBande] = useState(false);
  const derniereReponse = useRef<number | null>(null);
  const [verification, setVerification] = useState<VerificationDeVersion>("repos");
  const vivant = useRef(true);
  /** La demande en vol : le premier plan et le bouton partagent la même. */
  const enVol = useRef<Promise<Version | null> | null>(null);

  /** Demande au serveur ; rend sa réponse, ou `null` sans réponse. */
  const verifier = useCallback((): Promise<Version | null> => {
    const build = numeroDeBuild(Application.nativeBuildVersion);
    if (build === null) return Promise.resolve(null);
    enVol.current ??= (async () => {
      try {
        const reponse = await lireVersion(plateforme, build);
        if (!vivant.current) return null;
        derniereReponse.current = Date.now();
        poserVersionConnue(reponse);
        if (reponse.etat === "disponible") {
          const derniereBande = await lireLocal<number | null>(
            CLE_BANDE,
            null,
            estUnNombre,
          );
          if (vivant.current && bandeMontrable(derniereBande, Date.now())) {
            setBande(true);
            await ecrireLocal(CLE_BANDE, Date.now());
          }
        }
        return reponse;
      } catch (cause) {
        // Route absente, réseau coupé : on entre comme si de rien n'était.
        console.warn("[karria] version de l'application non vérifiée", cause);
        return null;
      } finally {
        enVol.current = null;
      }
    })();
    return enVol.current;
  }, []);

  useEffect(() => {
    vivant.current = true;
    if (numeroDeBuild(Application.nativeBuildVersion) === null) {
      console.warn("[karria] numéro de build illisible, porte de version ignorée");
      return () => {
        vivant.current = false;
      };
    }

    void verifier();
    const abonnement = AppState.addEventListener("change", (etatApp) => {
      if (etatApp !== "active") return;
      // Écran bloquant affiché : on redemande à chaque retour, sans attendre
      // six heures — la personne revient peut-être du magasin, ou le réglage
      // du serveur vient d'être corrigé.
      if (
        estBloquante(lireVersionConnue()) ||
        fautIlReverifier(derniereReponse.current, Date.now())
      ) {
        void verifier();
      }
    });
    return () => {
      vivant.current = false;
      abonnement.remove();
    };
  }, [verifier]);

  const reverifier = useCallback(() => {
    setVerification("en-cours");
    void verifier().then((reponse) => {
      if (!vivant.current) return;
      setVerification(
        reponse === null ? "echec" : estBloquante(reponse) ? "toujours" : "repos",
      );
    });
  }, [verifier]);

  const urlStore = version?.urlStore ?? null;
  const ouvrirStore = useCallback(() => {
    // Sans fiche connue : l'application du magasin, sur la recherche « Karria ».
    const cible =
      urlStore ??
      (Platform.OS === "ios"
        ? "itms-apps://apps.apple.com/fr/search?term=karria"
        : "market://search?q=karria");
    Linking.openURL(cible).catch((cause: unknown) => {
      console.warn("[karria] magasin impossible à ouvrir", cause);
    });
  }, [urlStore]);

  return {
    etat: version?.etat ?? "ok",
    version,
    bloquante: estBloquante(version),
    urlStore,
    bande: bande && version?.etat === "disponible",
    fermerBande: useCallback(() => setBande(false), []),
    ouvrirStore,
    reverifier,
    verification,
  };
}
