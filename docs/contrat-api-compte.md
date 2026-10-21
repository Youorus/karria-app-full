# Contrat API — le compte : sa suppression

Ce que `karria_api_v2` expose pour qu'une personne supprime son compte
depuis l'application, en disant pourquoi elle part. La forme exécutable de
ce contrat est `src/lib/dev/serveur-simule.ts` (section `/auth/`) : les
deux doivent toujours dire la même chose.

## Le principe

Supprimer son compte est un droit, pas un parcours d'obstacles. L'app
demande **une** raison (liste close), laisse un mot libre facultatif,
explique ce qui va disparaître, puis envoie **un seul appel**. Le serveur
fait tout le reste : effacer les données, couper toutes les sessions,
détacher les appareils. L'app n'a ensuite qu'à oublier ce que le téléphone
garde (jetons, fournisseurs sociaux) et à revenir à l'accueil.

La raison sert à **s'améliorer**, rien d'autre : elle n'est pas rattachée
à une identité une fois le compte effacé.

## La route

### `DELETE /auth/me` → `204`

Exige la session (`Authorization: Bearer <access_token>`). Corps JSON :

```jsonc
{
  "reason": "found_job", // voir la liste ci-dessous — obligatoire
  "details": "J'ai signé la semaine dernière, merci !", // string | null, ≤ 1 000 caractères
}
```

`reason`, parmi :

| Code                     | Ce que la personne a choisi                  |
| ------------------------ | -------------------------------------------- |
| `found_job`              | « J'ai trouvé un emploi »                    |
| `no_matching_offers`     | « Je ne trouve pas d'offres qui me correspondent » |
| `not_useful`             | « L'app ne m'est pas utile »                 |
| `too_many_notifications` | « Trop de notifications »                    |
| `privacy`                | « Je suis inquiet pour mes données »         |
| `other`                  | « Autre »                                    |

`details` : un texte libre, facultatif. L'app l'envoie **nettoyé** (espaces
de bord retirés, chaîne vide → `null`) ; le serveur applique la même règle
et refuse au-delà de 1 000 caractères.

### Ce que le serveur fait, dans une transaction

1. Supprime le compte et tout ce qui lui est rattaché : adresse e-mail,
   consentements horodatés, identités sociales (Apple, Google), **CV et
   brouillon de CV** (photos comprises), appareils enregistrés
   (`/devices/*`), offres gardées et interactions, conversations.
2. **Révoque toutes les sessions** du compte — pas seulement celle qui a
   appelé. Un autre téléphone connecté au même compte est déconnecté à sa
   prochaine requête (`401`, rafraîchissement refusé).
3. Conserve, **sans lien avec une identité**, la raison et le détail, la
   date, et le temps écoulé depuis l'inscription — pour les statistiques
   produit. Le détail libre est purgé de toute adresse e-mail ou numéro
   de téléphone qu'il contiendrait avant d'être retenu.
4. Journalise un événement interne (`AccountDeleted`) : les modules qui
   détiennent des données du compte (CV, appareils, offres) s'y abonnent
   et nettoient les leurs. La réponse n'attend pas ces nettoyages
   secondaires ; l'effacement du compte lui-même et la révocation des
   sessions, si.

C'est **irréversible**. Il n'y a ni délai de grâce ni restauration : la
personne qui revient repart d'un compte neuf. L'app le dit en toutes
lettres avant le dernier geste ; le serveur ne redemande rien.

### Réponses

- `204` sans corps : tout est fait. L'app oublie la session locale et
  revient à l'accueil — **sans** appeler `POST /auth/logout` ni
  `DELETE /devices/{id}`, qui échoueraient sur un compte disparu.
- `401 unauthenticated` : pas de session valable. L'app a déjà réagi
  (retour à l'accueil par `lib/http.ts`).
- `422 invalid_input` avec `details.field` et `details.reason` :
  - `account_deletion_reason_invalid` — `reason` absente ou hors liste ;
  - `account_deletion_details_invalid` — `details` ni chaîne ni `null` ;
  - `account_deletion_details_too_long` — plus de 1 000 caractères
    (`details.max_length: 1000`).
- `5xx` : rien n'a été supprimé (transaction). L'app affiche le message du
  serveur et propose de réessayer ; le compte reste intact.

Format d'erreur : celui du socle,
`{ error: { code, message, details: { reason, field, … } } }`.

### Idempotence

Un second `DELETE /auth/me` sur un compte déjà supprimé ne peut pas
arriver avec une session valable : toutes ont été révoquées. Il répond
donc `401`, comme n'importe quel appel sans session.

## Ce que l'app fait de son côté

Parcours `Profil → Paramètres → Supprimer mon compte`
(`src/features/profil/screens/ecran-suppression-compte.tsx`) :

1. la raison (choix unique) et le mot libre ;
2. ce qui sera supprimé, en clair, puis le bouton rouge ;
3. `DELETE /auth/me` ; sur `204`, `useSession().oublierApresSuppression()`
   oublie jetons, fournisseurs sociaux et réponse aux notifications, puis
   remplace la pile par `/bienvenue?adieu=1`, où l'accueil dit au revoir
   en une ligne.

L'identifiant d'installation (`lib/installation.ts`) n'est **pas**
effacé : il nomme le téléphone, pas la personne. Le prochain compte ouvert
sur ce téléphone réutilisera le même nom d'appareil, et le serveur
n'accumule pas de fantômes.
