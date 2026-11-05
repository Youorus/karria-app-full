/**
 * Choisir un modèle depuis l'atelier — et en acheter un sans quitter le parcours.
 *
 * ═══ Trois groupes ═══
 *
 * Le modèle courant d'abord ; puis ceux que la personne possède ; puis les
 * autres, Premium, au prix du serveur. Un modèle possédé ou gratuit
 * s'applique au toucher : la feuille derrière se redessine — c'est
 * l'aperçu avec ses données, le vrai. Un modèle non possédé passe par
 * Stripe (`features/soutien/api`, le flux du détail d'un modèle) : session
 * du navigateur, puis **relecture du serveur** jusqu'à « livré », puis le
 * modèle s'applique de lui-même. On ne quitte pas l'atelier.
 *
 * ═══ Le modèle choisi de la personne ═══
 *
 * Appliquer un modèle le retient aussi comme modèle par défaut
 * (`PUT /user-templates/me/selected`) : le contrat des dossiers ne permet
 * pas de changer le modèle d'un dossier après sa création, et c'est ce
 * choix que les exports lisent sans `template_id`. Sans attendre, sans
 * bloquer : un refus est journalisé, le modèle reste appliqué localement.
 */

import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { usePorte } from "@/features/auth/hooks/use-porte";
import type { Modele } from "@/features/modeles/types/modeles.types";
import {
  lireCatalogue,
  lireStatut,
  ouvrirAchatModele,
  RETOUR,
} from "@/features/soutien/api/soutien.api";
import { attendreLaLivraison } from "@/features/soutien/services/attente";
import { SIMULATION } from "@/lib/config";
import { ErreurApi } from "@/lib/http";

import { choisirModele as retenirModele } from "../api/documents.api";

export type EtatAchat = "libre" | "paiement" | "en-attente" | "erreur";

export interface ChoixModele {
  actuel: Modele | null;
  miens: Modele[];
  autres: Modele[];
  paiementsActifs: boolean;
  /** Le modèle dont l'achat est en cours, et l'état. */
  achat: { modeleId: string; etat: EtatAchat } | null;
  choisir: (modele: Modele) => void;
}

export function useChoixModele(
  actif: boolean,
  modeles: Modele[],
  possedes: Set<string>,
  modeleId: string | null,
  onApplique: (modeleId: string) => void,
): ChoixModele {
  const { invite } = usePorte();
  const [paiementsActifs, setPaiementsActifs] = useState(false);
  const [achat, setAchat] = useState<ChoixModele["achat"]>(null);
  const enVol = useRef(false);

  useEffect(() => {
    if (!actif || invite) return undefined;
    let vivant = true;
    lireCatalogue(Platform.OS).then(
      (c) => {
        if (vivant) setPaiementsActifs(c.actif);
      },
      (cause: unknown) =>
        console.warn("[karria] catalogue des paiements illisible", cause),
    );
    return () => {
      vivant = false;
    };
  }, [actif, invite]);

  const appliquer = useCallback(
    (id: string) => {
      onApplique(id);
      retenirModele(id).catch((cause: unknown) =>
        console.warn("[karria] modèle par défaut non retenu", cause),
      );
    },
    [onApplique],
  );

  const choisir = useCallback(
    (modele: Modele) => {
      if (!modele.premium || possedes.has(modele.id)) {
        appliquer(modele.id);
        return;
      }
      if (!paiementsActifs || enVol.current) return;
      enVol.current = true;
      setAchat({ modeleId: modele.id, etat: "paiement" });
      void (async () => {
        try {
          const session = await ouvrirAchatModele(modele.id);
          if (!SIMULATION) await WebBrowser.openAuthSessionAsync(session.adresse, RETOUR);
          const issue = await attendreLaLivraison(
            async () => (await lireStatut(session.id)).livre,
          );
          if (issue === "livre") {
            setAchat(null);
            appliquer(modele.id);
            return;
          }
          setAchat({ modeleId: modele.id, etat: "en-attente" });
        } catch (cause) {
          console.warn("[karria] achat du modèle depuis l'atelier", cause);
          if (cause instanceof ErreurApi && cause.raison === "template_already_owned") {
            setAchat(null);
            appliquer(modele.id);
            return;
          }
          setAchat({ modeleId: modele.id, etat: "erreur" });
        } finally {
          enVol.current = false;
        }
      })();
    },
    [possedes, paiementsActifs, appliquer],
  );

  const actuel = useMemo(
    () => modeles.find((m) => m.id === modeleId) ?? null,
    [modeles, modeleId],
  );
  const miens = useMemo(
    () => modeles.filter((m) => m.id !== modeleId && (!m.premium || possedes.has(m.id))),
    [modeles, modeleId, possedes],
  );
  const autres = useMemo(
    () => modeles.filter((m) => m.id !== modeleId && m.premium && !possedes.has(m.id)),
    [modeles, modeleId, possedes],
  );

  return { actuel, miens, autres, paiementsActifs, achat, choisir };
}
