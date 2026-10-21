/**
 * L'obtention d'un justificatif auprès d'Apple ou de Google.
 *
 * ═══ Ce que ce fichier fait, et ce qu'il ne fait pas ═══
 *
 * Il parle aux fournisseurs et rend un jeton. Il **n'ouvre aucune
 * session** : c'est le serveur qui vérifie la signature et décide qui est
 * cette personne. Le mobile ne fait que transporter.
 *
 * La distinction n'est pas théorique. Un client qui déciderait lui-même
 * de l'identité pourrait la déclarer — et n'importe qui pourrait alors
 * devenir n'importe qui.
 *
 * ═══ Le nonce ═══
 *
 * Émis ici, à chaque tentative, par `expo-crypto` — jamais par
 * `Math.random`, qui est prévisible et n'est pas conçu pour cela.
 *
 * Apple attend son **haché** : on lui envoie le SHA-256, on garde la
 * valeur en clair, et le serveur compare les deux. Sans lui, un jeton
 * intercepté reste valide jusqu'à son expiration et rouvrirait une
 * session.
 *
 * ═══ Pourquoi tout est rattrapé ═══
 *
 * Ces bibliothèques lèvent pour tout : annulation, absence de Play
 * Services, configuration manquante. Laisser remonter ferait tomber
 * l'écran d'accueil sur un geste aussi banal que fermer une feuille.
 */

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { SIMULATION } from "@/lib/config";

import type { CredentialSocial, ResultatSocial } from "./social.types";

/**
 * Le client OAuth iOS, lu dans la configuration Firebase.
 *
 * Il n'est pas secret — il est déjà dans le `GoogleService-Info.plist`
 * embarqué dans l'application, que n'importe qui peut extraire. Ce qui
 * protège, c'est la vérification d'audience côté serveur.
 */
const CLIENT_IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

/**
 * Le client OAuth **web**, exigé par Google pour obtenir un `idToken`.
 *
 * C'est le piège le plus courant de cette bibliothèque : sans lui, la
 * connexion aboutit et `idToken` vaut `null` — l'échec le plus
 * déroutant, puisque tout a l'air d'avoir fonctionné.
 */
const CLIENT_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

let googleConfigure = false;

function preparerGoogle(): void {
  if (googleConfigure) return;
  GoogleSignin.configure({
    webClientId: CLIENT_WEB,
    iosClientId: CLIENT_IOS || undefined,
    // On ne demande que l'identité. Aucun accès aux contacts, à l'agenda
    // ou aux fichiers : chaque périmètre demandé est une raison de plus
    // de refuser, et aucun ne nous servirait.
    scopes: ["openid", "email", "profile"],
  });
  googleConfigure = true;
}

/** Apple Sign-In est-il proposable sur cet appareil ? */
export async function appleDisponible(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Ouvre la feuille d'Apple et rend son justificatif.
 *
 * ═══ Ce qu'on demande, et rien de plus ═══
 *
 * L'adresse, et rien d'autre. Apple présente cette liste à la personne :
 * chaque champ superflu est une case en plus à lire, et une raison de
 * plus de refuser.
 */
export async function connexionApple(): Promise<ResultatSocial> {
  if (SIMULATION) return justificatifSimule("apple");
  const nonce = genererNonce();
  const nonceHache = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: nonceHache,
    });
    if (credential.identityToken === null) {
      return { resultat: "echec", message: "Apple n'a pas transmis de justificatif." };
    }
    return {
      resultat: "obtenu",
      fournisseur: "apple",
      jeton: credential.identityToken,
      nonce,
    } satisfies CredentialSocial;
  } catch (cause) {
    return interpreterApple(cause);
  }
}

/** Ouvre le sélecteur de compte Google et rend son justificatif. */
export async function connexionGoogle(): Promise<ResultatSocial> {
  if (SIMULATION) return justificatifSimule("google");
  preparerGoogle();

  try {
    // Sur Android, une version obsolète des Play Services fait échouer
    // la connexion sans message utile. Ce contrôle affiche le dialogue de
    // mise à jour du système, qui est actionnable.
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const reponse = await GoogleSignin.signIn();
    if (reponse.type === "cancelled") {
      return { resultat: "annulee" };
    }

    const jeton = reponse.data?.idToken;
    if (!jeton) {
      // Le symptôme du `webClientId` manquant — voir sa constante.
      return {
        resultat: "echec",
        message: "Google n'a pas transmis de justificatif d'identité.",
      };
    }

    return {
      resultat: "obtenu",
      fournisseur: "google",
      jeton,
    } satisfies CredentialSocial;
  } catch (cause) {
    return interpreterGoogle(cause);
  }
}

/**
 * Referme la session côté fournisseur.
 *
 * Sans cela, Google reconnecte silencieusement le même compte au
 * prochain appui — et quelqu'un qui a prêté son téléphone ne peut plus
 * en changer.
 */
export async function oublierLesFournisseurs(): Promise<void> {
  try {
    preparerGoogle();
    await GoogleSignin.signOut();
  } catch {
    // Sans conséquence : la session Zoumani est déjà fermée par ailleurs.
  }
}

/**
 * Un justificatif factice, pour la simulation.
 *
 * Les SDK natifs ne sont pas appelés : sans identifiants OAuth Karria
 * configurés et sans compte de développeur signé sur le simulateur, ils
 * échoueraient — et l'on ne pourrait pas concevoir l'écran qui suit. Le
 * faux serveur accepte n'importe quel jeton.
 */
async function justificatifSimule(
  fournisseur: "apple" | "google",
): Promise<CredentialSocial> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { resultat: "obtenu", fournisseur, jeton: `jeton-simule-${fournisseur}` };
}

function genererNonce(): string {
  // 32 octets tirés du générateur du système. `Math.random` serait
  // prévisible, et un nonce prévisible ne protège de rien.
  return Array.from(Crypto.getRandomBytes(32))
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join("");
}

function interpreterApple(cause: unknown): ResultatSocial {
  const code = (cause as { code?: string })?.code;
  // `ERR_REQUEST_CANCELED` : la feuille a été fermée. Ce n'est pas une
  // panne, et l'annoncer comme telle serait absurde.
  if (code === "ERR_REQUEST_CANCELED") {
    return { resultat: "annulee" };
  }
  console.warn("[karria] connexion Apple impossible", code);
  return {
    resultat: "echec",
    message: "La connexion avec Apple n'a pas abouti. Réessaie.",
  };
}

function interpreterGoogle(cause: unknown): ResultatSocial {
  if (isErrorWithCode(cause)) {
    switch (cause.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return { resultat: "annulee" };
      case statusCodes.IN_PROGRESS:
        // Un second appui pendant que le sélecteur s'ouvre. Rien à dire.
        return { resultat: "annulee" };
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return {
          resultat: "echec",
          message:
            "Les services Google Play sont indisponibles sur cet appareil. " +
            "Connecte-toi avec ton adresse e-mail.",
        };
      default:
        break;
    }
  }
  console.warn("[karria] connexion Google impossible", cause);
  return {
    resultat: "echec",
    message: "La connexion avec Google n'a pas abouti. Réessaie.",
  };
}
