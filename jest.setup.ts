/**
 * Ce que chaque test reçoit avant de démarrer.
 *
 * ═══ Pourquoi ce fichier est court ═══
 *
 * `jest-expo` simule déjà l'essentiel des modules natifs. On ne remplace
 * ici que ce dont le résultat change le sens d'un test — le reste, on le
 * laisse au préréglage, qui suivra les versions d'Expo sans qu'on ait à
 * le maintenir.
 *
 * ═══ Le silence des avertissements ═══
 *
 * Les services journalisent volontairement par `console.warn` quand un
 * jeton est indisponible : c'est une trace, pas une erreur. Les tests qui
 * provoquent exprès ces cas rempliraient la sortie de bruit, et l'on
 * finirait par ne plus lire les vraies erreurs.
 *
 * ═══ Reanimated, simulé partout ═══
 *
 * Le module réel exige le moteur natif des worklets dès son chargement
 * (`loadUnpackers`), qui n'existe pas sous Jest : tout écran qui importe,
 * même de loin, une animation — la zone de saisie, la bulle d'un
 * message — plantait avant le premier rendu. Chaque test concerné
 * recopiait sa propre fabrique, chacune un peu différente. On prend les
 * simulateurs que les bibliothèques publient elles-mêmes : ils suivent
 * chaque version, là où une fabrique maison oublie le prochain export
 * utilisé par un écran.
 *
 * Les deux lignes vont ensemble : `react-native-reanimated/mock` importe
 * encore l'index réel, donc `react-native-worklets`. Sans le simulateur
 * des worklets, le chargement plante exactement comme avant.
 *
 * ═══ Le délai des attentes, porté à cinq secondes ═══
 *
 * `findBy…` et `waitFor` abandonnent par défaut au bout d'une seconde.
 * C'est assez pour un écran déjà chargé, pas pour le premier rendu d'un
 * fichier quand la machine est occupée : deux tests échouaient ainsi par
 * intermittence. Le délai ne ralentit rien — une attente rend la main dès
 * que l'élément paraît — et n'affaiblit rien : un élément qui ne vient
 * jamais fait toujours échouer le test.
 */

import { afterEach, beforeEach, jest } from "@jest/globals";
import { configure } from "@testing-library/react-native";

jest.mock("react-native-worklets", () =>
  jest.requireActual("react-native-worklets/src/mock"),
);
jest.mock("react-native-reanimated", () =>
  jest.requireActual("react-native-reanimated/mock"),
);

configure({ asyncUtilTimeout: 5_000 });

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
