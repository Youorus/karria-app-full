/**
 * La lettre d'un dossier — la même feuille temps réel que le CV.
 *
 * ═══ Deux moments ═══
 *
 * Sans lettre : « Et ta lettre ? » — Karria en écrit une première version
 * (`POST /{id}/letter`, derrière le consentement à l'IA), ou on passe.
 * Avec : la feuille rendue (`{ letter }` dans le modèle du dossier, logo de
 * l'entreprise s'il est à nous), toucher un paragraphe pour le modifier à
 * la main ou le faire réécrire par Karria avec une consigne courte.
 *
 * ═══ Les mêmes horloges que l'atelier ═══
 *
 * Patch local tout de suite, rendu au repos (400 ms), `PUT /{id}/letter`
 * en différé (1,5 s). Une réécriture par Karria passe par le serveur, qui
 * rend le dossier avec le paragraphe réécrit : on montre l'ancien et le
 * nouveau ; « garder l'ancien » renvoie le texte d'avant par un `PUT`.
 *
 * ═══ Le modèle, ici aussi ═══
 *
 * La pastille sur la feuille rouvre « Avec quel modèle ? » : la lettre se
 * redessine dans le modèle choisi, et le dossier le retient
 * (`PUT /{id}/template`) — l'atelier et Finaliser liront le même. Le texte
 * de la lettre n'est pas touché : seul le rendu change.
 *
 * ═══ Le style de la lettre (ADR-0036) ═══
 *
 * Quand le modèle a une lettre assortie, la pastille « Du modèle · Sobre »
 * choisit entre elle et la lettre sobre sur page blanche : la feuille se
 * redessine en direct et le dossier retient le choix
 * (`PUT /{id}/letter-style`) — l'export de Finaliser le lira. Sans lettre
 * assortie, rien à choisir : la lettre sobre est servie, la pastille se tait.
 * Le texte de la lettre et son édition ne changent pas d'un style à l'autre.
 *
 * ═══ Les avertissements du rendu ═══
 *
 * `too_few_paragraphs`, `subject_not_explicit`… deviennent des conseils
 * discrets sous la feuille (`services/presentation.ts › conseilsDe`).
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import { consentementIa } from "@/features/auth/services/consentement-ia";
import {
  changerModeleDuDossier,
  changerStyleDeLettreDuDossier,
  ebaucherLettre,
  lireDossier,
  modifierLettre,
  regenererParagraphe,
} from "@/features/candidatures/api/candidatures.api";
import {
  type StyleLettre,
  styleLettreServi,
} from "@/features/candidatures/services/style-lettre";
import {
  dossierMemorise,
  memoriserDossier,
} from "@/features/candidatures/services/memoire-dossiers";
import type { Dossier, Lettre } from "@/features/candidatures/types/candidatures.types";
import { lireMesModeles, lireModeles } from "@/features/modeles/api/modeles.api";
import type { Modele } from "@/features/modeles/types/modeles.types";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import { lireModeleChoisi, rendreLettre } from "../api/documents.api";
import type { FeuilleCvHandle } from "../components/feuille-cv";
import { lireBrouillonAtelier } from "../services/brouillon-atelier";
import { cibleDeLettre, type CibleLettre } from "../services/chemins";
import { creerFileDeRendu } from "../services/file-de-rendu";
import { differencesDeLettre, documentDeLettre } from "../services/lettre";
import { modeleDuDossier } from "../services/modele";
import { conseilsDe, messageDeRendu, TEXTES } from "../services/presentation";

const DELAI_SAUVEGARDE_MS = 1_500;

export interface Reecriture {
  index: number;
  avant: string;
  apres: string;
}

export interface EcranLettre {
  dossier: Dossier | null;
  lettre: Lettre | null;
  chargement: boolean;
  erreur: string | null;
  /** Karria écrit l'ébauche. */
  ebauche: boolean;
  html: string | null;
  conseils: string[];
  erreurRendu: string | null;
  poserFeuille: (poignee: FeuilleCvHandle | null) => void;
  toucher: (chemin: string) => void;
  cible: CibleLettre | null;
  fermerCible: () => void;
  /** Le texte de la cible, pour le formulaire. */
  texteDeCible: string;
  apercu: (texte: string) => void;
  enregistrerTexte: (texte: string) => void;
  /** Karria réécrit le paragraphe visé, avec une consigne facultative. */
  reecrire: (consigne: string) => void;
  reecritureEnCours: boolean;
  reecriture: Reecriture | null;
  garderNouveau: () => void;
  garderAncien: () => void;
  enregistrement: "repos" | "en-cours" | "fait" | "erreur";
  /** Le modèle : le même geste que dans l'atelier, à la même place. */
  modeleId: string | null;
  modele: Modele | null;
  modeles: Modele[];
  possedes: Set<string>;
  feuilleModele: boolean;
  ouvrirModele: () => void;
  fermerModele: () => void;
  choisirModele: (modeleId: string) => void;
  /** Le modèle courant a une lettre assortie : le style se choisit. */
  lettreAssortie: boolean;
  /** Le style de lettre servi : « modèle » ou « sobre ». */
  styleLettre: StyleLettre;
  choisirStyleLettre: (style: StyleLettre) => void;
  ecrireAvecKarria: () => void;
  passer: () => void;
  continuer: () => void;
  retour: () => void;
}

