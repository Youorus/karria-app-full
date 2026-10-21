/**
 * La configuration de Jest.
 *
 * ═══ Pourquoi un fichier plutôt qu'un bloc dans `package.json` ═══
 *
 * Parce qu'il faut **composer** avec le préréglage `jest-expo`, pas le
 * remplacer. `moduleNameMapper` est un objet : déclaré dans la config, il
 * écrase entièrement celui du préréglage — lequel contient les deux
 * entrées qui résolvent React Native lui-même. Le symptôme est
 * déroutant : « module react-native/setup-env introuvable », alors qu'on
 * n'a fait qu'ajouter un alias.
 *
 * Ici on étale l'objet du préréglage avant d'ajouter le nôtre. Les deux
 * coexistent, et une entrée ajoutée par une future version d'Expo
 * arrivera d'elle-même.
 */

const preset = require("jest-expo/jest-preset");

/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    // L'alias du projet, tel que `tsconfig.json` le déclare.
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Les paquets Expo, React Native et gluestack sont publiés en ESM : sans
  // cette liste, Jest les reçoit non transpilés et échoue sur le premier
  // `import`. gluestack et uniwind s'y ajoutent pour les tests d'écran,
  // qui rendent les vrais composants de `components/ui/`.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|native-base|react-native-svg|react-native-worklets|react-native-reanimated|@gluestack-ui/.*|uniwind|react-native-css-interop|nativewind)",
  ],
  setupFilesAfterEnv: [...(preset.setupFilesAfterEnv ?? []), "<rootDir>/jest.setup.ts"],
  // Chaque test repart avec des simulateurs vierges : sans cela, les
  // appels d'un test comptent dans le suivant, et « appelé une fois »
  // devient faux dès le deuxième test du fichier.
  clearMocks: true,
  // Le premier test d'un fichier d'écran paie le chargement de tous ses
  // modules. Sur une machine chargée — la suite entière en parallèle, ou
  // la mesure de couverture — cela dépassait parfois les cinq secondes
  // par défaut, et un test juste échouait une fois sur dix. Un test qui
  // échoue au hasard apprend à ne plus lire les échecs.
  testTimeout: 20_000,
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
};
