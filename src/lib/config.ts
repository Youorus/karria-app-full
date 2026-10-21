/**
 * La configuration lue à l'exécution.
 *
 * ═══ Pourquoi `process.env` et pas un fichier de constantes ═══
 *
 * Une URL écrite en dur oblige à modifier une ligne pour changer
 * d'environnement — et cette ligne finit commitée avec la valeur de
 * développement. Metro remplace `process.env.EXPO_PUBLIC_*` par sa valeur
 * à la compilation : la même base de code produit un build local et un
 * build de production.
 *
 * L'accès s'écrit en toutes lettres : Metro fait une substitution
 * **textuelle**. `process.env[nom]` ne serait pas remplacé et vaudrait
 * `undefined` en production.
 *
 * ═══ ⚠️ Changer `.env` exige de vider le cache ═══
 *
 * Metro met en cache le module compilé, valeur inlinée comprise. Après
 * une modification de `.env` : `npx expo start --clear`. Sans cela,
 * l'application vise l'ancienne valeur et rien ne le signale.
 *
 * ═══ `EXPO_PUBLIC_`, donc public ═══
 *
 * Tout ce qui porte ce préfixe est lisible dans le paquet installé. Une
 * URL, un mode, jamais une clé secrète.
 */

const DEFAUT = "http://localhost:8000/api/v1";

/** Racine de l'API, sans barre finale. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAUT).replace(/\/$/, "");

/**
 * Vrai quand un faux serveur, embarqué, répond à la place du backend.
 *
 * ═══ Pourquoi ce mode existe ═══
 *
 * Le backend de Karria est en reconstruction. Sans ce mode, l'application
 * ne pourrait pas dépasser l'écran de connexion d'ici là — et on ne
 * concevrait pas l'expérience en la voyant tourner.
 *
 * ═══ Pourquoi `__DEV__` en plus de la variable ═══
 *
 * Une variable oubliée dans un build de production livrerait à des
 * utilisateurs réels une application qui accepte le code 000000. La
 * double condition rend cet accident impossible : hors développement, le
 * mode simulation n'existe pas, quoi que dise `.env`. Et le faux serveur
 * lui-même n'est pas empaqueté en production (voir `metro.config.js`).
 */
export const SIMULATION = __DEV__ && process.env.EXPO_PUBLIC_API_MODE === "simulation";

/**
 * Le backend visé en mode réel : `v1` (l'ancienne API, par défaut) ou
 * `v2` (`karria_api_v2`, en construction).
 *
 * La v2 ne sert pas encore tout : en développement, ce qu'elle ne sert
 * pas part au faux serveur (voir `enAvanceSurLeBackend`). Une session v2
 * n'ouvre pas la v1, d'où ce choix plutôt qu'un mélange des deux.
 */
export const CIBLE_V2 = process.env.EXPO_PUBLIC_API_CIBLE === "v2";
