/**
 * Lève le sandbox des phases de script Xcode.
 *
 * ═══ Le symptôme ═══
 *
 *   react-native-xcode.sh: line 27:
 *     .../Zoumani.app/ip.txt: Operation not permitted
 *
 * Un `Operation not permitted` (EPERM) et non un `Permission denied`
 * (EACCES) : le dossier est parfaitement accessible en écriture depuis un
 * terminal, au même instant, avec le même utilisateur. Ce n'est donc pas
 * une histoire de droits POSIX — c'est Xcode qui interdit.
 *
 * ═══ Pourquoi ═══
 *
 * `ENABLE_USER_SCRIPT_SANDBOXING = YES` confine chaque phase de script à ce
 * qu'elle DÉCLARE écrire, via `outputPaths`. Or la phase « Bundle React
 * Native code and images » que génère React Native déclare :
 *
 *   outputPaths = ( );
 *
 * Rien. Elle n'a donc le droit d'écrire nulle part, alors que son travail
 * consiste précisément à déposer trois choses dans le `.app` : `ip.txt`
 * (l'adresse de la machine qui fait tourner Metro), `main.jsbundle`, et les
 * assets. Le réglage et le script sont incompatibles par construction.
 *
 * ═══ Pourquoi ça n'est apparu que sur un appareil physique ═══
 *
 * En Debug sur simulateur, le script sort immédiatement — Metro sert le
 * bundle, il n'y a rien à écrire. Sur un appareil, il annonce « Bundling
 * for physical device » et écrit pour de bon. Le sandbox n'a donc jamais eu
 * l'occasion de bloquer quoi que ce soit tant qu'on n'avait pas quitté le
 * simulateur.
 *
 * ═══ Pourquoi on ne neutralise pas seulement `ip.txt` ═══
 *
 * Le script offre `SKIP_BUNDLING_METRO_IP`, qui supprime exactement la
 * ligne 27. Ça ne réglerait rien : les deux écritures suivantes tomberaient
 * sur le même refus trois lignes plus bas. Et priver l'appareil de
 * l'adresse de Metro, c'est perdre le rechargement à chaud sur device.
 *
 * ═══ Pourquoi un plugin, et non une modification de `ios/` ═══
 *
 * `/ios` est dans `.gitignore` : le dossier est reconstruit par
 * `expo prebuild`. Un `.pbxproj` corrigé à la main tient jusqu'au prochain
 * prebuild, puis le bug revient — sur la machine de quelqu'un d'autre, ou
 * six mois plus tard, sans que personne ne fasse le lien avec ce réglage.
 * Le correctif doit vivre dans une source versionnée : c'est ici.
 *
 * Aucune dépendance ajoutée : `@expo/config-plugins` est déjà fourni par
 * `expo`.
 *
 * ═══ Ce que ça coûte ═══
 *
 * Le sandbox est une défense en profondeur : il empêche une phase de script
 * d'aller écrire hors de son périmètre. On la perd. C'est le compromis
 * qu'acceptent tous les projets React Native, parce que la phase de
 * bundling est fournie par React Native et qu'on ne maîtrise pas ses
 * `outputPaths`. Le jour où React Native les déclarera, ce fichier se
 * supprime — et le build continuera de passer.
 */

const { withXcodeProject } = require("@expo/config-plugins");

const REGLAGE = "ENABLE_USER_SCRIPT_SANDBOXING";

module.exports = function sansSandboxDeScript(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();

    for (const cle of Object.keys(configurations)) {
      const reglages = configurations[cle]?.buildSettings;
      // Les clés de commentaire (« …_comment ») n'ont pas de buildSettings.
      if (!reglages) continue;

      // Posé sur TOUTES les configurations, y compris celles où le réglage
      // est absent : absent veut dire « valeur par défaut », et la valeur
      // par défaut a changé d'une version de Xcode à l'autre. On ne se
      // repose pas sur un défaut qui nous a déjà coûté un build.
      reglages[REGLAGE] = "NO";
    }

    return config;
  });
};
