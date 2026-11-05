/**
 * Les dossiers de candidature, et leur traduction — les routes
 * `/applications` de `karria_api_v2` (`docs/contrat-api-candidatures.md`).
 *
 * ═══ Les routes, toutes ═══
 *
 * - `POST /applications` : ouvrir un dossier depuis une offre (copie du CV,
 *   offre figée, adaptation lancée). `200` si un dossier existe déjà pour
 *   cette offre : rien n'est relancé.
 * - `GET /applications?applied=` : la liste, cartes légères.
 * - `GET /applications/{id}` : le dossier entier. À relire toutes les 2 s
 *   tant que `adaptation` vaut `en_cours`.
 * - `DELETE /applications/{id}` : supprimer (le CV de base n'est pas concerné).
 * - `POST /applications/{id}/adapt` : relancer après un échec.
 * - `PUT /applications/{id}/cv` : la copie retouchée à la main, entière.
 * - `POST /applications/{id}/propositions/{pid}` : accepter, refuser, revenir.
 * - `POST|PUT /applications/{id}/letter`, `POST …/letter/paragraphs/{i}/regenerate`.
 * - `POST|DELETE /applications/{id}/applied` : « j'ai candidaté » / « finalement non ».
 * - `GET /cv/me/generated-cvs?dossier_id=` (module `documents`) : les exports
 *   déjà faits pour ce dossier.
 *
 * Quatre routes confient l'offre et le CV à un modèle (créer, relancer,
 * ébaucher la lettre, réécrire un paragraphe) : elles passent par la porte
 * du consentement à l'IA (`403 ai_consent_required`, usage `application`)
 * et sont bornées à 30 appels par 10 minutes (`429 ai_rate_limited`,
 * `details.retry_after`). C'est à l'appelant d'envelopper le geste avec
 * `useActionIa`.
 *
 * ═══ Les refus que l'atelier doit prévoir ═══
 *
 * Rien n'est traduit ici : `ErreurApi.raison` porte le code du contrat et
 * `details` ses précisions. Les plus utiles à l'atelier :
 * `proposition_invalid` (409, la valeur ne tient pas dans son chemin —
 * `details.path`, `details.why`), `proposition_path_invalid` (409,
 * l'élément a été retiré à la main), `dossier_conflict` (409, le dossier a
 * bougé pendant l'appel au modèle : relire, réessayer), `cv_invalid` et
 * `letter_invalid` (422, `details.fields: [{ field, message }]`),
 * `cv_too_large` (422, plus de 256 Kio), `adaptation_in_progress` (409).
 *
 * ═══ La traduction, dans les deux sens ═══
 *
 * Le CV d'un dossier a la forme de `GET /cv/me` : on réutilise `versCv` du
 * domaine `cv` pour lire, et `versCvBrut` (ici) pour écrire — le reste de
 * l'application ne voit jamais de `snake_case`.
 */

import { versCv } from "@/features/cv/api/cv.api";
import type { CompetenceBrute, Cv, ExperienceBrute } from "@/features/cv/types/cv.types";
import { http } from "@/lib/http";

import type {
  CarteDossier,
  CarteDossierBrute,
  Couverture,
  CouvertureBrute,
  CvDeDossierBrut,
  Decision,
  Dossier,
  DossierBrut,
  ErreurAdaptation,
  ErreurAdaptationBrute,
  ExportBrut,
  ExportDossier,
  Lettre,
  LettreBrute,
  ListeDossiersBrute,
  ListeExportsBrute,
  OffreFigee,
  OffreFigeeBrute,
  Proposition,
  PropositionBrute,
  ValeurProposee,
  ValeurProposeeBrute,
} from "../types/candidatures.types";

// ─────────────────────────────────────────────────────────────────────
// Brut → app
// ─────────────────────────────────────────────────────────────────────

const ERREURS_ADAPTATION: Record<ErreurAdaptationBrute, ErreurAdaptation> = {
  ai_unavailable: "ia_indisponible",
  ai_output_invalid: "sortie_invalide",
  queue_unavailable: "file_indisponible",
};

export function versOffreFigee(b: OffreFigeeBrute): OffreFigee {
  return {
    id: b.offer_id,
    titre: b.title,
    entreprise: b.company ?? null,
    logo: b.logo_url ?? null,
    siteEntreprise: b.website ?? null,
    ville: b.city ?? null,
    contrat: b.contract_label ?? null,
    lienCandidature: b.source_url ?? null,
    extrait: b.excerpt ?? null,
    description: b.description ?? null,
    motsCles: b.keywords ?? [],
    publieeLe: b.published_at ?? null,
  };
}

