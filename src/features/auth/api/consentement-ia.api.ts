/**
 * Le consentement à l'IA, et sa traduction — `docs/contrat-api-consentement-ia.md`.
 *
 * - `GET /auth/ai-disclosure` : l'information courante **sans session** —
 *   ce que l'écran de connexion montre derrière « Karria et l'IA », et la
 *   version qu'il renvoie ensuite dans `ai_disclosure_version` ;
 * - `GET /auth/me/ai-consent` : où en est la personne, et ce qu'elle doit
 *   accepter aujourd'hui (version, fournisseurs, usages) ;
 * - `PUT /auth/me/ai-consent` `{ version }` : l'accord pour la version lue ;
 * - `DELETE /auth/me/ai-consent` : le retrait.
 *
 * La version vient **toujours** du serveur : l'app renvoie celle qu'elle a
 * montrée, elle n'en invente aucune.
 */

import { http } from "@/lib/http";

import type {
  ConsentementIa,
  ConsentementIaBrut,
  DisclosureIa,
  DisclosureIaBrut,
} from "../types/auth.types";

export function versDisclosureIa(brut: DisclosureIaBrut): DisclosureIa {
  return {
    version: brut.version,
    fournisseurs: brut.providers.map((p) => ({ id: p.id, nom: p.name })),
    usages: brut.purposes,
  };
}

export function versConsentementIa(brut: ConsentementIaBrut): ConsentementIa {
  return {
    ...versDisclosureIa(brut.disclosure),
    requis: brut.required,
    versionAcceptee: brut.accepted_version,
    accepteLe: brut.accepted_at,
    retireLe: brut.revoked_at,
  };
}

/** Publique : pas de jeton, même périmé — un 401 ici n'aurait aucun sens. */
export async function lireDisclosureIa(): Promise<DisclosureIa> {
  return versDisclosureIa(
    await http.get<DisclosureIaBrut>("/auth/ai-disclosure", { authentifie: false }),
  );
}

export async function lireConsentementIa(): Promise<ConsentementIa> {
  return versConsentementIa(await http.get<ConsentementIaBrut>("/auth/me/ai-consent"));
}

export async function accepterConsentementIa(version: string): Promise<ConsentementIa> {
  return versConsentementIa(
    await http.put<ConsentementIaBrut>("/auth/me/ai-consent", { version }),
  );
}

export async function retirerConsentementIa(): Promise<ConsentementIa> {
  return versConsentementIa(await http.delete<ConsentementIaBrut>("/auth/me/ai-consent"));
}
