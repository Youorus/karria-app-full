# Contrat API — les offres et le fil

Ce que `karria_api_v2` expose pour le fil d'offres, le détail d'une offre et
ce que la personne en fait. Préfixe `/api/v1`, erreurs au format
`{ error: { code, message, details } }`. Session (`Authorization: Bearer`)
exigée pour tout ce qui **écrit** ; la **lecture** du fil se fait aussi sans
compte (voir « Sans compte », ci-dessous).
La source de vérité exécutable est l'OpenAPI de l'API
(`https://api.128-140-80-204.sslip.io/docs`) ; ce document dit ce que l'app
doit en attendre et ce qui change par rapport à la V1.

État : **en production** (2026-10-23). Les parties marquées « nouveau »
(`impressions`, `position`, `dwell_ms`) sont livrées ce jour.

## Ce qui change par rapport à la V1

- Les identifiants sont des **UUID** (`id`, `job_offer_id`), plus des entiers.
  `id` = l'identifiant de l'**offre** : une personne la voit une fois.
- `job_offer.summary` vaut toujours `null` et il n'y a **pas** de
  `POST /job-matches/{id}/summary` ni de `GET …/summary-status` (l'analyse de
  Karria par offre n'existe pas encore). La description se lit dans
  `job_offer.excerpt` (liste) et `job_offer.description` (détail seulement).
- Il n'y a pas de `raw_data` : tout ce qui s'affiche est un champ typé
  (`location_label`, `contract_type.label`, `salary_raw`, `remote`,
  `schedule`, `experience`, `source`).
- `score_recency` n'existe plus : `is_new` (publiée il y a moins de 48 h et
  jamais vue) le remplace.
- `PATCH /job-matches/{id}/interaction` remplace les routes V1 d'état.

## Sans compte (2026-10-30, ADR-0025)

Une offre d'emploi n'est pas un contenu de compte (règle 5.1.1 v de l'App
Store) : `GET /job-matches/me`, `GET /job-matches/me/filter-options` et
`GET /job-matches/{id}` répondent **sans session**. Les mêmes gestionnaires
sont aussi servis sous `GET /offers/feed`, `GET /offers/filter-options` et
`GET /offers/{id}` — un nom qui ne dit plus « me » ; l'app garde
`/job-matches/…`.

Sans session :

- le fil est toujours `mode: all_offers`, `criteria_summary: null`,
  `score_normalized`/`match_quality`/`origin` à `null` ; `saved`, `applied`,
  `dismissed`, `feed_seen`, `detail_opened` valent `false` ; `is_new` ne dépend
  que de la date ;
- `contract_types`, `cities`, `published_after`, `limit`, `offset` s'appliquent ;
  `saved_only`, `unseen_only`, `unapplied_only` répondent
  `401 unauthenticated` avec `details.reason = account_required` et
  `details.field` ;
- rien n'est consigné : pas d'état, pas de journal, pas de critères ;
- l'origine est **comptée** (240 lectures par 10 min, par adresse) :
  `429 rate_limited`, `details.reason = anonymous_rate_limited`,
  `details.retry_after` (secondes).

`POST /job-matches/me/seen`, `PATCH /job-matches/{id}/interaction`, Karria
(`/assistant/*`) et la recherche (`/search/*`) exigent toujours la session.
L'app, en mode invité, n'envoie donc ni « vu » ni interaction, et ouvre la
feuille de connexion pour garder, écarter ou parler à Karria.

## Les deux modes du fil

`GET /job-matches/me` rend `mode` :

- `all_offers` — la personne n'a **jamais rien demandé** à Karria (pas de
  critères) : **toutes** les offres actives, les plus récentes d'abord,
  paginées. `score_normalized`,
  `match_quality`, `origin` valent `null`, `reasons` est vide.
- `search` — une recherche existe (`criteria_summary` la résume en une
  ligne) : les offres retenues pour elle, triées par pertinence (`sort=
relevance`, défaut) ou par fraîcheur (`sort=fresh`). Les mêmes filtres
  s'appliquent par-dessus.

