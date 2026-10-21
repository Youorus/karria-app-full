/**
 * Les règles d'affichage des offres — celles de la V1, à l'identique.
 *
 * Source : `Karria-Frontend`, `src/features/jobs/utils/job-offer-display.ts`
 * et les cartes du fil. On reprend les mêmes règles — pas des règles
 * « inspirées » — parce que l'API renvoie les mêmes données et que
 * l'utilisateur doit retrouver les mêmes libellés. Seule différence : ici
 * elles sont pures, testées, et hors des écrans.
 */

// ─────────────────────────────────────────────────────────────────────
// Lire la donnée source quand les champs normalisés manquent
// ─────────────────────────────────────────────────────────────────────

type Brut = Record<string, unknown> | null | undefined;

function chaine(...valeurs: unknown[]): string | null {
  for (const v of valeurs) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function imbrique(source: Brut, chemin: string[]): unknown {
  let courant: unknown = source;
  for (const cle of chemin) {
    if (typeof courant !== "object" || courant === null || !(cle in courant)) return null;
    courant = (courant as Record<string, unknown>)[cle];
  }
  return courant;
}

/** Le lieu : la ville normalisée, sinon ce que la source en dit. */
export function lieuDeLOffre(ville: string | null, brut: Brut): string | null {
  return chaine(
    ville,
    imbrique(brut, ["lieuTravail", "libelle"]),
    imbrique(brut, ["address", "city"]),
    imbrique(brut, ["location", "city"]),
    brut?.city,
    brut?.city_name,
    brut?.commune,
    brut?.ville,
  );
}

/** Le contrat : le libellé normalisé, sinon celui de la source. */
export function contratDeLOffre(contrat: string | null, brut: Brut): string | null {
  return chaine(
    contrat,
    imbrique(brut, ["contract_type", "label"]),
    brut?.typeContratLibelle,
    brut?.typeContrat,
    brut?.contract_label,
    brut?.natureContrat,
  );
}

/** Le texte de l'annonce, nettoyé du Markdown — comme la V1. */
export function descriptionDeLOffre(resume: string | null, brut: Brut): string | null {
  const texte = chaine(
    resume,
    imbrique(brut, ["description"]),
    imbrique(brut, ["descriptionOffre"]),
    imbrique(brut, ["offer_description"]),
  );
  if (texte === null) return null;
  return texte
    .replace(/\*\*/g, "")
    .replace(/^-{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Le contrat en abrégé, pour les pastilles : « Contrat à durée
 * indéterminée » → « CDI ». Les libellés viennent de France Travail
 * (`contract_types`) et des autres sources ; un libellé inconnu est rendu
 * tel quel plutôt que deviné.
 *
 * L'ordre compte : « CDI intérimaire » doit être reconnu avant « intérim ».
 */
const ABREVIATIONS: [RegExp, string][] = [
  [/cdi\s*int[ée]rimaire/i, "CDI intérimaire"],
  [/dur[ée]e\s+ind[ée]termin[ée]e|^cdi\b/i, "CDI"],
  [/dur[ée]e\s+d[ée]termin[ée]e|^cdd\b/i, "CDD"],
  [/int[ée]rim|^mis\b/i, "Intérim"],
  [/professionnalisation/i, "Contrat pro"],
  [/apprentissage|alternance|^alt\b/i, "Alternance"],
  [/saisonnier|^sai\b/i, "Saisonnier"],
  [/stage/i, "Stage"],
  [/lib[ée]ral|ind[ée]pendant|freelance|^lib\b/i, "Freelance"],
  [/franchise|^fra\b/i, "Franchise"],
];

export function contratCourt(libelle: string): string {
  for (const [motif, court] of ABREVIATIONS) {
    if (motif.test(libelle)) return court;
  }
  return libelle;
}

// ─────────────────────────────────────────────────────────────────────
// La tuile de l'entreprise
// ─────────────────────────────────────────────────────────────────────

/** « BNP Paribas » → « BP » ; « Doctolib » → « DO ». La règle de la V1. */
export function initiales(entreprise: string | null): string {
  const nom = (entreprise ?? "").trim();
  if (nom === "") return "?";
  const mots = nom.split(/\s+/);
  if (mots.length >= 2) return (mots[0]!.charAt(0) + mots[1]!.charAt(0)).toUpperCase();
  return nom.slice(0, 2).toUpperCase();
}

const ANGLE_D_OR = 137.508;

/**
 * La couleur de la tuile sans logo : la teinte tourne de l'angle d'or à
 * chaque carte, si bien que deux voisines n'ont jamais la même couleur.
 * Saturation 65 %, luminosité 55 % : la nuance de la V1.
 *
 * C'est une couleur **calculée** à partir de la donnée, pas une valeur de
 * charte : elle n'a pas sa place dans `tokens.css`.
 */
export function teinteDeTuile(rang: number): string {
  const sur = Number.isFinite(rang) && rang >= 0 ? Math.floor(rang) : 0;
  return `hsl(${(sur * ANGLE_D_OR) % 360}, 65%, 55%)`;
}

// ─────────────────────────────────────────────────────────────────────
// Salaire et date
// ─────────────────────────────────────────────────────────────────────

/** « Mensuel de 2048.00 Euros à 2730.00 Euros » → « 2 048 - 2 730€ / mois ». */
export function salaireLisible(brut: string | null): string | null {
  if (!brut) return null;
  const montants = brut.match(/\d+(?:\.\d+)?/g);
  if (!montants) return null;
  const formates = montants
    .slice(0, 2)
    .map((m) => parseFloat(m).toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
  const fourchette =
    formates.length > 1 ? `${formates[0]} - ${formates[1]}€` : `${formates[0]}€`;
  const bas = brut.toLowerCase();
  const periode = bas.includes("mensuel")
    ? " / mois"
    : bas.includes("annuel")
      ? " / an"
      : bas.includes("horaire")
        ? " / h"
        : "";
  return `${fourchette}${periode}`;
}

/**
 * « il y a environ 2 heures » — le libellé de la V1 (date-fns,
 * `formatDistanceToNow` en français), sans embarquer date-fns pour une
 * seule fonction. `maintenant` est passé : la fonction reste pure.
 */
export function ilYa(iso: string, maintenant: Date): string {
  const date = new Date(iso);
  if (iso === "" || Number.isNaN(date.getTime())) return "";
  const secondes = Math.max(0, (maintenant.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(secondes / 60);
  if (minutes < 1) return "il y a moins d'une minute";
  if (minutes < 45)
    return minutes === 1 ? "il y a 1 minute" : `il y a ${minutes} minutes`;
  const heures = Math.round(minutes / 60);
  if (minutes < 90) return "il y a environ 1 heure";
  if (heures < 24) return `il y a environ ${heures} heures`;
  const jours = Math.round(heures / 24);
  if (heures < 42) return "il y a 1 jour";
  if (jours < 30) return `il y a ${jours} jours`;
  const mois = Math.round(jours / 30);
  if (jours < 45) return "il y a environ 1 mois";
  if (mois < 12) return `il y a ${mois} mois`;
  const ans = Math.round(mois / 12);
  return ans <= 1 ? "il y a environ 1 an" : `il y a environ ${ans} ans`;
}

// ─────────────────────────────────────────────────────────────────────
// Qualité et partage
// ─────────────────────────────────────────────────────────────────────

export function qualite(
  brute: string | null | undefined,
): "haute" | "moyenne" | "basse" | null {
  if (brute === "high") return "haute";
  if (brute === "medium") return "moyenne";
  if (brute === "low") return "basse";
  return null;
}

/** Le texte partagé, repris de la V1. */
export function messageDePartage(offre: {
  titre: string;
  entreprise: string | null;
  ville: string | null;
  lienCandidature: string | null;
}): string {
  const lignes = [
    `💼 ${offre.titre}${offre.entreprise ? ` chez ${offre.entreprise}` : ""}`,
  ];
  if (offre.ville) lignes.push(`📍 ${offre.ville}`);
  if (offre.lienCandidature) lignes.push("", offre.lienCandidature);
  return lignes.join("\n");
}
