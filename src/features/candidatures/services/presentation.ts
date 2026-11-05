/**
 * Ce que l'espace Candidatures dit d'un dossier — en mots, jamais en
 * badges.
 *
 * ═══ L'état, en une phrase ═══
 *
 * Un dossier est à l'un de quatre moments, et la carte le dit comme on le
 * dirait à voix haute : « Karria adapte ton CV… », « 3 propositions à
 * relire », « Prêt à envoyer », « Candidaté le 6 nov. ». Le ton
 * (`attente`, `relecture`, `pret`, `fait`, `echec`) ne sert qu'à poser un
 * point de couleur devant la phrase ; aucune étiquette, aucun fond.
 *
 * ═══ Les dates, courtes et relatives quand elles sont proches ═══
 *
 * « aujourd'hui », « hier », puis « le 3 nov. » ; l'année n'apparaît que
 * si ce n'est pas la nôtre. `maintenant` est passé pour garder les
 * fonctions pures et testables.
 *
 * ═══ Le tri ═══
 *
 * Par date de génération (`creeLe`), la plus récente d'abord : c'est ce
 * qu'on a fait en dernier qu'on cherche en premier. Le serveur trie par
 * dernière modification ; l'espace, lui, raconte ce qui a été généré.
 */

import type {
  CarteDossier,
  Dossier,
  EtatAdaptation,
  StatutDossier,
} from "../types/candidatures.types";

export type TonEtat = "attente" | "relecture" | "pret" | "fait" | "echec";

export interface EtatLisible {
  libelle: string;
  ton: TonEtat;
}

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

function memeJour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** « aujourd'hui », « hier », « le 3 nov. », « le 3 nov. 2025 » — ou `null`
 *  si la date est illisible. */
export function dateCourte(iso: string | null, maintenant: Date): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (memeJour(date, maintenant)) return "aujourd'hui";
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);
  if (memeJour(date, hier)) return "hier";
  const jour = date.getDate() === 1 ? "1er" : String(date.getDate());
  const annee =
    date.getFullYear() === maintenant.getFullYear() ? "" : ` ${date.getFullYear()}`;
  return `le ${jour} ${MOIS[date.getMonth()]}${annee}`;
}

