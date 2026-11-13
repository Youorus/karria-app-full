/**
 * « Mes CV » : les CV mis en page sans dossier, et ce qu'on en fait.
 *
 * ═══ Relu au focus ═══
 *
 * On revient de l'atelier libre avec un export de plus, d'une suppression,
 * d'un envoi : la liste doit être juste sans geste. Une seule lecture
 * (`GET /cv/me/generated-cvs?kind=cv`), filtrée ici (`services/mes-cv.ts`) :
 * le contrat n'a pas de « sans dossier ».
 *
 * ═══ Les vignettes viennent de la galerie ═══
 *
 * Un export ne porte que l'identifiant et le nom de son modèle ; la galerie
 * (`lireModeles`, en cache) donne la miniature. Galerie illisible : la carte
 * montre le nom seul — la liste ne dépend pas d'elle.
 *
 * ═══ Les gestes ═══
 *
 * Ouvrir : le lecteur de Karria (`/lecture-document`, en-tête « CV · Prénom
 * Nom » — jamais l'adresse du stockage, que le navigateur intégré
 * affichait). Télécharger : `services/telechargement.ts`, la feuille de
 * partage du système, avec la phrase Karria sur iOS. Envoyer : `POST /documents/exports/{id}/send`, mêmes
 * quotas que Finaliser, même feuille. Supprimer : une alerte système
 * (c'est une décision), la carte part aussitôt et revient si le serveur
 * refuse. Nouveau CV : l'atelier libre.
 *
 * ═══ L'annonce ═══
 *
 * Une carte native après la deuxième (`mes_cv`) — la liste est courte, la
 * troisième place est encore dans l'écran ; et une sous l'invitation de
 * l'état vide (`mes_cv_vide`), au milieu de l'écran, loin du bouton bleu du
 * pied. Rien sans pub, rien pour un invité.
 *
 * ═══ Sans compte ═══
 *
 * Rien n'est lu ; l'écran invite à se connecter par la porte, et la liste
 * se charge dès que la session s'ouvre (le focus suit).
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { lireMoi } from "@/features/auth/api/auth.api";
import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
import { lireMonCv } from "@/features/cv/api/cv.api";
import { lireModeles } from "@/features/modeles/api/modeles.api";
import type { Modele } from "@/features/modeles/types/modeles.types";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnonceEmplacement } from "@/features/publicite/hooks/use-annonce-emplacement";
import { insererApres } from "@/features/publicite/services/regles-publicite";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import { effacerExport, envoyerExport, lireMesExports } from "../api/documents.api";
import { exportsLibres, sousTitreDesCv, TEXTES_MES_CV } from "../services/mes-cv";
import { messageDEnvoi, nomDeFichier } from "../services/presentation";
import { telechargerEtPartager, type Format } from "../services/telechargement";
import { oublierDocument } from "../services/lecteur";
import type { Export } from "../types/atelier.types";
import { memoriserApercu } from "../services/apercus";
import { useOuvrirLecteur } from "./use-ouvrir-lecteur";

export type ElementMesCv =
  | { type: "cv"; exporte: Export; modele: Modele | null; rang: number }
  | { type: "annonce"; annonce: NativeAd };

/** L'annonce se glisse après la deuxième carte, jamais en tête. */
const RANG_ANNONCE = 2;
const CLE_REPRISE = "mes-cv.nouveau";

export interface EcranMesCv {
  invite: boolean;
  elements: ElementMesCv[];
  sousTitre: string;
  chargement: boolean;
  erreur: string | null;
  maintenant: Date;
  /** L'annonce de l'état vide, sous l'invitation. */
  annonceVide: NativeAd | null;
  /** Le téléchargement en cours : export et format. */
  telechargement: { id: string; format: Format } | null;
  ouvrir: (exporte: Export) => void;
  telecharger: (exporte: Export, format: Format) => void;
  supprimer: (exporte: Export) => void;
  nouveau: () => void;
  /** « ‹ Mon CV » : l'onglet d'où l'on vient. */
  retour: () => void;
  seConnecter: () => void;
  recharger: () => void;
  /** L'adresse du compte, pour la pré-remplir. */
  adresseDuCompte: string | null;
  envoi: {
    exporte: Export | null;
    enCours: boolean;
    erreur: string | null;
    /** La dernière adresse servie, pour le dire sous la carte. */
    fait: { id: string; a: string } | null;
  };
  ouvrirEnvoi: (exporte: Export) => void;
  fermerEnvoi: () => void;
  envoyer: (a: string | null) => void;
}

