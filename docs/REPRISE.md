# Reprise — état de `karria_app`

> Document de passation. À lire en premier par toute personne ou IA qui
> reprend le travail, avec `AGENTS.md`. Mis à jour à chaque fin de session.

**Dernière mise à jour : 2026-10-21**

## Où on en est

Refonte de l'app Karria : Expo SDK 57, RN 0.86, expo-router, UniWind,
Reanimated 4. Elle suit l'anatomie de la V1 (`~/Documents/HelloWorkk/karria`,
cf. `docs/reference-v1.md`) avec une expérience plus immersive : aura, orbe
vivante, animations.

| Zone | État |
| ---- | ---- |
| Connexion | Google, Apple, code e-mail ; session à rotation (`lib/http.ts`, `lib/session.ts`) |
| Notifications | Écran d'activation à la 1re connexion. Enregistrement de l'appareil à chaque ouverture, retrait à la déconnexion. Une notification touchée ouvre son `data.url` (`features/notifications`). |
| Offres | Fil, filtres, détail. Le titre est à droite du logo. L'analyse Karria est générée à la demande avec son chargeur, selon la sémantique V1 : `not_available` à la 1re lecture déclenche `POST …/summary`. |
| Modèles | Onglet et détail, avec pied flottant |
| CV | Création en conversation : 8 chapitres, texte ou voix, jet validé ou corrigé, photo avec amélioration IA. Puis l'écran CV de la V1. |
| Profil | Identité (tirée du CV), raccourci CV, carte d'abonnement (`features/abonnement`, bouchon « Gratuit » : brancher Stripe = remplacer `lireMonAbonnement`) |
| Paramètres (`/parametres`) | Apparence, notifications, documents, version, déconnexion, suppression de compte (`/compte/supprimer` : raison du départ → ce qui sera supprimé → confirmation ; `DELETE /auth/me` vérifié contre la v2) |

`npm run check` passe (146 tests au dernier passage). **Rien n'est commité** : Marc commite lui-même.

## Les backends

`.env` (hors git) choisit la cible :

- `EXPO_PUBLIC_API_MODE` :
  - `simulation` : le faux serveur `lib/dev/serveur-simule.ts` répond, avec le code `000000` ;
  - `reel` : les requêtes partent vers le vrai serveur.
- `EXPO_PUBLIC_API_CIBLE` :
  - `v2` : `karria_api_v2` sur `http://localhost:8001/api/v1`. Ce que la v2
    ne sert pas encore (offres, modèles, assistant) part au faux serveur,
    en développement seulement (`enAvanceSurLeBackend`).
  - `v1` : l'API V1 locale sur le port 8000. Seul le CV passe alors par le faux serveur.
- Après toute modification de `.env`, relancer Metro avec `--clear`.

Contrats en prose (ils font foi pour l'API) : `docs/contrat-api-cv.md`,
`docs/contrat-api-appareils.md`, `docs/contrat-api-compte.md`.

## Lancer

```bash
cd ~/WebstormProjects/karria_app
npx expo start --dev-client --port 8081 --clear
# recompilation native (après ajout de module ou de plugin) :
npx expo prebuild --platform ios --no-install && (cd ios && pod install)
npx expo run:ios --device <UDID simulateur>
```

- Config native ajoutée le 2026-10-21 :
  - plugin `@react-native-google-signin/google-signin` avec `iosUrlScheme` ;
  - `extra.eas.projectId` (le projet EAS de la V1, même slug `karria`), nécessaire au jeton de notification.
- Dépendances ajoutées dans la session : `expo-audio`, `expo-image-picker`, `expo-notifications`, `expo-device`.

## Ce qui reste (par priorité)

1. **Vérifier en mode clair et sur Android** le Profil, les Paramètres et la suppression de compte (seul le mode sombre iOS a été vu).
2. **Tests manuels sur le simulateur avec l'API v2** :
   - connexion Google ou Apple réelle (Marc) ;
   - parcours CV complet, voix et photo ;
   - notification de test (`POST /devices/me/test-notification`, sur un appareil physique pour le vrai jeton).
3. **Import d'un CV existant** dans l'app (« J'ai déjà un CV ») : `POST /cv/import` existe côté API.
4. **Actions d'édition du CV** après sa création (« à voir »), puis l'onglet Dossiers.

## Règles de travail (Marc)

- Respecter `AGENTS.md` à la lettre :
  - un écran = une vue et un seul hook ;
  - le réseau seulement dans `api/` ;
  - aucune couleur en dur, aucun `any` ;
  - un en-tête de documentation en français dans chaque fichier ;
  - aucune nouvelle dépendance sans demander.
- Ne jamais commiter ni pousser sans demande explicite.
- Économiser les tokens. À la limite de session, s'arrêter proprement.
- Mettre ce fichier à jour à chaque fin de session.