function messageDe(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.statut === 404) return "Ce dossier n'existe plus.";
    if (cause.estReseau) return "Pas de connexion. Réessaie quand le réseau sera là.";
    if (cause.raison === "adaptation_in_progress")
      return "Karria adapte encore ton CV : la lettre viendra juste après.";
    return cause.message;
  }
  return "La lettre n'a pas pu être chargée.";
}

interface EntreeDeRendu {
  modeleId: string;
  dossier: Dossier;
  lettre: Lettre;
  style: StyleLettre | null;
}

export function useLettre(): EcranLettre {
  const { dossierId } = useLocalSearchParams<{ dossierId: string }>();
  const router = useRouter();
  const { pousser } = useNavigationUnique();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();

  const [dossier, setDossier] = useState<Dossier | null>(() =>
    dossierMemorise(dossierId),
  );
  const [lettre, setLettre] = useState<Lettre | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ebauche, setEbauche] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [erreurRendu, setErreurRendu] = useState<string | null>(null);
  const [cible, setCible] = useState<CibleLettre | null>(null);
  const [reecritureEnCours, setReecritureEnCours] = useState(false);
  const [reecriture, setReecriture] = useState<Reecriture | null>(null);
  const [enregistrement, setEnregistrement] =
    useState<EcranLettre["enregistrement"]>("repos");
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [possedes, setPossedes] = useState<Set<string>>(new Set());
  const [feuilleModele, setFeuilleModele] = useState(false);
  // Le style retenu par le dossier (`null` : par défaut) ; le serveur résout.
  const [styleChoisi, setStyleChoisi] = useState<StyleLettre | null>(
    () => dossierMemorise(dossierId)?.styleLettre ?? null,
  );

  const feuilleCv = useRef<FeuilleCvHandle | null>(null);
  const lettreRef = useRef<Lettre | null>(null);
  const dossierRef = useRef<Dossier | null>(dossier);
  const modeleRef = useRef<string | null>(null);
  const styleRef = useRef<StyleLettre | null>(styleChoisi);
  const vivant = useRef(true);
  const sauvegarde = useRef<{
    minuterie: ReturnType<typeof setTimeout> | null;
    lettre: Lettre | null;
  }>({ minuterie: null, lettre: null });

  const [file] = useState(() =>
    creerFileDeRendu<EntreeDeRendu, Awaited<ReturnType<typeof rendreLettre>>>({
      // La lettre suit la couleur principale du dossier (ADR-0034) et son
      // style de lettre (ADR-0036).
      rendre: (e) =>
        rendreLettre(
          e.modeleId,
          documentDeLettre(e.dossier, e.lettre, e.dossier.cv),
          e.dossier.couleur,
          e.style,
        ),
      surResultat: (rendu) => {
        setHtml(rendu.html);
        setAvertissements(rendu.avertissements);
        setErreurRendu(null);
      },
      surErreur: (cause) => {
        console.warn("[karria] rendu de la lettre en échec", cause);
        setErreurRendu(messageDeRendu(cause));
      },
    }),
  );

  useEffect(() => {
    vivant.current = true;
    const s = sauvegarde.current;
    return () => {
      vivant.current = false;
      file.arreter();
      if (s.minuterie !== null) clearTimeout(s.minuterie);
    };
  }, [file]);

  const rendre = useCallback(
    (immediat: boolean) => {
      const l = lettreRef.current;
      const d = dossierRef.current;
      const m = modeleRef.current;
      if (l === null || d === null || m === null) return;
      const entree = { modeleId: m, dossier: d, lettre: l, style: styleRef.current };
      if (immediat) file.rendreMaintenant(entree);
      else file.demander(entree);
    },
    [file],
  );

  const poserDossier = useCallback((lu: Dossier) => {
    memoriserDossier(lu);
    dossierRef.current = lu;
    setDossier(lu);
  }, []);

  const poserLettre = useCallback((l: Lettre | null) => {
    lettreRef.current = l;
    setLettre(l);
  }, []);

  // ── Le chargement ──────────────────────────────────────────────────────

  useEffect(() => {
    let actif = true;
    Promise.all([
      lireDossier(dossierId),
      lireModeleChoisi().catch(() => null),
      lireModeles().catch(() => [] as Modele[]),
      lireMesModeles().catch(() => new Set<string>()),
    ])
      .then(([lu, choisi, galerie, miens]) => {
        if (!actif) return;
        poserDossier(lu);
        poserLettre(lu.lettre);
        // Le dossier retient le style : il survit au changement d'appareil.
        styleRef.current = lu.styleLettre;
        setStyleChoisi(lu.styleLettre);
        setModeles(galerie);
        setPossedes(miens);
        modeleRef.current = modeleDuDossier({
          dossier: lu,
          brouillonModeleId: lireBrouillonAtelier(dossierId)?.modeleId,
          choisi: choisi?.modeleId,
          galerie,
          possedes: miens,
        });
        setModeleId(modeleRef.current);
        setErreur(null);
        if (lu.lettre !== null) rendre(true);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] lettre : dossier illisible", cause);
        if (actif) setErreur(messageDe(cause));
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [dossierId, poserDossier, poserLettre, rendre]);

  // ── La sauvegarde différée ─────────────────────────────────────────────

  const sauverMaintenant = useCallback(async () => {
    const s = sauvegarde.current;
    if (s.minuterie !== null) {
      clearTimeout(s.minuterie);
      s.minuterie = null;
    }
    const aSauver = s.lettre;
    if (aSauver === null) return;
    s.lettre = null;
    setEnregistrement("en-cours");
    try {
      const lu = await modifierLettre(dossierId, aSauver);
      if (!vivant.current) return;
      poserDossier(lu);
      setEnregistrement("fait");
    } catch (cause) {
      console.warn("[karria] lettre non enregistrée", cause);
      if (!vivant.current) return;
      s.lettre ??= aSauver;
      setEnregistrement("erreur");
    }
  }, [dossierId, poserDossier]);

  const appliquer = useCallback(
    (suivante: Lettre) => {
      const courante = lettreRef.current;
      if (courante !== null)
        feuilleCv.current?.patcher(differencesDeLettre(courante, suivante));
      poserLettre(suivante);
      rendre(false);
      const s = sauvegarde.current;
      s.lettre = suivante;
      if (s.minuterie !== null) clearTimeout(s.minuterie);
      setEnregistrement("repos");
      s.minuterie = setTimeout(() => {
        s.minuterie = null;
        void sauverMaintenant();
      }, DELAI_SAUVEGARDE_MS);
    },
    [poserLettre, rendre, sauverMaintenant],
  );

  // ── Karria ─────────────────────────────────────────────────────────────

  const ecrireAvecKarria = useCallback(() => {
    if (ebauche) return;
    const geste = () => {
      setEbauche(true);
      ebaucherLettre(dossierId)
        .then((lu) => {
          if (!vivant.current) return;
          poserDossier(lu);
          poserLettre(lu.lettre);
          rendre(true);
        })
        .catch((cause: unknown) => {
          if (!vivant.current) return;
          if (rejouerSiConsentementRequis(cause, "application", geste)) return;
          console.warn("[karria] ébauche de lettre en échec", cause);
          Alert.alert("Karria n'a pas pu écrire", messageDe(cause));
        })
        .finally(() => {
          if (vivant.current) setEbauche(false);
        });
    };
    avecConsentement("application", geste);
  }, [
    ebauche,
    dossierId,
    poserDossier,
    poserLettre,
    rendre,
    avecConsentement,
    rejouerSiConsentementRequis,
  ]);

  const reecrire = useCallback(
    (consigne: string) => {
      const c = cible;
      const courante = lettreRef.current;
      if (
        c === null ||
        c.partie !== "paragraphe" ||
        courante === null ||
        reecritureEnCours
      )
        return;
      const avant = courante.paragraphes[c.index]?.texte ?? "";
      const geste = () => {
        setReecritureEnCours(true);
        void (async () => {
          try {
            await sauverMaintenant();
            const lu = await regenererParagraphe(
              dossierId,
              c.index,
              consigne.trim() === "" ? null : consigne.trim().slice(0, 300),
            );
            if (!vivant.current) return;
            poserDossier(lu);
            if (lu.lettre !== null) {
              const apres = lu.lettre.paragraphes[c.index]?.texte ?? avant;
              lettreRef.current = lu.lettre;
              setLettre(lu.lettre);
              feuilleCv.current?.patcher([
                { chemin: `paragraphs.${c.index}.text`, texte: apres },
              ]);
              rendre(false);
              // La feuille a pu être fermée pour laisser passer l'accord à l'IA :
              // on la rouvre sur l'ancien et le nouveau.
              setCible(c);
              setReecriture({ index: c.index, avant, apres });
            }
          } catch (cause) {
            if (!vivant.current) return;
            if (rejouerSiConsentementRequis(cause, "application", geste)) {
              setCible(null);
              return;
            }
            console.warn("[karria] réécriture en échec", cause);
            Alert.alert("Karria n'a pas pu réécrire", messageDe(cause));
          } finally {
            if (vivant.current) setReecritureEnCours(false);
          }
        })();
      };
      // L'accord à l'IA se demande dans une feuille globale, montée à la
      // racine : sur iOS, elle ne peut pas monter par-dessus notre feuille
      // native. Si l'accord manque (ou n'a jamais été lu), on ferme la
      // nôtre d'abord ; le geste reprend après l'accord et la rouvre.
      const connu = consentementIa();
      if (connu === null || connu.requis) setCible(null);
      avecConsentement("application", geste);
    },
    [
      cible,
      reecritureEnCours,
      sauverMaintenant,
      dossierId,
      poserDossier,
      rendre,
      avecConsentement,
      rejouerSiConsentementRequis,
    ],
  );

  const garderAncien = useCallback(() => {
    const r = reecriture;
    const courante = lettreRef.current;
    if (r === null || courante === null) return;
    appliquer({
      ...courante,
      paragraphes: courante.paragraphes.map((p, i) =>
        i === r.index ? { ...p, texte: r.avant } : p,
      ),
    });
    setReecriture(null);
    setCible(null);
  }, [reecriture, appliquer]);

  const garderNouveau = useCallback(() => {
    setReecriture(null);
    setCible(null);
  }, []);

  // ── Le modèle ──────────────────────────────────────────────────────────

  const choisirModele = useCallback(
    (id: string) => {
      const precedent = modeleRef.current;
      if (precedent === id) return;
      // Seul le rendu change : la lettre (`lettreRef`) n'est pas touchée.
      modeleRef.current = id;
      setModeleId(id);
      setPossedes((p) => (p.has(id) ? p : new Set([...p, id])));
      rendre(true);
      changerModeleDuDossier(dossierId, id)
        .then((lu) => {
          if (vivant.current) poserDossier(lu);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] modèle du dossier non retenu (lettre)", cause);
          if (!vivant.current) return;
          if (cause instanceof ErreurApi && cause.raison === "template_locked") {
            modeleRef.current = precedent;
            setModeleId(precedent);
            rendre(true);
            Alert.alert(TEXTES.modeleVerrouille);
            return;
          }
          Alert.alert(TEXTES.modeleNonRetenu);
        });
    },
    [dossierId, poserDossier, rendre],
  );

  const ouvrirModele = useCallback(() => setFeuilleModele(true), []);
  const fermerModele = useCallback(() => setFeuilleModele(false), []);

  // ── Le style de la lettre ──────────────────────────────────────────────

  const choisirStyleLettre = useCallback(
    (style: StyleLettre) => {
      const precedent = styleRef.current;
      if (precedent === style) return;
      // Seul le rendu change : la lettre (`lettreRef`) n'est pas touchée.
      styleRef.current = style;
      setStyleChoisi(style);
      rendre(true);
      changerStyleDeLettreDuDossier(dossierId, style)
        .then((lu) => {
          if (vivant.current) poserDossier(lu);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] style de lettre non retenu", cause);
          if (vivant.current) Alert.alert(TEXTES.lettreStyleNonRetenu);
        });
    },
    [dossierId, poserDossier, rendre],
  );

  // ── Les gestes ─────────────────────────────────────────────────────────

  const toucher = useCallback((chemin: string) => {
    const c = cibleDeLettre(chemin);
    if (c === null) return;
    setReecriture(null);
    setCible(c);
  }, []);

  const texteDeCible = (() => {
    if (cible === null || lettre === null) return "";
    switch (cible.partie) {
      case "objet":
        return lettre.objet;
      case "destinataire":
        return lettre.destinataire;
      case "formule":
        return lettre.formule;
      case "paragraphe":
        return lettre.paragraphes[cible.index]?.texte ?? "";
      case "hors-lettre":
        return "";
    }
  })();

  const cheminDeCible = useCallback((c: CibleLettre): string | null => {
    switch (c.partie) {
      case "objet":
        return "subject";
      case "destinataire":
        return "greeting";
      case "formule":
        return "closing";
      case "paragraphe":
        return `paragraphs.${c.index}.text`;
      case "hors-lettre":
        return null;
    }
  }, []);

  const apercu = useCallback(
    (texte: string) => {
      if (cible === null) return;
      const chemin = cheminDeCible(cible);
      if (chemin !== null) feuilleCv.current?.patcher([{ chemin, texte }]);
    },
    [cible, cheminDeCible],
  );

  const enregistrerTexte = useCallback(
    (texte: string) => {
      const c = cible;
      const courante = lettreRef.current;
      if (c === null || courante === null) return;
      const propre = texte.trim();
      switch (c.partie) {
        case "objet":
          appliquer({ ...courante, objet: propre });
          break;
        case "destinataire":
          appliquer({ ...courante, destinataire: propre });
          break;
        case "formule":
          appliquer({ ...courante, formule: propre });
          break;
        case "paragraphe":
          appliquer({
            ...courante,
            paragraphes: courante.paragraphes.map((p, i) =>
              i === c.index ? { ...p, texte: propre } : p,
            ),
          });
          break;
        case "hors-lettre":
          break;
      }
      setCible(null);
    },
    [cible, appliquer],
  );

  const fermerCible = useCallback(() => {
    // Un aperçu non enregistré revient au texte de la lettre.
    const c = cible;
    const courante = lettreRef.current;
    if (c !== null && courante !== null) {
      const chemin = cheminDeCible(c);
      if (chemin !== null) feuilleCv.current?.patcher([{ chemin, texte: texteDeCible }]);
    }
    setReecriture(null);
    setCible(null);
  }, [cible, cheminDeCible, texteDeCible]);

  const continuer = useCallback(() => {
    void sauverMaintenant();
    pousser({ pathname: "/atelier/[dossierId]/finaliser", params: { dossierId } });
  }, [sauverMaintenant, pousser, dossierId]);

  const retour = useCallback(() => {
    void sauverMaintenant();
    if (router.canGoBack()) router.back();
    else router.replace("/dossiers");
  }, [router, sauverMaintenant]);

  const poserFeuille = useCallback((poignee: FeuilleCvHandle | null) => {
    feuilleCv.current = poignee;
  }, []);

  const modele = modeles.find((m) => m.id === modeleId) ?? null;
  const lettreAssortie = modele?.lettreAssortie ?? false;

  return {
    dossier,
    lettre,
    chargement,
    erreur,
    ebauche,
    html,
    conseils: conseilsDe(avertissements),
    erreurRendu,
    poserFeuille,
    toucher,
    cible,
    fermerCible,
    texteDeCible,
    apercu,
    enregistrerTexte,
    reecrire,
    reecritureEnCours,
    reecriture,
    garderNouveau,
    garderAncien,
    enregistrement,
    modeleId,
    modele,
    modeles,
    possedes,
    feuilleModele,
    ouvrirModele,
    fermerModele,
    choisirModele,
    lettreAssortie,
    styleLettre: styleLettreServi(styleChoisi, lettreAssortie),
    choisirStyleLettre,
    ecrireAvecKarria,
    passer: continuer,
    continuer,
    retour,
  };
}

export { TEXTES };
