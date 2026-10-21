/**
 * La session : qui est connecté, et ce qui se passe quand cela change.
 *
 * ═══ Trois états, pas quatre ═══
 *
 * La V1 — comme Zoumani — avait un état « onboarding » : connecté, mais
 * profil incomplet, donc retenu dans un tunnel de formulaires. Karria n'en
 * a plus. Qui prouve son adresse entre directement dans l'application, et
 * c'est l'assistant, en conversation, qui apprend ce que la personne
 * cherche. L'état se réduit donc à :
 *
 * - `verification` : on lit le magasin sécurisé au démarrage ;
 * - `connecte` : des jetons existent ;
 * - `anonyme` : aucun.
 *
 * ═══ Pourquoi on ne consulte pas le serveur au démarrage ═══
 *
 * Avoir des jetons suffit pour ouvrir l'application. S'ils sont morts, la
 * première requête le découvrira, `lib/http.ts` tentera de les
 * renouveler, et en cas de refus appellera `auMomentDeLaDeconnexion` :
 * retour à l'accueil. Attendre le serveur avant d'afficher quoi que ce
 * soit ferait payer un aller-retour réseau à chaque ouverture, et
 * bloquerait l'application hors connexion.
 */

import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { desinscrireAppareil } from "@/features/notifications/api/appareils.api";
import { auMomentDeLaDeconnexion } from "@/lib/http";
import { lireInstallationId, oublierReponseNotifications } from "@/lib/installation";
import { ecrireJetons, lireJetons, oublierSession, type Jetons } from "@/lib/session";
import { revoquerLaSession } from "../api/auth.api";
import { oublierLesFournisseurs } from "../services/social";

export type EtatSession = "verification" | "connecte" | "anonyme";

interface Ouverture {
  /** Vrai à la toute première connexion de ce compte : la question des
   *  notifications se repose, même si cette installation y avait déjà
   *  répondu pour un autre compte. */
  compteCree?: boolean;
}

interface Session {
  etat: EtatSession;
  /** Enregistre les jetons et entre dans l'application. */
  ouvrir: (jetons: Jetons, ouverture?: Ouverture) => Promise<void>;
  /** Déconnexion volontaire : désinscrit l'appareil, révoque côté serveur,
   *  puis oublie tout. */
  fermer: () => Promise<void>;
  /**
   * Le compte vient d'être **supprimé** côté serveur (`DELETE /auth/me`).
   *
   * Rien à révoquer ni à désinscrire : le serveur a déjà tout effacé, et
   * ces appels échoueraient sur un compte qui n'existe plus. On oublie
   * seulement ce que le téléphone garde — jetons, fournisseurs sociaux,
   * réponse aux notifications — et l'on revient à l'accueil, qui dit au
   * revoir. L'identifiant d'installation reste : il nomme le téléphone,
   * pas la personne, et le prochain compte le réutilisera.
   */
  oublierApresSuppression: () => Promise<void>;
}

/** Ce que l'accueil lit pour dire au revoir après une suppression. */
export const PARAMETRE_ADIEU = "adieu";

const Contexte = createContext<Session | null>(null);

export function FournisseurDeSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>("verification");
  const router = useRouter();

  useEffect(() => {
    let vivant = true;
    lireJetons().then(
      (jetons) => {
        if (vivant) setEtat(jetons === null ? "anonyme" : "connecte");
      },
      () => {
        if (vivant) setEtat("anonyme");
      },
    );
    return () => {
      vivant = false;
    };
  }, []);

  // `replace` seul, sans `dismissAll` : l'accueil vit dans la pile racine,
  // et le remplacer là démonte tout l'espace connecté — onglets et écrans
  // empilés dessus (paramètres, suppression). `dismissAll` envoyait un
  // POP_TO_TOP à la racine, où `(app)` est la seule route : « action non
  // traitée » en rouge en bas de l'écran, et rien de plus.
  const revenirALAccueil = useCallback(() => {
    setEtat("anonyme");
    router.replace("/bienvenue");
  }, [router]);

  // La session peut mourir sans que personne ne le demande : jeton de
  // rafraîchissement refusé par le serveur. `lib/http.ts` le découvre et
  // nous prévient ; c'est ici qu'on décide de ce que l'utilisateur voit.
  useEffect(() => {
    auMomentDeLaDeconnexion(revenirALAccueil);
  }, [revenirALAccueil]);

  const ouvrir = useCallback(async (jetons: Jetons, ouverture: Ouverture = {}) => {
    if (ouverture.compteCree === true) {
      try {
        await oublierReponseNotifications();
      } catch (cause) {
        // La question ne se reposera pas : dommage, pas bloquant.
        console.warn("[karria] réponse aux notifications non réinitialisée", cause);
      }
    }
    await ecrireJetons(jetons);
    setEtat("connecte");
  }, []);

  const fermer = useCallback(async () => {
    const jetons = await lireJetons();
    if (jetons !== null) {
      // L'appareil d'abord, tant que la session est valide : après la
      // révocation, la route refuserait, et le serveur continuerait
      // d'envoyer des notifications à un téléphone où personne n'est là.
      try {
        await desinscrireAppareil(await lireInstallationId());
      } catch (cause) {
        console.warn("[karria] désinscription de l'appareil impossible", cause);
      }
      try {
        await revoquerLaSession(jetons.rafraichissement);
      } catch (cause) {
        // On déconnecte quand même : refuser de sortir parce que le
        // réseau est coupé serait absurde. Le jeton expirera seul.
        console.warn("[karria] révocation de session impossible", cause);
      }
    }
    await oublierLesFournisseurs();
    await oublierSession();
    revenirALAccueil();
  }, [revenirALAccueil]);

  const oublierApresSuppression = useCallback(async () => {
    try {
      await oublierReponseNotifications();
    } catch (cause) {
      // Le prochain compte ne se verra pas reposer la question tout de
      // suite : regrettable, pas bloquant.
      console.warn("[karria] réponse aux notifications non réinitialisée", cause);
    }
    await oublierLesFournisseurs();
    await oublierSession();
    setEtat("anonyme");
    router.replace({ pathname: "/bienvenue", params: { [PARAMETRE_ADIEU]: "1" } });
  }, [router]);

  const valeur = useMemo<Session>(
    () => ({ etat, ouvrir, fermer, oublierApresSuppression }),
    [etat, ouvrir, fermer, oublierApresSuppression],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession(): Session {
  const session = useContext(Contexte);
  if (session === null) {
    throw new Error("useSession doit être appelé sous <FournisseurDeSession>.");
  }
  return session;
}
