# Contrat API — la recherche avec Karria

Ce que `karria_api_v2` expose pour parler à Karria, poser ou lire la
recherche en cours, et gérer les alertes. Préfixe `/api/v1`, session exigée,
erreurs `{ error: { code, message, details } }`. OpenAPI :
`https://api.128-140-80-204.sslip.io/docs`.

État : **en production** (2026-10-23, `widenings` et `results_count` sans plafond
compris). « Nouveau » = livré ce jour : l'app peut s'y appuyer.

## Le principe

Karria tutoie. Une conversation **ne cherche jamais en direct** sur France
Travail ni sur un site : elle lit notre index (des dizaines de milliers
d'offres fraîches), et une demande maigre fait seulement monter la collecte
en priorité — les alertes préviennent quand les offres arrivent.

Le modèle de langage **propose** (une réponse, des critères, une question) ;
le serveur **décide** : il cherche quand les critères sont complets (un
métier **et** un lieu — ou « partout en France », ou « en télétravail »),
pose une question sinon, une seule à la fois. Le fil (`GET /job-matches/me`,
contrat `contrat-api-offres.md`) passe en mode `search` dès la première
recherche ; la réponse de Karria dit combien d'offres y sont.

## `POST /assistant/messages` → `200 AssistantReply`

```json
{ "conversation_id": null, "content": "Je cherche un poste de cuisinier en CDI à Lyon" }
```

`conversation_id: null` au premier message : le serveur ouvre la conversation
et rend son identifiant, que les messages suivants rappellent. **Le serveur
garde l'historique** ; l'app n'envoie jamais la conversation entière.
`content` : 1 à 2 000 caractères.

Réponse :

```json
{
  "conversation_id": "uuid",
  "message": { "id": "uuid", "role": "assistant", "content": "C'est noté… J'ai trouvé 20 offres, elles sont dans ton fil.", "created_at": "…" },
  "status": "search",
  "intent": "search",
  "results_count": 20,
  "criteria": Criteria,
  "suggestions": ["Élargir à 50 km : +340 offres", "Aussi en intérim : +120", "Uniquement en CDI"],
  "widenings": [
    { "id": "radius-50", "kind": "radius", "label": "Élargir à 50 km autour de Lyon", "gain": 340,
      "message": "Élargir à 50 km : +340 offres" }
  ]
}
```

| Champ                   | Sens                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`                | `search` : une recherche a tourné, le fil est à jour. `clarify` : Karria pose une question. `chat` : une réponse, rien d'autre.                                                                 |
| `intent`                | ce que Karria a compris : `search`, `refine`, `career_talk`, `app_help`, `small_talk`, `off_topic`                                                                                              |
| `results_count`         | offres placées dans le fil si `status = search`, sinon `null`. **Nouveau** : plus de plafond bas — toutes les offres pertinentes et récentes (jusqu'à plusieurs centaines), paginées par le fil |
| `criteria`              | la recherche en cours après ce tour (voir `Criteria`), ou `null`                                                                                                                                |
| `suggestions`           | 0 à 4 réponses rapides à montrer sous la bulle ; un toucher **envoie le texte tel quel** comme message                                                                                          |
| `widenings` **nouveau** | 0 à 3 élargissements calculés sur la base (voir ci-dessous)                                                                                                                                     |

### Les élargissements (nouveau)

Quand la recherche rapporte peu, ou qu'un voisinage rapporterait beaucoup
plus, Karria le dit avec des chiffres **réellement comptés** (jamais inventés
par le modèle) et **demande la permission** :

> « Avec 20 offres seulement à Lyon, je peux élargir : à 50 km il y en a 340
> de plus, et en acceptant aussi l'intérim +120. Je le fais ? »

Chaque élargissement :

| Champ     | Sens                                                                                                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | stable dans la conversation (`radius-50`, `contract-interim`, `title-commis-de-cuisine`)                                                                                                                                                                        |
| `kind`    | `radius` (rayon plus grand), `departments` (départements voisins), `whole_france`, `contract_types` (un contrat de plus), `schedule` (accepter l'autre temps / les offres muettes), `job_titles` (un intitulé très proche, tiré du vocabulaire réel des offres) |
| `label`   | la phrase complète, prête à afficher                                                                                                                                                                                                                            |
| `gain`    | offres **en plus** dans le fil si on accepte                                                                                                                                                                                                                    |
| `message` | le texte à envoyer pour accepter — il figure aussi dans `suggestions`                                                                                                                                                                                           |

Pour accepter, l'app envoie `message` comme un message ordinaire
(`POST /assistant/messages`). Le serveur le reconnaît et applique
l'élargissement **sans repasser par le modèle** : `status: search`,
`criteria` mis à jour, `results_count` recalculé. La personne peut aussi
répondre en texte libre (« oui pour les 50 km, pas l'intérim ») : le modèle
l'interprète alors normalement.

### `Criteria`

```json
{
  "query": "La personne cherche un poste de cuisinier en CDI à Lyon.",
  "summary": "cuisinier · Lyon (30 km) · CDI",
  "job_titles": ["cuisinier", "cuisinière", "cuisinier de restaurant"],
  "keywords": ["cuisine", "restauration", "HACCP"],
  "location": {
    "label": "Lyon",
    "latitude": 45.758,
    "longitude": 4.835,
    "radius_km": 30,
    "department_codes": []
  },
  "whole_france": false,
  "contract_types": ["cdi"],
  "remote": [],
  "schedule": null,
  "max_experience": null,
  "salary_min_monthly": null,
  "alerts_enabled": true,
  "updated_at": "…"
}
```

`summary` est la ligne à afficher en tête du fil (`criteria_summary` du fil).

### Erreurs

| Code | `error.code`                            | Quand                                                  |
| ---- | --------------------------------------- | ------------------------------------------------------ |
| 404  | `conversation_not_found`                | `conversation_id` inconnu ou d'une autre personne      |
| 422  | `invalid_input`                         | `assistant_message_empty`                              |
| 429  | `assistant_rate_limited`                | 120 tours par jour ; `details.retry_after` en secondes |
| 503  | `ai_unavailable` / `search_unavailable` | un service ne répond pas ; réessayer                   |

## La recherche en cours

- `GET /search/criteria` → `200 { criteria: Criteria | null }`.
- `PUT /search/criteria` → `200 { criteria, results_count }` : poser les
  critères directement depuis l'app (édition sans conversation). Corps :
  `job_titles` (1–12, requis), `keywords`, `location { label, latitude?,
longitude?, radius_km?, department_codes? }`, `whole_france`,
  `contract_types`, `remote`, `schedule`, `max_experience`,
  `salary_min_monthly`. `422 criteria_incomplete` s'il manque un lieu.
- `DELETE /search/criteria` → `204` : oublier la recherche ; le fil repasse
  en `all_offers`. Depuis l'ADR-0041, elle n'est plus supprimée : elle reste
  enregistrée (voir ci-dessous), alerte coupée, réactivable.
- `PUT /search/criteria/alerts` `{ enabled }` → `200 { enabled }`. Écrit le
  même drapeau que `PUT /search/saved/{id}/alerts` pour la recherche en
  cours. `404 criteria_not_found` sans recherche en cours.

## Les recherches enregistrées (ADR-0041 de l'API)

Chaque recherche appliquée (par Karria ou par `PUT /search/criteria`) est
retenue, une par jeu de critères, et **continue de surveiller** les nouvelles
offres quand une autre devient la recherche en cours. C'est l'écran « Mes
recherches » des paramètres (`features/profil/screens/ecran-mes-recherches.tsx`,
route `/mes-recherches`).

- `GET /search/saved` → `200 { items: SavedSearch[], max }`. La plus
  récemment utilisée d'abord ; `items: []` tant que la personne n'a rien
  cherché. `max` : recherches gardées au plus (10) ; au-delà, la moins
  récemment utilisée sort, jamais la recherche en cours.
- `PUT /search/saved/{id}/alerts` `{ enabled }` → `200 SavedSearch` (la
  recherche à jour). Coupée : plus de notification pour elle, et Karria ne
  collecte plus pour elle. Si c'est la recherche en cours, `GET
/search/criteria` rend le même `alerts_enabled`.
- `DELETE /search/saved/{id}` → `204`. Si c'était la recherche en cours, le
  fil redevient `all_offers` (`criteria: null`).

| Champ de `SavedSearch` | Type             | Sens                                                   |
| ---------------------- | ---------------- | ------------------------------------------------------ |
| `id`                   | UUID             | identifiant de la recherche enregistrée                |
| `summary`              | string           | une ligne : « Serveur · Paris (30 km) · CDI »          |
| `query`                | string           | ce que la personne a demandé, dans ses mots            |
| `job_titles`           | string[]         | les intitulés                                          |
| `location_label`       | string \| null   | le lieu nommé ; `null` : France entière                |
| `whole_france`         | bool             |                                                        |
| `contract_types`       | string[]         | codes de contrat                                       |
| `alerts_enabled`       | bool             | Karria la surveille et prévient quand une offre arrive |
| `is_current`           | bool             | c'est la recherche en cours : elle fait le fil         |
| `created_at`           | ISO 8601         |                                                        |
| `last_used_at`         | ISO 8601         | dernière fois qu'elle a été appliquée                  |
| `last_alert_at`        | ISO 8601 \| null | dernière notification envoyée pour elle                |

| HTTP | `details.reason`         | Quand                                                  |
| ---- | ------------------------ | ------------------------------------------------------ |
| 404  | `saved_search_not_found` | recherche inconnue, supprimée, ou d'une autre personne |

**Ce que fait l'app.** La liste se relit à chaque retour sur l'écran et en
tirant. La bascule est optimiste (retour arrière et phrase si l'appel
échoue ; un `404` retire la ligne et relit la liste). La suppression se fait
en glissant la ligne puis en confirmant ; quand c'était la recherche en
cours, le fil — resté monté sous les paramètres — est prévenu
(`features/offres/services/recherche-changee.ts`) et se relit **sans
demander de `mode`** : c'est le serveur qui dit s'il reste une recherche.
L'app ne garde aucun état des alertes de la recherche en cours (le fil
n'affiche que `criteria_summary`) et n'appelle pas `PUT
/search/criteria/alerts` : une bascule ici n'a donc rien d'autre à
invalider. Le libellé de la rubrique, « Mes recherches », est celui que
Karria cite en conversation ; il vit dans
`features/profil/services/mes-recherches.ts`.

## Ce que Karria a retenu

- `GET /assistant/memory` → `200 { target_jobs[], locations[], constraints[],
preferences[], situation[], summary, updated_at | null }` : les faits
  stables que Karria garde pour mieux aider ; vide si rien.
- `DELETE /assistant/memory` → `204` : tout effacer. À exposer dans les
  réglages (« Ce que Karria sait de moi »).

## Ce que l'app n'a pas à faire

- Pas de clé de modèle, pas de nom de fournisseur : Karria ne dit jamais
  quel modèle l'anime, et l'app n'affiche rien de tel.
- Pas de recherche côté client : l'app n'appelle jamais une source d'offres.
