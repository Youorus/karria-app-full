# Contrat API — les modèles de CV, les exports et le score ATS

Ce que `karria_api_v2` exposera pour l'onglet **Modèles** (galerie, détail, aperçus), le
choix d'un modèle par la personne, l'export de son CV en **PDF** et en **DOCX**, et le
**score de compatibilité ATS** de chaque CV produit. Préfixe `/api/v1`, session exigée
(`Authorization: Bearer`), erreurs au format `{ error: { code, message, details } }`.

État : **servi en production** depuis le 2026-10-24 (module `documents` de l'API,
ADR-0020 acceptée). Modèles publiés : Meridian, Minimalist (Marketing est en revue, non
listé). Les URL signées ne s'ouvrent depuis un téléphone qu'une fois
`storage.karria.fr` en place (voir « URL signées » en bas).

## Ce qui change par rapport à la V1

- Les identifiants sont des **UUID** (`id`, `template.id`, `generated_cv.id`), plus des
  entiers — comme pour les offres. `ModeleBrut.id` et `PossessionBrute.id` passent en
  `string`.
- Les **noms de champs de la V1 sont gardés** là où l'app les lit (`name`, `label`,
  `category`, `is_premium`, `price`, `tags`, `signed_thumbnail_url`,
  `signed_preview_url`, `signed_full_url`, `views_count`, `uses_count`, `rating_avg`,
  `rating_count`, `primary_color`, `font_family`, `has_photo`, `cover_letters`).
  Les URL sont **signées** et expirent (1 h) : ne jamais les garder d'une session à
  l'autre, redemander la ressource.
- **Nouveaux champs** : `version`, `columns`, `formats`, `fields_added`, `ats` (le profil
  ATS du modèle), `ats_safe_available`.
- **Nouvelles routes** : le choix du modèle (`/user-templates/me/selected`), l'aperçu
  personnalisé (`POST /templates/{id}/preview`), l'export PDF + DOCX et son score ATS
  (`/cv/me/generated-cvs`).
- Disparaissent : `POST /templates/cv`, `/cv/generic`, `/cv/targeted`, `/cover-letter`,
  `/cv-and-cover-letter`, leurs variantes `stream`, `/regenerate/*` et
  `/templates/history` — un seul `POST /cv/me/generated-cvs` les remplace. Aucun texte
  n'est plus réécrit par un modèle de langage pour faire tenir le CV sur une page.

## `GET /templates/` → `200 Modele[]`

