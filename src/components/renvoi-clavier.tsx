/**
 * Le clavier se referme quand on tape à côté.
 *
 * ═══ Ce qui manquait ═══
 *
 * Sur un téléphone réel, un champ prend le focus, le clavier monte, et il
 * recouvre le bas de l'écran — donc le bouton d'action. Toucher ailleurs ne
 * le renvoyait pas : il fallait la touche « OK » du clavier, quand elle
 * existe. Sur les claviers numériques d'iOS, elle n'existe pas. On se
 * retrouvait avec un bouton visible mais inatteignable.
 *
 * ═══ Pourquoi ici et non dans les écrans ═══
 *
 * Vingt-quatre écrans portent des champs. Quinze géraient déjà le clavier,
 * chacun à sa façon, et c'est précisément le problème : ce qui est écrit
 * vingt-quatre fois finit écrit de vingt-quatre façons, et la vingt-
 * cinquième est oubliée. Monté une fois à la racine, aucun écran n'a à y
 * penser — y compris ceux qui n'existent pas encore.
 *
 * ═══ Pourquoi ça ne vole pas les appuis ═══
 *
 * Le système de « responder » de React Native attribue un toucher au
 * composant le plus profond qui le réclame. Un champ, un bouton, une
 * bascule le réclament ; ils gagnent, et `onPress` ne se déclenche pas ici.
 * Ne remontent jusqu'à nous que les touchers dont personne n'a voulu —
 * c'est-à-dire, très exactement, « à côté ».
 *
 * C'est aussi pour ça que ce n'est pas
 * `onStartShouldSetResponderCapture` : la capture s'exécute avant les
 * enfants, et refermerait le clavier au moment même où l'on touche un
 * champ pour l'ouvrir.
 *
 * ═══ Ce que ça ne couvre pas ═══
 *
 * L'intérieur d'une zone défilante : le `ScrollView` réclame le toucher
 * pour pouvoir faire défiler, donc il gagne. Ce cas-là est déjà traité par
 * `keyboardShouldPersistTaps="handled"`, posé sur les listes de
 * l'application : un appui sur un bouton l'atteint, un appui dans le vide
 * referme le clavier.
 *
 * ═══ `accessible={false}` ═══
 *
 * Sans lui, VoiceOver annonce l'application entière comme un unique
 * élément actionnable, et le parcours au doigt devient impraticable. Ce
 * composant doit être invisible à l'accessibilité : il ne propose aucune
 * action, il en annule une.
 */

import { Keyboard, TouchableWithoutFeedback, View } from "react-native";
import type { ReactNode } from "react";

export function RenvoiClavier({ children }: { children: ReactNode }) {
  return (
    <TouchableWithoutFeedback
      accessible={false}
      // Appelé sur tout toucher non réclamé. Sans clavier ouvert, c'est
      // une opération nulle : inutile de tenir un état pour le savoir.
      onPress={() => Keyboard.dismiss()}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
