/**
 * Les deux bandes du démarrage, par-dessus la navigation, une seule à la
 * fois.
 *
 * « Une amélioration est prête — Relancer » (mise à jour EAS déjà
 * téléchargée) passe avant « Une nouvelle version est disponible — Mettre
 * à jour » (magasin) : la première se règle en deux secondes sans quitter
 * l'application, la seconde reviendra demain si la personne la ferme.
 *
 * Un composant sans rendu propre, pour que la racine n'appelle pas un
 * hook de plus : `useMiseAJour` vit ici, `usePorteDeVersion` à la racine
 * parce que la porte, elle, remplace la navigation.
 */

import { useMiseAJour } from "../hooks/use-mise-a-jour";
import type { PorteDeVersion } from "../hooks/use-porte-de-version";
import { BandeDemarrage } from "./bande-demarrage";

interface Props {
  version: PorteDeVersion;
}

export function BandesDeDemarrage({ version }: Props) {
  const miseAJour = useMiseAJour();

  if (miseAJour.bande) {
    return (
      <BandeDemarrage
        visible
        phrase="Une amélioration est prête."
        libelleAction="Relancer"
        onAction={miseAJour.relancer}
        onFermer={miseAJour.fermerBande}
      />
    );
  }
  return (
    <BandeDemarrage
      visible={version.bande}
      phrase="Une nouvelle version de Karria est disponible."
      libelleAction="Mettre à jour"
      onAction={version.ouvrirStore}
      onFermer={version.fermerBande}
    />
  );
}
