/**
 * Le consentement à l'IA, et sa traduction — `docs/contrat-api-consentement-ia.md`.
 *
 * - `GET /auth/me/ai-consent` : où en est la personne, et ce qu'elle doit
 *   accepter aujourd'hui (version, fournisseurs, usages) ;
 * - `PUT /auth/me/ai-consent` `{ version }` : l'accord pour la version lue ;
 * - `DELETE /auth/me/ai-consent` : le retrait.
 *
 * La version vient **toujours** du serveur : l'app renvoie celle qu'elle a
 * montrée, elle n'en invente aucune.
 */

import { http } from "@/lib/http";

import type { ConsentementIa, ConsentementIaBrut } from "../types/auth.types";

export function versConsentementIa(brut: ConsentementIaBrut): ConsentementIa {
  return {
    requis: brut.required,
    version: brut.disclosure.version,
    fournisseurs: brut.disclosure.providers.map((p) => ({ id: p.id, nom: p.name })),
    usages: brut.disclosure.purposes,
    versionAcceptee: brut.accepted_version,
    accepteLe: brut.accepted_at,
    retireLe: brut.revoked_at,
  };
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
