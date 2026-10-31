/**
 * Le clavier est-il à l'écran ?
 *
 * Sur iOS, on écoute les événements `Will` : la mise en page change en même
 * temps que le clavier monte, et non une fois qu'il a fini — sinon le
 * contenu passe d'abord sous le clavier, puis saute. Android n'émet que les
 * `Did`.
 */

import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useClavierOuvert(): boolean {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    const montee = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const descente = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(montee, () => setOuvert(true));
    const b = Keyboard.addListener(descente, () => setOuvert(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return ouvert;
}
