/**
 * Les mots de l'atelier, et ce qu'on dit d'un score, d'un avertissement,
 * d'un refus.
 *
 * ═══ Le score ATS, sans chiffre inventé ═══
 *
 * La phrase qui motive ne cite aucun pourcentage d'entreprises : le chiffre
 * viendra d'une constante serveur **sourcée** (feuille de route, § 5). D'ici
 * là, « la grande majorité » est vrai, et suffit.
 *
 * ═══ Les avertissements du rendu ═══
 *
 * Le serveur les nomme (`too_few_paragraphs`, `subject_not_explicit`…) ;
 * ici on les traduit en conseils, à la deuxième personne, sans reproche.
 * Un code inconnu ne s'affiche pas : mieux vaut un conseil de moins qu'un
 * identifiant technique à l'écran.
 *
 * Pur, testé.
 */

import { ErreurApi } from "@/lib/http";

import type { ControleAts, NiveauAts, ScoreAts } from "../types/atelier.types";

export const TEXTES = {
  adapter: "Adapter mon CV à cette offre",
  adapterEnCours: "J'ouvre ton dossier…",
  sansCv: "Il te faut d'abord un CV",
  sansCvPhrase: "Importe ton CV ou crée-le avec Karria : l'adaptation partira de là.",
  allerAuCv: "Aller à mon CV",
  // La barre basse.
  modifier: "Modifier",
  karria: "Karria",
  miseEnAvant: "Mise en avant",
  /** Le mot de la barre : « Mise en avant » ne tient pas sous l'icône. */
  enAvant: "En avant",
  intitule: "Intitulé",
  finaliser: "Finaliser",
  // L'attente.
  attenteTitre: "Karria lit l'offre et ton CV",
  attentePhrase:
    "Elle relève le poste, les mots qui comptent, et ce qu'elle te propose d'ajuster. Quelques secondes.",
  echecTitre: "Karria n'a pas pu adapter ton CV",
  echecPhrase: "Ton dossier est là, tel quel. Tu peux relancer, ou continuer à la main.",
  reessayer: "Réessayer",
  continuerALaMain: "Continuer à la main",
  // La note des propositions déjà appliquées.
  noteAProposMisAJour: "Karria a mis à jour ton à-propos",
  noteIntituleMisAJour: "Karria a mis à jour ton intitulé",
  noteLesDeuxMisAJour: "Karria a mis à jour ton intitulé et ton à-propos",
  voir: "voir",
  revenir: "revenir",
  // Les propositions.
  propositionsTitre: "Ce que Karria propose",
  propositionsVide: "Rien à proposer : ton CV répond déjà bien à cette offre.",
  accepter: "Accepter",
  refuser: "Refuser",
  revenirEnArriere: "Revenir",
  toutAccepter: "Tout accepter",
  avant: "Avant",
  apres: "Après",
  couvertureTitre: "Les mots de l'offre",
  couverturePresents: "Dans ton CV",
  couvertureManquants: "Pas encore dans ton CV",
  couverturePhrase:
    "Les logiciels de tri cherchent ces mots. Ceux qui manquent, ajoute-les seulement s'ils sont vrais pour toi.",
  // Le modèle.
  modeleTitre: "Avec quel modèle ?",
  modeleActuel: "Ton modèle",
  modeleMiens: "Tes modèles",
  modeleAutres: "Et si tu changeais de style ?",
  modeleAutresPhrase:
    "Un paiement unique, et le modèle reste à toi — pour ce CV et les suivants.",
  modeleGarder: "Garder ce modèle",
  modeleChanger: "Changer",
  modeleChoisir: "Choisir un modèle",
  modeleChangerLong: "Changer de modèle",
  modeleNonRetenu:
    "Le modèle est appliqué ici, mais le dossier n'a pas pu le retenir. Il sera réessayé.",
  modeleVerrouille: "Ce modèle Premium n'est pas à toi : l'ancien est gardé.",
  autreModele: "Voir avec un autre modèle",
  modelePaiement: "Paiement en cours…",
  modeleAttente:
    "Paiement pas encore confirmé. Si tu as payé, le modèle arrivera dans quelques minutes.",
  modeleErreur: "Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant.",
  // La couleur principale (ADR-0034).
  couleur: "Couleur",
  couleurTitre: "Quelle couleur ?",
  couleurSousTitre:
    "Ta couleur habille les bandes, les filets et les puces. Le texte reste lisible.",
  couleurOrigine: "D'origine",
  couleurNuance: "Plus clair ou plus sombre",
  couleurPlusClair: "Plus clair",
  couleurPlusSombre: "Plus sombre",
  couleurCode: "Code couleur",
  couleurCodeAide: "Six caractères, comme #1A5276.",
  couleurRevenir: "Revenir à la couleur d'origine",
  couleurGarder: "Garder cette couleur",
  couleurNonRetenue:
    "La couleur est appliquée ici, mais elle n'a pas pu être retenue. Elle sera réessayée.",
  // Mise en avant.
  miseEnAvantTitre: "Ce que tu mets en avant",
  miseEnAvantPhrase:
    "L'ordre des éléments est le tien. Masquer retire un élément de ce CV seulement ; ton CV de base reste entier.",
  miseEnAvantRubriques: "L'ordre des rubriques suit le modèle choisi.",
  masquer: "Masquer",
  montrer: "Montrer",
  masques: "Masqués dans ce CV",
  // L'intitulé.
  intituleTitre: "Poste visé",
  intituleAide:
    "Le poste que tu vises, formulé comme dans les offres — sans « recherche » ni « candidat ».",
  // La lettre.
  lettreTitre: "Et ta lettre ?",
  lettrePhrase:
    "Karria en écrit une première version à partir de l'offre et de ton CV adapté. Tu la retouches, paragraphe par paragraphe.",
  lettreEbaucher: "Écrire ma lettre",
  lettreEbauche: "Karria écrit…",
  lettrePasser: "Plus tard",
  lettreModifier: "Je modifie",
  lettreKarria: "Karria réécrit",
  lettreConsigne: "Une consigne, si tu veux (facultatif)",
  lettreConsignePlaceholder:
    "Ex. : plus court, plus direct, cite mon expérience chez Zara",
  lettreGarderAncien: "Garder l'ancien",
  lettreGarderNouveau: "Garder le nouveau",
  // Le style de la lettre (ADR-0036) : celle du modèle, ou la sobre.
  lettreStyleModele: "Du modèle",
  lettreStyleSobre: "Sobre",
  lettreStyleAide: "Style de la lettre",
  lettreStyleNonRetenu:
    "Ce style est appliqué ici, mais le dossier n'a pas pu le retenir. Il sera réessayé.",
  lettreHorsLettre:
    "Ces informations viennent de ton CV et de l'offre : modifie-les dans l'atelier.",
  // L'atelier libre (« Nouveau CV », sans dossier).
  nouveauCv: "Nouveau CV",
  nouveauCvSousTitre: "À partir de ton CV, sans le modifier",
  voirMesCv: "Voir mes CV",
  // Finaliser.
  finaliserTitre: "Ton dossier",
  finaliserTitreLibre: "Ton CV",
  generationPhraseLibre: "Le PDF et le Word de ton CV. Une poignée de secondes.",
  generation: "Karria met en page…",
  generationPhrase:
    "Le PDF et le Word de ton CV, puis de ta lettre. Une poignée de secondes.",
  telecharger: "Télécharger",
  envoyerParEmail: "Envoyer par e-mail",
  envoye: "Envoyé",
  aMonAdresse: "À mon adresse",
  autreAdresse: "Une autre adresse",
  confirmerEnvoi: "Envoyer à cette adresse",
  atsPhrase:
    "Ton CV est lisible par les logiciels de tri de candidatures qu'utilisent la grande majorité des grandes entreprises, en France et dans le monde.",
  atsPhraseMoyen:
    "Ton CV est lu par les logiciels de tri de candidatures ; quelques points l'aideraient à passer mieux encore.",
  atsPhraseFaible:
    "Les logiciels de tri de candidatures ont du mal à lire ton CV tel quel. Les points ci-dessous font la différence.",
  atsPoints: "Ce qui ferait la différence",
  jeCorrige: "Je corrige",
  optimiser: "Optimiser pour les logiciels de tri",
  exportIntrouvable: "Les documents n'ont pas pu être générés. Réessaie dans un instant.",
  accordIaPourLeScore:
    "Le score ATS est expliqué par l'IA de Karria : dis-nous d'abord si tu es d'accord.",
} as const;

