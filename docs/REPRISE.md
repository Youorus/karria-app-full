# Reprise — état de `karria_app`

> Document de passation. À lire en premier par toute personne ou IA qui
> reprend le travail, avec `AGENTS.md`. Mis à jour à chaque fin de session.

**Dernière mise à jour : 2026-10-24**

## Où on en est

Refonte de l'app Karria : Expo SDK 57, RN 0.86, expo-router, UniWind,
Reanimated 4. Elle suit l'anatomie de la V1 (`~/Documents/HelloWorkk/karria`,
cf. `docs/reference-v1.md`) avec une expérience plus immersive : aura, orbe
vivante, animations.

| Zone                       | État                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connexion                  | Google, Apple, code e-mail ; session à rotation (`lib/http.ts`, `lib/session.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Notifications              | Écran d'activation à la 1re connexion. Enregistrement de l'appareil à chaque ouverture, retrait à la déconnexion. Une notification touchée ouvre son `data.url` (`features/notifications`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Offres                     | **Branchées sur la production** (`docs/contrat-api-offres.md`) : identifiants UUID, deux modes du fil (toutes les offres récentes / recherche) ; sélecteur « Ma recherche / Toutes les offres » sous l'en-tête dès qu'une recherche existe — « Toutes les offres » met la recherche **en pause** sur l'appareil (`features/assistant/services/recherche-en-pause.ts`, `DELETE` puis `PUT /search/criteria` au retour) car le contrat n'a pas de « voir tout en gardant ma recherche » (demander à l'API un `mode=all_offers` sur le fil pour supprimer cet aller-retour), offres vues envoyées par lots, écarter une offre depuis le détail. Pas d'analyse par offre dans la V2 : le détail montre le texte de l'annonce dans le bloc de la V1. La feuille de filtres reste celle de la V1 (contrats et villes avec effectifs, période, affichage). |
| Karria                     | `POST /assistant/messages` au contrat `docs/contrat-api-recherche.md` : statut, réponses rapides et élargissements comptés en capsules sous la réponse, « Voir les N offres » referme le rideau sur un fil rechargé.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Modèles                    | Onglet et détail, avec pied flottant. Servis par le faux serveur `lib/dev/modeles-simule.ts` (6 modèles, sans images) tant que la v2 n'a pas de module `/templates/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| CV                         | Création en conversation : 8 chapitres, texte ou voix, jet validé ou corrigé, photo avec amélioration IA. Puis l'écran CV de la V1. **Import d'un CV existant** (« J'ai déjà un CV », `expo-document-picker` → `POST /cv/import`) : les chapitres extraits arrivent en propositions à valider une à une ; seuls les chapitres validés comptent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Orbe                       | `OrbeVivante` est une sphère de particules Skia sur un tourbillon chromatique (`components/orbe-vivante.tsx`, maths dans `orbe-particules.ts`). Même API + `ecoute`, `niveauAudio`. Réglages dans l'en-tête du fichier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Profil                     | Identité (tirée du CV), raccourci CV, carte d'abonnement (`features/abonnement`, bouchon « Gratuit » : brancher Stripe = remplacer `lireMonAbonnement`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Paramètres (`/parametres`) | Apparence, notifications, documents, version, déconnexion, suppression de compte (`/compte/supprimer` : raison du départ → ce qui sera supprimé → confirmation ; `DELETE /auth/me` vérifié contre la v2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

`npm run check` passe (177 tests au dernier passage) et `npx expo export --platform ios` produit un paquet. Commits poussés sur `main` de `karria-app-full` le 2026-10-24 (autorisés par Marc pour cette session).

## Les backends

`.env` (hors git) choisit la cible :

- `EXPO_PUBLIC_API_MODE` :
  - `simulation` : le faux serveur `lib/dev/serveur-simule.ts` répond, avec le code `000000` ;
  - `reel` : les requêtes partent vers le vrai serveur.
- `EXPO_PUBLIC_API_URL` : la **production** `https://api.karria.fr/api/v1`
  (≈ 54 000 offres réelles) ; en local, `http://localhost:8001/api/v1`.
- `EXPO_PUBLIC_API_CIBLE` :
  - `v2` : `karria_api_v2`. Seuls les modèles de CV (`/templates/`) partent
    encore au faux serveur, en développement seulement (`enAvanceSurLeBackend`,
    liste `SERVI_PAR_LA_V2` dans `lib/dev/serveur-simule.ts`).
  - `v1` : l'API V1 locale sur le port 8000. Seul le CV passe alors par le faux serveur.
- Après toute modification de `.env`, relancer Metro avec `--clear`.

Contrats en prose (ils font foi pour l'API) : `docs/contrat-api-cv.md`,
`docs/contrat-api-appareils.md`, `docs/contrat-api-compte.md`,
`docs/contrat-api-offres.md`, `docs/contrat-api-recherche.md` (ces deux
derniers sont tenus par l'agent du backend ; les relire avant toute
modification du fil ou de Karria). Le faux serveur des offres est
`lib/dev/offres-simule.ts`.

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
- Dépendances ajoutées le 2026-10-21 : `expo-audio`, `expo-image-picker`, `expo-notifications`, `expo-device`.
- Dépendances ajoutées le 2026-10-23 : `expo-document-picker` (import de CV), `@shopify/react-native-skia` (orbe). Toutes deux natives : `prebuild` + `pod install` faits, build installé sur le simulateur iPhone 17 (`53F41CC0-710B-40C4-AB4B-8F6942FF60DF`).

## Ce qui reste (par priorité)

1. **Tester sur le simulateur, contre la production** (non vérifié à l'écran
   dans la session du 2026-10-23, faute de boîte mail pour le code) :
   le fil en mode « toutes les offres » et après une recherche Karria, les
   capsules d'élargissement, le détail (texte de l'annonce, écarter),
   l'import de CV (PDF/DOCX/image), et l'orbe (rendu, fluidité, mode
   clair, Android — baisser `flou` dans `orbe-vivante.tsx` si Android rame).
2. **La feuille de filtres complète** (mots-clés, lieu + rayon / toute la
   France, horaires, télétravail, expérience, salaire, source, facettes)
   : reportée par Marc le 2026-10-23, côté API comme côté app
   (`docs/contrat-api-offres.md` le dit aussi). L'app n'envoie que les
   filtres de la V1.
3. **Le journal d'apprentissage** (`impressions` avec `position`,
   `position`/`dwell_ms` dans l'interaction) : non envoyé tant que la
   production ne l'accepte pas (`extra=forbid` côté API → 422).
4. **Vérifier en mode clair et sur Android** le Profil, les Paramètres et la suppression de compte.
5. **Tests manuels** : connexion Google ou Apple réelle (Marc), parcours CV complet (voix, photo), notification de test sur appareil physique.
6. **Actions d'édition du CV** après sa création, puis l'onglet Dossiers ; « Ce que Karria sait de moi » (`/assistant/memory`) dans les réglages.

## Règles de travail (Marc)

- Respecter `AGENTS.md` à la lettre :
  - un écran = une vue et un seul hook ;
  - le réseau seulement dans `api/` ;
  - aucune couleur en dur, aucun `any` ;
  - un en-tête de documentation en français dans chaque fichier ;
  - aucune nouvelle dépendance sans demander.
- Ne jamais commiter ni pousser sans demande explicite (le 2026-10-23, Marc a autorisé le push sur `main`).
- Économiser les tokens. À la limite de session, s'arrêter proprement.
- Mettre ce fichier à jour à chaque fin de session.
