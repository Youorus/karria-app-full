/**
 * L'information sur l'IA, **avant tout compte** : ce que la feuille de
 * connexion montre derrière « Karria et l'IA ».
 *
 * ═══ Pourquoi un hook à part de `use-consentement-ia` ═══
 *
 * Celui-là lit `/auth/me/ai-consent`, qui exige une session, et porte les
 * gestes d'accord et de retrait. Ici il n'y a ni session ni geste : on lit
 * la route publique `GET /auth/ai-disclosure`, on montre, et c'est tout.
 * Les textes (`ceQuiPart`, `fournisseursLisibles`) sont les mêmes — une
 * seule voix.
 *
 * ═══ Chargée dès que la feuille de connexion s'ouvre ═══
 *
 * Pas au premier toucher du lien : la version chargée est celle que les
 * requêtes de connexion renvoient (`ai_disclosure_version`), et « en
 * continuant » doit désigner une information **effectivement affichable**.
 * Si le réseau n'a pas répondu avant que la personne continue, la requête
 * part sans version : le serveur ne consigne rien, et la feuille de
 * consentement demandera au premier geste d'IA — le filet.
 *
 * ═══ L'ouverture est un état visuel ═══
 *
 * La feuille d'information est un `Modal` **imbriqué** dans celui de la
 * connexion (voir `feuille-information-ia.tsx`) : ouverte ou fermée, rien
 * de plus — pas le store global `feuilleIa`, qui pilote la feuille montée
 * au-dessus de l'espace connecté.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { lireDisclosureIa } from "../api/consentement-ia.api";
import {
  abonnerConsentementIa,
  ceQuiPart,
  disclosureIa,
  fournisseursLisibles,
  poserDisclosureIa,
} from "../services/consentement-ia";
import { ouvrirDocument } from "../services/documents";

export interface InformationIa {
  ouverte: boolean;
  ouvrir: () => void;
  fermer: () => void;
  /** Ce qui part, tous usages, sans relief. Vide tant que rien n'est chargé. */
  envois: string[];
  /** « Google Gemini », ou « nos fournisseurs d'IA » tant que rien n'est chargé. */
  fournisseurs: string;
  /** Vrai tant que l'information n'a pas pu être lue. */
  indisponible: boolean;
  lirePolitique: () => void;
}

export function useInformationIa(): InformationIa {
  const disclosure = useSyncExternalStore(
    abonnerConsentementIa,
    disclosureIa,
    disclosureIa,
  );
  const [ouverte, setOuverte] = useState(false);
  const [echec, setEchec] = useState(false);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    if (disclosureIa() !== null) return;
    let vivant = true;
    lireDisclosureIa().then(
      (lue) => {
        if (!vivant) return;
        poserDisclosureIa(lue);
        setEchec(false);
      },
      (cause: unknown) => {
        console.warn("[karria] information sur l'IA illisible", cause);
        if (vivant) setEchec(true);
      },
    );
    return () => {
      vivant = false;
    };
  }, [tentative]);

  const ouvrir = useCallback(() => {
    // Un échec de chargement se retente à l'ouverture : la personne demande à lire.
    if (disclosureIa() === null) setTentative((n) => n + 1);
    setOuverte(true);
  }, []);

  return {
    ouverte,
    ouvrir,
    fermer: useCallback(() => setOuverte(false), []),
    envois: disclosure === null ? [] : ceQuiPart(disclosure.usages, null),
    fournisseurs: fournisseursLisibles(disclosure?.fournisseurs ?? []),
    indisponible: disclosure === null && echec,
    lirePolitique: useCallback(() => void ouvrirDocument("confidentialite"), []),
  };
}
