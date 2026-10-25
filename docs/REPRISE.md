# Reprise — état de `karria_app`

> Document de passation. À lire en premier par toute personne ou IA qui
> reprend le travail, avec `AGENTS.md`. Mis à jour à chaque fin de session.

**Dernière mise à jour : 2026-10-25**

## Session du 2026-10-25 — logos des entreprises

- `company.logo` (128 px) et `company.logo_large` (256 px) : WebP carrés servis par
  `storage.karria.fr`, adressés par empreinte, immuables (contrat
  `docs/contrat-api-offres.md` § « Le logo de l'entreprise »).
- Composant `features/offres/components/tuile-entreprise.tsx`, partagé par la carte
  (`logo`, `recyclingKey` = id de l'offre) et le détail (`logoGrand ?? logo`) :
  `expo-image` cache mémoire + disque, fondu 180 ms, `contain` sur tuile blanche
  (jeton `fond-logo`, blanc dans les deux modes) ; repli sur les initiales si
  l'URL est `null` **ou** si le chargement échoue (`onError`).
- Type `Offre` : champ `logoGrand` ; le faux serveur sert `logo_large`.
- **Vérifié sur le simulateur iPhone 17 (iOS, mode sombre) contre la production** : le fil
  affiche les logos (PROMAN, Tereva…) et les initiales à défaut. Le client de développement
  installé datait d'avant `@shopify/react-native-skia` (écran rouge `RNSkiaModule`) : il a
  fallu `npx expo run:ios --device <udid> --no-bundler`. À refaire après tout ajout de module
  natif.
- Côté API, un domaine ne fournit d'icône que si le nom s'y lit : le logo d'`iziwork.com`
  affiché pour PROMAN (vu sur le simulateur) a été corrigé en production.
- Non vérifié sur Android ni en mode clair.
- Des modifications non commitées d'une autre main sont dans l'arbre (`app.json`, `eas.json`,
  `package.json`, `docs/contrat-api-appareils.md`…) : laissées telles quelles.

## Où on en est

Refonte de l'app Karria : Expo SDK 57, RN 0.86, expo-router, UniWind,
Reanimated 4. Elle suit l'anatomie de la V1 (`~/Documents/HelloWorkk/karria`,
cf. `docs/reference-v1.md`) avec une expérience plus immersive : aura, orbe
vivante, animations.

| Zone                       | État                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connexion                  | Google, Apple, code e-mail ; session à rotation (`lib/http.ts`, `lib/session.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Notifications              | Écran d'activation à la 1re connexion. Enregistrement de l'appareil à chaque ouverture, retrait à la déconnexion. Une notification touchée ouvre son `data.url` (`features/notifications`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Offres                     | **Branchées sur la production** (`docs/contrat-api-offres.md`) : identifiants UUID, deux modes du fil (toutes les offres récentes / recherche) ; sélecteur « Ma recherche / Toutes les offres » sous l'en-tête dès que le serveur rend un `criteria_summary`. Changer de vue ne change que le paramètre `mode` (`all_offers` / `search`) de `GET /job-matches/me` : les critères restent, **les alertes restent actives** (plus de `DELETE`/`PUT /search/criteria`, plus de stockage sur l'appareil — `recherche-en-pause.ts` supprimé le 2026-10-24). Une nouvelle recherche Karria remet le mode « déduit ». Offres vues envoyées par lots, écarter une offre depuis le détail. Pas d'analyse par offre dans la V2. La feuille de filtres reste celle de la V1.                                                                                                                                                                                                                                                                                                                                                                         |
| Karria                     | `POST /assistant/messages` au contrat `docs/contrat-api-recherche.md` : statut, réponses rapides et élargissements comptés en capsules sous la réponse, « Voir les N offres » referme le rideau sur un fil rechargé.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Modèles                    | Onglet et détail au contrat `docs/contrat-api-modeles.md` (UUID, `pages`, corps de `POST /user-templates/me` réduit à `template_id`). **Servis par le faux serveur** `lib/dev/modeles-simule.ts` : `/templates/` répond 404 en production (vérifié le 2026-10-24). Il sert les 3 modèles du PoC (Meridian, Marketing, Minimalist) avec leurs **vrais aperçus** (WebP dans `lib/dev/modeles/`, absents du paquet de production) et un `thumbnail_blurhash` (champ **proposé** au contrat). **Bascule** : ajouter `"/templates/"` et `"/user-templates/"` à `SERVI_PAR_LA_V2` (`lib/dev/serveur-simule.ts`), rien d'autre. Images `expo-image` en cache mémoire+disque, clé `modele-<id>-v<version>`. Ouverture : zoom natif sur iOS 18+, zoom Reanimated mesuré (`hooks/use-ouverture-modele.ts`) sur Android, aucun en mouvement réduit ; le détail s'affiche aussitôt depuis la galerie (`modeleConnu`). Pastille et puce « Premium » (or, jetons `premium-texte`, `surface-premium`, `border-premium`). Lien `karria://modeles?categorie=étudiant`. Puces : hauteur fixe, défileur `grow-0 shrink-0` (corrige l'étirement à une carte). |
| CV                         | Création en conversation : 8 chapitres, texte ou voix, jet validé ou corrigé, photo avec amélioration IA. Puis l'écran CV de la V1. **Import d'un CV existant** (« J'ai déjà un CV », `expo-document-picker` → `POST /cv/import`) : les chapitres extraits arrivent en propositions à valider une à une ; seuls les chapitres validés comptent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Orbe                       | `OrbeVivante` est une sphère de particules Skia sur un tourbillon chromatique (`components/orbe-vivante.tsx`, maths dans `orbe-particules.ts`). Même API + `ecoute`, `niveauAudio`. Réglages dans l'en-tête du fichier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Profil                     | Refait minimaliste et chaleureux (2026-10-24) : sans aura ni cadre, identité centrée (anneau et initiales caramel), raccourci CV, carte **« Offrir un café »** (`features/soutien`) = un mot signé de l'équipe sur crème (`surface-chaleur`), une rangée segmentée de 1 à 3 tasses, un bouton. Derrière le port `services/pourboire.ts` ; branché sur `bientot` (« Bientôt », désactivé) tant qu'aucune lib d'achat intégré n'est installée. Jetons ajoutés : `chaleur`, `surface-chaleur`, `border-chaleur` (+ `CHALEUR`, `PREMIUM_TEXTE` dans `theme/index.ts`). Vérifié en sombre sur iOS ; **pas encore en clair ni sur Android**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Paramètres (`/parametres`) | Apparence, notifications, documents, version, déconnexion, suppression de compte (`/compte/supprimer` : raison du départ → ce qui sera supprimé → confirmation ; `DELETE /auth/me` vérifié contre la v2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

`npm run check` passe (179 tests au dernier passage) et `npx expo export --platform ios` produit un paquet. Commits poussés sur `main` de `karria-app-full` le 2026-10-24 (autorisés par Marc pour cette session).

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

0. **Modèles** : dès que la v2 sert `/templates/` (curl `https://api.karria.fr/api/v1/templates/` → 401 et non 404), faire la bascule `SERVI_PAR_LA_V2` ci-dessus et vérifier la galerie contre la production. Faire valider par l'agent backend le champ proposé `thumbnail_blurhash`. Tester le zoom Reanimated sur un émulateur Android (non vérifié) et le Profil en mode clair.

1. **Activer les cafés (achat intégré obligatoire : Apple 3.1.1, Google Play Billing — pas de lien de don externe).**
   - Marc : créer 3 produits **consommables** `com.karria.cafe.1`, `com.karria.cafe.2`, `com.karria.cafe.3` (même id sur App Store Connect et Play Console, app `com.karria.app`), contrats « Paid Apps » signés ; les importer dans RevenueCat (projet de la V1) et les grouper dans une offering `cafes`. Clés : `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (celles de la V1, cf. `eas.json` de la V1).
   - Code : demander l'accord pour `react-native-purchases` (V1 : ^10), écrire `features/soutien/api/pourboire.revenuecat.ts` qui implémente `PortPourboire` (`getOfferings` → prix localisés, `purchaseStoreProduct` → `"merci"`, annulation → `"renonce"`), le brancher dans `pourboire.ts`, `prebuild` + `pod install`. Tester en TestFlight / test interne Play (pas sur simulateur sans StoreKit config).
   - Fast Refresh sur l'onglet Offres lève « Changing viewabilityConfigCallbackPairs on the fly » (le hook est réinitialisé) : relancer l'app suffit ; pas un bug en usage normal.

2. **Tester sur le simulateur, contre la production** (non vérifié à l'écran
   dans la session du 2026-10-23, faute de boîte mail pour le code) :
   le fil en mode « toutes les offres » et après une recherche Karria, les
   capsules d'élargissement, le détail (texte de l'annonce, écarter),
   l'import de CV (PDF/DOCX/image), et l'orbe (rendu, fluidité, mode
   clair, Android — baisser `flou` dans `orbe-vivante.tsx` si Android rame).
3. **La feuille de filtres complète** (mots-clés, lieu + rayon / toute la
   France, horaires, télétravail, expérience, salaire, source, facettes)
   : reportée par Marc le 2026-10-23, côté API comme côté app
   (`docs/contrat-api-offres.md` le dit aussi). L'app n'envoie que les
   filtres de la V1.
4. **Le journal d'apprentissage** (`impressions` avec `position`,
   `position`/`dwell_ms` dans l'interaction) : non envoyé tant que la
   production ne l'accepte pas (`extra=forbid` côté API → 422).
5. **Vérifier en mode clair et sur Android** le Profil, les Paramètres et la suppression de compte.
6. **Tests manuels** : connexion Google ou Apple réelle (Marc), parcours CV complet (voix, photo), notification de test sur appareil physique.
7. **Actions d'édition du CV** après sa création, puis l'onglet Dossiers ; « Ce que Karria sait de moi » (`/assistant/memory`) dans les réglages.

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
