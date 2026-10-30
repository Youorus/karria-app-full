/**
 * Le consentement à l'IA du faux serveur — le contrat
 * `docs/contrat-api-consentement-ia.md`, en exécutable.
 *
 * Un fichier à part, parce que deux faux serveurs le lisent : celui du
 * compte (`/auth/me`, `/auth/me/ai-consent`) et ceux des routes d'IA (le
 * CV, Karria), qui refusent avec `ai_consent_required` tant que rien n'est
 * accepté — exactement comme la vraie API.
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

export function consentementIaBrut() {
  const accorde = consentementIaAccorde();
  return {
    required: !accorde,
    disclosure: {
      version: VERSION,
      providers: [{ id: "gemini", name: "Google Gemini" }],
      purposes: [
        "assistant",
        "transcription",
        "cv_creation",
        "cv_import",
        "photo_enhancement",
        "template_analysis",
      ],
    },
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
