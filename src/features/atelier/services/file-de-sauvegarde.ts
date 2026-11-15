/**
 * Une file d'écritures par éditeur. Le contenu, le modèle et la couleur
 * peuvent être modifiés indépendamment, mais une seule écriture part à la
 * fois. Avant un export, vider attend aussi la requête déjà partie.
 */

export type Enregistrement = "repos" | "en-cours" | "fait" | "erreur";

type Ecriture = () => Promise<void>;

export const DELAI_SAUVEGARDE_MS = 1_500;

export function creerFileDeSauvegarde() {
  let observateur: ((etat: Enregistrement) => void) | null = null;
  const surEtat = (etat: Enregistrement) => observateur?.(etat);
  const enAttente = new Map<string, Ecriture>();
  let enVol: Promise<boolean> | null = null;
  let minuterie: ReturnType<typeof setTimeout> | null = null;

  const annulerMinuterie = () => {
    if (minuterie !== null) clearTimeout(minuterie);
    minuterie = null;
  };

  const vider = (): Promise<boolean> => {
    annulerMinuterie();
    if (enVol !== null) return enVol;
    if (enAttente.size === 0) return Promise.resolve(true);

    enVol = Promise.resolve().then(async () => {
      try {
        while (true) {
          const prochain = enAttente.entries().next();
          if (prochain.done) break;
          const [cle, ecrire] = prochain.value;
          enAttente.delete(cle);
          try {
            await ecrire();
          } catch (cause) {
            console.warn("[karria] écriture de l'atelier non enregistrée", cle, cause);
            // Une frappe plus récente remplace l'écriture en échec.
            if (!enAttente.has(cle)) enAttente.set(cle, ecrire);
            surEtat("erreur");
            return false;
          }
        }
        surEtat("fait");
        return true;
      } finally {
        enVol = null;
      }
    });
    surEtat("en-cours");
    return enVol;
  };

  return {
    vider,
    abonner(observe: (etat: Enregistrement) => void) {
      observateur = observe;
      return () => {
        observateur = null;
        annulerMinuterie();
      };
    },
    demander(cle: string, ecrire: Ecriture, immediat = false) {
      enAttente.set(cle, ecrire);
      if (enVol !== null) return;
      annulerMinuterie();
      if (immediat) void vider();
      else {
        surEtat("repos");
        minuterie = setTimeout(() => void vider(), DELAI_SAUVEGARDE_MS);
      }
    },
  };
}
