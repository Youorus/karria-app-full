/**
 * Relancer, au retour de la connexion, ce qui avait échoué faute de réseau.
 *
 * ═══ Pourquoi ═══
 *
 * Un fil resté sur « Pas de connexion. — Réessayer » oblige à appuyer alors
 * que le réseau est revenu depuis dix secondes. `etat-connexion.ts` publie
 * un numéro à chaque retour constaté ; l'écran qui s'y abonne se relit
 * tout seul.
 *
 * ═══ Sans tempête ═══
 *
 * Seul un écran **en panne** au moment du retour se relance (`enPanne`) :
 * un écran qui a ses données ne redemande rien. Et le numéro ne bouge pas
 * plus d'une fois toutes les cinq secondes (`ECART_RELANCES_MS`).
 *
 * `enPanne` et `relancer` sont lus au moment du retour, par une référence :
 * la relance ne dépend que du numéro, pas d'une fonction qui change à
 * chaque rendu.
 */

import { useEffect, useRef } from "react";

import { useVersionRetour } from "@/lib/etat-connexion";

export function useRelanceAuRetour(enPanne: boolean, relancer: () => void): void {
  const version = useVersionRetour();
  const servie = useRef(version);
  const courant = useRef({ enPanne, relancer });

  useEffect(() => {
    courant.current = { enPanne, relancer };
  }, [enPanne, relancer]);

  useEffect(() => {
    if (servie.current === version) return;
    servie.current = version;
    if (courant.current.enPanne) courant.current.relancer();
  }, [version]);
}
