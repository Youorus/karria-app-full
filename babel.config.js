// Configuration Babel.
//
// ─── L'alias `@` doit rester aligné sur `tsconfig.json` ───
//
// TypeScript et Metro ont chacun leur table de résolution, et **aucun ne
// lit celle de l'autre**. Un alias correct dans `tsconfig.json` mais faux
// ici compile parfaitement et échoue à l'empaquetage : le typage ne
// prouve pas qu'un module existe pour Metro.
//
// **Une seule** entrée, et c'est délibéré. Une seconde racine — `@/assets`
// pointant ailleurs — a fait disparaître un `require("@/assets/...")` du
// paquet sans le moindre message : l'écran s'affichait, simplement sans
// l'image. Les ressources importées par le code vivent donc sous
// `src/assets/`. Celles que les plugins Expo lisent dans `app.json`
// (icône, écran de démarrage) restent à la racine : ce sont des chemins
// de configuration, jamais des imports.
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],

    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],

          alias: {
            "@": "./src",
          },
        },
      ],
      "react-native-worklets/plugin",
    ],
  };
};
