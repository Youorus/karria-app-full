/**
 * Les appels d'authentification, et leur traduction.
 *
 * ═══ Le contrat ═══
 *
 * Ces routes sont celles du **futur** backend Karria, en reconstruction.
 * En attendant, `lib/dev/serveur-simule.ts` les implémente à l'identique :
 * ce fichier ne sait pas, et n'a pas à savoir, qui lui répond.
 *
 * ═══ Le consentement voyage avec la première requête ═══
 *
 * Il n'y a plus d'écran d'inscription où cocher une case. L'écran
 * d'accueil dit « en continuant, tu acceptes les conditions » ; continuer
 * **est** l'acceptation. La preuve juridique tient alors dans les
 * versions envoyées ici, que le serveur horodate avec le compte.
 */

import { http } from "@/lib/http";
import { VERSIONS } from "../services/consentements";
import { versConsentementIa } from "./consentement-ia.api";
import type {
  Connexion,
  ConnexionBrute,
  Moi,
  MoiBrut,
  Parcours,
  ParcoursBrut,
  SuppressionCompte,
  SuppressionCompteBrute,
} from "../types/auth.types";

const CONSENTEMENT = {
  terms_version: VERSIONS.conditions,
  privacy_policy_version: VERSIONS.confidentialite,
};

function versParcours(brut: ParcoursBrut): Parcours {
  return {
    id: brut.challenge_id,
    envoyeA: brut.sent_to,
    valableSecondes: brut.expires_in,
    avantRenvoi: brut.seconds_before_resend,
  };
}

function versConnexion(brut: ConnexionBrute): Connexion {
  return {
    jetons: {
      acces: brut.session.access_token,
      rafraichissement: brut.session.refresh_token,
    },
    compte: { id: brut.user.id, email: brut.user.email },
    compteCree: brut.created_account,
  };
}

/** Envoie un code à six chiffres à l'adresse. Compte existant ou non :
 *  le serveur ne le révèle pas, et le parcours est le même. */
export async function demanderCode(email: string): Promise<Parcours> {
  return versParcours(
    await http.post<ParcoursBrut>(
      "/auth/email/start",
      { email, ...CONSENTEMENT },
      { authentifie: false },
    ),
  );
}

export async function renvoyerCode(parcoursId: string): Promise<Parcours> {
  return versParcours(
    await http.post<ParcoursBrut>(
      "/auth/email/resend",
      { challenge_id: parcoursId },
      { authentifie: false },
    ),
  );
}

export async function verifierCode(parcoursId: string, code: string): Promise<Connexion> {
  return versConnexion(
    await http.post<ConnexionBrute>(
      "/auth/email/verify",
      { challenge_id: parcoursId, code },
      { authentifie: false },
    ),
  );
}

/**
 * Échange le justificatif d'Apple ou de Google contre une session.
 *
 * Le nonce est celui **en clair** : le serveur le hache lui-même pour le
 * comparer à celui que le fournisseur a scellé dans le jeton. C'est ce
 * qui empêche de rejouer un jeton volé.
 */
export async function connecterAvec(
  fournisseur: "apple" | "google",
  jeton: string,
  nonce?: string,
): Promise<Connexion> {
  const corps =
    fournisseur === "apple"
      ? { identity_token: jeton, nonce: nonce ?? null, ...CONSENTEMENT }
      : { id_token: jeton, nonce: nonce ?? null, ...CONSENTEMENT };
  return versConnexion(
    await http.post<ConnexionBrute>(`/auth/social/${fournisseur}`, corps, {
      authentifie: false,
    }),
  );
}

export async function lireMoi(): Promise<Moi> {
  const brut = await http.get<MoiBrut>("/auth/me");
  return {
    id: brut.id,
    email: brut.email,
    consentementIa: versConsentementIa(brut.ai_consent),
  };
}

export async function revoquerLaSession(rafraichissement: string): Promise<void> {
  await http.post("/auth/logout", { refresh_token: rafraichissement });
}

/**
 * Supprime le compte connecté, avec la raison du départ.
 *
 * `204` et tout est parti côté serveur : compte, CV, appareils, sessions —
 * toutes, pas seulement celle-ci. Il n'y a donc pas de `logout` à
 * appeler ensuite : il échouerait, le compte n'existant plus. Le détail
 * est vidé de ses espaces et un texte vide devient `null` : le serveur
 * n'a rien à faire d'une chaîne blanche, et la limite se compte sur ce
 * qui a vraiment été écrit.
 */
export async function supprimerMonCompte(suppression: SuppressionCompte): Promise<void> {
  const details = suppression.details?.trim() ?? "";
  const corps: SuppressionCompteBrute = {
    reason: suppression.raison,
    details: details === "" ? null : details,
  };
  await http.delete("/auth/me", corps);
}
