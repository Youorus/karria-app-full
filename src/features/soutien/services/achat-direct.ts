/**
 * L'abonnement « Karria sans pub » pris **sur place** : depuis la feuille qui
 * le propose (CV sorti avec le filigrane, portraits du mois épuisés), le
 * bouton ouvre directement la page de paiement, sans détour par le profil.
 *
 * ═══ Pourquoi ═══
 *
 * La personne a déjà dit oui sur la feuille, qui annonce le prix. La renvoyer
 * vers l'offre du profil lui faisait quitter son CV et décider une seconde
 * fois : une étape où l'on perd des gens (demande de Marc, 2026-11-20).
 *
 * ═══ L'issue ne vient jamais du navigateur ═══
 *
 * Comme `use-soutien.ts` : la page se referme, puis on **relit le serveur**
 * jusqu'à ce qu'il dise « livré ». La session est retenue
 * (`achat-en-attente.ts`) : si la confirmation tarde, l'app la revérifie au
 * retour au premier plan et le drapeau « sans pub » suit.
 *
 * ═══ Trois issues ═══
 *
 * - `livre` : abonné, le drapeau « sans pub » est posé ;
 * - `non_confirme` : la page est refermée, on ne sait pas encore — on ne dit
 *   rien de faux, la session retenue sera revérifiée ;
 * - `echec` : la page n'a pas pu s'ouvrir — à l'appelant de montrer l'offre
 *   du profil, qui sait dire l'erreur.
 */

import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { SIMULATION } from "@/lib/config";
import { ErreurApi } from "@/lib/http";
import { poserSansPub } from "@/lib/sans-pub";

import {
  lireFacturation,
  lireStatut,
  ouvrirAbonnement,
  RETOUR,
} from "../api/soutien.api";
import { oublierAchatEnAttente, retenirAchatEnAttente } from "./achat-en-attente";
import { attendreLaLivraison } from "./attente";

export type IssueAchatDirect = "livre" | "non_confirme" | "echec";

/** Deux appuis dans la même image n'ouvrent pas deux sessions. */
let enVol = false;

async function abonne(): Promise<boolean> {
  try {
    const lue = await lireFacturation(Platform.OS);
    poserSansPub(lue.sansPub.actif);
    return lue.sansPub.actif;
  } catch (cause) {
    console.warn("[karria] droits illisibles", cause);
    return false;
  }
}

export async function acheterSansPub(): Promise<IssueAchatDirect> {
  if (enVol) return "non_confirme";
  enVol = true;
  try {
    const session = await ouvrirAbonnement("mensuel");
    await retenirAchatEnAttente(session);
    if (!SIMULATION) await WebBrowser.openAuthSessionAsync(session.adresse, RETOUR);
    const issue = await attendreLaLivraison(async () => {
      const [statut, actif] = await Promise.all([lireStatut(session.id), abonne()]);
      return statut.livre || actif;
    });
    if (issue !== "livre") return "non_confirme";
    await oublierAchatEnAttente();
    // Le serveur a livré : le drapeau suit, même si la dernière lecture des
    // droits a précédé la notification de Stripe.
    poserSansPub(true);
    return "livre";
  } catch (cause) {
    console.warn("[karria] achat direct échoué", cause);
    // Déjà abonné ailleurs (un autre téléphone) : l'état vrai est au serveur.
    if (cause instanceof ErreurApi && cause.raison === "subscription_already_active")
      return (await abonne()) ? "livre" : "echec";
    return "echec";
  } finally {
    enVol = false;
  }
}