/** `before`/`after` : un texte, ou une liste réordonnée (compétences,
 *  expériences). La liste se reconnaît à son premier élément. */
function sontDesExperiences(
  v: ExperienceBrute[] | CompetenceBrute[],
): v is ExperienceBrute[] {
  return v.length > 0 && "position" in v[0];
}

function versValeurProposee(v: ValeurProposeeBrute): ValeurProposee {
  if (typeof v === "string") return v;
  if (v.length === 0) return [];
  if (sontDesExperiences(v)) {
    return v.map((e) => ({
      poste: e.position,
      entreprise: e.company,
      lieu: e.location,
      debut: e.start_date,
      fin: e.end_date,
      enCours: e.is_current,
      missions: e.missions ?? [],
    }));
  }
  return v.map((c) => ({ nom: c.name, niveau: c.level }));
}

export function versProposition(b: PropositionBrute): Proposition {
  return {
    id: b.id,
    chemin: b.path,
    avant: versValeurProposee(b.before),
    apres: versValeurProposee(b.after),
    raison: b.reason,
    etat: b.state,
  };
}

export function versLettre(b: LettreBrute): Lettre {
  return {
    destinataire: b.recipient,
    objet: b.subject,
    paragraphes: b.paragraphs.map((p) => ({ sorte: p.kind, texte: p.text })),
    formule: b.closing,
  };
}

function versCouverture(b: CouvertureBrute): Couverture {
  return { presents: b.present, manquants: b.missing, ratio: b.ratio };
}

export function versDossier(b: DossierBrut): Dossier {
  return {
    id: b.id,
    offre: versOffreFigee(b.offer),
    modeleId: b.template_id,
    cv: versCv({ ...b.cv, updated_at: b.updated_at }),
    empreinteCvDeBase: b.cv_base_hash,
    baseChangee: b.base_changed,
    propositions: b.propositions.map(versProposition),
    lettre: b.letter === null ? null : versLettre(b.letter),
    couverture: versCouverture(b.coverage),
    statut: b.status,
    adaptation: b.adaptation,
    erreurAdaptation:
      b.adaptation_error === null ? null : ERREURS_ADAPTATION[b.adaptation_error],
    candidateLe: b.applied_at,
    creeLe: b.created_at,
    modifieLe: b.updated_at,
  };
}

export function versCarteDossier(b: CarteDossierBrute): CarteDossier {
  return {
    id: b.id,
    offre: versOffreFigee(b.offer),
    modeleId: b.template_id,
    statut: b.status,
    adaptation: b.adaptation,
    couverture: b.coverage_ratio,
    propositionsEnAttente: b.pending_propositions,
    aUneLettre: b.has_letter,
    candidateLe: b.applied_at,
    creeLe: b.created_at,
    modifieLe: b.updated_at,
  };
}

