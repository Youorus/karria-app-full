/**
 * Naviguer une fois, même quand le doigt appuie deux fois.
 *
 * ═══ Le défaut, et pourquoi il ne se voit qu'à l'usage ═══
 *
 * Un appui sur une carte ouvre un écran. Deux appuis rapprochés en
 * ouvrent **deux** : la pile empile deux fois la même route, et il faut
 * revenir deux fois pour en sortir. Sur un simulateur on ne le reproduit
 * pas ; sur un téléphone, avec une seconde d'attente réseau, tout le
 * monde le fait.
 *
 * Le remède habituel — un drapeau `enCours` par écran — se recopie à
 * chaque bouton et s'oublie au premier ajout. Celui-ci porte sur la
 * navigation elle-même.
 *
 * ═══ Comment ═══
 *
 * `navigation.isFocused()` répond « non » dès que la première navigation
 * a pris effet. Le second appui, qui arrive quelques dizaines de
 * millisecondes plus tard, trouve donc un écran qui n'a plus la main et
 * ne fait rien.
 *
 * C'est le garde recommandé par React Navigation, et il a un avantage
 * qu'un verrou temporel n'a pas : il ne se trompe jamais de durée. Un
 * `setTimeout` de 500 ms bloque un second appui légitime sur un appareil
 * rapide, et laisse passer le doublon sur un appareil lent.
 *
 * ═══ Sortir d'un parcours, et non seulement de son dernier écran ═══
 *
 * `remplacer` échange l'écran du dessus. À la fin d'un parcours de trois
 * étapes, cela laisse les deux premières dessous : le geste de retour
 * ramène sur une saisie déjà envoyée.
 *
 * `quitterLeParcours` vide d'abord la pile, puis remplace ce qui reste.
 * C'est le motif que l'écran de confirmation d'une vérification employait
 * déjà à la main — il est ici pour ne pas l'écrire une troisième fois.
 *
 * Le `canDismiss` n'est pas une précaution inutile : appelé sur une pile
 * déjà au fond, `dismissAll` émet un avertissement en console qu'on lirait
 * cent fois avant de comprendre qu'il ne signale rien.
 *
 * ═══ Ce qu'il ne couvre pas ═══
 *
 * Deux appuis sur **deux cibles différentes** du même écran — une carte
 * puis une autre. C'est plus rare, et le garder demanderait de tenir un
 * verrou partagé dont on oublierait de sortir. Ici, le second appui ouvre
 * la bonne route ; simplement, ce n'est pas celle du premier doigt.
 */

import { useNavigation, useRouter } from "expo-router";
import { useCallback } from "react";

export type Chemin = Parameters<ReturnType<typeof useRouter>["push"]>[0];

export interface NavigationUnique {
  /** Empile un écran. Ignoré si l'écran courant n'a plus la main. */
  pousser: (chemin: Chemin) => void;
  /**
   * Remplace l'écran courant.
   *
   * À préférer dès qu'on quitte une étape terminée : ce qui est fait ne
   * doit pas se refaire par un geste de retour.
   */
  remplacer: (chemin: Chemin) => void;
  /**
   * Sort d'un parcours entier et atterrit ailleurs.
   *
   * À employer quand ce qui vient d'être fait ne se refait pas : une offre
   * publiée, un dossier transmis, un paiement accepté.
   */
  quitterLeParcours: (chemin: Chemin) => void;
  /**
   * Sort d'un parcours **et ouvre ce qu'on vient de créer**.
   *
   * ═══ Le défaut que cela corrige ═══
   *
   * Un parcours de création vit à la racine — `/proposer-un-voyage` — et
   * non dans l'onglet qui possédera l'objet. En remplaçant l'écran final
   * par la fiche du voyage, on obtient une pile où **rien** ne se trouve
   * en dessous : le geste de retour ramène à l'accueil, pas à la liste
   * des trajets. C'est déroutant parce qu'on n'est jamais passé par
   * l'accueil.
   *
   * ═══ Ce que font les grandes applications ═══
   *
   * Elles reconstruisent la pile qu'on aurait eue en arrivant par le
   * chemin normal : la racine de l'onglet, **puis** le détail. Le retour
   * ramène alors à la liste, où l'objet qu'on vient de créer figure — ce
   * qui confirme au passage qu'il existe.
   *
   * On ferme donc le parcours, on pose la racine de l'onglet, puis on
   * empile le détail. Trois gestes, un seul appel.
   */
  terminerVers: (racine: Chemin, detail: Chemin) => void;
}

export function useNavigationUnique(): NavigationUnique {
  const router = useRouter();
  const navigation = useNavigation();

  const pousser = useCallback(
    (chemin: Chemin) => {
      if (!navigation.isFocused()) return;
      router.push(chemin);
    },
    [navigation, router],
  );

  const remplacer = useCallback(
    (chemin: Chemin) => {
      if (!navigation.isFocused()) return;
      router.replace(chemin);
    },
    [navigation, router],
  );

  const quitterLeParcours = useCallback(
    (chemin: Chemin) => {
      if (!navigation.isFocused()) return;
      if (router.canDismiss()) router.dismissAll();
      router.replace(chemin);
    },
    [navigation, router],
  );

  const terminerVers = useCallback(
    (racine: Chemin, detail: Chemin) => {
      if (!navigation.isFocused()) return;
      if (router.canDismiss()) router.dismissAll();
      // L'ordre est tout : `replace` pose la racine de l'onglet à la
      // place du parcours, `push` empile le détail par-dessus. Inverser
      // les deux, ou n'en faire qu'un, laisse une pile où le retour saute
      // par-dessus la liste.
      router.replace(racine);
      router.push(detail);
    },
    [navigation, router],
  );

  return { pousser, remplacer, quitterLeParcours, terminerVers };
}
