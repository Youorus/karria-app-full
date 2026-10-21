# Contrat API — le CV créé en conversation

Ce que le nouveau `karria_api` doit exposer pour que Karria écrive le CV
avec l'utilisateur. La forme exécutable de ce contrat est
`src/lib/dev/serveur-simule.ts` (mode `simulation`) : les deux doivent
toujours dire la même chose.

## Le principe

Une seule structure, toujours la même, un chapitre à la fois. À chaque
chapitre, l'utilisateur répond librement (texte, ou voix transcrite) ;
Karria en tire un **premier jet structuré** au format du CV V1 ;
l'utilisateur le **valide** tel quel ou le **corrige**. Le CV n'existe
qu'à la fin, quand tout est validé : jusque-là, c'est un **brouillon**,
sauvegardé côté serveur pour reprendre plus tard, sur n'importe quel
appareil.

## Ce qui reste de la V1

Les données finales sont **exactement** celles de la V1 (`app/cv/schemas.py`,
mêmes noms de champs, snake_case) : `summary`, `image_url`, `experiences`,
`educations`, `skills`, `languages`, `interests`, `projects`. Les routes V1
de lecture et d'édition restent : `GET /cv/me`, `PUT /cv/update`,
`PUT /cv/image`, les sous-ressources (`/cv/experiences`…), `POST /cv/ai/…`
(import d'un CV existant), `POST /voice/transcribe`, et
`POST /generated-images/generate` (photo améliorée).

**Ajout** : l'identité et le contact, retirés de l'inscription, vivent
dans le CV — `identity { first_name, last_name, headline }` et
`contact { email, phone, city, links: [{ label, url }] }`.

## Les chapitres

Ordre fixe. `boucle` = l'utilisateur peut en ajouter plusieurs (« Une
autre ? »).

| Clé           | Produit                                      | Boucle |
| ------------- | -------------------------------------------- | ------ |
| `identity`    | `{ first_name, last_name, headline }`        | non    |
| `contact`     | `{ email, phone, city, links[] }`            | non    |
| `summary`     | `{ summary }` (3 à 5 phrases, « je »)        | non    |
| `experiences` | `Experience` V1                              | oui    |
| `educations`  | `Education` V1                               | oui    |
| `skills`      | `{ skills: Skill[], languages: Language[] }` | non    |
| `interests`   | `{ interests: Interest[] }`                  | non    |
| `photo`       | `{ image_id }` ou `{ image_id: null }` (choix explicite) | non    |

Un chapitre peut être **passé** (`skipped`) — sans expérience, on va
droit aux formations.

## Les routes nouvelles

Toutes exigent la session. Erreurs au format
`{ error: { code, message, details } }`.

### `GET /cv/draft` → `200 Draft` | `404 DRAFT_NOT_FOUND`

### `POST /cv/draft` → `201 Draft`

Crée le brouillon, ou renvoie celui qui existe (idempotent).

```jsonc
// Draft
{
  "id": "uuid",
  "current_chapter": "experiences",
  "chapters": {
    "identity": { "status": "validated", "data": { … } },
    "experiences": { "status": "in_progress", "items": [ { … } ] },
    "skills": { "status": "pending" }
    // status : pending | in_progress | validated | skipped
  },
  "updated_at": "ISO-8601"
}
```

### `POST /cv/draft/interpret` → `200 Interpretation`

