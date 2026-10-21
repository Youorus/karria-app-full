/**
 * Les chapitres du CV, tels que Karria les pose.
 *
 * ═══ Une question, pas un formulaire ═══
 *
 * Chaque chapitre est une **question de conversation**, avec ce qu'il faut
 * pour que personne ne reste bloqué devant : une aide qui donne un
 * exemple, et des suggestions qu'on touche au lieu d'écrire (« Je n'ai
 * pas encore d'expérience »). L'objectif : quelqu'un qui n'a jamais ouvert
 * Word arrive au bout.
 *
 * ═══ Le ton ═══
 *
 * Le tutoiement de Karria, des phrases courtes, jamais de jargon RH
 * (« parcours académique ») : on parle comme on parlerait à un ami qui
 * aide à écrire son CV.
 */

import type { NomIcone } from "@/components/icone";
import type { CleChapitre, Jet } from "../types/cv.types";

export interface DefinitionChapitre {
  cle: CleChapitre;
  /** Le nom court, dans la frise de progression et le mini-CV. */
  titre: string;
  icone: NomIcone;
  question: string;
  aide: string;
  suggestions: string[];
  /** Un chapitre en boucle s'enrichit d'éléments (« Une autre ? »). */
  boucle: boolean;
  /** La question qui relance la boucle après un élément validé. */
  encore?: string;
  /** Peut-on passer ce chapitre ? L'identité et le contact, jamais. */
  facultatif: boolean;
}

export const DEFINITIONS: Record<CleChapitre, DefinitionChapitre> = {
  identity: {
    cle: "identity",
    titre: "Toi",
    icone: "identite",
    question: "Faisons connaissance. Comment tu t'appelles, et quel métier tu vises ?",
    aide: "Par exemple : « Je m'appelle Awa Diallo, je veux devenir conseillère de vente. »",
    suggestions: [],
    boucle: false,
    facultatif: false,
  },
  contact: {
    cle: "contact",
    titre: "Contact",
    icone: "arobase",
    question: "Comment un recruteur peut te joindre ?",
    aide: "Ton e-mail, ton téléphone, ta ville. Et ton LinkedIn si tu en as un.",
    suggestions: [],
    boucle: false,
    facultatif: false,
  },
  summary: {
    cle: "summary",
    titre: "À propos",
    icone: "citation",
    question: "Parle-moi un peu de toi. Qu'est-ce qui te décrit le mieux ?",
    aide: "Dis-le comme ça vient : ce que tu aimes, ce que tu cherches. Je mets en forme.",
    suggestions: [
      "J'aime le contact avec les gens",
      "Je suis organisé et fiable",
      "Je cherche mon premier emploi",
    ],
    boucle: false,
    facultatif: true,
  },
  experiences: {
    cle: "experiences",
    titre: "Expériences",
    icone: "contrat",
    question: "Raconte-moi un endroit où tu as travaillé. Même un job d'été compte !",
    aide: "Où, pendant combien de temps, et ce que tu y faisais. Un stage ou du bénévolat, ça marche aussi.",
    suggestions: ["Je n'ai pas encore d'expérience"],
    boucle: true,
    encore: "Bien noté ! Tu as travaillé ailleurs ?",
    facultatif: true,
  },
  educations: {
    cle: "educations",
    titre: "Formation",
    icone: "diplome",
    question: "Et côté études ? Ton dernier diplôme, ou celui que tu prépares.",
    aide: "Le diplôme, l'école et l'année. Par exemple : « BTS commerce au lycée Jean Jaurès, en 2021 ».",
    suggestions: ["Je n'ai pas de diplôme"],
    boucle: true,
    encore: "Parfait. Tu as un autre diplôme ou une formation à ajouter ?",
    facultatif: true,
  },
  skills: {
    cle: "skills",
    titre: "Compétences",
    icone: "eclair",
    question: "Qu'est-ce que tu sais bien faire ? Et quelles langues tu parles ?",
    aide: "Cite-les simplement : « la vente, la caisse, le travail en équipe, anglais courant ».",
    suggestions: [],
    boucle: false,
    facultatif: true,
  },
  interests: {
    cle: "interests",
    titre: "Passions",
    icone: "coeur",
    question:
      "Dernière question sur toi : qu'est-ce que tu aimes faire en dehors du travail ?",
    aide: "Un sport, une passion, du bénévolat… Ça en dit beaucoup aux recruteurs.",
    suggestions: [],
    boucle: false,
    facultatif: true,
  },
  photo: {
    cle: "photo",
    titre: "Photo",
    icone: "photo",
    question: "Tu veux mettre une photo sur ton CV ?",
    aide: "C'est toi qui choisis. En France, elle n'est jamais obligatoire.",
    suggestions: [],
    boucle: false,
    facultatif: true,
  },
};

/** Les suggestions qui veulent dire « je passe ce chapitre » : on ne les
 *  envoie pas à l'interprète, on passe directement. */
const PASSAGES = new Set(["Je n'ai pas encore d'expérience", "Je n'ai pas de diplôme"]);

export function veutPasser(suggestion: string): boolean {
  return PASSAGES.has(suggestion);
}

/** « 2021-09 » → « sept. 2021 ». */
export function moisLisible(date: string | null): string | null {
  if (date === null) return null;
  const [annee, mois] = date.split("-");
  const MOIS = [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc.",
  ];
  const index = Number(mois) - 1;
  return index >= 0 && index < 12 ? `${MOIS[index]} ${annee}` : annee;
}

export function periodeLisible(
  debut: string | null,
  fin: string | null,
  enCours: boolean,
): string | null {
  const d = moisLisible(debut);
  const f = enCours ? "aujourd'hui" : moisLisible(fin);
  if (d === null && f === null) return null;
  if (d === null) return f;
  return f === null ? d : `${d} – ${f}`;
}

/** Ce que le mini-CV affiche d'un jet validé : une ligne. */
export function resumeDuJet(jet: Jet): string {
  switch (jet.chapitre) {
    case "identity":
      return `${jet.donnees.prenom} ${jet.donnees.nom}`.trim();
    case "contact":
      return jet.donnees.email ?? jet.donnees.telephone ?? jet.donnees.ville ?? "";
    case "summary":
      return jet.donnees.texte;
    case "experiences":
      return [jet.donnees.poste, jet.donnees.entreprise].filter(Boolean).join(" · ");
    case "educations":
      return [jet.donnees.diplome, jet.donnees.ecole].filter(Boolean).join(" · ");
    case "skills":
      return [
        ...jet.donnees.competences.map((c) => c.nom),
        ...jet.donnees.langues.map((l) => l.langue),
      ].join(", ");
    case "interests":
      return jet.donnees.interets.map((i) => i.nom).join(", ");
    case "photo":
      return jet.donnees.image === null ? "Sans photo" : "Avec photo";
  }
}
