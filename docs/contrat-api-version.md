# Contrat API — la porte de mise à jour : `GET /app/release`

Ce que `karria_api_v2` expose pour que l'application sache si la build installée
est encore servie. Préfixe `/api/v1`, **sans session** (la question se pose avant
de savoir qui ouvre l'application, invité compris), erreurs au format
`{ error: { code, message, details } }`. La forme exécutable est
`src/lib/dev/version-simule.ts`.

État : **en cours de livraison côté serveur** (2026-11-05). Tant que la route
répond `404`, l'application ne fait rien — c'est voulu.

## `GET /app/release?platform=ios|android&build=<entier>` → `200`

`build` est le numéro de build natif de l'application (`expo-application`
`nativeBuildVersion` : `versionCode` Android, `CFBundleVersion` iOS, entier
incrémenté par EAS).

```json
{
  "status": "ok",
  "latest_build": 12,
  "minimum_build": 8,
  "store_url": "https://apps.apple.com/fr/app/karria/id…"
}
```

- `status` : `ok` (rien à faire), `update_available` (une version plus récente
  existe, celle-ci fonctionne encore), `update_required` (cette build n'est
  plus servie : `build < minimum_build`).
- `latest_build`, `minimum_build` : entiers, informatifs — l'application
  n'en déduit rien, elle lit `status`.
- `store_url` : la fiche de l'application sur le magasin **de la plateforme
  demandée** (App Store pour `ios`, Play Store pour `android`). `null` si
  elle n'est pas encore publiée.

Erreurs : `422 platform_invalid` (`field: platform`), `422 build_invalid`
(`field: build`).

## Ce que l'application en fait

| Réponse                                    | Geste                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `update_required` avec `store_url`         | Écran bloquant « Une nouvelle version de Karria t'attend », un seul bouton « Mettre à jour ».           |
| `update_required` sans `store_url`         | Traité comme `update_available` : on ne bloque pas derrière un bouton qui n'ouvre rien.                 |
| `update_available`                         | Bande au lancement, fermable, **au plus une fois par jour** ; badge « Nouvelle version » sur le profil. |
| `ok`, `404`, réseau coupé, build illisible | Rien. Une panne ne bloque jamais personne.                                                              |

Demandé au lancement, puis au retour au premier plan si la dernière réponse
date de plus de **six heures** (`features/demarrage/hooks/use-porte-de-version.ts`).

## Côté serveur, ce qui reste à décider

Où vivent `minimum_build` et `latest_build` par plateforme (variables
d'environnement ou table) : au serveur de choisir ; l'application ne lit que la
réponse.
