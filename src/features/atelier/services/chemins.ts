/**
 * Les chemins `data-chemin` du rendu ancré, et ce qu'ils désignent dans le CV.
 *
 * ═══ Pourquoi un dictionnaire chemin → texte ═══
 *
 * Le rendu HTML du serveur ancre chaque texte issu du CV sur un chemin JSON
 * (`experiences.1.missions.2`), et quelques chemins **virtuels** que le
 * modèle compose lui-même (`identity.full_name`, `experiences.1.dates`).
 * À chaque frappe, on ne sait pas quel chemin le modèle a employé pour
 * l'élément modifié : on calcule donc **tous** les textes du CV, avant et
 * après, et l'on envoie à la feuille les chemins qui ont changé. Le
 * prochain rendu du serveur, au repos, remet la vérité partout.
 *
 * ═══ Et chemin → cible d'édition ═══
 *
 * Toucher `experiences.0.company` ouvre le formulaire de la première
 * expérience ; toucher `skills.3` ouvre celui des compétences. La cible est
 * la section du CV (et l'index dans une liste), jamais un champ seul : le
 * formulaire existant travaille par section.
 *
 * Pur, sans réseau ; la mise en forme des dates est celle du domaine `cv`.
 */

import { periodeLisible } from "@/features/cv/services/chapitres";
import type { CleChapitre, Cv } from "@/features/cv/types/cv.types";

export type Cible =
  | { section: "identity" }
  | { section: "contact" }
  | { section: "summary" }
  | { section: "experiences"; index: number }
  | { section: "educations"; index: number }
  | { section: "skills" }
  | { section: "interests" };

export interface Patch {
  chemin: string;
  texte: string;
}

function poser(m: Map<string, string>, chemin: string, texte: string | null | undefined) {
  if (texte !== null && texte !== undefined) m.set(chemin, texte);
}

/** Tous les textes du CV, par chemin — virtuels compris. */
export function textesDuCv(cv: Cv): Map<string, string> {
  const m = new Map<string, string>();
  if (cv.identite !== null) {
    poser(m, "identity.first_name", cv.identite.prenom);
    poser(m, "identity.last_name", cv.identite.nom);
    poser(m, "identity.full_name", `${cv.identite.prenom} ${cv.identite.nom}`.trim());
    poser(m, "identity.headline", cv.identite.titre);
  }
  if (cv.contact !== null) {
    poser(m, "contact.phone", cv.contact.telephone);
    poser(m, "contact.email", cv.contact.email);
    poser(m, "contact.city", cv.contact.ville);
    cv.contact.liens.forEach((l, i) => {
      poser(m, `contact.links.${i}.url`, l.url);
      poser(m, `contact.links.${i}.label`, l.libelle);
    });
  }
  poser(m, "summary", cv.presentation);
  cv.experiences.forEach((e, i) => {
    poser(m, `experiences.${i}`, [e.poste, e.entreprise].filter(Boolean).join(" - "));
    poser(m, `experiences.${i}.position`, e.poste);
    poser(m, `experiences.${i}.company`, e.entreprise);
    poser(m, `experiences.${i}.location`, e.lieu);
    poser(m, `experiences.${i}.dates`, periodeLisible(e.debut, e.fin, e.enCours));
    e.missions.forEach((mission, j) =>
      poser(m, `experiences.${i}.missions.${j}`, mission),
    );
  });
  cv.formations.forEach((f, i) => {
    poser(m, `educations.${i}.degree`, f.diplome);
    poser(m, `educations.${i}.school`, f.ecole);
    poser(m, `educations.${i}.location`, f.lieu);
    poser(m, `educations.${i}.dates`, periodeLisible(f.debut, f.fin, f.enCours));
  });
  cv.competences.forEach((c, i) => poser(m, `skills.${i}`, c.nom));
  cv.langues.forEach((l, i) => poser(m, `languages.${i}`, l.langue));
  cv.interets.forEach((it, i) => poser(m, `interests.${i}`, it.nom));
  return m;
}

/** Les chemins dont le texte a changé entre deux CV. Un chemin disparu
 *  (élément retiré) s'efface : texte vide, le rendu suivant le retirera. */
export function differences(avant: Cv, apres: Cv): Patch[] {
  const a = textesDuCv(avant);
  const b = textesDuCv(apres);
  const patches: Patch[] = [];
  for (const [chemin, texte] of b) {
    if (a.get(chemin) !== texte) patches.push({ chemin, texte });
  }
  for (const chemin of a.keys()) {
    if (!b.has(chemin)) patches.push({ chemin, texte: "" });
  }
  return patches;
}

/** La section du CV qu'un chemin désigne, ou `null` (titre de rubrique, inconnu). */
export function cibleDuChemin(chemin: string): Cible | null {
  const [racine, suite] = chemin.split(".", 2);
  switch (racine) {
    case "identity":
      return { section: "identity" };
    case "contact":
      return { section: "contact" };
    case "summary":
      return { section: "summary" };
    case "experiences":
    case "educations": {
      const index = Number(suite);
      return Number.isInteger(index) && index >= 0 ? { section: racine, index } : null;
    }
    case "skills":
    case "languages":
      return { section: "skills" };
    case "interests":
      return { section: "interests" };
    default:
      return null;
  }
}

/** Le premier chemin de la feuille qui montre cette cible — pour y
 *  revenir depuis « Je corrige ». */
export function cheminDeCible(cible: Cible): string {
  switch (cible.section) {
    case "identity":
      return "identity.full_name";
    case "contact":
      return "contact.email";
    case "summary":
      return "summary";
    case "experiences":
      return `experiences.${cible.index}.position`;
    case "educations":
      return `educations.${cible.index}.degree`;
    case "skills":
      return "skills.0";
    case "interests":
      return "interests.0";
  }
}

export function sectionDeCible(cible: Cible): CleChapitre {
  return cible.section;
}

/** Comment nommer ce qu'on modifie : « Expérience chez Zara », « À propos ». */
export function libelleDeCible(cible: Cible, cv: Cv): string {
  switch (cible.section) {
    case "identity":
      return "Identité";
    case "contact":
      return "Coordonnées";
    case "summary":
      return "À propos";
    case "experiences": {
      const e = cv.experiences[cible.index];
      return e === undefined ? "Expérience" : `Expérience chez ${e.entreprise || "…"}`;
    }
    case "educations": {
      const f = cv.formations[cible.index];
      return f === undefined ? "Formation" : f.diplome || "Formation";
    }
    case "skills":
      return "Compétences et langues";
    case "interests":
      return "Centres d'intérêt";
  }
}

// ─────────────────────────────────────────────────────────────────────
// La lettre
// ─────────────────────────────────────────────────────────────────────

export type CibleLettre =
  | { partie: "objet" }
  | { partie: "destinataire" }
  | { partie: "formule" }
  | { partie: "paragraphe"; index: number }
  /** Expéditeur, entreprise : ça vient du CV ou de l'offre, pas de la lettre. */
  | { partie: "hors-lettre" };

export function cibleDeLettre(chemin: string): CibleLettre | null {
  if (chemin === "subject") return { partie: "objet" };
  if (chemin === "greeting") return { partie: "destinataire" };
  if (chemin === "closing") return { partie: "formule" };
  const m = /^paragraphs\.(\d+)\.text$/.exec(chemin);
  if (m !== null) return { partie: "paragraphe", index: Number(m[1]) };
  if (chemin.startsWith("sender.") || chemin.startsWith("recipient."))
    return { partie: "hors-lettre" };
  return null;
}