Par défaut, le mode se **déduit** des critères. L'app peut aussi le
**demander** par le paramètre `mode` (voir ci-dessous) : `mode=all_offers`
montre toutes les offres alors que la recherche reste enregistrée et que
ses **alertes restent actives** — c'est ainsi que l'app « met en pause »
l'affichage de la recherche. Ne plus faire `DELETE` puis `PUT
/search/criteria` pour cela : supprimer les critères coupe les alertes.
`DELETE /search/criteria` ne sert qu'à abandonner vraiment la recherche.

La réponse rend toujours le `mode` **réellement servi** (`search` demandé
sans critères → `all_offers`) et `criteria_summary` dès que des critères
existent, même en `all_offers`.

La recherche elle-même se change en parlant à Karria (contrat
`contrat-api-recherche.md`) ou par `PUT/DELETE /search/criteria`.

## `GET /job-matches/me` → `200 FeedPage`

Paramètres de requête, tous facultatifs et combinables (les listes en CSV) :

| Paramètre         | Type                                                                 | Sens                                                                                                                             |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `limit`           | 1–50, défaut 20                                                      | taille de page                                                                                                                   |
| `offset`          | ≥ 0                                                                  | décalage ; `has_next` dit s'il reste des pages                                                                                   |
| `sort`            | `relevance` \| `fresh`                                               | mode `search` seulement ; `all_offers` est toujours par fraîcheur                                                                |
| `saved_only`      | bool                                                                 | les offres gardées (toutes, même expirées)                                                                                       |
| `unseen_only`     | bool                                                                 | jamais affichées                                                                                                                 |
| `unapplied_only`  | bool                                                                 | pas encore postulées                                                                                                             |
| `contract_types`  | CSV de `cdi, cdd, interim, alternance, stage, freelance, saisonnier` |                                                                                                                                  |
| `cities`          | CSV de noms de ville (valeurs de `filter-options`)                   |                                                                                                                                  |
| `published_after` | ISO 8601                                                             | publiées depuis                                                                                                                  |
| `mode`            | `all_offers` \| `search`                                             | facultatif ; absent = déduit des critères. `all_offers` garde les critères et les alertes. Valeur inconnue → `422 invalid_input` |

Le filtrage étendu (texte libre, rayon, départements, temps de travail,
télétravail, expérience, salaire, source) et les facettes avec effectifs ont
été **reportés** par Marc (2026-10-23) : ne pas les coder pour l'instant.

Réponse :

```json
{
  "items": [JobMatch],
  "count": 54072,
  "limit": 20,
  "offset": 0,
  "has_next": true,
  "mode": "all_offers",
  "criteria_summary": null
}
```

`count` est le total **après filtres**.

### `JobMatch`

```json
{
  "id": "uuid",
  "job_offer_id": "uuid",
  "score_normalized": 0.93,
  "match_quality": "high",
  "reasons": ["CDI", "Lyon · 4 km"],
  "origin": "search",
  "is_new": true,
  "feed_seen": false,
  "detail_opened": false,
  "saved": false,
  "applied": false,
  "dismissed": false,
  "job_offer": {
    "id": "uuid",
    "title": "Cuisinier H/F",
    "summary": null,
    "excerpt": "Les premières lignes…",
    "description": null,
    "company": {
      "name": "…",
      "logo": "https://storage.karria.fr/karria-production-logos/<hash>/128.webp",
      "logo_large": "https://storage.karria.fr/karria-production-logos/<hash>/256.webp",
      "website": null
    },
    "city": { "name": "Lyon", "postal_code": "69003" },
    "location_label": "Lyon 3e",
    "department_code": "69",
    "latitude": 45.76,
    "longitude": 4.84,
    "contract_type": { "code": "cdi", "label": "CDI" },
    "remote": null,
    "schedule": "temps_plein",
    "experience": "debutant",
    "salary_raw": "2 000 € brut/mois",
    "salary_min_monthly": 2000,
    "salary_max_monthly": null,
    "published_at": "2026-10-23T05:12:00Z",
    "is_alternance": false,
    "apply_url": "https://…",
    "origin_url": "https://…",
    "source": "france_travail",
    "is_active": true
  }
}
```

`match_quality` : `high` (« Très alignée »), `medium`, `low` (« À explorer »),
`null` hors recherche. `remote`, `schedule`, `experience`, `contract_type`,
`company`, `city` valent `null` quand l'annonce ne le dit pas.

### Le logo de l'entreprise (2026-10-25)

- `company.logo` : logo **carré 128 px** en WebP, `company.logo_large` : le même
  en **256 px**. Les deux sont hébergés par Karria (`storage.karria.fr`, bucket
  public en lecture seule) ; l'URL d'origine de la source (Indeed, HelloWork,
  France Travail, LinkedIn…) n'est **plus jamais** servie — elle expirait et
  exposait l'IP de la personne au site tiers.
- L'URL porte l'**empreinte du contenu** : un logo qui change change d'URL.
  Un fichier servi est donc immuable (`Cache-Control: public, max-age=31536000,