function messageDe(cause: unknown): string {
  return cause instanceof ErreurApi && cause.estReseau
    ? TEXTES_MES_CV.erreurReseau
    : TEXTES_MES_CV.erreurLecture;
}

export function useMesCv(): EcranMesCv {
  const { exiger, invite } = usePorte();
  const router = useRouter();
  const { pousser } = useNavigationUnique();
  const [exports, setExports] = useState<Export[]>([]);
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [chargement, setChargement] = useState(!invite);
  const [erreur, setErreur] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());
  const [telechargement, setTelechargement] =
    useState<EcranMesCv["telechargement"]>(null);
  const [adresseDuCompte, setAdresseDuCompte] = useState<string | null>(null);
  /** « Prénom Nom », pour nommer les fichiers téléchargés comme le serveur le fait. */
  const [nom, setNom] = useState("");
  const [envoi, setEnvoi] = useState<EcranMesCv["envoi"]>({
    exporte: null,
    enCours: false,
    erreur: null,
    fait: null,
  });

  const charger = useCallback(() => {
    if (invite) {
      setChargement(false);
      return () => undefined;
    }
    let vivant = true;
    setMaintenant(new Date());
    lireMesExports("cv")
      .then((lus) => {
        if (!vivant) return;
        setExports(exportsLibres(lus));
        setErreur(null);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] Mes CV illisibles", cause);
        if (vivant) setErreur(messageDe(cause));
      })
      .finally(() => {
        if (vivant) setChargement(false);
      });
    // La galerie et l'adresse : utiles, jamais bloquantes.
    lireModeles().then(
      (galerie) => {
        if (vivant) setModeles(galerie);
      },
      (cause: unknown) => console.warn("[karria] galerie illisible dans Mes CV", cause),
    );
    lireMoi().then(
      (moi) => {
        if (vivant) setAdresseDuCompte(moi.email);
      },
      (cause: unknown) => console.warn("[karria] adresse du compte illisible", cause),
    );
    lireMonCv().then(
      (cv) => {
        if (vivant)
          setNom(`${cv.identite?.prenom ?? ""} ${cv.identite?.nom ?? ""}`.trim());
      },
      (cause: unknown) => console.warn("[karria] nom du CV illisible dans Mes CV", cause),
    );
    return () => {
      vivant = false;
    };
  }, [invite]);

  useFocusEffect(charger);

  const nouveau = useCallback(() => {
    if (exiger("cv", { cle: CLE_REPRISE })) pousser("/atelier/libre");
  }, [exiger, pousser]);
  useReprise(CLE_REPRISE, () => pousser("/atelier/libre"));

  const ouvrirLecteur = useOuvrirLecteur();
  const ouvrir = useCallback(
    (exporte: Export) => {
      const lien = exporte.pdf ?? exporte.docx;
      // Les pages en image d'abord, comme dans la galerie ; le lecteur du
      // PDF reste à un geste. Un export ancien, sans images, ouvre le lecteur.
      const apercu = memoriserApercu({
        id: exporte.id,
        genre: "cv",
        titre: TEXTES_MES_CV.titreApercu,
        pages: exporte.apercus,
        pdf: exporte.pdf,
        modele: exporte.modele?.libelle ?? null,
        complement: nom === "" ? null : nom,
        retour: TEXTES_MES_CV.titre,
      });
      if (apercu !== null) {
        pousser({ pathname: "/apercu-export", params: { id: apercu } });
        return;
      }
      if (lien === null) {
        Alert.alert(TEXTES_MES_CV.apercuIndisponible);
        return;
      }
      ouvrirLecteur({
        id: exporte.id,
        url: lien,
        genre: "cv",
        complement: nom === "" ? null : nom,
        modele: exporte.modele?.libelle ?? null,
        retour: TEXTES_MES_CV.titre,
      });
    },
    [ouvrirLecteur, nom, pousser],
  );

  const telecharger = useCallback(
    (exporte: Export, format: Format) => {
      const url = format === "pdf" ? exporte.pdf : exporte.docx;
      if (url === null || telechargement !== null) return;
      setTelechargement({ id: exporte.id, format });
      void (async () => {
        try {
          await telechargerEtPartager(
            url,
            nomDeFichier("cv", nom, null, format),
            format,
            "cv",
          );
        } catch (cause) {
          console.warn("[karria] téléchargement en échec", cause);
          Alert.alert(TEXTES_MES_CV.erreurTelechargement, TEXTES_MES_CV.reessayer);
        } finally {
          setTelechargement(null);
        }
      })();
    },
    [telechargement, nom],
  );

  const supprimer = useCallback((exporte: Export) => {
    Alert.alert(TEXTES_MES_CV.supprimerTitre, TEXTES_MES_CV.supprimerPhrase, [
      { text: TEXTES_MES_CV.annuler, style: "cancel" },
      {
        text: TEXTES_MES_CV.supprimer,
        style: "destructive",
        onPress: () => {
          setExports((liste) => liste.filter((e) => e.id !== exporte.id));
          // Le lecteur n'a plus rien à retenir de cet export.
          oublierDocument(exporte.id);
          effacerExport(exporte.id).catch((cause: unknown) => {
            console.warn("[karria] export non supprimé", cause);
            if (!(cause instanceof ErreurApi && cause.statut === 404)) {
              setExports((liste) => exportsLibres([...liste, exporte]));
              Alert.alert(TEXTES_MES_CV.erreurSuppression, TEXTES_MES_CV.reessayer);
            }
          });
        },
      },
    ]);
  }, []);

  const envoyer = useCallback(
    (a: string | null) => {
      const exporte = envoi.exporte;
      if (exporte === null || envoi.enCours) return;
      setEnvoi((e) => ({ ...e, enCours: true, erreur: null }));
      envoyerExport(exporte.id, a)
        .then((fait) =>
          setEnvoi({
            exporte: null,
            enCours: false,
            erreur: null,
            fait: { id: exporte.id, a: fait.a },
          }),
        )
        .catch((cause: unknown) => {
          console.warn("[karria] envoi en échec", cause);
          setEnvoi((e) => ({ ...e, enCours: false, erreur: messageDEnvoi(cause) }));
        });
    },
    [envoi.exporte, envoi.enCours],
  );

  const annonce = useAnnonceEmplacement("mes_cv", !invite && exports.length > 0);
  const annonceVide = useAnnonceEmplacement(
    "mes_cv_vide",
    !invite && !chargement && erreur === null && exports.length === 0,
  );

  const elements = useMemo<ElementMesCv[]>(
    () =>
      insererApres<ElementMesCv, ElementMesCv>(
        exports.map((exporte, rang) => ({
          type: "cv",
          exporte,
          modele: modeles.find((m) => m.id === exporte.modele?.id) ?? null,
          rang,
        })),
        annonce === null ? null : { type: "annonce", annonce },
        RANG_ANNONCE,
      ),
    [exports, modeles, annonce],
  );

  return {
    invite,
    elements,
    sousTitre: sousTitreDesCv(exports.length),
    chargement,
    erreur,
    maintenant,
    annonceVide,
    telechargement,
    ouvrir,
    telecharger,
    supprimer,
    nouveau,
    retour: useCallback(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/cv");
    }, [router]),
    seConnecter: useCallback(() => void exiger("cv"), [exiger]),
    recharger: useCallback(() => {
      setChargement(true);
      charger();
    }, [charger]),
    adresseDuCompte,
    envoi,
    ouvrirEnvoi: useCallback(
      (exporte: Export) => setEnvoi((e) => ({ ...e, exporte, erreur: null })),
      [],
    ),
    fermerEnvoi: useCallback(() => setEnvoi((e) => ({ ...e, exporte: null })), []),
    envoyer,
  };
}