export function versExport(b: ExportBrut): ExportDossier {
  return {
    id: b.id,
    genre: b.kind === "letter" ? "lettre" : "cv",
    modele: b.template?.label ?? null,
    creeLe: b.created_at,
    pdf: b.pdf_url ?? null,
    docx: b.docx_url ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// App → brut
// ─────────────────────────────────────────────────────────────────────

/** Le CV de l'app → la forme de `GET /cv/me` sans `id` ni `image_url`,
 *  pour `PUT /applications/{id}/cv`. Le serveur revalide. */
export function versCvBrut(cv: Cv): CvDeDossierBrut {
  return {
    summary: cv.presentation,
    identity:
      cv.identite === null
        ? null
        : {
            first_name: cv.identite.prenom,
            last_name: cv.identite.nom,
            headline: cv.identite.titre,
          },
    contact:
      cv.contact === null
        ? null
        : {
            email: cv.contact.email,
            phone: cv.contact.telephone,
            city: cv.contact.ville,
            links: cv.contact.liens.map((l) => ({ label: l.libelle, url: l.url })),
          },
    experiences: cv.experiences.map((e) => ({
      position: e.poste,
      company: e.entreprise,
      location: e.lieu,
      start_date: e.debut,
      end_date: e.fin,
      is_current: e.enCours,
      missions: e.missions,
    })),
    educations: cv.formations.map((f) => ({
      degree: f.diplome,
      school: f.ecole,
      location: f.lieu,
      start_date: f.debut,
      end_date: f.fin,
      is_in_progress: f.enCours,
    })),
    skills: cv.competences.map((c) => ({ name: c.nom, level: c.niveau })),
    languages: cv.langues.map((l) => ({ language: l.langue, level: l.niveau })),
    interests: cv.interets.map((i) => ({ name: i.nom, category: i.categorie })),
  };
}

export function versLettreBrute(lettre: Lettre): LettreBrute {
  return {
    recipient: lettre.destinataire,
    subject: lettre.objet,
    paragraphs: lettre.paragraphes.map((p) => ({ kind: p.sorte, text: p.texte })),
    closing: lettre.formule,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Les routes
// ─────────────────────────────────────────────────────────────────────

/**
 * Ouvre un dossier pour cette offre — ou rend celui qui existe déjà.
 * Route d'IA : `403 ai_consent_required` sans accord ; `409 cv_missing`
 * sans CV de base ; `403 template_locked` (`details.template_id`).
 */
export async function ouvrirDossier(
  offreId: string,
  modeleId: string | null = null,
): Promise<Dossier> {
  return versDossier(
    await http.post<DossierBrut>("/applications", {
      offer_id: offreId,
      template_id: modeleId,
    }),
  );
}

/** La liste, du plus récemment modifié au plus ancien. `candidatees` :
 *  seulement les dossiers où la personne a candidaté. */
export async function lireDossiers(candidatees = false): Promise<CarteDossier[]> {
  const brut = await http.get<ListeDossiersBrute>(
    `/applications?applied=${candidatees ? "true" : "false"}`,
  );
  return brut.items.map(versCarteDossier);
}

export async function lireDossier(id: string): Promise<Dossier> {
  return versDossier(await http.get<DossierBrut>(`/applications/${id}`));
}

export async function supprimerDossier(id: string): Promise<void> {
  await http.delete(`/applications/${id}`);
}

/** Relance l'adaptation après un échec seulement (`409 adaptation_not_failed`). */
export async function relancerAdaptation(id: string): Promise<Dossier> {
  return versDossier(await http.post<DossierBrut>(`/applications/${id}/adapt`, {}));
}

/** La copie retouchée, entière. `422 cv_invalid` (`details.fields`),
 *  `409 adaptation_in_progress`. */
export async function modifierCvDuDossier(id: string, cv: Cv): Promise<Dossier> {
  return versDossier(
    await http.put<DossierBrut>(`/applications/${id}/cv`, { cv: versCvBrut(cv) }),
  );
}

/** `accepter` applique `apres` ; `refuser` remet `avant` ; `revenir` remet
 *  `avant` et laisse la proposition en attente. */
export async function deciderProposition(
  id: string,
  propositionId: string,
  decision: Decision,
): Promise<Dossier> {
  return versDossier(
    await http.post<DossierBrut>(`/applications/${id}/propositions/${propositionId}`, {
      decision,
    }),
  );
}

/** Karria écrit la première ébauche (remplace la lettre existante). Route d'IA. */
export async function ebaucherLettre(id: string): Promise<Dossier> {
  return versDossier(await http.post<DossierBrut>(`/applications/${id}/letter`, {}));
}

/** La lettre entière, retouchée. `422 letter_invalid` (`details.fields`). */
export async function modifierLettre(id: string, lettre: Lettre): Promise<Dossier> {
  return versDossier(
    await http.put<DossierBrut>(`/applications/${id}/letter`, versLettreBrute(lettre)),
  );
}

/** Un seul paragraphe réécrit, sa sorte conservée. `instruction` : 300
 *  caractères au plus, ou `null`. Route d'IA. */
export async function regenererParagraphe(
  id: string,
  index: number,
  instruction: string | null = null,
): Promise<Dossier> {
  return versDossier(
    await http.post<DossierBrut>(
      `/applications/${id}/letter/paragraphs/${index}/regenerate`,
      { instruction },
    ),
  );
}

/** « J'ai candidaté » : la première date reste. Idempotent. */
export async function marquerCandidate(id: string): Promise<Dossier> {
  return versDossier(await http.post<DossierBrut>(`/applications/${id}/applied`, {}));
}

/** « Finalement non » : retour à `brouillon` ou `pret`. Idempotent. */
export async function retirerCandidate(id: string): Promise<Dossier> {
  return versDossier(await http.delete<DossierBrut>(`/applications/${id}/applied`));
}

/** Les exports (`documents`) déjà faits pour ce dossier, les plus récents d'abord. */
export async function lireExportsDuDossier(id: string): Promise<ExportDossier[]> {
  const brut = await http.get<ListeExportsBrute>(
    `/cv/me/generated-cvs?dossier_id=${encodeURIComponent(id)}`,
  );
  return brut.items.map(versExport);
}
