# Contrat API — « Parler à l'équipe »

Ce que `karria_api_v2` expose (module `support`, ADR-0026) pour la messagerie
entre une personne et **les humains** de l'équipe Karria. Préfixe `/api/v1`,
session exigée (`Authorization: Bearer`), erreurs au format
`{ error: { code, message, details: { reason, field } } }`. La forme exécutable
est `src/lib/dev/equipe-simule.ts`.

Ce n'est **pas** une fonction d'IA : aucun modèle ne lit ni n'écrit ici, la
porte du consentement à l'IA ne s'applique pas.

## Le message

```json
{
  "id": "3f2c9a1e-8b4d-4e7f-9a10-2b3c4d5e6f70",
  "author": "user",
  "kind": "voice",
  "body": null,
  "attachment": {
    "url": "https://storage.karria.fr/…?X-Amz-Signature=…",
    "content_type": "audio/mp4",
    "size_bytes": 48211,
    "duration_ms": 7400
  },
  "created_at": "2026-10-31T09:12:44.120391Z"
}
```

- `author` : `user` (la personne) ou `team` (l'équipe).
- `kind` : `text` (`body` rempli, `attachment` nul), `voice` ou `image`
  (`attachment` rempli, `body` nul).
- `attachment.url` est **signée** et expire : l'app ne la garde pas, elle relit
  le fil. `duration_ms` n'existe que pour un vocal.

## `GET /support/me` → `200`

Le fil, ouvert à la première visite : `{ id, has_unread, last_team_message_at,
messages: [Message…] }` — les 200 derniers messages, du plus ancien au plus
récent. Lire le fil **ne** pose **pas** la lecture : l'app appelle
`POST /support/me/read` une fois l'écran affiché.

## `GET /support/me/unread` → `200`

`{ "has_unread": true }` — l'équipe a répondu depuis la dernière lecture. Léger :
ne crée rien. C'est le point discret du bouton flottant du Profil.

## `POST /support/me/messages` → `201` Message

Corps `{ "body": "…" }`, 1 à 4 000 caractères. `422 support_message_empty` si le
texte est vide une fois nettoyé.

## `POST /support/me/messages/media` → `201` Message

Multipart : `file` (JPEG, PNG, WebP, ou un son M4A/AAC/MP3/WAV/WebM/OGG, 15 Mo
au plus) et, pour un vocal, `duration_ms` (1 à 600 000). La sorte se déduit du
fichier. Erreurs : `422 support_media_unsupported`, `422 support_voice_too_long`
(au-delà de cinq minutes), `422` image illisible, `503` stockage indisponible.

L'app envoie un vocal en `audio/mp4` (`.m4a`, ce qu'`expo-audio` enregistre en
`HIGH_QUALITY` sur les deux systèmes) et une image en `image/jpeg`.

## `POST /support/me/read` → `204`

Pose la lecture : plus de non-lu, et pas de notification pour ce qui arrive
sous les yeux de la personne pendant les 45 secondes qui suivent.

## Le direct — `GET /support/me/stream` (WebSocket)

`wss://api.karria.fr/api/v1/support/me/stream?since=<ISO 8601>`, en-tête
`Authorization: Bearer <jeton>` (le `WebSocket` de React Native l'accepte en
troisième argument). `since` est l'instant du dernier message reçu : le serveur
rattrape ce qui est arrivé entre la lecture du fil et l'ouverture du flux.

| Sens          | Trame                                  | Sens                                                                                                                                            |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| serveur → app | `{"type":"message","message":Message}` | un message nouveau — de l'équipe, ou de la personne depuis un autre appareil, **ou celui qu'elle vient d'envoyer** (l'app dédoublonne par `id`) |
| serveur → app | `{"type":"ping"}`                      | toutes les 20 s : la connexion vit                                                                                                              |
| app → serveur | `{"type":"read"}`                      | « j'ai vu » — envoyé à chaque message de l'équipe reçu en direct                                                                                |

Fermeture `4401` : jeton refusé. L'app relit alors une route HTTP (qui renouvelle
la session si elle a expiré) et rouvre une fois ; un second refus arrête le
direct.

### Ce que fait l'app

- Ouvre le flux quand l'écran est **affiché et au premier plan** ; le ferme en
  arrière-plan et en quittant l'écran.
- Coupure : reconnexion avec attente croissante (1, 2, 4… 30 s au plus), depuis
  le dernier message connu.
- **Retour au premier plan** : relit `GET /support/me` (le repli si le direct
  était tombé), pose la lecture, rouvre le flux.

## La notification

Type `support` du contrat v1 (`docs/contrat-notifications.md`), canal `compte`,
`url` `karria://equipe` ; le toucher ouvre Profil → l'échange. Elle part quand
l'équipe répond, **sauf** si la personne a lu il y a moins de 45 s (écran
ouvert) et **sauf** si une réponse non lue l'attend déjà : une rafale de
réponses = une notification. Au premier plan, l'app ne montre pas sa bannière
quand l'écran de l'équipe est déjà ouvert. Le corps ne cite jamais la réponse.

## Côté équipe (hors app)

`/internal/support/*` et la console `GET /internal/support/console`, protégés
par le jeton `SUPPORT__ADMIN_TOKEN` de l'API. Chaque nouveau message d'une
personne envoie un courriel à `mtakoumba@gmail.com` (une fois par rafale).
Voir `karria_api_v2/docs/DEPLOIEMENT.md` § « Parler à l'équipe ».
