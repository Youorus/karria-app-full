/**
 * La file de rendu : un seul rendu serveur à la fois, au repos, le dernier
 * demandé gagne.
 *
 * ═══ Le problème ═══
 *
 * Chaque frappe modifie le CV. Le serveur rend en 200–400 ms, et plafonne
 * à 90 rendus par minute. Demander un rendu à chaque frappe en lancerait
 * dix en vol, qui reviendraient dans le désordre : la feuille montrerait un
 * état périmé par-dessus un état frais.
 *
 * ═══ La règle ═══
 *
 * 1. On attend **le repos** (`delaiMs`, 400 ms après la dernière demande).
 * 2. Un seul rendu en vol. Une demande qui arrive pendant le vol est mise
 *    de côté — **la dernière seulement** — et part dès que le vol se pose.
 * 3. Un résultat n'est livré que s'il correspond à la dernière entrée
 *    demandée : un rendu rattrapé par une demande plus récente est jeté.
 *
 * Pur : les minuteries sont injectables, pour tester sans attendre.
 */

export interface OptionsFile<E, R> {
  rendre: (entree: E) => Promise<R>;
  surResultat: (resultat: R, entree: E) => void;
  surErreur: (cause: unknown, entree: E) => void;
  /** Vrai dès qu'un rendu part, faux quand plus rien n'est en vol ni en attente. */
  surActivite?: (enCours: boolean) => void;
  delaiMs?: number;
  planifier?: (rappel: () => void, ms: number) => unknown;
  annuler?: (poignee: unknown) => void;
}

export interface FileDeRendu<E> {
  /** Au repos, après `delaiMs` — ou juste après le rendu en vol. */
  demander: (entree: E) => void;
  /** Sans attendre le repos : à l'ouverture, au changement de modèle. */
  rendreMaintenant: (entree: E) => void;
  /** Plus rien ne sera livré. */
  arreter: () => void;
}

export const DELAI_REPOS_MS = 400;

export function creerFileDeRendu<E, R>(options: OptionsFile<E, R>): FileDeRendu<E> {
  const delaiMs = options.delaiMs ?? DELAI_REPOS_MS;
  const planifier =
    options.planifier ?? ((rappel: () => void, ms: number) => setTimeout(rappel, ms));
  const annuler =
    options.annuler ??
    ((poignee: unknown) => clearTimeout(poignee as ReturnType<typeof setTimeout>));

  let minuterie: unknown = null;
  let enVol = false;
  let enAttente: { entree: E } | null = null;
  let derniere: { entree: E } | null = null;
  let arretee = false;

  const signaler = () => options.surActivite?.(enVol || enAttente !== null);

  const lancer = (entree: E) => {
    enVol = true;
    signaler();
    options
      .rendre(entree)
      .then(
        (resultat) => {
          if (arretee) return;
          if (derniere?.entree === entree) options.surResultat(resultat, entree);
        },
        (cause: unknown) => {
          if (arretee) return;
          if (derniere?.entree === entree) options.surErreur(cause, entree);
        },
      )
      .finally(() => {
        enVol = false;
        if (arretee) return;
        const suivante = enAttente;
        enAttente = null;
        if (suivante !== null) lancer(suivante.entree);
        else signaler();
      });
  };

  const partir = (entree: E) => {
    derniere = { entree };
    if (enVol) {
      enAttente = { entree };
      signaler();
      return;
    }
    lancer(entree);
  };

  return {
    demander(entree) {
      if (arretee) return;
      derniere = { entree };
      if (minuterie !== null) annuler(minuterie);
      minuterie = planifier(() => {
        minuterie = null;
        partir(entree);
      }, delaiMs);
    },
    rendreMaintenant(entree) {
      if (arretee) return;
      if (minuterie !== null) {
        annuler(minuterie);
        minuterie = null;
      }
      partir(entree);
    },
    arreter() {
      arretee = true;
      if (minuterie !== null) annuler(minuterie);
      minuterie = null;
      enAttente = null;
    },
  };
}
