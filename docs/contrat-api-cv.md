# Contrat API — le CV créé en conversation

Ce que le nouveau `karria_api` doit exposer pour que Karria écrive le CV
avec l'utilisateur. La forme exécutable de ce contrat est
`src/lib/dev/serveur-simule.ts` (mode `simulation`) : les deux doivent
toujours dire la même chose.

## Le principe

Trois façons d'avoir un CV, une seule forme de données.

1. **L'import** (la voie principale depuis le 2026-11-04) : on envoie son
   CV existant — PDF, Word, ou les photos de ses pages — et il **devient le
   CV**, directement. Le serveur dit ce qu'il a vraiment lu ; l'app mène la
   personne à vérifier ses coordonnées, puis ses expériences et formations.
2. **La conversation**, pour qui n'a pas de CV : une seule structure, un
   chapitre à la fois. L'utilisateur répond librement (texte, ou voix
   transcrite) ; Karria en tire un **premier jet structuré** au format du CV
   V1 ; l'utilisateur le **valide** ou le **corrige**. Le CV n'existe qu'à la
   fin : jusque-là, c'est un **brouillon**, sauvegardé côté serveur pour
   reprendre plus tard, sur n'importe quel appareil.
3. **L'édition directe**, depuis l'écran du CV : chaque section se remplace
   d'un bloc, revalidée par le même schéma que le chapitre.

## Ce qui reste de la V1

Les données finales sont **exactement** celles de la V1 (`app/cv/schemas.py`,
mêmes noms de champs, snake_case) : `summary`, `image_url`, `experiences`,
`educations`, `skills`, `languages`, `interests`, `projects`. De la V1
restent `GET /cv/me` et `POST /voice/transcribe` ; l'édition
(`PUT /cv/update`, `PUT /cv/image`, les sous-ressources) est remplacée par
**une** route, `PUT /cv/me/chapters/{chapitre}` ; l'import (`POST /cv/ai/…`)
par `POST /cv/import` ; la photo améliorée (`/generated-images/generate`)
par `POST /cv/photo`.

**Ajout** : l'identité et le contact, retirés de l'inscription, vivent
dans le CV — `identity { first_name, last_name, headline }` et
`contact { email, phone, city, links: [{ label, url }] }`.

## Les chapitres

Ordre fixe. `boucle` = l'utilisateur peut en ajouter plusieurs (« Une
autre ? »).

| Clé           | Produit                                                  | Boucle |
| ------------- | -------------------------------------------------------- | ------ |
| `identity`    | `{ first_name, last_name, headline }`                    | non    |
| `contact`     | `{ email, phone, city, links[] }`                        | non    |
| `summary`     | `{ summary }` (3 à 5 phrases, « je »)                    | non    |
| `experiences` | `Experience` V1                                          | oui    |
| `educations`  | `Education` V1                                           | oui    |
| `skills`      | `{ skills: Skill[], languages: Language[] }`             | non    |
| `interests`   | `{ interests: Interest[] }`                              | non    |
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
- La photo **déjà sur le CV** se retravaille sans la rechoisir :
  `POST /cv/me/photo/enhance` (ci-dessous, 2026-11-06).

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

| Ce document disait          | HTTP | `error.code`         | `details.reason`                                  |
| --------------------------- | ---- | -------------------- | ------------------------------------------------- |
| `DRAFT_NOT_FOUND`           | 404  | `not_found`          | `draft_not_found`                                 |
| `DRAFT_INCOMPLETE`          | 409  | `rule_violation`     | `draft_incomplete` (+ `chapters: [...]`)          |
| `PHOTO_ENHANCE_REFUSED`     | 422  | `invalid_input`      | `photo_enhance_refused`                           |
| `PHOTO_ENHANCE_UNAVAILABLE` | 503  | `dependency_failure` | `photo_enhance_unavailable`                       |
| chapitre invalide           | 422  | `invalid_input`      | `chapter_invalid` (+ `fields: [{field, reason}]`) |
| modèle indisponible         | 503  | `dependency_failure` | `ai_unavailable`                                  |

Autres raisons : `chapter_required` (passer `identity` ou `contact`),
`chapter_items_expected` / `chapter_data_expected` / `chapter_items_empty`
(forme de la soumission), `document_*` et `audio_*` (fichiers reçus,
ci-dessous). Un chapitre inconnu dans l'URL est un `422` de validation,
pas un `404`.

### `GET /cv/me`

- `id` est un **UUID** (chaîne), pas un entier ; `created_at` et
  `updated_at` sont présents (l'app compare `updated_at` pour retrouver un
  import abouti pendant un passage en arrière-plan).
