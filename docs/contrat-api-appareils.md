# Contrat API — les appareils et les notifications push

Ce que le nouveau `karria_api` expose pour que l'application déclare le
téléphone sur lequel elle tourne, et pour que le serveur puisse y envoyer
des notifications. La forme exécutable de ce contrat est
`src/lib/dev/appareils-simule.ts` (mode `simulation`) : les deux doivent
toujours dire la même chose. Côté serveur, c'est le module `devices` de
`karria_api_v2` qui le sert.

## Le principe

Un **appareil** est une installation de l'app, identifiée par un
`installation_id` que l'app tire une fois et conserve. L'app déclare sa
fiche **à chaque démarrage** et à chaque changement de permission ou de
jeton ; le serveur la remplace entière. À la déconnexion, l'app détache
l'appareil **avant** de révoquer sa session.

Le jeton est un **jeton Expo** (`ExponentPushToken[…]`). Le serveur envoie
par le service push d'Expo, lit les tickets puis les reçus, et détache de
lui-même un jeton qu'Expo déclare mort (`DeviceNotRegistered`). L'app n'a
rien à faire pour cela : au prochain démarrage, elle redéclare son jeton.

## Ce que le serveur retient, et ce qu'il ne retient pas

- La fiche telle que l'app l'envoie, plus `first_seen_at` et
  `last_seen_at` (première et dernière déclaration).
- Le **pays** de la requête, si le mandataire de confiance le transmet
  (en-tête `CF-IPCountry`). **Aucune adresse IP** n'est conservée.
- Le couple `(compte, installation_id)` est unique : le même téléphone
  utilisé par deux comptes donne deux fiches ; une réinstallation donne un
  nouvel `installation_id`, donc une nouvelle fiche.

## Les routes

Toutes exigent la session (`Authorization: Bearer <access_token>`).
Erreurs au format `{ error: { code, message, details: { reason, field } } }`.

### `PUT /devices/{installation_id}` → `200 Enregistrement`

`installation_id` : 1 à 128 caractères parmi `A-Z a-z 0-9 . _ -`.

```jsonc
// Requête — tout est envoyé à chaque fois, le serveur ne fusionne rien
{
  "platform": "ios",                       // "ios" | "android"
  "push_token": "ExponentPushToken[…]",    // string | null
  "push_permission": "granted",            // "granted" | "denied" | "undetermined"
  "os_name": "iOS",
  "os_version": "18.1",
  "device_brand": "Apple",                 // string | null
  "device_manufacturer": "Apple",          // string | null
  "device_model": "iPhone 15",             // string | null
  "device_model_id": "iPhone15,2",         // string | null
  "device_year_class": 2023,               // number | null
  "is_physical_device": true,
  "app_version": "2.0.0",
  "app_build": "42",                       // string | null
  "locale": "fr-FR",                       // string | null
  "timezone": "Europe/Paris",              // string | null
  "region": "FR"                           // string | null
}
// Réponse
{ "installation_id": "…", "push_enabled": true }
```

`push_enabled` est la **décision du serveur** : vrai seulement si
`push_permission` vaut `granted` **et** qu'un jeton existe. L'app
l'affiche, elle ne le recalcule pas.

Validation **stricte** → `422` avec `details.field` désignant le premier
champ fautif :

- énumérations (`platform`, `push_permission`) ;
- longueurs : chaînes libres ≤ 100 caractères, `push_token` ≤ 256,
  `device_year_class` entre 1990 et 2100 ;
- `push_token`, s'il est présent, doit avoir la forme
  `ExponentPushToken[…]` ou `ExpoPushToken[…]` (une chaîne vide vaut
  `null`). Le simulateur ne vérifie pas ce format ; le serveur, si.

Idempotent : rejouer le même appel ne crée rien de plus et n'avance que
`last_seen_at`.

### `DELETE /devices/{installation_id}` → `204`

Détache l'appareil du compte connecté : plus rien ne lui est envoyé.
Répond `204` même si l'appareil est inconnu — la déconnexion ne doit jamais
échouer parce que le serveur n'a pas connu l'appareil. Ne touche ni aux
autres appareils du compte, ni aux fiches d'un autre compte portant le
même `installation_id`.

### `POST /devices/me/test-notification` → `200` (développement seulement)

Envoie « Karria vous entend » aux appareils joignables **de l'appelant**.
Réponse `{ targeted, accepted, rejected }`. Répond `404` sur les
environnements déployés : la route n'existe que pour vérifier la chaîne en
local. Non simulée côté app.

## Ce que le serveur fait avec les jetons

- Envoi par lots de 100 au plus, à **tous** les appareils joignables du
  compte visé.
- Un ticket en erreur `DeviceNotRegistered` détache le jeton aussitôt ; un
  reçu en erreur `DeviceNotRegistered`, lu un quart d'heure plus tard, le
  détache aussi. L'appareil reste connu, sans jeton, jusqu'à sa prochaine
  déclaration.
- Le contenu des notifications (`title`, `body`, `data`) est décidé par le
  module qui a quelque chose à dire ; `data` ne contient que des chaînes,
  et c'est ce que l'app lit à l'ouverture (`type`, écran, identifiant).
  Aucun gabarit n'est fixé par ce contrat.
