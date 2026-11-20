/**
 * Le bandeau de connexion, par-dessus toute la navigation : « Pas de
 * connexion », « Connexion instable », « Connexion rétablie ».
 *
 * ═══ La forme : la bande du démarrage ═══
 *
 * La carte flottante sous l'encoche est déjà le langage de Karria pour
 * « quelque chose à savoir, pas à subir » (`bande-demarrage.tsx`) : mêmes
 * couleurs, même typographie, même glissement, mouvement réduit respecté.
 * Ici sans bouton d'action — il n'y a rien à faire.
 *
 * ═══ Elle ne bloque ni ne décale rien ═══
 *
 * Posée en absolu : la mise en page dessous ne bouge pas d'un point quand
 * elle paraît ou se retire. Elle recouvre en revanche le haut de l'écran,
 * où vivent des boutons d'en-tête : d'où la croix, qui la retire d'un
 * geste jusqu'au prochain changement d'état. « Connexion rétablie » n'en a
 * pas : elle part seule au bout de deux secondes.
 *
 * ═══ Sous les autres bandes ═══
 *
 * Montée avant les bandes du démarrage et la bannière de notification :
 * si deux se présentent ensemble, celle qui porte une action reste dessus.
 *
 * Une feuille (`Modal`) passe au-dessus de toute la navigation, donc du
 * bandeau : pendant qu'une feuille est ouverte, ce sont les messages
 * d'erreur de la feuille qui parlent.
 */

import { BandeDemarrage } from "@/features/demarrage/components/bande-demarrage";
import { useBandeauConnexion } from "@/hooks/use-bandeau-connexion";

export function BandeauConnexion() {
  const { visible, phrase, icone, masquer } = useBandeauConnexion();
  return (
    <BandeDemarrage
      visible={visible}
      phrase={phrase}
      icone={icone}
      onFermer={masquer}
      libelleFermer="Masquer"
    />
  );
}
