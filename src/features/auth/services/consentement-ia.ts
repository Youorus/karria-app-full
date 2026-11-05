/**
 * Le consentement à l'IA côté app : l'état partagé, et ce qu'on dit à la
 * personne selon l'outil.
 *
 * ═══ Pourquoi un store au niveau du module ═══
 *
 * La réponse vient du serveur (`GET /auth/me`, puis les routes
 * `/auth/me/ai-consent`) et doit être lue par des domaines qui ne se
 * connaissent pas : Karria, le CV, la dictée, la photo. Et la feuille qui
 * demande l'accord est montée une fois, au-dessus de tout. Un store
 * minuscule, abonnable, comme `lib/sans-pub.ts`.
 *
 * ═══ Le serveur tranche ═══
 *
 * L'app ne décide jamais si l'accord vaut : elle recopie `requis`. Et si
 * elle se trompe (cache périmé, fournisseur changé), la route d'IA répond
 * `403 ai_consent_required` : `estConsentementIaRequis` le reconnaît, la
 * feuille se montre, l'action est rejouée (`contrat-api-consentement-ia.md`).
 *
 * ═══ Dire ce qui part, pour cet outil ═══
 *
 * La feuille nomme d'abord ce que **ce** geste envoie — tes messages, ta
 * voix, ton CV, ta photo — puis le reste. La liste des fournisseurs vient
 * du serveur ; les textes, d'ici. Pur et testé.
 *
 * ═══ L'information avant tout compte (2026-11-05) ═══
 *
 * L'écran de connexion dit « en continuant, tu acceptes … et que Karria
 * s'appuie sur des modèles d'IA », avec le lien « Karria et l'IA ». Il lit
 * `GET /auth/ai-disclosure` (public) et garde ici la `disclosure` : c'est
 * **sa version** que les requêtes de connexion renvoient
 * (`versionDisclosureAffichee`), et le serveur consigne l'accord s'il la
 * reconnaît. Après la connexion, `poserConsentementIa` la tient à jour
 * depuis `/auth/me` — une seule vérité, deux moments.
 */

import { ErreurApi } from "@/lib/http";

import type { ConsentementIa, DisclosureIa, UsageIa } from "../types/auth.types";

// ─────────────────────────────────────────────────────────────────────
// L'état partagé
// ─────────────────────────────────────────────────────────────────────

/** `null` tant que le serveur n'a rien dit (pas de session, ou pas encore lu). */
let courant: ConsentementIa | null = null;
/**
 * L'information courante, lisible sans session. Survit à la déconnexion :
 * la prochaine connexion la renvoie telle quelle.
 */
let disclosure: DisclosureIa | null = null;
let actionEnAttente: { usage: UsageIa; action: () => void } | null = null;
/**
 * La feuille ouverte, ou `null`. **Un seul objet par ouverture** : les
 * écrans la lisent par `useSyncExternalStore`, qui compare les instantanés
 * par référence — un objet neuf à chaque lecture relance le rendu sans fin
 * (« Maximum update depth exceeded », vu sur le simulateur).
 */
let feuille: FeuilleIa | null = null;
const abonnes = new Set<() => void>();

function publier(): void {
  abonnes.forEach((rappel) => rappel());
}

export function consentementIa(): ConsentementIa | null {
  return courant;
}

/** Recopie ce que le serveur a dit ; l'information affichable suit. */
export function poserConsentementIa(valeur: ConsentementIa | null): void {
  courant = valeur;
  if (valeur !== null) {
    disclosure = {
      version: valeur.version,
      fournisseurs: valeur.fournisseurs,
      usages: valeur.usages,
    };
  }
  publier();
}

export function disclosureIa(): DisclosureIa | null {
  return disclosure;
}

/** Recopie l'information publique (`GET /auth/ai-disclosure`). */
export function poserDisclosureIa(valeur: DisclosureIa | null): void {
  disclosure = valeur;
  publier();
}

