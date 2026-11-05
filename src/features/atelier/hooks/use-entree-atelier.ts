/**
 * « Adapter mon CV à cette offre » — l'entrée dans l'atelier, depuis une offre.
 *
 * ═══ Ce qui se passe au toucher ═══
 *
 * 1. Sans compte : la porte (`usePorte`, raison « dossiers ») ; le geste
 *    reprend tout seul une fois connecté (`useReprise`).
 * 2. L'accord sur l'IA, si le serveur l'exige (`useActionIa`) : ouvrir un
 *    dossier confie l'offre et le CV à un modèle.
 * 3. `POST /applications` : `201` (dossier neuf, adaptation lancée) ou
 *    `200` (il existait déjà : on le reprend tel quel, rien n'est relancé).
 *    Le modèle passé est le modèle choisi de la personne, s'il y en a un —
 *    le contrat ne permet pas de le changer sur le dossier ensuite.
 * 4. L'atelier s'ouvre sur ce dossier.
 *
 * Sans CV de base (`409 cv_missing`) : une alerte qui mène à l'onglet CV
 * — importer ou créer d'abord. Rien d'autre ne bloque : un refus du
 * serveur se dit, avec sa raison.
 */

import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
import { ouvrirDossier } from "@/features/candidatures/api/candidatures.api";
import { memoriserDossier } from "@/features/candidatures/services/memoire-dossiers";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique, type Chemin } from "@/lib/navigation";

import { lireModeleChoisi } from "../api/documents.api";
import { TEXTES } from "../services/presentation";

export interface EntreeAtelier {
  adapter: () => void;
  /** Le dossier s'ouvre : le bouton attend. */
  ouverture: boolean;
}

export function useEntreeAtelier(offreId: string | null): EntreeAtelier {
  const { exiger } = usePorte();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  const { pousser, remplacer } = useNavigationUnique();
  const [ouverture, setOuverture] = useState(false);
  const enVol = useRef(false);

  const ouvrir = useCallback(
    function ouvrirLeDossier() {
      if (offreId === null || enVol.current) return;
      enVol.current = true;
      setOuverture(true);
      void (async () => {
        try {
          const choisi = await lireModeleChoisi().catch(() => null);
          const dossier = await ouvrirDossier(offreId, choisi?.modeleId ?? null);
          memoriserDossier(dossier);
          pousser(`/atelier/${dossier.id}` as Chemin);
        } catch (cause) {
          if (rejouerSiConsentementRequis(cause, "application", ouvrirLeDossier)) return;
          console.warn("[karria] dossier non ouvert", cause);
          if (cause instanceof ErreurApi && cause.raison === "cv_missing") {
            Alert.alert(TEXTES.sansCv, TEXTES.sansCvPhrase, [
              { text: "Plus tard", style: "cancel" },
              { text: TEXTES.allerAuCv, onPress: () => remplacer("/cv") },
            ]);
            return;
          }
          Alert.alert(
            "Le dossier n'a pas pu s'ouvrir",
            cause instanceof ErreurApi
              ? cause.estReseau
                ? "Vérifie ta connexion, puis réessaie."
                : cause.message
              : "Réessaie dans un instant.",
          );
        } finally {
          enVol.current = false;
          setOuverture(false);
        }
      })();
    },
    [offreId, pousser, remplacer, rejouerSiConsentementRequis],
  );

  const adapter = useCallback(() => {
    if (offreId === null) return;
    if (!exiger("dossiers", { cle: "atelier.adapter", charge: offreId })) return;
    avecConsentement("application", ouvrir);
  }, [offreId, exiger, avecConsentement, ouvrir]);

  useReprise("atelier.adapter", (charge) => {
    if (charge === offreId) adapter();
  });

  return { adapter, ouverture };
}