/** « le 6 novembre 2026 » : la date entière, pour le détail. */
export function dateLongue(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface MomentDuDossier {
  statut: StatutDossier;
  adaptation: EtatAdaptation;
  propositionsEnAttente: number;
  candidateLe: string | null;
}

/** La phrase d'état d'un dossier, et son ton. */
export function etatDuDossier(d: MomentDuDossier, maintenant: Date): EtatLisible {
  if (d.statut === "candidate") {
    const quand = dateCourte(d.candidateLe, maintenant);
    return { libelle: quand === null ? "Candidaté" : `Candidaté ${quand}`, ton: "fait" };
  }
  if (d.adaptation === "en_cours")
    return { libelle: "Karria adapte ton CV…", ton: "attente" };
  if (d.adaptation === "echouee")
    return { libelle: "L'adaptation n'a pas abouti", ton: "echec" };
  if (d.propositionsEnAttente > 0) {
    const n = d.propositionsEnAttente;
    return {
      libelle: n === 1 ? "1 proposition à relire" : `${n} propositions à relire`,
      ton: "relecture",
    };
  }
  return { libelle: "Prêt à envoyer", ton: "pret" };
}

/** « Généré le 3 nov. » — la ligne de date de la carte. */
export function ligneDeGeneration(carte: CarteDossier, maintenant: Date): string {
  const quand = dateCourte(carte.creeLe, maintenant);
  return quand === null ? "Généré" : `Généré ${quand}`;
}

/** Les dossiers du plus récemment généré au plus ancien. */
export function parDateDeGeneration(cartes: readonly CarteDossier[]): CarteDossier[] {
  return [...cartes].sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

/** « 1 dossier », « 3 dossiers, 1 candidature » — le sous-titre de l'onglet. */
export function sousTitreDesDossiers(cartes: readonly CarteDossier[]): string {
  const total = cartes.length;
  if (total === 0) return "Tes CV et lettres, offre par offre";
  const candidatees = cartes.filter((c) => c.statut === "candidate").length;
  const dossiers = `${total} dossier${total > 1 ? "s" : ""}`;
  if (candidatees === 0) return dossiers;
  return `${dossiers}, ${candidatees} candidature${candidatees > 1 ? "s" : ""}`;
}

/** Les premiers mots d'un texte, pour une vignette : coupe au mot. */
export function extrait(texte: string | null, longueur = 90): string | null {
  if (texte === null) return null;
  const plat = texte.replace(/\s+/g, " ").trim();
  if (plat === "") return null;
  if (plat.length <= longueur) return plat;
  return `${plat.slice(0, longueur).replace(/\s+\S*$/, "")}…`;
}

/** Les lignes d'aperçu de la feuille « CV adapté » : le nom et
 *  l'intitulé, le début de l'à-propos, deux expériences. Vide tant que
 *  Karria travaille (la feuille reste en pointillé). */
export function apercuDuCv(dossier: Pick<Dossier, "cv" | "adaptation">): string[] {
  if (dossier.adaptation === "en_cours") return [];
  const { cv } = dossier;
  const nom =
    cv.identite === null ? "" : `${cv.identite.prenom} ${cv.identite.nom}`.trim();
  const tete = [nom, cv.identite?.titre ?? ""].filter((l) => l !== "").join(" · ");
  const resume = extrait(cv.presentation, 70);
  const experiences = cv.experiences
    .slice(0, 2)
    .map((e) => `${e.poste} — ${e.entreprise}`);
  return [
    tete === "" ? "Mon CV" : tete,
    ...(resume === null ? [] : [resume]),
    ...experiences,
  ];
}

/** Les lignes d'aperçu de la feuille « Lettre » : l'objet, puis l'ouverture. Vide sans lettre. */
export function apercuDeLaLettre(dossier: Pick<Dossier, "lettre">): string[] {
  if (dossier.lettre === null) return [];
  const ouverture = extrait(dossier.lettre.paragraphes[0]?.texte ?? null, 110);
  return [dossier.lettre.objet, ...(ouverture === null ? [] : [ouverture])];
}

/** Les textes de l'espace, en un seul endroit. */
export const TEXTES = {
  titre: "Candidatures",
  /** « ‹ Dossier » : d'où l'on vient en lisant un export. */
  retourDossier: "Dossier",
  videTitre: "Rien ici pour l'instant",
  videPhrase: "Depuis une offre, touche « Adapter mon CV » : ton dossier arrivera ici.",
  videCandidatees: "Aucune candidature marquée pour l'instant.",
  videCandidateesPhrase:
    "Quand tu auras envoyé un dossier, dis-le-nous : il apparaîtra ici avec sa date.",
  segmentToutes: "Toutes",
  segmentCandidatees: "Candidatées",
  supprimer: "Supprimer",
  supprimerTitre: "Supprimer ce dossier ?",
  supprimerPhrase:
    "Le CV adapté et la lettre de ce dossier disparaîtront. Ton CV de base reste.",
  annuler: "Annuler",
  erreurListe: "Tes dossiers n'ont pas pu être chargés.",
  erreurReseau: "Pas de connexion. Tes dossiers reviennent dès que le réseau est là.",
  erreurDetail: "Ce dossier n'a pas pu être chargé.",
  dossierIntrouvable: "Ce dossier n'existe plus.",
  candidate: "J'ai candidaté",
  finalementNon: "Finalement non",
  continuerAtelier: "Continuer dans l'atelier",
  noteCandidate: "C'est noté. Bonne chance !",
  noteRetiree: "D'accord, le dossier reste à envoyer.",
  questionTitre: "As-tu candidaté à cette offre ?",
  questionOui: "Oui, c'est fait",
  questionPasEncore: "Pas encore",
} as const;