- Toujours `200` : sans CV, toutes les sections sont vides et `identity`
  vaut `null` (c'est ce que `vide` déduit déjà).
- Chaque élément de section porte un `id` (UUID) stable, destiné à la
  génération de documents. L'app peut l'ignorer.

### `Draft`

- `chapters` liste **toujours les huit chapitres** ; `data` et `items`
  valent `null` quand ils sont absents.
- Le chapitre `photo` validé revient avec `{ image_id, image_url }`
  (`image_url` recalculée à chaque lecture).
- Depuis le 2026-11-04, l'import ne pose plus de **propositions** dans le
  brouillon (il écrit le CV) ; un chapitre `in_progress` avec `data` ou
  `items` ne vient donc plus que d'un ancien brouillon, et `jetsValides` ne
  compte toujours que `validated`.

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

### `POST /cv/import` — le CV existant devient le CV (2026-11-04)

- Multipart `file` : PDF, DOCX, image (JPEG, PNG, WebP, HEIC) ou texte ;
  10 Mo et 10 pages au plus. **Plusieurs images** — les photos des pages
  d'un même CV, dans l'ordre — s'envoient en répétant le champ `file` ;
  plusieurs fichiers d'un autre type → `422 document_pages_must_be_images`.
  Chaque photo est réduite (2 000 px) avant d'être lue.
- `201 ImportRead` : le CV lu **remplace les sections** du CV de la personne
  (la photo, non lue dans le document, reste) ; le brouillon de conversation,
  s'il y en avait un, est **supprimé** — le CV existe désormais. Rien n'est
  écrit si la lecture échoue.

```jsonc
// ImportRead
{
  "cv": { … },                       // au format GET /cv/me
  "source": { "content_type": "application/pdf", "files": 1, "pages": 2 },
  "kept": { "identity": 1, "contact": 1, "summary": 0, "experiences": 4,
            "educations": 2, "skills": 12, "languages": 2, "interests": 0 },
  "discarded": { "experiences": 1 },  // lu par le modèle, refusé par le schéma
  "missing": ["contact.phone", "summary", "experiences.dates"]
}
```

- `kept`, `discarded` et `missing` sont le **compte rendu réel** : c'est
  d'eux que l'app tire ses notes de lecture (« 4 expériences trouvées »,
  « Pas de téléphone trouvé ») — jamais d'une liste de phrases d'attente.
- `missing`, dans l'ordre d'importance : `contact.phone`, `contact.email`,
  `contact.city`, `identity`, `identity.headline`, `summary`, `experiences`,
  `experiences.dates`, `educations`, `educations.dates`, `skills`.
- Erreurs : `422` avec `details.reason` parmi `document_type_unsupported`,
  `document_too_large`, `document_too_many_pages`,
  `document_pages_must_be_images`, `document_empty`, `document_unreadable`,
  `document_not_a_cv` (rien d'un CV n'a été lu : ni nom, ni expérience, ni
  formation) ; `503 ai_unavailable` si le modèle ne répond pas.
- Côté serveur, l'extraction est **un appel par groupe de sections, deux
  tentatives chacun** (trois pour les expériences), la plus riche gardée :
  mesuré le 2026-11-04, un seul appel laissait des listes vides une fois sur
  deux. Compter 5 à 10 s.

### `PUT /cv/me/chapters/{chapitre}` → `200 CVRead` — édition directe (2026-11-04)

Même corps que `PUT /cv/draft/chapters/{chapitre}` (`{ data }`, `{ items }`
ou `{ skipped: true }`), même schéma de revalidation, deux nuances :

- `skipped: true` **vide** la section (`summary`, `skills`, `interests`,
  `experiences`, `educations`, `photo`) ; `identity` et `contact` ne se
  vident pas (`422 chapter_required`) ;
- `items` peut être **vide** (retirer sa dernière expérience), et son ordre
  est l'ordre du CV (c'est ainsi qu'on réordonne).

`photo` reçoit `{ "data": { "image_id": "…" } }` (rendu par `POST /cv/photo`)
ou `{ "data": { "image_id": null } }` pour la retirer ; l'ancienne photo et
les photos en attente sont oubliées après l'écriture.

Erreurs : `404 cv_not_found` sans CV ; `422 chapter_invalid` avec
`details.fields: [{ field, reason }]` (`field` en snake_case du contrat :
`first_name`, `links.0.url`…) ; `chapter_items_expected` /
`chapter_data_expected`.

### `POST /cv/me/photo/enhance` → `201 { image_id, image_url, enhanced: true }` — retravailler la photo déjà en place (2026-11-06)

Session **et** consentement à l'IA requis (`403 ai_consent_required`, usage
`photo_enhancement`, ADR-0025) : la photo part chez le générateur d'image.
Sans corps. Le serveur relit la photo du CV dans le bucket, la passe au même
générateur que `POST /cv/photo` (`enhance=true`) et rend la version
retravaillée **en attente**, comme une photo envoyée : le CV ne change pas.
L'app montre l'originale et la retravaillée ; « Garder cette version » →
`PUT /cv/me/chapters/photo` avec `{ "data": { "image_id" } }` ; « Garder
l'originale » → rien, elle n'a pas bougé (la retravaillée en attente est
oubliée à la prochaine écriture de la photo, ou avec le compte).

Erreurs : `404 cv_not_found` sans CV ; `409 photo_missing` (`rule_violation`)
si le CV n'a pas de photo ; `422 photo_enhance_refused` et
`503 photo_enhance_unavailable` comme `POST /cv/photo`.

### `GET /cv/suggestions?kind=…&q=…` → `200 { items: string[] }` — suggestions à la saisie (2026-11-04)

Session requise. `kind` ∈ `title | company | city | school | degree | skill |
language` ; `q` la saisie (60 caractères au plus, casse et accents
indifférents). Rend **huit libellés au plus**, du plus pertinent au moins
pertinent : ce qui commence par la saisie, puis ce dont un mot commence par
elle, puis par fréquence. Vide pour une saisie vide ou sans correspondance.
`title`, `company` et `city` viennent de l'index d'offres (matérialisé chaque
nuit côté API, ADR-0028) ; `school`, `degree`, `skill`, `language` de listes
de référence embarquées. `422` pour une famille inconnue ou une saisie trop
longue. L'app appelle après 200 ms de calme (`use-suggestions.ts`) ; une
suggestion remplit le champ, la saisie libre reste possible.

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
