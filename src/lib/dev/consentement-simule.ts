/**
 * Le consentement à l'IA du faux serveur — le contrat
 * `docs/contrat-api-consentement-ia.md`, en exécutable.
 *
 * Un fichier à part, parce que deux faux serveurs le lisent : celui du
 * compte (`/auth/me`, `/auth/me/ai-consent`) et ceux des routes d'IA (le
 * CV, Karria), qui refusent avec `ai_consent_required` tant que rien n'est
 * accepté — exactement comme la vraie API.
 *
 * Depuis le 2026-11-05 : `GET /auth/ai-disclosure` (public) et l'accord
 * donné « en continuant » (`ai_disclosure_version` sur les requêtes de
 * connexion), consigné en silence s'il vise la version courante, jamais si
 * l'accord a été retiré — comme `AcceptAiConsent.at_sign_in` côté API.
 */

export const VERSION_SIMULEE = "2026-10.simule01";
const VERSION = VERSION_SIMULEE;

const etat: { accepteLe: string | null; retireLe: string | null } = {
  accepteLe: null,
  retireLe: null,
};

export function consentementIaAccorde(): boolean {
  return etat.accepteLe !== null && etat.retireLe === null;
}

/** `GET /auth/ai-disclosure` : l'information courante, sans session. */
export function disclosureIaBrute() {
  return {
    version: VERSION,
    providers: [{ id: "gemini", name: "Google Gemini" }],
    purposes: [
      "assistant",
      "transcription",
      "cv_creation",
      "cv_import",
      "photo_enhancement",
      "template_analysis",
      "application",
    ],
  };
}

export function consentementIaBrut() {
  const accorde = consentementIaAccorde();
  return {
    required: !accorde,
    disclosure: disclosureIaBrute(),
    accepted_version: etat.accepteLe === null ? null : VERSION,
    accepted_at: etat.accepteLe,
    revoked_at: etat.retireLe,
  };
}

/** Rend `null` si la version est la bonne, sinon la version attendue. */
export function accepterConsentementIa(version: unknown): string | null {
  if (version !== VERSION) return VERSION;
  etat.accepteLe = new Date().toISOString();
  etat.retireLe = null;
  return null;
}

/**
 * L'accord « en continuant » : rien si la version manque ou est périmée,
 * rien si un accord a été retiré (le retrait explicite prime), rien si un
 * accord court déjà (sa date d'origine reste).
 */
export function accepterConsentementIaALaConnexion(version: unknown): void {
  if (version !== VERSION) return;
  if (etat.retireLe !== null || etat.accepteLe !== null) return;
  etat.accepteLe = new Date().toISOString();
}

export function retirerConsentementIa(): void {
  if (etat.accepteLe !== null) etat.retireLe = new Date().toISOString();
}

/** Le corps du 403 que toute route d'IA rend sans accord. */
export function refusIa() {
  return {
    statut: 403,
    raison: "ai_consent_required",
    message:
      "Avant de continuer, Karria doit t'expliquer ce qu'elle partage avec ses fournisseurs d'IA.",
    details: { version: VERSION, providers: ["gemini"] },
  };
}
