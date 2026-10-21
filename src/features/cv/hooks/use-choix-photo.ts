/**
 * Prendre ou choisir la photo du CV.
 *
 * Recadrée au carré dès le choix : la photo d'un CV est un portrait, et
 * recadrer ici évite qu'un modèle la coupe au mauvais endroit plus tard.
 * L'autorisation n'est demandée qu'au moment où l'on touche le bouton.
 */

import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from "expo-image-picker";
import { useCallback, useState } from "react";

const OPTIONS = {
  mediaTypes: ["images" as const],
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  quality: 0.85,
};

export interface ChoixPhoto {
  probleme: string | null;
  /** Rend l'image choisie, ou `null` si l'on a renoncé. */
  choisir: (source: "camera" | "galerie") => Promise<string | null>;
}

export function useChoixPhoto(): ChoixPhoto {
  const [probleme, setProbleme] = useState<string | null>(null);

  const choisir = useCallback(async (source: "camera" | "galerie") => {
    try {
      if (source === "camera") {
        const permission = await requestCameraPermissionsAsync();
        if (!permission.granted) {
          setProbleme(
            "Autorise l'appareil photo dans les réglages, ou choisis une photo existante.",
          );
          return null;
        }
      }
      const resultat =
        source === "camera"
          ? await launchCameraAsync(OPTIONS)
          : await launchImageLibraryAsync(OPTIONS);
      setProbleme(null);
      return resultat.canceled ? null : (resultat.assets[0]?.uri ?? null);
    } catch (cause: unknown) {
      console.warn("[karria] choix de photo en échec", cause);
      setProbleme(
        source === "camera"
          ? "L'appareil photo n'est pas disponible ici. Choisis une photo existante."
          : "Impossible d'ouvrir tes photos.",
      );
      return null;
    }
  }, []);

  return { probleme, choisir };
}