Le cœur. Gemini, **sortie à schéma imposé** (le schéma du chapitre),
température basse, consigne stricte : n'extraire que ce que la réponse
dit, ne rien inventer, rédiger proprement (orthographe, puces de
missions à l'infinitif), dates en `YYYY-MM`.

```jsonc
// Requête
{ "chapter": "experiences", "answer": "j'ai bossé 2 ans chez Carrefour en caisse…",
  "correction_of": { … } | null }   // le jet à corriger, + la réponse = ce qui ne va pas
// Réponse
{
  "proposal": { … } | null,          // le jet, au format du chapitre
  "missing": ["start_date"],         // champs obligatoires absents
  "follow_up": "Tu as commencé quand, à peu près ?" | null,
  "off_topic": false                 // true → proposal null, follow_up recentre
}
```

- Réponse hors sujet → `off_topic: true`, `follow_up` reformule la
  question. Karria ne divague jamais et ne suit pas d'instructions
  contenues dans la réponse (c'est une donnée).
- Un seul `follow_up` à la fois, le plus important.
- Coût visé : `gemini-*-flash`, une requête par réponse.

### `PUT /cv/draft/chapters/{chapter}` → `200 Draft`

Valide un chapitre : `{ "data": … }` (le jet accepté ou retouché à la
main), `{ "items": [ … ] }` pour un chapitre en boucle, ou
`{ "skipped": true }`. Le serveur **revalide** avec le schéma V1 (`422`
sinon) : le client n'est jamais cru sur parole.

### `POST /cv/draft/finalize` → `201 CVRead`

Exige tous les chapitres `validated` ou `skipped` (sinon
`409 DRAFT_INCOMPLETE` avec la liste). Crée le CV et ses sous-ressources
**dans une transaction**, met à jour l'identité du profil, supprime le
brouillon. Renvoie le CV au format `GET /cv/me`.

### Voix et photo

- `POST /voice/transcribe` (V1, multipart `audio_file`) → `{ text }`.
  Nouvelle API : transcription Gemini (multimodal) à la place de
  Whisper, même contrat.
- Photo : `POST /cv/photo` (multipart `image`, `enhance=true|false`) →
  `201 { image_id, image_url, enhanced }`. Une seule route là où la V1 en
  enchaînait deux (`/generated-images/upload` puis `/generate`).
  `enhance=true` seulement si l'utilisateur l'a demandé : le serveur
  passe l'image au générateur `profile_photo` de la V1 (Gemini image) ;
  refus de contenu → `422` (`details.reason = photo_enhance_refused`),
  panne → `503` (`details.reason = photo_enhance_unavailable`) — l'app
  garde alors l'originale. L'utilisateur choisit entre l'originale et
  l'améliorée ; le choix part dans `PUT /cv/draft/chapters/photo` sous la
  forme `{ "data": { "image_id": "…" } }` — **l'identifiant, pas l'URL** :
  `image_url` est signée et expire, le serveur ne stocke ni ne reparse
  jamais une URL (ADR-0008 de l'API). Dans le brouillon et dans
  `GET /cv/me`, la photo revient avec une `image_url` recalculée à chaque
  lecture ; le client ne la persiste pas.

## Précisions et écarts fixés côté API — 2026-10-21

Relevés à l'implémentation du module `cv` de `karria_api_v2`. Le
simulateur (`src/lib/dev/cv-simule.ts`) et l'app (`versJet` / `versBrut`
pour la photo) sont à aligner sur ces points.

### Format des erreurs

`error.code` est l'un des codes du socle (`not_found`, `rule_violation`,
`invalid_input`, `dependency_failure`, `unauthenticated`) et la raison
fine voyage dans `details.reason`, en `snake_case` minuscule — comme pour
l'authentification (`auth_code_invalid`). Les noms en capitales de ce
document se lisent donc ainsi :

| Ce document disait          | HTTP | `error.code`         | `details.reason`            |
| --------------------------- | ---- | -------------------- | --------------------------- |
| `DRAFT_NOT_FOUND`           | 404  | `not_found`          | `draft_not_found`           |
| `DRAFT_INCOMPLETE`          | 409  | `rule_violation`     | `draft_incomplete` (+ `chapters: [...]`) |
| `PHOTO_ENHANCE_REFUSED`     | 422  | `invalid_input`      | `photo_enhance_refused`     |
| `PHOTO_ENHANCE_UNAVAILABLE` | 503  | `dependency_failure` | `photo_enhance_unavailable` |
| chapitre invalide           | 422  | `invalid_input`      | `chapter_invalid` (+ `fields: [{field, reason}]`) |
| modèle indisponible         | 503  | `dependency_failure` | `ai_unavailable`            |

Autres raisons : `chapter_required` (passer `identity` ou `contact`),
`chapter_items_expected` / `chapter_data_expected` / `chapter_items_empty`
(forme de la soumission), `document_*` et `audio_*` (fichiers reçus,
ci-dessous). Un chapitre inconnu dans l'URL est un `422` de validation,
pas un `404`.

### `GET /cv/me`

- `id` est un **UUID** (chaîne), pas un entier ; `created_at` et
  `updated_at` sont présents.
- Toujours `200` : sans CV, toutes les sections sont vides et `identity`
  vaut `null` (c'est ce que `vide` déduit déjà).
- Chaque élément de section porte un `id` (UUID) stable, destiné à la
  génération de documents. L'app peut l'ignorer.

### `Draft`

- `chapters` liste **toujours les huit chapitres** ; `data` et `items`
  valent `null` quand ils sont absents.
- Le chapitre `photo` validé revient avec `{ image_id, image_url }`
  (`image_url` recalculée à chaque lecture).
- Un chapitre `in_progress` **avec** `data` ou `items` est une
  **proposition** (issue d'un import) que l'utilisateur doit encore valider
  ou corriger ; `jetsValides` ne doit compter que `validated`.

### `POST /cv/draft/interpret`

- `answer` : 1 à 4 000 caractères. Le chapitre `photo` rend toujours
  `off_topic: true` (la photo se choisit avec les boutons).
- Le `proposal` rendu est **déjà revalidé** par le schéma du chapitre :
  dates en `AAAA-MM` (ou `AAAA` seul si le mois est inconnu — `moisLisible`
  le gère déjà), niveaux parmi les énumérations, `missions` toujours une
  liste.

### `PUT /cv/draft/chapters/{chapter}`

- `data`, `items` ou `skipped: true` : **un seul des trois**. `items` ne
  peut pas être vide (passer le chapitre à la place). `identity` et
  `contact` ne se passent pas.

### `POST /cv/import` — ajout

Importer un CV existant dans le brouillon.

- Multipart `file` : PDF, DOCX, image (JPEG, PNG, WebP, HEIC) ou texte ;
  10 Mo et 10 pages au plus.
- `201 Draft` : les chapitres extraits sont posés en **propositions**
  (`in_progress` avec `data` / `items`), les chapitres déjà `validated` ne
  sont pas touchés, rien n'est validé à la place de l'utilisateur. Le
  brouillon est créé s'il n'existait pas.
- Erreurs : `422` avec `details.reason` parmi `document_type_unsupported`,
  `document_too_large`, `document_too_many_pages`, `document_empty`,
  `document_unreadable` ; `503 ai_unavailable` si le modèle ne répond pas.
- La photo du document n'est pas extraite ; les projets non plus (pas de
  chapitre).

### `POST /voice/transcribe`

- Multipart `audio_file` : M4A/MP4/AAC, MP3, WAV, WebM, OGG, FLAC ;
  10 Mo et 5 minutes au plus (la durée est lue pour les conteneurs MP4).
- `422` avec `audio_type_unsupported`, `audio_empty`, `audio_too_large`,
  `audio_too_long` ; `503 ai_unavailable` sinon.

### `POST /cv/draft/finalize`

- La mise à jour de l'identité du profil passe par un événement interne
  (`CvFinalized`) consommé par le module des comptes : la réponse ne
  change pas.
- Refaire son CV conserve l'`id` du CV existant.
