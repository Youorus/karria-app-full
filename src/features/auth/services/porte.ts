/**
 * La porte : ce qu'on dit à un invité quand un geste demande un compte.
 *
 * ═══ Dire ce qu'on gagne, pas ce qui manque ═══
 *
 * « Connexion requise » est un mur. « Garde cette offre, et retrouve-la
 * partout » est une raison. Chaque geste qui exige un compte a donc son
 * titre, sa phrase, et la liste de ce qu'un compte apporte — la même liste
 * partout, pour que l'invité comprenne vite ce qu'est un compte Karria.
 *
 * Pur : des textes par raison, rien d'autre. Testé.
 */

import type { NomIcone } from "@/components/icone";

/** Pourquoi la porte s'ouvre. */
export type RaisonConnexion =
  | "karria"
  | "cv"
  | "garder"
  | "ecarter"
  | "criteres"
  | "notifications"
  | "achat"
  | "modele"
  | "profil";

export interface TextesPorte {
  titre: string;
  phrase: string;
}

const TEXTES: Record<RaisonConnexion, TextesPorte> = {
  karria: {
    titre: "Parle à Karria",
    phrase:
      "Dis-moi ce que tu cherches, je m'occupe du reste : un compte, et ta recherche me suit partout.",
  },
  cv: {
    titre: "Ton CV, en quelques minutes",
    phrase:
      "Je l'écris avec toi, chapitre par chapitre, et je le garde pour toi. Il te faut juste un compte.",
  },
  garder: {
    titre: "Garde cette offre",
    phrase: "Avec un compte, tes offres gardées te suivent sur tous tes appareils.",
  },
  ecarter: {
    titre: "Écarte cette offre",
    phrase:
      "Avec un compte, je ne te la remontre plus — et j'apprends ce qui ne te va pas.",
  },
  criteres: {
    titre: "Ta recherche, tes alertes",
    phrase: "Un compte, et je te préviens dès qu'une offre qui te correspond sort.",
  },
  notifications: {
    titre: "Je te préviens au bon moment",
    phrase: "Les notifications demandent un compte : c'est à toi qu'elles s'adressent.",
  },
  achat: {
    titre: "Soutenir Karria",
    phrase:
      "Un compte garde ce que tu as choisi — sans pub, modèles — où que tu te connectes.",
  },
  modele: {
    titre: "Ce modèle est pour toi",
    phrase: "Avec un compte, il rejoint ta collection et habille ton CV.",
  },
  profil: {
    titre: "Ton espace t'attend",
    phrase:
      "Ton CV, tes offres gardées, ta recherche : tout se retrouve ici, avec un compte.",
  },
};

/** Ce qu'un compte apporte, toujours dans le même ordre. */
export const GAINS: readonly { icone: NomIcone; texte: string }[] = [
  { icone: "etincelles", texte: "Parler à Karria et lancer ta recherche" },
  { icone: "cv", texte: "Créer ou importer ton CV" },
  { icone: "signet", texte: "Garder et écarter des offres" },
  { icone: "cloche", texte: "Être prévenu dès qu'une offre sort" },
];

export function textesDeLaPorte(raison: RaisonConnexion): TextesPorte {
  return TEXTES[raison];
}