// ─────────────────────────────────────────────────────────────────────
// Le score ATS
// ─────────────────────────────────────────────────────────────────────

export function phraseAts(niveau: NiveauAts): string {
  if (niveau === "bon") return TEXTES.atsPhrase;
  if (niveau === "moyen") return TEXTES.atsPhraseMoyen;
  return TEXTES.atsPhraseFaible;
}

/** Les contrôles où il reste des points à prendre, les plus payants d'abord — trois au plus. */
export function pointsAAmeliorer(score: ScoreAts): ControleAts[] {
  return score.controles
    .filter((c) => c.conseil !== null && c.points < c.maxPoints)
    .sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points))
    .slice(0, 3);
}

/** Où « Je corrige » mène, selon le contrôle. */
export type CorrectionAts =
  | { geste: "modifier"; section: "contact" | "summary" }
  | { geste: "karria" }
  | { geste: "mise-en-avant" }
  | { geste: "ats-safe" }
  | { geste: "modele" };

export function correctionDe(cle: string): CorrectionAts {
  switch (cle) {
    case "contact":
      return { geste: "modifier", section: "contact" };
    case "content":
      return { geste: "modifier", section: "summary" };
    case "keywords":
      return { geste: "karria" };
    case "sections":
      return { geste: "mise-en-avant" };
    case "fonts":
    case "text_layer":
      return { geste: "ats-safe" };
    default:
      return { geste: "modele" };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Les avertissements du rendu
// ─────────────────────────────────────────────────────────────────────

const CONSEILS: Record<string, string> = {
  headline_missing:
    "Ajoute le poste visé : il s'affiche sous ton nom dans tous les modèles.",
  photo_missing: "Ce modèle a une place pour ta photo ; sans elle, l'espace reste vide.",
  more_than_one_page:
    "Ton CV dépasse une page. Raccourcis une mission ou masque un élément ancien.",
  too_few_paragraphs: "Une lettre tient mieux en trois ou quatre paragraphes.",
  too_many_paragraphs: "Plus de cinq paragraphes, c'est long : regroupe-en deux.",
  body_too_long: "Ta lettre est longue à lire : vise une page.",
  subject_not_explicit:
    "Commence l'objet par « Candidature » : c'est ce que les recruteurs cherchent.",
  closing_missing: "Termine par une formule de politesse.",
  company_missing: "Le nom de l'entreprise manque en tête de lettre.",
  logo_unavailable:
    "Le logo de l'entreprise n'a pas pu être posé ; la lettre se lit sans.",
};

export function conseilsDe(avertissements: readonly string[]): string[] {
  return avertissements
    .map((a) => CONSEILS[a])
    .filter((c): c is string => c !== undefined);
}

// ─────────────────────────────────────────────────────────────────────
// Les refus
// ─────────────────────────────────────────────────────────────────────

function heuresDepuis(secondes: unknown): string {
  const n = typeof secondes === "number" ? secondes : 0;
  if (n <= 0) return "un peu plus tard";
  const heures = Math.ceil(n / 3600);
  return heures <= 1 ? "dans une heure" : `dans ${heures} heures`;
}

/** Ce qu'on dit quand l'envoi est refusé — humainement. */
export function messageDEnvoi(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau)
      return "Pas de connexion. Rien n'est parti : réessaie quand le réseau sera là.";
    if (cause.raison === "send_quota_exceeded") {
      const scope = cause.details.scope;
      if (scope === "recipient")
        return "Cette adresse a déjà reçu deux envois aujourd'hui. Réessaie demain, ou envoie à ton adresse.";
      if (scope === "origin")
        return `Beaucoup d'envois partent d'ici en ce moment. Réessaie ${heuresDepuis(cause.details.retry_after)}.`;
      return `Tu as fait tes cinq envois du jour. Tu pourras renvoyer ${heuresDepuis(cause.details.retry_after)} — les fichiers restent téléchargeables.`;
    }
    if (cause.raison === "recipient_invalid")
      return "Cette adresse e-mail n'a pas l'air valide.";
    if (cause.raison === "account_email_unknown")
      return "L'adresse de ton compte est introuvable : saisis une adresse.";
    if (cause.raison === "document_file_missing")
      return "Un des documents n'a pas de fichier. Regénère-les, puis réessaie.";
    return cause.message;
  }
  return "L'envoi n'a pas abouti. Réessaie dans un instant.";
}

