/**
 * Le parcours de connexion, partagé entre ses écrans.
 *
 * ═══ Pourquoi un fournisseur et non un appel direct au hook ═══
 *
 * L'écran de l'adresse et celui du code sont deux routes. Si chacun
 * appelait `useConnexion()`, chacun aurait **son** état : le second
 * n'aurait ni le `parcoursId` obtenu par le premier, ni le décompte de
 * renvoi. Le parcours serait à reconstituer à travers la navigation, donc
 * à faire passer dans une URL — donc dans l'historique.
 *
 * Le fournisseur est monté sur le groupe de routes `(auth)` : il naît
 * quand on entre dans le parcours, et meurt quand on en sort. Sa durée de
 * vie est exactement celle du parcours qu'il représente.
 */

import { createContext, useContext, type ReactNode } from "react";

import { useConnexion, type EtatConnexion } from "./use-connexion";

const Contexte = createContext<EtatConnexion | null>(null);

export function FournisseurDeParcours({ children }: { children: ReactNode }) {
  return <Contexte.Provider value={useConnexion()}>{children}</Contexte.Provider>;
}

export function useParcours(): EtatConnexion {
  const parcours = useContext(Contexte);
  if (parcours === null) {
    throw new Error("useParcours doit être appelé sous <FournisseurDeParcours>.");
  }
  return parcours;
}
