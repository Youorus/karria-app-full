// Configuration Metro.
//
// `cssEntryFile` désigne le point d'entrée des styles : c'est lui que
// UniWind compile, et par lui que `theme/tokens.css` entre dans
// l'application. Il vit sous `src/`, avec le reste du code.
//
// `extraThemes: ["dark"]` déclare le second jeu de variables du thème.
// Sans cette ligne, le bloc `@variant dark` de `tokens.css` serait
// compilé mais jamais activé — l'application resterait claire la nuit.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// ═══ Le faux serveur ne part pas en production ═══
//
// `SIMULATION` (lib/config.ts) empêche de l'appeler hors développement,
// mais pas son code de partir dans le bundle : Metro n'élague pas un
// module sur la foi d'une condition. Vérifié sur Zoumani en exportant un
// bundle de production et en y trouvant les chaînes de développement.
//
// Chaque import de `lib/dev/` est donc redirigé, en production, vers un
// module qui exporte les mêmes noms et échoue s'il est appelé.
//
// `NODE_ENV` et non `__DEV__` : celui-ci n'existe pas ici, ce fichier
// tourne dans Node au moment de la construction. Expo pose `production`
// pour `expo export` et pour toute construction EAS.
const REMPLACANT = path.resolve(__dirname, "src/lib/dev/absent-en-production.ts");
const resolutionDefaut = config.resolver.resolveRequest;

config.resolver.resolveRequest = (contexte, nom, plateforme) => {
  const resoudre = resolutionDefaut ?? contexte.resolveRequest;
  if (process.env.NODE_ENV === "production" && nom.includes("lib/dev/")) {
    // Le remplaçant lui-même doit passer, sinon la redirection se
    // renverrait à elle-même indéfiniment.
    if (!nom.includes("absent-en-production")) {
      return { type: "sourceFile", filePath: REMPLACANT };
    }
  }
  return resoudre(contexte, nom, plateforme);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./uniwind-types.d.ts",
  extraThemes: ["dark"],
});