export function messageDExport(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau) return "Pas de connexion. Réessaie quand le réseau sera là.";
    if (cause.raison === "template_locked" || cause.raison === "template_not_owned")
      return "Ce modèle n'est pas à toi. Choisis-en un autre dans l'atelier.";
    if (cause.raison === "rendering_unavailable")
      return "La mise en page est indisponible pour quelques minutes. Réessaie bientôt.";
    if (cause.raison === "cv_missing") return TEXTES.sansCvPhrase;
    return cause.message;
  }
  return TEXTES.exportIntrouvable;
}

export function messageDeRendu(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau)
      return "Pas de connexion : la feuille se mettra à jour dès que le réseau sera là.";
    if (cause.raison === "template_not_owned" || cause.raison === "template_locked")
      return "Ce modèle n'est pas à toi : choisis-en un autre.";
    if (cause.raison === "render_rate_limited")
      return "Beaucoup de modifications d'un coup : la feuille rattrape dans un instant.";
    return cause.message;
  }
  return "La feuille n'a pas pu être mise à jour.";
}

/** « 3 propositions », « 1 proposition », rien à zéro. */
export function compteurPropositions(n: number): string | null {
  if (n <= 0) return null;
  return n === 1 ? "1 proposition" : `${n} propositions`;
}

// ─────────────────────────────────────────────────────────────────────
// Le partage porte Karria
// ─────────────────────────────────────────────────────────────────────

/** Le lien intelligent du site : App Store, Google Play ou la page selon l'appareil. */
export const LIEN_APP = "https://karria.fr/app";

/**
 * Le message qui accompagne un fichier partagé (iOS : `Share.share` avec
 * le fichier **et** ce texte). Court, à la première personne — c'est la
 * personne qui parle, pas Karria —, et le lien en clair : le destinataire
 * sait d'où vient le document et où trouver l'app.
 */
export function messageDePartageDocument(genre: "cv" | "lettre"): string {
  return genre === "cv"
    ? `Mon CV, préparé avec Karria — l'app qui adapte ton CV à chaque offre : ${LIEN_APP}`
    : `Ma lettre de motivation, préparée avec Karria — l'app qui adapte ton CV et ta lettre à chaque offre : ${LIEN_APP}`;
}

export function nomDeFichier(
  genre: "cv" | "lettre",
  nom: string,
  entreprise: string | null,
  format: "pdf" | "docx",
): string {
  const propre = (t: string) =>
    t
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const base =
    genre === "cv"
      ? `CV - ${propre(nom) || "Karria"}`
      : `Lettre de motivation - ${propre(entreprise ?? "") || "Karria"}`;
  return `${base}.${format}`;
}
