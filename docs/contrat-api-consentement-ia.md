# Contrat API — le consentement à l'IA

Ce que `karria_api_v2` expose pour qu'une personne accepte, **avant la
première utilisation** d'un outil d'IA, que ses données partent chez un
fournisseur de modèles tiers — et pour qu'elle puisse revenir dessus. Règle
5.1.2 (i) de l'App Store ; côté API, ADR-0025. Préfixe `/api/v1`, session
exigée, erreurs au format `{ error: { code, message, details } }`.

État : **servi en production** depuis le 2026-10-30.

## Le principe

Le serveur est la porte. Chaque route qui confie une donnée de la personne à
un modèle refuse tant qu'aucun consentement **valable** n'existe :

| Route                            | Ce qui part                               | Usage (`purposes`)   |
| -------------------------------- | ----------------------------------------- | -------------------- |
| `POST /assistant/messages`       | tes messages à Karria, sa mémoire de toi  | `assistant`          |
| `POST /voice/transcribe`         | ta voix                                   | `transcription`      |
| `POST /cv/draft/interpret`       | tes réponses sur ton parcours             | `cv_creation`        |
| `POST /cv/import`                | le fichier de ton CV                      | `cv_import`          |
| `POST /cv/photo` (`enhance=true`) | ta photo                                 | `photo_enhancement`  |
| `POST /cv/me/generated-cvs`      | le score ATS de ton CV, pour l'expliquer  | `template_analysis`  |

Sans amélioration (`enhance=false`), la photo ne quitte pas Karria : pas de
porte. Lire son CV, son brouillon, valider un chapitre, finaliser : aucun
modèle, aucune porte.

La **version** du consentement se calcule côté serveur à partir des
fournisseurs **réellement routés** (`gemini` aujourd'hui ; `anthropic`,
`openai` possibles) et des usages. Un fournisseur ou un usage de plus change
la version : `required` repasse à vrai et l'app redemande. L'app ne décide
jamais de la version : elle renvoie celle qu'elle a montrée.

## Les routes

### `GET /auth/me/ai-consent` → `200 AiConsent`

```jsonc
{
  "required": true, // vrai : montrer la feuille avant tout outil d'IA
  "disclosure": {
    "version": "2026-10.3f9a1c2e", // à renvoyer dans le PUT
    "providers": [{ "id": "gemini", "name": "Google Gemini" }],
    "purposes": [
      "assistant",
      "transcription",
      "cv_creation",
      "cv_import",
      "photo_enhancement",
      "template_analysis"
    ]
  },
  "accepted_version": null, // la version du dernier accord, ou null
  "accepted_at": null, // ISO 8601, ou null
  "revoked_at": null // ISO 8601 si la personne a retiré son accord
}
```

Le même objet est servi dans `GET /auth/me` sous `ai_consent`
(`contrat-api-compte.md`) : l'app sait dès l'ouverture de session si la
feuille devra se montrer.

### `PUT /auth/me/ai-consent` `{ "version": "…" }` → `200 AiConsent`

Enregistre l'accord pour la version **lue**, horodaté par le serveur avec la
liste des fournisseurs montrés. Une acceptation déjà valable n'est pas
réécrite (la date d'origine est la preuve).

- `409 rule_violation`, `details.reason = ai_consent_version_mismatch`,
  `details.expected_version` : l'information a changé entre la lecture et
  l'acceptation — relire `GET`, remontrer la feuille.

### `DELETE /auth/me/ai-consent` → `200 AiConsent`

Marque le retrait (`revoked_at`) ; la trace reste. `required` repasse à vrai.
Silencieux s'il n'y avait rien à retirer.

## L'erreur que toute route d'IA peut rendre

`403 forbidden`, `details.reason = ai_consent_required`, avec
`details.version` (la version à accepter) et `details.providers` (les
identifiants). L'app doit alors montrer la feuille de consentement, puis
**rejouer l'action** une fois l'accord enregistré. C'est le filet : même si
l'app croit l'accord donné (cache périmé, fournisseur changé), le serveur
tranche.

## Ce que l'app fait de son côté

- `features/ia/` : un état partagé (`consentement-ia.ts`) recopié depuis
  `GET /auth/me` à l'ouverture de session, puis tenu à jour par les routes
  ci-dessus ; `useActionIa()` enveloppe chaque première action d'IA
  (parler à Karria, dicter, créer ou importer un CV, améliorer une photo) :
  si `required`, la feuille s'ouvre et l'action reprend après « J'accepte et
  je continue ».
- La feuille (`feuille-consentement-ia.tsx`) : l'orbe, ce qui part selon
  l'outil, les fournisseurs du serveur (`disclosure.providers[].name`),
  pourquoi, « jamais pour entraîner des modèles ni pour la publicité »,
  conservation selon la politique de confidentialité (lien), « J'accepte et
  je continue » / « Pas maintenant ».
- Un `403 ai_consent_required` reçu par n'importe quelle couche `api/` est
  traité pareil (`estConsentementIaRequis(cause)`), l'action est rejouée.
- Paramètres → « Karria et l'IA » : la même feuille en consultation (date,
  fournisseurs) avec « Retirer mon consentement » (`DELETE`).
- En simulation, le faux serveur (`lib/dev/serveur-simule.ts`) tient le même
  état et refuse les routes d'IA avec `ai_consent_required` tant que rien
  n'est accepté.
