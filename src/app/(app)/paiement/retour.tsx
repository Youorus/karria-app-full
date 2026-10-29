/**
 * La route `karria://paiement/retour` : où la page de retour de l'API renvoie
 * après Stripe.
 *
 * Dans le cas normal, la session d'authentification du navigateur
 * intercepte ce lien et se referme : cette route n'est jamais montée. Elle
 * existe pour le cas où la page a été ouverte dans Safari lui-même (lien
 * partagé, navigateur par défaut) : le lien ouvre l'application, et l'on
 * revient au profil, qui relit les droits au focus. Rien n'est déduit des
 * paramètres (`status`, `session_id`) : l'issue se lit au serveur.
 */

import { Redirect } from "expo-router";

export default function RouteRetourPaiement() {
  return <Redirect href="/profil" />;
}
