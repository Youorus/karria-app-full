/**
 * Le direct : garder le flux de l'équipe ouvert tant que l'écran est sous
 * les yeux, et le rouvrir quand il tombe.
 *
 * ═══ Le cycle ═══
 *
 * - `actif` passe à vrai (écran affiché, application au premier plan,
 *   session ouverte) → on ouvre, depuis le dernier message connu.
 * - Coupure subie → nouvelle tentative après 1, 2, 4… 30 s
 *   (`delaiReconnexion`), toujours depuis le dernier message connu : rien
 *   n'est perdu, le serveur rattrape.
 * - Refus (`4401`) → une seule nouvelle tentative : l'ouverture relit
 *   d'abord une route HTTP, qui renouvelle la session expirée. Un second
 *   refus arrête le direct ; le retour au premier plan relira le fil.
 * - `actif` passe à faux (arrière-plan, autre écran) → on ferme. Le
 *   serveur, sans lecture récente, enverra une notification à la place.
 *
 * ═══ « J'ai vu » ═══
 *
 * Chaque réponse de l'équipe reçue en direct est signalée lue sur le flux
 * lui-même : c'est ce qui dit au serveur de ne pas envoyer de notification
 * pour ce que la personne lit déjà. Une réponse arrivée pendant le
 * rattrapage, avant que le flux soit rendu, est signalée dès qu'il l'est.
 */

import { useEffect, useRef, useState } from "react";

import { ouvrirFlux } from "../api/equipe.api";
import { delaiReconnexion } from "../services/fil";
import type { FluxEquipe, MessageEquipe } from "../types/equipe.types";

/** `connexion` : on ouvre ; `direct` : ouvert ; `coupe` : en attente de reprise. */
export type EtatDirect = "connexion" | "direct" | "coupe";

export function useDirectEquipe(
  actif: boolean,
  depuis: () => string | null,
  surMessage: (message: MessageEquipe) => void,
): EtatDirect {
  const [etat, setEtat] = useState<EtatDirect>("connexion");
  const depuisRef = useRef(depuis);
  const surMessageRef = useRef(surMessage);
  useEffect(() => {
    depuisRef.current = depuis;
    surMessageRef.current = surMessage;
  }, [depuis, surMessage]);

  useEffect(() => {
    if (!actif) return undefined;
    let vivant = true;
    let flux: FluxEquipe | null = null;
    let luEnAttente = false;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let essai = 0;
    let refus = 0;

    const replanifier = () => {
      setEtat("coupe");
      minuterie = setTimeout(() => void ouvrir(), delaiReconnexion(essai));
      essai += 1;
    };

    const ouvrir = async () => {
      if (!vivant) return;
      setEtat("connexion");
      try {
        const ouvert = await ouvrirFlux({
          depuis: depuisRef.current(),
          surOuvert: () => {
            essai = 0;
            refus = 0;
            if (vivant) setEtat("direct");
          },
          surMessage: (message) => {
            if (!vivant) return;
            surMessageRef.current(message);
            if (message.auteur !== "equipe") return;
            if (flux === null) luEnAttente = true;
            else flux.signalerLu();
          },
          surFin: (fin) => {
            flux = null;
            if (!vivant) return;
            if (fin === "refuse") {
              refus += 1;
              if (refus > 1) {
                console.warn(
                  "[karria] flux de l'équipe refusé deux fois : direct arrêté",
                );
                setEtat("coupe");
                return;
              }
            }
            replanifier();
          },
        });
        if (!vivant) {
          ouvert.fermer();
          return;
        }
        flux = ouvert;
        if (luEnAttente) {
          luEnAttente = false;
          ouvert.signalerLu();
        }
      } catch (cause: unknown) {
        // Pas de réseau, ou la lecture préalable a échoué : on retentera.
        console.warn("[karria] ouverture du flux de l'équipe impossible", cause);
        if (vivant) replanifier();
      }
    };

    void ouvrir();
    return () => {
      vivant = false;
      clearTimeout(minuterie);
      flux?.fermer();
      flux = null;
    };
  }, [actif]);

  return etat;
}
