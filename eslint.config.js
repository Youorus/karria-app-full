// Configuration ESLint — https://docs.expo.dev/guides/using-eslint/
//
// ─── Pourquoi `src/components/ui/**` est ignoré ───
//
// Ces fichiers sont générés par la CLI de gluestack et se régénèrent à
// chaque `npx gluestack-ui@latest add`. Les linter produit vingt-deux
// avertissements que personne n'a le droit de corriger durablement : la
// correction se perdrait à la mise à jour suivante.
//
// Le bruit a un coût réel : une sortie pleine d'avertissements qu'on
// apprend à ignorer est une sortie où l'avertissement qui compte passe
// inaperçu.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "src/components/ui/**"],
  },
]);
