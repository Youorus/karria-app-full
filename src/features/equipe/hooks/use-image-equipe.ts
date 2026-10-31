/**
 * Choisir une image ou prendre une photo à montrer à l'équipe.
 *
 * Contrairement à la photo du CV (`features/cv/hooks/use-choix-photo.ts`),
 * aucun recadrage : une capture d'écran se montre **entière**, c'est
 * souvent le coin qu'on aurait coupé qui explique le problème. La qualité
 * 0,85 fait sortir un JPEG (pas de HEIC, que l'API refuserait) ; le
 * serveur réduit ensuite à 2 048 px.
 *
 * L'autorisation de l'appareil photo n'est demandée qu'au toucher.
 */

import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from "expo-image-picker";
import { useCallback, useState } from "react";

import type { FichierAEnvoyer } from "../types/equipe.types";

const OPTIONS = { mediaTypes: ["images" as const], quality: 0.85 };

export interface ImageEquipe {
  probleme: string | null;
  choisir: (source: "camera" | "galerie") => Promise<FichierAEnvoyer | null>;
}

export function useImageEquipe(): ImageEquipe {
  const [probleme, setProbleme] = useState<string | null>(null);

  const choisir = useCallback(async (source: "camera" | "galerie") => {
    try {
      if (source === "camera") {
        const permission = await requestCameraPermissionsAsync();
        if (!permission.granted) {
          setProbleme(
            "Autorise l'appareil photo dans les réglages, ou choisis une image existante.",
          );
          return null;
        }
      }
      const resultat =
        source === "camera"
          ? await launchCameraAsync(OPTIONS)
          : await launchImageLibraryAsync(OPTIONS);
      setProbleme(null);
      const image = resultat.canceled ? undefined : resultat.assets[0];
      if (image === undefined) return null;
      const type = image.mimeType === "image/png" ? "image/png" : "image/jpeg";
      return {
        uri: image.uri,
        type,
        nom: type === "image/png" ? "capture.png" : "image.jpg",
        dureeMs: null,
      };
    } catch (cause: unknown) {
      console.warn("[karria] choix d'image pour l'équipe en échec", cause);
      setProbleme(
        source === "camera"
          ? "L'appareil photo n'est pas disponible ici. Choisis une image existante."
          : "Impossible d'ouvrir tes photos.",
      );
      return null;
    }
  }, []);

  return { probleme, choisir };
}