La galerie. Paramètres facultatifs : `category`, `premium` (`true` | `false`).
Seuls les modèles **publiés** (passés par la porte de qualité de l'ADR-0020) apparaissent.

```json
[
  {
    "id": "6f1c…",
    "name": "meridian",
    "label": "Meridian",
    "category": "minimal",
    "description": "Une colonne de repères et une frise discrète…",
    "is_premium": false,
    "price": null,
    "tags": ["sobre", "frise", "photo ronde"],
    "signed_thumbnail_url": "https://…/vignette.webp?…",
    "signed_preview_url": "https://…/apercu.png?…",
    "signed_full_url": "https://…/apercu_pleine_page.png?…",
    "views_count": 0,
    "uses_count": 0,
    "rating_avg": 0,
    "rating_count": 0,
    "primary_color": "#000000",
    "font_family": "Raleway",
    "has_photo": true,
    "cover_letters": [],
    "version": 1,
    "columns": 2,
    "formats": ["pdf", "docx"],
    "fields_added": ["headline"],
    "ats_safe_available": true,
    "ats": { "readiness": "warning", "warnings": ["spaced_titles"] }
  }
]
```

- `primary_color` et `font_family` sont **mesurés** dans le PDF du modèle (couleur
  dominante des titres, famille principale), plus des étiquettes déclaratives.
- `fields_added` : les champs que le modèle d'origine n'avait pas et que Karria ajoute
  dans son style (aujourd'hui `headline`, le poste visé). Rien à faire côté app, c'est
  une information pour le détail.
- `ats.readiness` : `good` | `warning` — ce que le **dessin** du modèle coûte aux ATS
  avant tout contenu. `warnings` parmi `spaced_titles` (intitulés très espacés, lus
  lettre à lettre), `photo`, `multi_column`. Le score réel se calcule sur chaque CV
  produit (plus bas).
- `ats_safe_available` : le modèle a une variante « optimisée ATS » (interlettrage
  resserré), proposée par le score quand elle aide.

### Proposé par l'app (2026-10-24) — **accepté et servi par le backend**

- **`thumbnail_blurhash`** (`string | null`) : le [BlurHash](https://blurha.sh) de la
  vignette (composantes 4 × 5), calculé une fois à la publication du modèle. L'app
  l'affiche, flou, le temps que la vignette signée arrive (`expo-image`, `placeholder`).
  Facultatif : absent ou `null`, la carte montre une surface neutre. Le faux serveur
  le sert déjà. **Backend :** calculé à l'ingestion (4 × 5 composantes, sur l'aperçu
  pleine page), gardé avec la version publiée.
- **Payant** : `is_premium` (+ `price`) suffit ; aucun champ de palier n'est
  nécessaire. L'app affiche ces modèles sous le nom **« Premium »** (pastille dorée,
  puce de filtre « Premium ») ; « Pro » n'apparaît plus nulle part dans l'interface.
- L'app met les images en cache sous la clé `modele-<id>-v<version>` : `version` doit
  changer à chaque nouveau dessin, sans quoi l'ancien aperçu resterait affiché.
  **Backend :** `version` est le numéro de la version publiée ; toute nouvelle analyse
  du modèle (nouveau PDF, ou rendu amélioré) crée une version `+1`. Une version publiée
  ne change jamais.

## `GET /templates/{id}` → `200 Modele`

Le même objet, plus `pages` : les images du carrousel (le CV d'exemple, puis les
lettres assorties). `404 template_not_found`.

```json
{
  "…": "…",
  "pages": [
    { "kind": "cv", "label": "CV", "signed_thumbnail_url": "…", "signed_full_url": "…" }
  ]
}
```

`POST /templates/{id}/view` → `204` (compteur de vues, inchangé). Les avis
(`GET /templates/{id}/reviews`) gardent la forme de la V1 (`AvisListeBrute`).

## Posséder et choisir un modèle

- `GET /user-templates/me` → `200 Possession[]` (forme V1, `id` UUID).
- `POST /user-templates/me` `{ "template_id": "…" }` → `201 Possession` ;
  `404 template_not_found`, `422 template_not_free` (un modèle Premium s'achète par l'achat
  intégré, hors de ce contrat).
- **Nouveau** — `GET /user-templates/me/selected` → `200 Selection` | `204` (aucun choix) ;
  `PUT /user-templates/me/selected` `{ "template_id": "…", "ats_safe": false }` →
  `200 Selection`. `403 template_locked` (`details.reason`) si le modèle est Premium et non
  possédé. Le choix sert de modèle par défaut aux exports.

```json
{
  "template": { "id": "6f1c…", "label": "Meridian", "version": 1 },
  "ats_safe": false,
  "updated_at": "2026-10-24T10:00:00Z"
}
```

## `POST /templates/{id}/preview` → `200 Apercu`

Le CV **de la personne** dans ce modèle, sans rien enregistrer (bouton « Voir avec mon
CV » du détail). Corps facultatif : `{ "ats_safe": false }`. Rendu en ~1 s, mis en cache
tant que ni le CV ni la version du modèle ne changent.

```json
{
  "pages": [{ "signed_url": "https://…/page-1.png?…", "width": 1240, "height": 1754 }],
  "fit": { "spacing": 0.8, "font_scale": 1.0, "pages": 1 }
}
```

`409 cv_missing` (aucun CV finalisé, `contrat-api-cv.md`), `403 template_locked`,
`503 rendering_unavailable` (moteur de rendu indisponible, se retente).

## Exporter son CV : `POST /cv/me/generated-cvs` → `201 GeneratedCv`

```json
{
  "template_id": "6f1c…",
  "formats": ["pdf", "docx"],
  "ats_safe": false,
  "offer_id": null
}
```

- `template_id` facultatif : le modèle choisi (`/user-templates/me/selected`) sinon.
- `formats` : `pdf`, `docx`, ou les deux (défaut : les deux).
- `offer_id` : **réservé** à l'adaptation du CV à une offre (ADR-0020 § 7). Tant qu'elle
  n'est pas servie, une valeur non nulle rend `422 tailoring_not_available`. Le score ATS
  sait déjà mesurer la couverture des mots-clés d'une offre : voir `ats.keywords`.

Réponse (synchrone, 1 à 3 s) :

```json
{
  "id": "2b7e…",
  "template": { "id": "6f1c…", "label": "Meridian", "version": 1 },
  "ats_safe": false,
  "offer_id": null,
  "created_at": "2026-10-24T10:00:00Z",
  "pdf_url": "https://…/cv.pdf?…",
  "docx_url": "https://…/cv.docx?…",
  "fit": { "spacing": 0.8, "font_scale": 1.0, "pages": 1 },
  "ats": {
    "score": 86,
    "level": "good",
    "format": "pdf",
    "checks": [
      {
        "key": "fonts",
        "label": "Polices exploitables",
        "points": 4.0,
        "max_points": 8,
        "finding": "2 intitulé(s) lu(s) lettre à lettre (« C A M I L L E… »)",
        "tip": "Des intitulés très espacés se lisent lettre à lettre par les ATS : active la variante « optimisée ATS » du modèle."
      }
    ],
    "keywords": null,
    "explanation": null,
    "explanation_status": "pending",
    "suggest_ats_safe": true
  }
}
```

- `pdf_url`, `docx_url` : URL signées (1 h) ; `download_as` pose le nom de fichier
  « CV - Prénom Nom.pdf ». Absente si le format n'a pas été demandé.
- `fit` : ce que la mise en page a dû faire pour tenir (espacements ×`spacing`, corps
  ×`font_scale`, `pages`). Le DOCX suit les mêmes facteurs.
- Le DOCX est **modifiable librement** : un style Word par rôle (« Karria · Intitulé »,
  « Karria · Puce »…), colonnes en tableau sans bordure. À cette étape, il n'a pas les
  ornements du PDF (frise, pastilles d'élément).

- `ats.docx` (servi en plus) : `{ score, level, format: "docx", checks }`, le score du DOCX
  quand il a été demandé ; `ats` lui-même porte le score du PDF (celui du DOCX si seul le
  DOCX est demandé).
- Variante « optimisée ATS » : interlettrage plafonné à **0,08 em** (mesuré : pdfminer,
  que lisent beaucoup d'ATS, coupe les lettres au-delà de 0,1 em).

Erreurs : `409 cv_missing`, `404 template_not_found`, `403 template_locked`,
`422 invalid_input` (format inconnu), `422 tailoring_not_available`,
`503 rendering_unavailable`.

### L'objet `ats`

Calculé **sans modèle de langage** sur le document tel qu'un ATS le lit (le PDF par
défaut ; `format` dit lequel). `score` sur 100 ; `level` : `good` (≥ 85), `fair`
(70–84), `poor` (< 70). `checks[]` : un élément par contrôle, toujours dans cet ordre —
`text_layer`, `fonts`, `reading_order`, `contact`, `layout`, `sections`, `content`, puis
`keywords` s'il y a une offre. `tip` vaut `null` quand il n'y a rien à faire.

- `keywords` : `null` sans offre ; sinon
  `{ "coverage": 0.73, "covered": ["power bi", …], "missing": ["dax", …] }`.
- `explanation` : `null` tant que `explanation_status` vaut `pending` ; puis
  `{ "summary": "…", "tips": ["…", "…", "…"] }`, rédigé par Karria à partir des seuls
  contrôles (tutoiement, jamais de compétence inventée). `explanation_status` :
  `pending` | `ready` | `unavailable` (aucun modèle de langage : les `tip` suffisent).
  L'app relit `GET /cv/me/generated-cvs/{id}` pour l'obtenir.
- `suggest_ats_safe` : la variante optimisée ferait gagner des points ; l'app peut
  proposer « Optimiser pour les ATS » (un nouvel export avec `ats_safe: true`).

## Historique

- `GET /cv/me/generated-cvs` → `200 { items: GeneratedCv[], total }` (les plus récents
  d'abord ; `limit`, `offset`).
- `GET /cv/me/generated-cvs/{id}` → `200 GeneratedCv` (URL re-signées à chaque lecture).
- `DELETE /cv/me/generated-cvs/{id}` → `204` (fichiers effacés du stockage).
- `404 generated_cv_not_found`.

Un export garde la **version** du modèle qui l'a produit : le même document se reproduit
à l'identique même après une nouvelle version du modèle.


## Notes de service (backend, 2026-10-24)

- `Possession` porte aussi `source` (`free`) et `acquired_at`.
- `GET /templates/{id}/reviews` répond `{ items: [], total: 0, rating_avg, rating_count }` :
  la v2 ne recueille pas encore d'avis.
- Codes d'erreur : `details.reason` vaut `template_not_found` (404), `template_locked`
  (403), `template_not_free` (422), `cv_missing` (409 `rule_violation`),
  `tailoring_not_available` / `invalid_format` (422), `rendering_unavailable` (503),
  `generated_cv_not_found` (404).
- **URL signées** : tant que `storage.karria.fr` n'existe pas, les URL (vignettes,
  aperçus, exports) sont signées pour l'adresse interne du stockage et ne s'ouvrent pas
  depuis l'app. Rien à changer côté app : elles deviennent valides dès que le backend
  pose `STORAGE__PUBLIC_ENDPOINT_URL`.
