/**
 * Le thème choisi par la personne, et son application à toute l'appli.
 *
 * ═══ Ce qui ne marchait pas ═══
 *
 * Le sélecteur des réglages écrivait dans un `useState` local à l'écran du
 * profil. Le choix s'affichait, ne s'appliquait nulle part, et disparaissait
 * en fermant l'application. Le fichier l'assumait en commentaire — « le
 * brancher demande de remonter jusqu'au fournisseur de thème, et ce sera un
 * tour à part ». C'est ce tour-là.
 *
 * ═══ Deux consommateurs, une seule source ═══
 *
 * Les classes utilitaires (`bg-card`, `text-foreground`) sont résolues par
 * Uniwind, qui a son propre registre de thèmes. Les couleurs passées en
 * argument à un SVG viennent de `useCouleurs`, qui lisait `useColorScheme`
 * — donc le réglage **du système**, jamais celui de l'application.
 *
 * Les deux lisent maintenant ce fournisseur. Sans quoi l'on obtenait des
 * pictogrammes clairs sur des cartes sombres, ce qui est pire que pas de
 * bascule du tout.
 *
 * ═══ « Automatique » n'est pas un troisième thème ═══
 *
 * C'est l'absence de choix : on suit le système, et l'on continue de le
 * suivre s'il change en cours de route. Uniwind le sait faire — sa valeur
 * `"system"` réactive ses thèmes adaptatifs. Le stocker comme un thème à
 * part obligerait à recopier partout la question « et si c'est
 * automatique ? ».
 *
 * ═══ Pourquoi `SecureStore` pour un réglage anodin ═══
 *
 * Parce que c'est le seul stockage déjà installé, et que le projet
 * n'ajoute pas de dépendance pour trois lignes (AGENTS.md §6.11). Un
 * réglage de thème n'a rien de secret ; il est simplement rangé là où le
 * reste est rangé.
 *
 * ═══ L'ordre du premier rendu ═══
 *
 * La lecture du disque est asynchrone. Rien ne s'affiche avant qu'elle
 * revienne : monter l'application en clair puis basculer en sombre donne
 * un éclair blanc à chaque démarrage, sur un téléphone qu'on ouvre le
 * soir.
 */

import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { Uniwind } from "uniwind";

/** Les trois positions du sélecteur. */
export type Theme = "clair" | "sombre" | "systeme";

const CLE = "karria.theme";

/** Ce qu'Uniwind attend : un thème déclaré, ou son mot pour « suivre ». */
const POUR_UNIWIND = {
  clair: "light",
  sombre: "dark",
  systeme: "system",
} as const;

interface Preference {
  theme: Theme;
  changerTheme: (theme: Theme) => void;
  /** Le mode réellement appliqué. `systeme` est déjà résolu. */
  mode: "light" | "dark";
}

const Contexte = createContext<Preference | null>(null);

/** Sans préférence enregistrée : le **sombre**, comme la V1 — c'est le
 *  décor où l'aura de Karria se voit le mieux. */
function lire(brut: string | null): Theme {
  return brut === "clair" || brut === "sombre" || brut === "systeme" ? brut : "sombre";
}

export function FournisseurDeTheme({ children }: { children: ReactNode }) {
  const duSysteme = useColorScheme() === "dark" ? "dark" : "light";
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let vivant = true;
    SecureStore.getItemAsync(CLE)
      .then((brut) => {
        if (vivant) setTheme(lire(brut));
      })
      .catch(() => {
        // Un stockage illisible n'est pas une raison de bloquer : on suit
        // le système, ce que fait l'application depuis toujours.
        if (vivant) setTheme("systeme");
      });
    return () => {
      vivant = false;
    };
  }, []);

  const changerTheme = useCallback((choisi: Theme) => {
    setTheme(choisi);
    // Immédiatement, sans attendre l'écriture : la bascule doit être
    // instantanée, et l'écriture n'a d'effet qu'au prochain démarrage.
    Uniwind.setTheme(POUR_UNIWIND[choisi]);
    void SecureStore.setItemAsync(CLE, choisi).catch(() => {
      // Le choix vaut pour la session. Le dire à l'utilisateur pour un
      // réglage de couleur serait une alerte pour rien.
      console.warn("[karria] préférence de thème non enregistrée");
    });
  }, []);

  // Appliqué une fois la lecture revenue, et à chaque changement — un
  // rechargement du bundle en développement remet Uniwind à zéro.
  useEffect(() => {
    if (theme !== null) Uniwind.setTheme(POUR_UNIWIND[theme]);
  }, [theme]);

  const valeur = useMemo<Preference | null>(
    () =>
      theme === null
        ? null
        : {
            theme,
            changerTheme,
            mode: theme === "systeme" ? duSysteme : theme === "sombre" ? "dark" : "light",
          },
    [theme, changerTheme, duSysteme],
  );

  // Voir l'en-tête : pas d'éclair blanc au démarrage.
  if (valeur === null) return null;

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/**
 * Le thème courant.
 *
 * Hors du fournisseur — un aperçu isolé, un test — on retombe sur le
 * système plutôt que de lever : un composant de vue ne doit pas exiger un
 * contexte pour s'afficher.
 */
export function useTheme(): Preference {
  const preference = useContext(Contexte);
  const duSysteme = useColorScheme() === "dark" ? "dark" : "light";

  return (
    preference ?? {
      theme: "systeme",
      changerTheme: () => {},
      mode: duSysteme,
    }
  );
}