/**
 * La version à joindre aux requêtes de connexion, ou `null` si rien n'a
 * encore été chargé : on n'envoie jamais une version qu'on n'a pas montrée.
 */
export function versionDisclosureAffichee(): string | null {
  return disclosure?.version ?? null;
}

export function abonnerConsentementIa(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

export interface FeuilleIa {
  mode: "demande" | "consultation";
  usage: UsageIa | null;
}

export function feuilleIa(): FeuilleIa | null {
  return feuille;
}

/** Ouvre la feuille avant un geste ; l'action reprendra après l'accord. */
export function demanderConsentementIa(usage: UsageIa, action: () => void): void {
  actionEnAttente = { usage, action };
  feuille = { mode: "demande", usage };
  publier();
}

/** Ouvre la feuille en consultation (paramètres) : voir, retirer. */
export function ouvrirConsultationIa(): void {
  actionEnAttente = null;
  feuille = { mode: "consultation", usage: null };
  publier();
}

/** Ferme la feuille ; « Pas maintenant » laisse tomber l'action. */
export function fermerFeuilleIa(): void {
  actionEnAttente = null;
  if (feuille === null) return;
  feuille = null;
  publier();
}

/** L'accord vient d'être donné : la feuille se ferme, le geste reprend. */
export function reprendreApresAccord(): void {
  const attente = actionEnAttente;
  fermerFeuilleIa();
  attente?.action();
}

/** Un 403 `ai_consent_required` : le serveur veut l'accord avant ce geste. */
export function estConsentementIaRequis(cause: unknown): boolean {
  return cause instanceof ErreurApi && cause.raison === "ai_consent_required";
}

// ─────────────────────────────────────────────────────────────────────
// Ce qu'on dit
// ─────────────────────────────────────────────────────────────────────

export interface TextesIa {
  /** Ce que ce geste envoie, en premier. */
  envoi: string;
  /** Le libellé court de l'outil, pour la liste. */
  outil: string;
}

export const TEXTES_IA: Record<UsageIa, TextesIa> = {
  assistant: { envoi: "tes messages à Karria", outil: "Parler à Karria" },
  transcription: { envoi: "ta voix, le temps de la transcrire", outil: "Dicter" },
  cv_creation: { envoi: "tes réponses sur ton parcours", outil: "Créer ton CV" },
  cv_import: { envoi: "le fichier de ton CV", outil: "Importer ton CV" },
  photo_enhancement: { envoi: "ta photo, pour l'améliorer", outil: "Améliorer ta photo" },
  template_analysis: {
    envoi: "le score de ton CV, pour l'expliquer",
    outil: "Expliquer ton score",
  },
  application: {
    envoi: "ton CV et l'offre, pour les rapprocher",
    outil: "Adapter ton CV et écrire ta lettre pour une offre",
  },
};

/**
 * La phrase « Ce qui part » : l'envoi de l'outil courant d'abord, puis les
 * autres en une liste courte. Sans outil (consultation) : tout, sans relief.
 */
export function ceQuiPart(usages: readonly UsageIa[], courant: UsageIa | null): string[] {
  const connus = usages.filter((u): u is UsageIa => u in TEXTES_IA);
  const tete = courant !== null && connus.includes(courant) ? [courant] : [];
  const reste = connus.filter((u) => u !== courant);
  return [...tete, ...reste].map((u) => TEXTES_IA[u].envoi);
}

/** « Google Gemini », « Google Gemini et Anthropic Claude »… */
export function fournisseursLisibles(fournisseurs: readonly { nom: string }[]): string {
  const noms = fournisseurs.map((f) => f.nom);
  if (noms.length === 0) return "nos fournisseurs d'IA";
  if (noms.length === 1) return noms[0] ?? "";
  return `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}

/** « le 30 octobre 2026 », ou `null`. */
export function dateLisible(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
