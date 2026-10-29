/**
 * Mettre la fiche de l'appareil à jour chez le serveur, sans rien montrer.
 *
 * ═══ Pourquoi une fonction, et pas un hook ═══
 *
 * Deux hooks s'en servent — le garde de l'espace connecté, au démarrage
 * et au changement de jeton ; l'écran d'activation, après la réponse à la
 * permission. Chacun recopierait les mêmes six lignes, et c'est le
 * `catch` qu'on finirait par écrire différemment.
 *
 * ═══ Pourquoi ça ne lève jamais ═══
 *
 * L'enregistrement est un confort pour le serveur, pas une étape du
 * parcours. Un réseau coupé, un backend qui ne sert pas encore la route :
 * une ligne de journal, et l'utilisateur continue comme si de rien
 * n'était. La prochaine ouverture réessaiera.
 *
 * ═══ Une à la fois, et jamais une de perdue ═══
 *
 * Le démarrage et le changement de jeton peuvent tomber en même temps. La
 * seconde demande attend la première plutôt que d'envoyer deux `PUT`
 * concurrents dont l'ordre d'arrivée déciderait de la fiche finale — et
 * elle est **rejouée** après, pas fusionnée : un jeton rafraîchi pendant
 * l'envoi du précédent doit partir lui aussi, sinon le serveur garderait
 * un jeton mort jusqu'au prochain lancement.
 */

import { lireInstallationId } from "@/lib/installation";

import { enregistrerAppareil } from "../api/appareils.api";
import { decrireAppareil } from "../services/appareil";
import { lirePermission, obtenirLeJetonPush } from "../services/notifications";

let enCours: Promise<void> | null = null;
let relancer = false;

async function executer(): Promise<void> {
  try {
    const permission = await lirePermission();
    // Un jeton ne se demande qu'à qui a dit oui : avant, l'appel
    // déclencherait la boîte de permission à l'insu de l'écran.
    const jeton = permission === "granted" ? await obtenirLeJetonPush() : null;
    await enregistrerAppareil(
      await lireInstallationId(),
      decrireAppareil(permission, jeton),
    );
  } catch (cause) {
    console.warn("[karria] enregistrement de l'appareil impossible", cause);
  }
}

export function synchroniserAppareil(): Promise<void> {
  if (enCours !== null) {
    // Une demande pendant l'envoi : on la retient et on la joue juste après.
    relancer = true;
    return enCours;
  }
  enCours = (async () => {
    do {
      relancer = false;
      await executer();
    } while (relancer);
    enCours = null;
  })();
  return enCours;
}