immutable`) — l'app le garde en cache mémoire + disque sans revalider.
- Carré déjà rogné, marges comprises, fond transparent possible : l'app le
  pose sur une tuile blanche (`fond-logo`) dans les deux modes.
- `null` (pas de logo, ou logo refusé par la porte de qualité) → **initiales**
  sur une teinte calculée. Un logo qui ne se charge pas retombe aussi sur les
  initiales. Les cartes lisent `logo` ; le détail `logo_large ?? logo`.

## `GET /job-matches/me/filter-options` → `200 FilterOptions`

Contrats et villes présents dans le fil courant (mode `all_offers` : tout le
corpus actif ; mode `search` : les offres retenues), avec leurs effectifs,
— accepte le même paramètre `mode` que le fil, à passer à l'identique —
triés par effectif décroissant. `value` se renvoie tel quel dans le paramètre
du même nom.

```json
{
  "contract_types": [{ "value": "cdi", "label": "CDI", "count": 812 }],
  "cities": [{ "value": "Lyon", "label": "Lyon", "count": 210 }]
}
```

## `GET /job-matches/{id}` → `200 JobMatch` | `404 offer_not_found`

Le détail : `job_offer.description` rempli (Markdown léger). Une offre expirée
reste lisible (`is_active: false`) — utile pour une offre gardée.

## `POST /job-matches/me/seen` → `200 { updated }`

Les offres passées à l'écran, par lots de 100 au plus. Idempotent.

```json
{ "offer_ids": ["uuid", "uuid"] }
```

**Nouveau** (journal d'apprentissage, facultatif mais souhaité) : à la place
de `offer_ids`, `impressions: [{ "offer_id": "uuid", "position": 0 }]` —
`position` est le rang de la carte dans le fil **tel qu'affiché**
(0 = première carte de la première page, `offset + index`). Un seul des deux
champs par appel.

## `PATCH /job-matches/{id}/interaction` → `200 JobMatch`

Corps partiel ; les champs absents ne changent rien ; `422 interaction_empty`
si rien ne change.

| Champ                  | Type       | Sens                                                                                  |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `saved`                | bool       | garder / ne plus garder                                                               |
| `applied`              | bool       | postulé / finalement non                                                              |
| `dismissed`            | bool       | écarter : l'offre quitte le fil et n'y revient plus (réversible en renvoyant `false`) |
| `detail_opened`        | `true`     | la fiche a été ouverte ; ne redescend jamais                                          |
| `link_clicked`         | `true`     | le lien de candidature a été ouvert ; ne redescend jamais                             |
| `position` **nouveau** | entier ≥ 0 | la place de la carte au moment du geste (voir `seen`)                                 |
| `dwell_ms` **nouveau** | entier ≥ 0 | temps passé sur la fiche quand elle se ferme, en ms                                   |

Ces deux derniers champs ne changent rien à l'affichage : ils nourrissent
l'apprentissage du classement (ADR-0019). Les envoyer quand on les connaît.

## Erreurs

| Code HTTP | `error.code`      | Quand                                                                         |
| --------- | ----------------- | ----------------------------------------------------------------------------- |
| 401       | `unauthenticated` | session absente sur une route qui l'exige ; `account_required` pour un filtre personnel sans compte |
| 403       | `forbidden`       | `ai_consent_required` sur `POST /assistant/messages` (voir `contrat-api-consentement-ia.md`) |
| 429       | `rate_limited`    | `anonymous_rate_limited` (lecture sans compte, `retry_after`) ; `assistant_rate_limited` |
| 404       | `offer_not_found` | `{id}` inconnu                                                                |
| 422       | `invalid_input`   | paramètre hors bornes, `interaction_empty`, lieu incomplet (`lat` sans `lng`) |
