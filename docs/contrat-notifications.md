# Contrat — la charge des notifications push (v1)

> Partagé par l'API (`karria_api_v2`, constructeur typé unique) et l'app
> (`src/features/notifications/services/routeur-notifications.ts`). Un
> écart se corrige des deux côtés dans la même livraison.

## La charge `data`

Toutes les valeurs sont des **chaînes** (ce qu'Android transmet intact).

| Clé        | Obligatoire | Valeur                                                            |
| ---------- | ----------- | ----------------------------------------------------------------- |
| `v`        | oui         | `"1"`                                                             |
| `type`     | oui         | voir le tableau des types                                         |
| `id`       | selon type  | identifiant (UUID), `[A-Za-z0-9-]{1,64}`                          |
| `count`    | non         | nombre d'offres annoncées, entier décimal                         |
| `campaign` | non         | étiquette de mesure (`v1-retour-2026`, `test`)                    |
| `url`      | oui         | lien équivalent, pour les versions de l'app qui ne lisent que lui |

## Les types

| `type`           | `id`        | Canal / catégorie | Pastille | Pile ouverte dans l'app                 | `url`                      |
| ---------------- | ----------- | ----------------- | -------- | --------------------------------------- | -------------------------- |
| `offer`          | obligatoire | `offres`          | 1        | fil → détail de l'offre                 | `karria://offre/{id}`      |
| `offers_feed`    | interdit    | `offres`          | 1        | fil                                     | `karria://offres`          |
| `search_results` | interdit    | `offres`          | 1        | fil                                     | `karria://offres`          |
| `assistant`      | interdit    | `offres`          | 1        | fil, rideau Karria ouvert (`?karria=1`) | `karria://offres?karria=1` |
| `cv_ready`       | interdit    | `documents`       | —        | onglet CV                               | `karria://cv`              |
| `cv_export`      | facultatif  | `documents`       | —        | onglet CV                               | `karria://cv`              |
| `template`       | obligatoire | `documents`       | —        | galerie → modèle                        | `karria://modele/{id}`     |
| `templates`      | interdit    | `documents`       | —        | galerie                                 | `karria://modeles`         |
| `account`        | interdit    | `compte`          | —        | profil → paramètres                     | `karria://parametres`      |

Le message Expo porte en plus `channelId` et `categoryId` (même valeur que
le canal) et `badge` quand la colonne le dit.

## Ce que fait l'app d'une charge qu'elle ne comprend pas

1. Charge v1 valide → sa pile.
2. Sinon (version future, type inconnu, ancienne charge sans `v`, `id`
   absent ou mal formé) → l'`url` si elle désigne Karria
   (`karria://…`, `https://karria.fr/…`), le détail au-dessus de son parent.
3. Sinon → le fil. Jamais d'écran vide, jamais hors de l'app.

## Les états de l'app

- **Premier plan** : pas de bannière système ; l'app affiche la sienne
  (6 s, toucher = ouvrir, croix = écarter). La notification reste dans le
  centre de notifications.
- **Arrière-plan** et **lancement à froid** : la destination s'ouvre ; la
  réponse du lancement est dédoublonnée (identifiant + issue).
- **Pas de session, session pas encore relue, ou écran d'entrée** (`/`,
  `/bienvenue`, `/email`, `/code`, `/notifications`) : la destination la
  plus récente est gardée et ouverte dès que possible.
- La pastille s'efface à l'ouverture et à chaque retour au premier plan.

## Canaux et catégories

Android : `offres` (importance haute), `documents`, `compte`, plus
`defaut` pour les messages sans `channelId`. iOS : mêmes noms en
catégories, avec `customDismissAction`.

## Mesure

Port `services/analytique.ts`, sans fournisseur pour l'instant (journal en
développement) : `notification_received` (premier plan seulement),
`notification_opened` (toujours, avec `type`, `campaign`, `source`),
`notification_dismissed` (bannière interne ; iOS quand la personne efface
la notification ; Android ne le signale pas).
