/**
 * L'aiguilleur des notifications : qui ouvre quoi, et quand.
 *
 * ═══ Pourquoi une classe sans React ═══
 *
 * Les trois règles délicates — ne jamais traiter deux fois la même
 * réponse, garder la destination tant que l'on ne peut pas naviguer,
 * mesurer chaque issue — se testent sans écran, sans `expo-notifications`
 * et sans routeur : on leur injecte une fonction `naviguer` et un port de
 * mesure. Le hook `use-centre-notifications` ne fait que brancher.
 *
 * ═══ Le doublon du lancement à froid ═══
 *
 * L'application lancée par un toucher lit la réponse par
 * `getLastNotificationResponseAsync` ; selon la plateforme et la version,
 * l'écouteur de réponses la reçoit **aussi**. Sans garde, le détail de
 * l'offre s'empilerait deux fois. La clé d'une réponse est l'identifiant
 * de la notification et l'action : la même notification touchée deux fois
 * n'ouvre qu'une fois.
 *
 * ═══ L'attente ═══
 *
 * Pas de session, session pas encore relue, navigation pas montée, ou
 * encore sur un écran d'entrée : la destination est gardée. Une seule —
 * la plus récente : si deux notifications sont touchées avant la
 * connexion, c'est la dernière qu'on voulait voir.
 */

import type {
  EvenementNotification,
  PortAnalytiqueNotifications,
  SourceNotification,
} from "./analytique";
import { destinationDe } from "./routeur-notifications";
import type { DestinationNotification } from "../types/notifications.types";

/** Au-delà, les plus anciennes clés sont oubliées : la mémoire reste bornée. */
const CLES_RETENUES = 50;

export interface ReponseNotification {
  /** Identifiant de la notification (`request.identifier`). */
  identifiant: string;
  donnees: unknown;
  /** `ecartee` : effacée par la personne sans l'ouvrir (iOS seulement). */
  issue: "ouverte" | "ecartee";
  source: Exclude<SourceNotification, "banniere">;
}

export class AiguilleurNotifications {
  private readonly vues: string[] = [];
  private enAttente: DestinationNotification | null = null;
  private pret = false;
  private naviguer: ((destination: DestinationNotification) => void) | null = null;

  constructor(private readonly analytique: () => PortAnalytiqueNotifications) {}

  /** Le routeur du moment. Tant qu'aucun n'est branché, tout attend. */
  brancher(naviguer: (destination: DestinationNotification) => void): void {
    this.naviguer = naviguer;
    this.vider();
  }

  /** Une réponse du système : toucher, lancement, ou effacement (iOS). */
  repondre(reponse: ReponseNotification): void {
    const cle = `${reponse.identifiant}:${reponse.issue}`;
    if (this.vues.includes(cle)) return;
    this.vues.push(cle);
    if (this.vues.length > CLES_RETENUES) this.vues.shift();

    const destination = destinationDe(reponse.donnees);
    const evenement = evenementDe(destination, reponse.source);
    if (reponse.issue === "ecartee") {
      this.analytique().ecartee(evenement);
      return;
    }
    this.analytique().ouverte(evenement);
    this.ouvrir(destination);
  }

  /** Reçue application ouverte : mesurée, et rendue pour la bannière. */
  recevoir(donnees: unknown): DestinationNotification {
    const destination = destinationDe(donnees);
    this.analytique().recue(evenementDe(destination, "systeme"));
    return destination;
  }

  /** La bannière interne touchée ou écartée. */
  banniere(destination: DestinationNotification, issue: "ouverte" | "ecartee"): void {
    const evenement = evenementDe(destination, "banniere");
    if (issue === "ecartee") {
      this.analytique().ecartee(evenement);
      return;
    }
    this.analytique().ouverte(evenement);
    this.ouvrir(destination);
  }

  /** L'état de l'application change : peut-on naviguer ? */
  signalerPret(pret: boolean): void {
    this.pret = pret;
    this.vider();
  }

  /** Pour les tests et le diagnostic. */
  get destinationEnAttente(): DestinationNotification | null {
    return this.enAttente;
  }

  private ouvrir(destination: DestinationNotification): void {
    this.enAttente = destination;
    this.vider();
  }

  private vider(): void {
    if (!this.pret || this.naviguer === null || this.enAttente === null) return;
    const destination = this.enAttente;
    this.enAttente = null;
    this.naviguer(destination);
  }
}

function evenementDe(
  destination: DestinationNotification,
  source: SourceNotification,
): EvenementNotification {
  return { type: destination.type, campagne: destination.campagne, source };
}
