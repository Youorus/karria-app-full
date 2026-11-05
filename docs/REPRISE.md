# Reprise — état de `karria_app`

> Document de passation. À lire en premier par toute personne ou IA qui
> reprend le travail, avec `AGENTS.md`. Mis à jour à chaque fin de session.

**Dernière mise à jour : 2026-11-05**

## Session du 2026-11-05 (matin) — le modèle se change à tout moment, sans rien perdre (Fable)

**Demande de Marc** : dans l'onglet CV, le choix du modèle n'était proposé qu'une fois ; il
faut pouvoir passer d'un modèle à l'autre pour voir les différences, sur **tous** les modèles
qu'on possède (son catalogue), sans perdre ce qui est déjà inscrit si le CV a été adapté ; et
être sûr qu'un modèle acheté est bien remis et utilisable tout de suite.

### Ce qui est livré (commit `916fdf3`, `npm run check` vert, 569 tests)

- **La pastille du modèle** (`atelier/components/pastille-modele.tsx`, `testID="pastille-modele"`) :
  une capsule « Meridian · Changer » posée **sur la feuille**, en haut à gauche, **à la même place**
  dans l'atelier d'un dossier, l'atelier libre, la lettre, et sous la carte « Mon CV » de Finaliser
  (là, elle renvoie à l'atelier avec `?cible=modele`). Elle rouvre « Avec quel modèle ? » quand on
  veut ; les possédés (gratuits + achetés) s'appliquent au toucher, les Premium passent par Stripe
  comme avant (`use-choix-modele` inchangé). Le sous-titre de l'en-tête libre devient « À partir de
  ton CV, sans le modifier » (le nom du modèle est dans la pastille).
- **Changer de modèle ne perd rien** (`use-atelier.ts › choisirModele`) : seul le rendu est redemandé ;
  `cvRef`, l'historique annuler/rétablir, la sauvegarde différée et le brouillon ne bougent pas.
  **Prouvé par `hooks/use-atelier.test.tsx`** (retouche → deux changements → CV identique, annuler
  fonctionne, brouillon = CV retouché + dernier modèle, rendu demandé avec le même CV).
- **Dossier** : le choix part aussitôt à **`PUT /applications/{id}/template`**
  (`candidatures.api.ts › changerModeleDuDossier`), le dossier rendu remplace le nôtre (jamais le
  CV local) ; `403 template_locked` remet l'ancien modèle et le dit ; autre panne : le choix reste à
  l'écran et dans le brouillon. « Garder ce modèle » à la première visite envoie aussi le choix au
  dossier. La lettre (`use-lettre.ts`) a le même geste et appelle la même route. `modeleDuDossier`
  (dossier → brouillon → choisi → premier gratuit) suit : Finaliser et la lettre exportent avec le
  modèle courant.
- **`?modele=<id>`** sur `/atelier/libre` et `/atelier/[dossierId]` : le modèle demandé est retenu
  s'il est à la personne (sinon ignoré), la feuille ne se rouvre pas d'elle-même ; pour un dossier,
  il part au serveur. Hook partagé `atelier/hooks/use-atelier-avec-modele.ts`
  (`useOuvrirAtelierAvecModele`) : dossier en cours → son atelier, sinon l'atelier libre.
- **Galerie** : « Utiliser ce modèle » (vert) sur un modèle à soi → l'atelier avec **les données de
  la personne** (jamais l'échantillon) ; « Continuer dans l'atelier » quand un dossier est ouvert :
  le dossier prend ce modèle. « Voir tous les modèles » n'est plus un bouton du pied (le retour suffit).
- **Mes CV** : un rond de plus sur chaque carte, « Voir avec un autre modèle » → atelier libre dans
  le modèle de l'export, feuille ouverte pour comparer.
- **Faux serveur** : `candidatures-simule.ts` sert `PUT /applications/{id}/template` (idempotent,
  `403 template_locked` via `modeles-simule › trouverModele`, `422` sans champ) ; test dans
  `candidatures-simule.test.ts`.

### Vu sur le simulateur iPhone 17 (captures dans

`/private/tmp/claude-501/-Users-marc--PycharmProjects-karria-api/b728036c-016d-4c13-965e-0db7af7cdbe1/scratchpad/modele/`)

Mes CV avec le rond « autre modèle » (`00-mes-cv`) → Nouveau CV → feuille « Avec quel modèle ? »
(`01`) → Garder → pastille « Meridian · Changer » sur la feuille (`02`) → la pastille rouvre la
feuille (`03`) → Marketing : page re-rendue en Marketing derrière la feuille, pastille « Marketing »
(`04`) → Finaliser libre (`07`). Dossier Alan (prêt) : feuille à la première visite (`11`), pastille
(`12`), Marketing appliqué **sans perdre l'intitulé et l'à-propos adaptés** (`13`, `14`), lettre
rendue dans Marketing avec la pastille à la même place (`15`), Finaliser (`16`). **Achat** : détail
Minimalist « Débloquer · 4,99 € » (`20`) → Stripe simulé livré → « ✓ Continuer dans l'atelier »
(`22`) → le dossier rendu dans Minimalist, pastille « Minimalist » (`23`).

### Non vérifié / à savoir

- L'achat d'un Premium **depuis la feuille de l'atelier** (carte sous le pli : Maestro n'a pas fait
  défiler la feuille) — le même code que la galerie (`use-choix-modele`), vérifié là.
- **Pièges Maestro iOS** rencontrés : la hiérarchie d'accessibilité devient vide quand la WebView de
  la feuille est chargée (les `tapOn` par texte échouent : passer par `point:` et des captures
  `simctl`) ; `point:` n'accepte que des entiers ; les captures vont dans
  `~/.maestro/tests/<run>/<flux>/takeScreenshot/` ; le simulateur s'est **figé** une fois (écran
  immobile après un `curl /reload`) — `simctl shutdown/boot` l'a rendu. Les liens profonds
  `karria:///cv/mes-cv`, `karria:///dossiers`, `karria:///modele/<id>`, `karria:///atelier/libre/finaliser`
  évitent les touchers d'onglets.
- **`.env` fait foi sur l'env du shell** pour `EXPO_PUBLIC_API_MODE` (vu : Metro lancé avec
  `simulation` servait `reel` après la modification de `.env`). L'app du simulateur parlait donc à
  la **production** : trois `POST /auth/email/start` réels pour `marc@exemple.fr` et des codes faux
  (aucun compte ouvert). Pour la simulation, j'ai bundlé depuis un worktree avec son propre `.env`
  (Metro 8082, retiré depuis) ; le build **Debug** simulateur de la nuit (`DerivedData/…/Debug-iphonesimulator`)
  est réinstallé sur l'iPhone 17 (le build Release y avait été posé), pointé sur `localhost:8081`.
- Contrat : un export (`GET /cv/me/generated-cvs`) ne porte pas le CV qui l'a produit ; « Voir avec
  un autre modèle » repart du CV courant (brouillon libre plus récent, sinon CV de base). Un
  `cv` embarqué dans l'export permettrait de rouvrir le texte exact.

## Session du 2026-11-05 — Android, premier passage (Fable)

**Question de Marc** : « tout ce que l'on construit est aussi bien adapté pour les apps Android comme il
se doit ? » Karria n'avait **jamais** été lancée sur Android. Réponse courte : **oui pour l'essentiel,
avec quatre défauts corrigés ici et quelques angles morts qu'un émulateur ne peut pas lever** (voir
« Ce qui reste »). Le code partagé tient : edge-to-edge, thème, polices, WebView, navigation, retour
système, Modal imbriqués, clavier — rien n'a planté, aucun écran rouge, aucun onglet vide.

### Outillage posé (hors dépôt)

- SDK Android dans `~/Library/Android/sdk` : image système `system-images;android-36;google_apis;arm64-v8a`
  installée, AVD **`Pixel_8_API_36`** (Android 16, 1080×2400, `hw.keyboard=no`, 4 Go, GPU auto). Le
  démarrer : `~/Library/Android/sdk/emulator/emulator -avd Pixel_8_API_36 -no-snapshot`. Il a **planté
  une fois** (threads QEMU bloqués) après ~40 min, relancé sans séquelle.
- `npx expo prebuild --platform android` (dossier `android/` git-ignoré, rien de natif commité), puis
  `cd android && JAVA_HOME=/opt/homebrew/opt/openjdk ./gradlew :app:assembleDebug
-PreactNativeArchitectures=arm64-v8a` (NDK 27.0 téléchargé par Gradle, ~25 min la première fois ;
  les quatre architectures auraient pris quatre fois plus). APK dans
  `android/app/build/outputs/apk/debug/app-debug.apk`, `adb install -r`, `adb reverse tcp:8081 tcp:8081`.
- Metro : `EXPO_PUBLIC_API_MODE=simulation EXPO_PUBLIC_ADMOB_TEST_MODE=true
EXPO_PUBLIC_SIMULATION_CV=rempli npx expo start --port 8081` (**sans `CI=1`** : en mode CI Metro
  refuse les rechargements). Premier bundle Android ~20-60 s ; l'écran de chargement (le « K » sur fond
  clair) dure autant — normal en debug.
- Maestro marche sur l'émulateur (`maestro test flux/01-connexion.yaml`) mais **`inputText` reste muet**
  avec `hw.keyboard=yes`, et `tapOn` par texte est lent (10-15 s par geste) : la plupart des captures
  ont été prises avec `adb shell input tap/swipe/text` + `adb exec-out screencap`. Les flux
  `/private/tmp/claude-501/-Users-marc--PycharmProjects-karria-api/b728036c-016d-4c13-965e-0db7af7cdbe1/scratchpad/android/flux/*.yaml` restent utiles comme trame.

### Ce qui a été vu et qui marche (captures dans `/private/tmp/claude-501/-Users-marc--PycharmProjects-karria-api/b728036c-016d-4c13-965e-0db7af7cdbe1/scratchpad/android/`)

- **Connexion** (`01-bienvenue`, `02-feuille-connexion`, `03-information-ia`, `05b-code`,
  `06b-apres-code`) : l'accueil, la feuille avec la phrase « En continuant… » et le lien « Karria
  s'appuie sur des modèles d'IA » qui ouvre bien le **Modal imbriqué** « Karria et l'IA » par-dessus la
  feuille (le doute iOS n'existe pas sur Android : deux fenêtres de dialogue distinctes), « Compris »
  referme ; e-mail → code `000000` → onglets. Le clavier Android **ne masque pas** le champ e-mail ni
  les six cases du code (`windowSoftInputMode=adjustResize`, `KeyboardAvoidingView` sans `behavior`).
- **Fil des offres** (`07c-fil`, `11-`, `12-fil-defile`, `68-fil-clair`) en sombre et en clair, aura,
  barre d'onglets flottante au-dessus de la **barre de gestes** (edge-to-edge respecté), orbe Karria.
- **Fiche d'offre** (`13-detail-offre`, `14-detail-offre-defile`) : carte en haut, pied flottant
  « Adapter mon CV à cette offre » posé au-dessus de la barre de gestes, défilement ; **retour système**
  → le fil (`15-retour-systeme-fil`), aucun geste prédictif (désactivé dans `app.json`, confirmé dans
  le manifeste généré : `enableOnBackInvokedCallback="false"`).
- **Onglet CV rempli** (`33-retour-mes-cv`), « Mes CV » avec ses deux cartes, PDF/Word/enveloppe/corbeille
  et « Nouveau CV » en pied (`21-mes-cv`).
- **Atelier libre** (`23-atelier-choix-modele`, `24-atelier-feuille`, `28-atelier-apres-annuler`) : la
  demi-feuille « Avec quel modèle ? » par-dessus la page rendue, la WebView à 826 px tient la largeur
  (feuille blanche, fond du thème autour), toucher « Awa DIALLO » → formulaire Identité, Annuler →
  l'intitulé reste surligné, barre à quatre gestes. **Pincer-zoomer n'a pas pu être exercé** (l'émulateur
  ne simule pas deux doigts par `adb` ; `maestro pinch` non essayé après le plantage).
- **Finaliser** (`29b-finaliser`, `30-finaliser-defile`, `31-finaliser-envoi`, `32-finaliser-envoye`) :
  cadran 83, les trois points, **le défilement fonctionne** (ce qui n'avait pas pu être vu sous Maestro
  iOS), « Mon CV » PDF/Word, « Voir mes CV », feuille d'envoi (`pageSheet` plein écran sur Android),
  « Envoyé à toi@exemple.fr ».
- **Candidatures** (`40-candidatures`, `49-retour-dossiers`), **dossier** (`41b-dossier-corrige`,
  `42-dossier-defile`), **atelier d'un dossier** (`44-atelier-dossier-feuille`, cinq gestes, pastille 2 sur
  Karria), **propositions** (`45-atelier-karria`, accepter → `46-`), **lettre** (`47-lettre`,
  `48-lettre-ecrite`, Karria écrit la lettre en simulation).
- **Modèles** (`50-modeles`) : galerie, puces, pastilles « Premium » et « à toi ». Le **zoom Reanimated
  Android** du détail (`use-ouverture-modele.ts`) est resté **non vu** : l'émulateur a planté sur le
  toucher de la vignette (coïncidence QEMU, pas une trace JS) et je ne l'ai pas rejoué.
- **Profil** (`60-profil`, `61-profil-defile`, `67-profil-clair`) : soutien (sans pub, cafés), « Parler à
  l'équipe » (`62-equipe`, `63-equipe-clavier` : champ, envoi, icônes galerie/photo/micro), **Paramètres**
  (`64-parametres`, `65-parametres-clair`), « Karria et l'IA » en consultation (`66-karria-ia-clair`).
- **Thème** : Sombre ↔ Clair ↔ Système bascule tout, **barre d'état et barre de gestes suivent**
  (`Uniwind.setTheme` → `Appearance.setColorScheme`, le style natif `values-night` fait le reste).
- **Changement d'onglet répété** (8 bascules rapides, `69-`, `70-onglets-repetes-*`) : aucun onglet vide.
  Une capture (`41b` première version) a montré le fil « 15 offres » sans aucune carte **pendant ~3 s
  après un rechargement Metro** — c'est l'entrée en fondu des cartes après rechargement, pas le bug de
  l'iPhone de Marc ; revu plein 5 s plus tard (`90-onglet-vide` → plein).
- **Porte de version obsolète** (`EXPO_PUBLIC_SIMULATION_VERSION=requise`, `80-version-obsolete`) :
  l'écran bloquant, « Mettre à jour » ouvre le **Play Store via Chrome** sur l'émulateur (pas de Play
  Store dans une image `google_apis`), `81-mettre-a-jour`.
- **expo-updates** : manifeste généré correct (`EXPO_UPDATE_URL`, `CODE_SIGNING_*`, `ALWAYS`,
  `runtimeVersion` = `appVersion`). **Notifications** : icône monochrome et couleur `#1877F2` dans le
  manifeste, canaux `offres/documents/compte/defaut` créés. **AdMob** : `APPLICATION_ID` Android et
  `DELAY_APP_MEASUREMENT_INIT` dans le manifeste.

### Ce qui a été corrigé (code partagé, branches `Platform.OS` minimales, tests)

1. **`notifications.ts`** — Android refusait `setNotificationCategoryAsync(famille, [])` (« Must provide
   at least one action ») : un avertissement à chaque démarrage. Les catégories ne servent qu'à iOS
   (`customDismissAction`) ; sur Android les familles **sont** les canaux. `preparerLesFamilles` ne pose
   les catégories que sur iOS. Test `notifications.test.ts` (Android : 4 canaux, 0 catégorie ; iOS : 3
   catégories).
2. **Feuilles `pageSheet` sous la barre d'état** — sur Android `presentationStyle="pageSheet"` n'existe
   pas : le Modal prend tout l'écran, bord à bord, et « Annuler / Enregistrer » passait **sous l'heure**
   (`26-atelier-formulaire` avant, `26b-atelier-formulaire-corrige` après). Nouveau
   `src/lib/feuille-native.ts › BORDS_FEUILLE_NATIVE` (`["top","bottom"]` sur Android, `["bottom"]` sur
   iOS, inchangé) posé sur les cinq feuilles : `feuille-basse` (pleine), `feuille-filtres`,
   `feuille-sans-pub`, `selecteur-mois`, `formulaires-elements`. `feuille-envoi` et `visionneuse-pages`
   géraient déjà le haut.
3. **`PiedAction flottant` sur la barre de gestes** — positionné en absolu, il ignorait le padding bas de
   la `SafeAreaView` de l'écran : « Continuer dans l'atelier » couvrait la barre de gestes Android (et
   l'indicateur d'accueil iOS, mais Marc ne l'avait pas relevé) — `41-dossier` avant, `41b-dossier-corrige`
   après. Le pied lit `useSafeAreaInsets().bottom` lui-même. Test `pied-action.test.tsx`.
4. **Alertes « Mes CV »** — Android coupe un titre d'alerte à deux lignes (« Réessaie dans un ins… »,
   `22-mes-cv-pdf`) ; les deux messages d'erreur sont désormais un titre court + une phrase
   (`TEXTES_MES_CV.reessayer`), comme les autres alertes.

### Ce qui reste (non vérifiable sur émulateur, ou à faire)

- **AdMob / UMP** : sur l'émulateur, UMP répond « no form(s) configured for the input app ID
  `ca-app-pub-…~4848202843` » (**le message de consentement n'est pas publié pour l'app Android dans
  la console AdMob** — à faire avant toute build de prod Android, sinon `REFUS` hors test), puis les
  annonces natives échouent en `internal-error` (ID de test Android absent de `.env`, `EMULATOR` comme
  appareil de test). **Aucune annonce native n'a donc été vue sur Android** : fil, fiche, Mes CV, score.
  À rejouer avec `EXPO_PUBLIC_ADMOB_NATIVE_ANDROID` de test et un appareil réel.
- **Repris de la V1 le 2026-11-05 au matin (coordinateur, commit `5a879fb`)** — Marc a rappelé que la V1
  (`~/Documents/HelloWorkk/karria`) avait tout cela en marche, et c'est vrai : même `com.karria.app`,
  même projet EAS, projet Firebase `karria-notifications-push`. Posé en V2 :
  `config/firebase/google-services.json` et `GoogleService-Info.plist` (fichiers CLIENT, versionnés,
  référencés par `android.googleServicesFile` / `ios.googleServicesFile`) → push Android ;
  `EXPO_PUBLIC_GOOGLE_ANDROID_WEB_CLIENT_ID` (client **web du projet Firebase**, celui qui contient le
  client Android OAuth avec l'empreinte SHA-1 du keystore — `social.ts` l'emploie sur Android, l'API
  l'accepte via `SOCIAL__GOOGLE_ANDROID_WEB_CLIENT_ID`) → Google Sign-In Android ; les trois
  identifiants Google dans les profils EAS `preview`/`production` (le `.env` n'est pas versionné, un
  build EAS ne le voit pas). Le keystore Android de la V1 et son `credentials.json` sont copiés dans
  `~/.karria/android/` (hors dépôt, mode 600) ; son SHA-1 est **celui enregistré dans Firebase**
  (vérifié). Le projet EAS porte des builds Android de la V1 (juin 2026) : les identifiants distants
  (keystore, clé FCM) devraient y être — à confirmer dans expo.dev › Credentials avant le premier
  `eas build --platform android`. Les deux points qui suivent sont donc **réglés sur le papier**, à
  vérifier sur un vrai Android ; reste AdMob (message UMP à publier dans la console pour l'app Android).
- **Notifications push Android (constat avant reprise)** : aucun `google-services.json` (`config/` est vide, `.gitignore` en
  parle, `app.json` n'a pas `android.googleServicesFile`) → `getExpoPushTokenAsync` échouera sur un
  vrai Android (« Default FirebaseApp is not initialized »). Le code le rattrape et avertit, mais
  **aucun Android ne recevra de notification** tant que le fichier Firebase n'est pas posé.
- **Google Sign-In Android** : `webClientId` seul suffit au code, mais il faut un client OAuth **Android**
  (SHA-1 de la clé de signature EAS + `com.karria.app`) dans le projet Google Cloud — non vérifiable
  en simulation.
- **Stripe** : pas de SDK natif, le paiement passe par `openAuthSessionAsync` (Custom Tabs) et le retour
  `karria://paiement/retour` (intent-filter présent dans le manifeste). Non exercé contre Stripe réel.
- **Partage de fichier** (`expo-sharing`) : le téléchargement échoue en simulation (403 sur
  `storage.karria.fr/simule/…`, comme sur iOS) — la feuille de partage Android n'a pas été vue.
- **Pincer-zoomer de la WebView**, **zoom Reanimated du détail d'un modèle**, **dictée** (micro),
  **sélecteur de fichiers** (import CV), **haptique** (aucune dans l'app : pas de `expo-haptics`) : à
  faire au doigt sur un appareil.
- **Maestro sur Android** : à refaire avec `hw.keyboard=no` (fait dans l'AVD) pour `inputText`.
- Le ripple Android n'est pas utilisé (`active:opacity-70` partout) : cohérent iOS/Android, choix assumé.
- Les deux fichiers d'un autre chantier parallèle (`candidatures.api.ts`, `candidatures-simule.test.ts`)
  faisaient échouer `format:check` pendant cette session ; `tsc` et `expo lint` propres, Jest vert.

## Session du 2026-11-05 (nuit) — « Mes CV », l'atelier libre (« Nouveau CV »), la pub dans Mes CV et sous le score (Fable)

**Demande de Marc** : dans l'onglet CV, pas de bouton pour **créer un CV** ; voir ses CV déjà
mis en page (génériques, pas liés à une candidature, avec différents modèles), en créer de
nouveaux ; et « le maximum de pub, au plus d'endroits ». Un autre agent travaillait en parallèle
sur `features/auth/**`, `calme-tactile.ts`, `ecran-detail-offre.tsx`, `consentement-simule.ts` :
rien de tout cela n'a été touché ici (dans `journal-impressions.ts`, seules des valeurs
d'`Emplacement` ont été ajoutées).

### Ce qui est livré

- **L'icône « Mes CV » dans l'en-tête de l'onglet CV** (`cv/screens/ecran-cv.tsx`,
  `BoutonEnTeteRond` à droite, icône `pile` = `doc.on.doc` / `file_copy`, nouvelle entrée du
  catalogue `components/icone.tsx`), visible dans tous les états, y compris `CvRempli`. Une
  icône, pas un badge ni un menu. Invité : la porte `cv` (`cv.mes-cv`), puis reprise.
- **L'écran « Mes CV »** (`app/(app)/cv/mes-cv.tsx` → `atelier/screens/ecran-mes-cv.tsx`,
  hook `atelier/hooks/use-mes-cv.ts`, carte `atelier/components/carte-export-cv.tsx`,
  règles `atelier/services/mes-cv.ts` testées). **Rangé dans `features/atelier`** et non dans
  `cv` : la liste est la sortie de l'atelier (exports, téléchargement, envoi, Finaliser), et
  `atelier` importe déjà `cv` — l'inverse ferait un cycle. Liste de
  `GET /cv/me/generated-cvs?kind=cv` **filtrée côté app sur `dossierId === null`** (voir les
  écarts), du plus récent au plus ancien, relue au focus. Carte : vignette du modèle (depuis
  la galerie `lireModeles`, en cache ; sans galerie, le nom seul), nom du modèle, « Créé hier »,
  toucher = **aperçu** (le PDF dans le navigateur intégré), boutons **PDF / Word**
  (`components/bouton-format.tsx`, extrait de Finaliser), deux ronds **envoyer par e-mail**
  (`FeuilleEnvoi` réutilisée, `POST /documents/exports/{id}/send`, mêmes quotas et mêmes
  messages) et **supprimer** (alerte système, `DELETE /cv/me/generated-cvs/{id}`, carte
  retirée aussitôt, rendue si le serveur refuse). Pied flottant : **« Nouveau CV »**, seule
  action bleue. État vide : deux feuilles, « Ton premier CV mis en page », une phrase.
  Le téléchargement commun est dans `atelier/services/telechargement.ts`
  (`telechargerEtPartager` : `cache/atelier/exports/`, feuille de partage, fichier supprimé) —
  Finaliser l'emploie aussi désormais.
- **L'atelier libre** = « Nouveau CV » (`app/(app)/atelier/libre/{index,finaliser}.tsx`, route
  **statique**, préférée à `[dossierId]` par expo-router ; `EcranAtelier({ libre })`,
  `useAtelier(libre)`). Même feuille temps réel sur le **CV de base** (`/cv/me`), même
  édition par toucher (Modifier, En avant, Intitulé, annuler/rétablir), **sans** Karria (la
  barre a quatre places, `avecKarria={false}`), sans note, sans lettre ; « Finaliser » mène
  droit aux exports. Première étape : **la feuille du modèle** (achat Stripe compris, par
  `use-choix-modele` inchangé), sauf reprise d'un brouillon. **Rien n'écrit sur `/cv/me`** :
  pas de `PUT`, pas de sauvegarde différée (`planifierSauvegarde` et `sauverMaintenant` sont
  des non-opérations en libre) ; les retouches vivent dans le brouillon local
  `CLE_BROUILLON_LIBRE = "libre"` (`brouillon-atelier.ts`), repris seulement s'il est **plus
  récent que `misAJour` du CV de base** (sinon on repart du CV — en simulation, le CV semé est
  daté du démarrage, donc on repart toujours de lui après un relancement : voulu). CV vide →
  `TEXTES.sansCvPhrase` + « Revenir ». « Reporter ces retouches dans mon CV » n'est **pas**
  proposé (c'eût été un geste explicite de plus ; à discuter).
- **Finaliser libre** (`useFinaliser(libre)`, `EcranFinaliser({ libre })`) : un seul export,
  `POST /cv/me/generated-cvs` avec `cv` = brouillon libre (ou le CV de base) et **sans**
  `dossier_id` (`documents.api.ts › exporterCvLibre`) ; cadran ATS, points, « Je corrige »
  (→ `/atelier/libre?cible=` ; « mots-clés » n'a pas de Karria : il mène à l'à-propos),
  PDF/Word, « Envoyer par e-mail » (feuille « Ton CV, en pièce jointe »), pas de « As-tu
  candidaté ? » ; **« Voir mes CV »** sous le document → `router.dismissTo("/cv/mes-cv")`, la
  liste relue au focus montre la nouvelle entrée.
- **Publicité** : `mes_cv` (une carte **après la deuxième** de la liste), `mes_cv_vide` (sous
  l'invitation de l'état vide, au milieu de l'écran, loin du pied), et un emplacement de plus,
  **`finaliser_score`** : une fois les documents là, **sous le score ATS et ses points,
  au-dessus des documents** (les deux modes), en plus de `finaliser` pendant la génération —
  deux objets, deux impressions. Rien pour un invité, rien sans pub. Documenté dans
  `karria_api_v2/docs/atelier-cv-feuille-de-route.md` § 7 (commit `8024744`, poussé).
- **API `documents`** (`atelier/api/documents.api.ts`) : `exporterCvLibre`, `lireMesExports`,
  `effacerExport`, `envoyerExport` ; `Export.dossierId` ; `versScoreAts` tolère un `ats` absent
  (un export de dossier d'avance du faux serveur n'en a pas — le vrai serveur l'envoie
  toujours).
- **Faux serveur** : `atelier-simule.ts` tient désormais **tout** `/cv/me/generated-cvs`
  (`GET` liste fusionnée avec les exports des dossiers via
  `candidatures-simule › exportsSimulesDesDossiers`, `GET`/`DELETE /{id}`, `POST` qui prend le
  **CV de base** `cvSimule()` sans `cv`, `409 cv_missing` sinon), `POST /documents/exports/{id}/send`,
  et **sème deux CV libres** (Minimalist il y a 9 jours, Meridian il y a 2 jours) pour que
  « Mes CV » ait une liste et son annonce. `candidatures-simule.ts` ne sert plus le `GET` (ses
  tests passent par `repondreAtelier`). **`EXPO_PUBLIC_SIMULATION_CV=rempli`** (`cv-simule.ts`)
  pose au démarrage le CV que l'import aurait lu : l'onglet CV est rempli sans sélecteur de
  fichiers — indispensable pour Maestro.

### Vu sur le simulateur iPhone 17 (Maestro, `EXPO_PUBLIC_API_MODE=simulation EXPO_PUBLIC_SIMULATION_CV=rempli`)

Onglet CV rempli (Awa DIALLO) avec l'icône « Mes CV » à droite de l'en-tête → « Mes CV »,
« 2 CV mis en page », cartes Meridian (« Créé le 3 nov. ») et Minimalist avec vignettes, PDF /
Word / enveloppe / corbeille, **annonce native après la deuxième carte** (impression
« mes_cv » journalisée), « Nouveau CV » en pied → atelier libre : « Nouveau CV / Meridian »,
feuille « Avec quel modèle ? » par-dessus la page rendue → « Garder ce modèle » → barre à
**quatre** gestes (Modifier · En avant · Intitulé · Finaliser) ; toucher « Awa DIALLO » sur la
feuille → formulaire Identité → « Annuler » referme, l'intitulé reste surligné → Finaliser :
cadran 83/100, trois points, « Envoyer par e-mail » → « À mon adresse toi@exemple.fr » →
envoyé → retour à l'atelier. L'export libre apparaît ensuite dans la liste (sous-titre
« 3 CV mis en page » attendu par le flux ; vu à l'écran : la liste relue après Finaliser).

### Non vérifié / à savoir

- **Le défilement de l'écran Finaliser sous Maestro** : les balayages (`swipe`, `scroll`,
  lents ou rapides) n'ont fait défiler **ni** le Finaliser libre **ni** celui d'un dossier,
  avec ou sans l'annonce `finaliser_score` (essayé désactivée) — donc le bas de l'écran (carte
  « Mon CV », « Voir mes CV », l'annonce sous le score) n'a été vu que par la hiérarchie
  d'accessibilité, pas en capture. Les taps y répondent. **À faire au doigt** : si ça ne défile
  pas non plus, c'est la `ScrollView` de `ecran-finaliser.tsx` (pré-existante) à regarder.
- Maestro a « touché » une fois l'intitulé sur la page **à travers** la demi-feuille de
  l'intitulé ouverte, ce qui a ouvert le formulaire Identité par-dessus et laissé une feuille
  pleine qui ne se fermait plus — un doigt réel tombe sur le voile de la demi-feuille, pas
  sur la WebView ; non reproduit ensuite (Identité → Annuler referme bien, en libre comme en
  dossier). À garder en tête si « une feuille ne se ferme plus » revient.
- « Ouvrir » (aperçu dans le navigateur) et PDF/Word en simulation : les URL
  `storage.karria.fr/simule/…` ne répondent pas — à essayer contre la production.
- Le retour Stripe réel depuis l'atelier libre (même code que l'atelier d'un dossier), Android,
  les textes à relire par Marc.
- `npm run check` vert (**559** tests), `npx expo export --platform ios` produit un paquet.

### Écarts de contrat

- `GET /cv/me/generated-cvs` n'a **pas de filtre « sans dossier »** (`dossier_id` donné
  seulement) : « Mes CV » filtre côté app (`exportsLibres`). Un `?dossier_id=null` (ou
  `?orphan=true`) côté API éviterait de lire tous les exports des dossiers.
- Un export ne porte pas le nom de la personne : « Mes CV » lit `/cv/me` pour nommer le
  fichier téléchargé « CV - Prénom Nom.pdf » comme le serveur le fait.

## Session du 2026-11-05 (soir) — Le consentement IA « en continuant », et la pub de la fiche d'offre au-dessus du pli (Fable)

**Demande de Marc** : (1) faire accepter l'IA à l'inscription, naturellement, plutôt que par la
feuille au moment du geste qui fait renoncer ; (2) « ai-je la garantie qu'une pub native est
comptée à chaque ouverture d'une offre ? » API en face : `karria_api_v2` ADR-0025 § 2026-11-05,
`GET /auth/ai-disclosure` + `ai_disclosure_version` **en production**.

### Chantier 1 — `src/features/auth`

- **La phrase** de `feuille-connexion.tsx` : « En continuant, tu acceptes nos Conditions
  Générales, notre Politique de Confidentialité, et que _Karria s'appuie sur des modèles d'IA_
  pour t'aider » — le troisième lien ouvre **`feuille-information-ia.tsx`** (titre « Karria et
  l'IA » : ce qui part, chez qui, pourquoi, les deux promesses, lien politique, « Compris »,
  aucun bouton d'accord). Un `Modal` **imbriqué** dans celui de la connexion (sur iOS un second
  `Modal` frère n'est pas fiable) — **à vérifier sur l'iPhone de Marc**, non vu sur simulateur.
- **`hooks/use-information-ia.ts`** : charge `GET /auth/ai-disclosure` (public, sans jeton) dès
  que la feuille de connexion s'ouvre ; store `disclosureIa` / `poserDisclosureIa` /
  `versionDisclosureAffichee` dans `services/consentement-ia.ts` (tenu à jour aussi par
  `/auth/me` ; survit à la déconnexion).
- **`api/auth.api.ts`** joint `ai_disclosure_version` = la version chargée aux trois requêtes
  de connexion, ou rien si elle n'est pas encore là (le serveur ne consigne alors rien, la
  feuille demandera : le filet). `use-action-ia.ts` et la feuille connectée sont inchangés ;
  Paramètres → « Karria et l'IA » garde consultation et retrait.
- **Risque Apple 5.1.2 (i)** noté en tête de `feuille-connexion.tsx` : retour arrière = ne plus
  envoyer `ai_disclosure_version`, le chemin explicite est intact.
- Faux serveur : `GET /auth/ai-disclosure`, version portée par le parcours puis consignée à
  `verify`, jamais après un retrait (`consentement-simule.ts`, `serveur-simule.ts`). Contrat
  `docs/contrat-api-consentement-ia.md` à jour.

### Chantier 2 — `src/features/publicite`, `offres/screens/ecran-detail-offre.tsx`

- La `CarteAnnonce` de la fiche passe **entre les étiquettes et la description** (jamais
  au-dessus de « Adapter mon CV », qui est dans le pied flottant) ; elle arrive en fondu et la
  description glisse (`LinearTransition`).
- `calme-tactile.ts` : `delaiAvantCalme(maintenant, calmeMs)` ; **`noterFinDeToucher`** (la
  racine `app/_layout.tsx` note `onTouchEnd`/`onTouchCancel`) : un doigt posé n'est jamais
  calme, garde-fou `DOIGT_OUBLIE_MS` 10 s. `use-annonce-emplacement.ts` :
  `CALME_PAR_EMPLACEMENT = { detail_offre: 700 }`, et en tête **la réponse à la question de
  Marc** (pas de garantie ; ce qui conditionne vraiment une impression).
- Journal : une impression par objet, l'objet détruit à la fermeture (inchangé, vérifié).

**Vérifié** : jest sur `auth`, `publicite`, `lib/dev/serveur-simule` (84 tests), `tsc` et
`expo lint` propres sur mes fichiers, `npx expo export --platform ios` produit un paquet.
**Pas vérifié** : `npm run check` entier (l'arbre de travail portait le chantier atelier d'un
autre agent, `cv-simule.ts` / `atelier-simule.test.ts` en cours), le rendu sur appareil.

## Session du 2026-11-05 (nuit) — L'atelier CV : feuille temps réel, Karria qui propose, lettre, Finaliser (Fable)

**Plan de Marc** : `karria_api_v2/docs/atelier-cv-feuille-de-route.md` (§ 1 à 5 et 7), contrats
`contrat-api-documents.md` (recopié dans `docs/`) et `contrat-api-candidatures.md`. Commits `346807c`
(socle), `e5e4237` (brouillons effacés à la déconnexion, revue sécurité), `4f9f5a7` (feuille, entrée,
modèle, atelier), `2c04ce9` (lettre, Finaliser), `4940e07` (relais galerie → atelier, routes typées),
`aeebdd6` (finitions vues sur simulateur : Annuler dans la feuille pleine, En avant dans la barre, Finaliser
passe par la lettre, modèle retenu, accord IA depuis la lettre). `npm run check` vert (543 tests), `npx expo export --platform ios` produit un paquet. Paquets ajoutés
(SDK 57) : `react-native-webview`, `expo-file-system`, `expo-sharing`.

### Ce qui est livré — `src/features/atelier`, routes `app/(app)/atelier/[dossierId]/{index,lettre,finaliser}`

- **La feuille temps réel** (`components/feuille-cv.tsx`) : une WebView **unique, jamais rechargée**.
  Le premier HTML part en `source` ; chaque rendu suivant est injecté (`__karria.remplacer` : corps et
  styles remplacés, scripts de la page rejoués pour `window.karriaFit`, défilement conservé, polices
  déjà chargées). Choix fait **contre** la double WebView en fondu : une seule page en mémoire, rien à
  synchroniser (`services/script-feuille.ts`, en-tête). Le `viewport` est déclaré à 826 px : la page
  A4 tient dans la largeur, et **pincer-zoomer est celui du système** (×4). Fond du mode courant
  autour, feuille blanche avec ombre, filet pointillé des coupures posé par la page. Toucher un
  élément → `postMessage({ type: "toucher", chemin })`. La poignée (`patcher`, `choisir`) passe par la
  prop `onPoignee`, pas par `ref` : le compilateur React (activé) traite tout ce qui passe par `ref`
  comme une référence lue au rendu, et contaminait l'objet rendu par le hook.
- **Le hook central** (`hooks/use-atelier.ts`) : trois horloges — patch local **immédiat**
  (`services/chemins.ts › differences` : tous les textes du CV par `data-chemin`, virtuels compris,
  avant/après → seuls les changés), **rendu au repos 400 ms** (`services/file-de-rendu.ts` : un vol à
  la fois, la dernière demande gagne, un résultat périmé est jeté — testé avec minuteries factices),
  **`PUT /applications/{id}/cv` à 1,5 s** (la couverture relue dans le dossier rendu ; le CV local
  garde la main, un PUT ne l'écrase jamais). Annuler/rétablir (`services/historique.ts`, 50 états),
  brouillon local (`services/brouillon-atelier.ts`, **`Paths.cache`**, un JSON par dossier, repris
  seulement s'il est plus récent que `modifieLe` du serveur ; **effacé à la déconnexion et à la
  suppression du compte** depuis `use-session.tsx`), relecture 2 s pendant `adaptation: en_cours`,
  `echouee` → « Réessayer » (`POST /adapt`, consentement IA) ou « Continuer à la main ».
- **Les cinq gestes** (`components/barre-atelier.tsx`, capsule de verre du pied flottant ; seul
  « Finaliser » est bleu) : **Modifier** (toucher un élément → `FeuilleModifier` pleine avec **le
  formulaire existant** de `cv/components/edition`, validations et suggestions comprises, recréée par
  `key` à chaque cible ; sans élément touché : la liste des sections) ; **Karria** (`FeuilleKarria`,
  demi-feuille : la page reste visible ; propositions avant/après/raison, accepter · refuser ·
  revenir, « Tout accepter » ; couverture des mots-clés en pastilles présents/manquants) ; **Mise en
  avant** (`FeuilleMiseEnAvant` : monter/descendre, masquer/montrer — **l'ordre des rubriques n'est
  pas dans le contrat** (c'est le modèle), la feuille le dit ; masquer = retirer de la copie,
  montrer = reprendre du **CV de base** à sa place, `services/mise-en-avant.ts`) ; **Intitulé**
  (`FeuilleIntitule`, suggestions `kind=title`, aperçu à la frappe, enregistrement au bouton) ;
  **Finaliser**. La **note discrète** « Karria a mis à jour ton à-propos — voir · revenir »
  (`note-karria.tsx`) pour les propositions `acceptee` d'office (intitulé, à-propos), fermable pour la
  session.
- **L'entrée** : fiche d'offre (`offres/screens/ecran-detail-offre.tsx`) → **« Adapter mon CV à cette
  offre »** devient l'action principale (l'annonce d'origine passe en contour). Hook
  `atelier/hooks/use-entree-atelier.ts` composé dans `use-detail-offre` : porte « dossiers » + reprise,
  consentement IA « application », `POST /applications` avec le modèle choisi de la personne (201 ou
  200 si existant), `409 cv_missing` → alerte vers l'onglet CV. **Première étape dans l'atelier : le
  modèle** (`FeuilleModele`, demi-feuille) — le modèle actuel, les miens, les autres (Premium, prix
  serveur, pastille or) ; toucher un modèle possédé **redessine la page derrière** (c'est l'aperçu avec
  ses données) ; un Premium ouvre Stripe (`ouvrirAchatModele` + `openAuthSessionAsync` + relecture
  jusqu'à livré, `hooks/use-choix-modele.ts`) puis s'applique **sans quitter l'atelier**. Le modèle
  appliqué est aussi retenu par `PUT /user-templates/me/selected`. Depuis la galerie, un modèle à soi
  propose « Continuer dans l'atelier » si un dossier y est ouvert (`services/dossier-en-cours.ts`).
- **La lettre** (`screens/ecran-lettre.tsx`, `hooks/use-lettre.ts`) : « Et ta lettre ? » → ébauche
  (`POST /{id}/letter`), même feuille avec `{ letter }` (`services/lettre.ts › documentDeLettre` :
  entreprise + logo s'il est sur `storage.karria.fr`, expéditeur du CV adapté), toucher un paragraphe
  → `FeuilleParagraphe` : à la main (aperçu à la frappe) ou **« Karria réécrit »** avec consigne
  (`regenerate`), puis garder l'ancien / le nouveau ; `PUT /letter` différé ; avertissements du rendu
  → conseils (`presentation.ts › conseilsDe`), le premier sous le bouton « Continuer ».
- **Finaliser** (`screens/ecran-finaliser.tsx`, `hooks/use-finaliser.ts`) : **deux exports distincts**
  (`POST /cv/me/generated-cvs` avec `cv` du dossier + `template_id` + `dossier_id` ;
  `POST /documents/letters/export`), attente immersive avec annonce (`emplacement finaliser`),
  **cadran ATS** (`cadran-ats.tsx`, arc SVG) + phrase **sans chiffre** par niveau, points à améliorer
  (trois, les plus payants) avec « Je corrige » → retour dans l'atelier sur l'élément (`?cible=`) ou
  « Optimiser pour les logiciels de tri » (`ats_safe`) ; **Télécharger** PDF/Word (fichier dans le
  `cache/atelier/exports/` sous un nom lisible, puis `Sharing.shareAsync`, **puis supprimé** ; le répertoire
  est purgé avec la session) ; **Envoyer par e-mail** (`FeuilleEnvoi` : à
  mon adresse pré-remplie via `lireMoi`, ou une autre validée ; `POST /documents/exports/send` avec les
  deux ids ; `429 send_quota_exceeded` par `scope` en français) ; puis la **feuille « As-tu
  candidaté ? »** du domaine Candidatures.
- **Faux serveur** `lib/dev/atelier-simule.ts` (`EXPO_PUBLIC_API_MODE=simulation`) : HTML ancré
  réaliste (deux mises en page selon le modèle, `data-chemin` virtuels, `karriaFit`, filets), `403
template_not_owned` tant que le faux paiement n'a pas livré, exports avec score ATS par règles,
  envoi avec quotas, modèle choisi. Routé **avant** les dossiers dans `serveur-simule.ts` (le `POST`
  des exports est à lui, le `GET` reste aux dossiers — leurs exports ne se voient donc pas dans la
  liste du faux serveur des dossiers : à fusionner un jour, sans importance en réel).
- **Publicité** : emplacements `atelier_attente` (pendant l'adaptation) et `finaliser` (pendant la
  génération) — jamais sur la feuille, jamais au-dessus d'un bouton principal.

### Ce qu'il faut savoir du contrat (constaté en construisant)

- `template_id` d'un dossier n'est posé qu'à la création (`POST /applications`) : **aucune route ne
  le change ensuite**. Le modèle réellement employé suit une seule règle (`services/modele.ts`) :
  dossier → brouillon local → modèle choisi de la personne → premier modèle gratuit. Une route
  `PATCH /applications/{id}` (`template_id`) côté API rendrait la `DossierCard` juste.
- L'ordre des **rubriques** n'existe pas dans le CV du contrat ; l'ordre des **éléments** si.
- Le rendu charge polices et photo depuis `storage.karria.fr` : la WebView pose `baseUrl` sur cette
  origine pour ne pas dépendre d'en-têtes CORS. **À vérifier contre la production.**

### Vu sur le simulateur iPhone 17 (Maestro, `EXPO_PUBLIC_API_MODE=simulation`)

Candidatures → dossier Alan → « Continuer dans l'atelier » → feuille « Avec quel modèle ? » par-dessus
la page rendue (Meridian, deux colonnes) → « Garder ce modèle » → atelier : note « Karria a mis à jour
ton intitulé et ton à-propos — voir · revenir », barre à cinq gestes. Toucher « Tenir la caisse » sur
la feuille → « Expérience chez Zara » avec la proposition de Karria (avant/après/raison) **et** le
formulaire existant ; « Vendeuse » + « senior » → Enregistrer → la feuille montre « Vendeuse senior
chez Zara », l'élément touché est surligné, « Enregistré » en tête. Karria (deux propositions
appliquées, « Revenir »), En avant (monter/descendre/masquer), Intitulé (aperçu à la frappe,
« Annuler » / « Enregistrer »). Finaliser → lettre rendue (expéditeur, entreprise, date, objet,
signature) → toucher un paragraphe → « Karria réécrit » → **feuille de consentement IA** (fermée
d'abord : une feuille globale ne monte pas par-dessus une feuille native, corrigé) → « Karria a
réécrit », avant/après, « Garder le nouveau » → Continuer → Finaliser : cadran 82/100 (ambre), phrase,
« Ce qui ferait la différence », cartes CV/lettre avec PDF/Word → « Envoyer par e-mail » → « À mon
adresse toi@exemple.fr » → « Envoyer à toi@exemple.fr » → **« As-tu candidaté à cette offre ? »** →
« Pas encore ». Captures dans le rapport de session.

Deux corrections faites en voyant : la feuille pleine a « Annuler » à gauche (la croix était cachée
par « Enregistrer ») ; le mot de la barre est « En avant » (« Mise en avant » se tronquait).

### Non vérifié / reste

- **La WebView réelle avec le HTML de production** (polices, photo signée, `karriaFit`, zoom, rejeu
  des scripts à chaque remplacement) : seule la simulation a été exercée.
- L'entrée depuis la fiche d'offre (« Adapter mon CV à cette offre ») n'a pas été exercée à l'écran :
  en simulation le CV de base n'existe pas sans import (`409 cv_missing` → alerte vers l'onglet CV,
  voulu). Le code est le même que « Continuer dans l'atelier » une fois le dossier ouvert.
- Metro en développement : le surveillant de fichiers n'a pas relevé les modifications pendant la
  session (Fast Refresh muet, trois redémarrages avec `--clear`) — à garder en tête si « rien ne
  change » à l'écran.
- Le retour Stripe réel depuis l'atelier (comme pour le soutien), Android (zoom `setBuiltInZoomControls`,
  feuilles), tablette/paysage (phase 7), les textes à relire par Marc.
- Les exports `pdf_url` du faux serveur ne répondent pas : « Télécharger » échoue en simulation
  (voulu : rien n'est écrit) — à essayer contre la production.

## Session du 2026-11-05 (soir) — Espace Candidatures : client API des dossiers, onglet, détail, feuille « As-tu candidaté ? » (Fable)

**Demande de Marc** : l'onglet Candidatures (`(onglets)/dossiers.tsx`, jusqu'ici « à venir ») devient
l'espace de suivi des dossiers de candidature (une offre figée + le CV adapté + la lettre, générés à
une date ; savoir si l'on a candidaté, et quand). API : `karria_api_v2` module `applications`
(ADR-0033, **en production** sur `/api/v1/applications`). Contrat recopié dans
`docs/contrat-api-candidatures.md`. **Un autre agent travaille en parallèle sur l'atelier**
(`src/features/atelier/**`, `/atelier/[dossierId]`, « Adapter mon CV » dans la fiche d'offre) : rien
de la fiche d'offre ni des modèles n'a été touché ici. `app.json` / `package.json` modifiés dans le
dépôt (expo-sharing, webview, file-system) **ne sont pas de cette session** — pas commités.

**Livré (`src/features/candidatures/`)** :

- **Client API complet** (`api/candidatures.api.ts`, types `types/candidatures.types.ts`, conversions
  testées) : `ouvrirDossier`, `lireDossiers(candidatees)`, `lireDossier`, `supprimerDossier`,
  `relancerAdaptation`, `modifierCvDuDossier` (Cv → brut par `versCvBrut`), `deciderProposition`,
  `ebaucherLettre`, `modifierLettre`, `regenererParagraphe`, `marquerCandidate`, `retirerCandidate`,
  `lireExportsDuDossier` (`GET /cv/me/generated-cvs?dossier_id=`). Le CV d'un dossier est traduit par
  `versCv` du domaine `cv` (exporté, paramètre élargi : pas d'`id` ni d'`image_url`). Les erreurs du
  contrat (`proposition_invalid`, `dossier_conflict`, `cv_invalid`/`letter_invalid` + `fields`,
  `ai_rate_limited`…) arrivent telles quelles dans `ErreurApi.raison`/`details` — listées dans
  l'en-tête du fichier pour l'atelier. **Les routes d'IA (créer, relancer, ébaucher, réécrire) sont à
  envelopper avec `useActionIa` par l'appelant** (usage `application`).
- **Faux serveur** `lib/dev/candidatures-simule.ts` (testé, 15 cas) : trois dossiers d'avance (un
  candidaté avec deux exports, un prêt avec lettre, un en cours qui passe `faite` **à la relecture**
  après 6 s — `DELAI_ADAPTATION_MS`), propositions fabriquées par règles (intitulé et à-propos
  appliqués d'office, mission et compétences `proposee`), lettre à quatre paragraphes typés,
  validations `cv_invalid`/`letter_invalid` avec `fields`, `proposition_path_invalid`, porte IA, et
  « j'ai candidaté » qui marque l'offre `applied` dans `offres-simule` (`marquerPostuleeSimulee`).
  `POST /applications` copie le vrai CV de `cv-simule` (`cvSimule()`), `409 cv_missing` sinon.
  Branché dans `serveur-simule.ts` **avant** le CV (il tient `/cv/me/generated-cvs`) ;
  `/applications` ajouté à `SERVI_PAR_LA_V2`. `application` ajouté aux `purposes` simulés.
- **Onglet Candidatures** (`screens/ecran-candidatures.tsx`, `hooks/use-dossiers.ts`, testé) : liste
  des pochettes (`components/carte-dossier.tsx` : tuile d'entreprise, titre, les deux feuilles
  dessinées `feuilles-documents.tsx` — la lettre en pointillé si absente —, ville, « Généré hier »,
  état en une phrase avec un point `point-etat.tsx` : « Karria adapte ton CV… » (point qui respire),
  « N propositions à relire », « Prêt à envoyer », « Candidaté le 3 nov. »), segments « Toutes /
  Candidatées » avec effectifs (filtre local, une seule lecture), tri par date de génération, relecture
  au focus, tirer pour actualiser, **glisser pour supprimer** (`ReanimatedSwipeable`, confirmation
  par alerte, carte rendue si le serveur refuse), état vide invitant, invité → porte `dossiers`,
  **annonce native après la 3e carte** (`useAnnonceEmplacement("candidatures")`, emplacement ajouté à
  `journal-impressions`, rien sans pub), retour discret sous l'en-tête (`services/retour-discret.ts`).
- **Détail** (`/candidatures/[id]`, `screens/ecran-dossier.tsx`, `hooks/use-dossier.ts`) : titre,
  état, offre figée compacte (`carte-offre-figee.tsx` ; « Voir l'offre » si elle est encore dans
  l'index — vérifié par `lireOffre`, 404 ⇒ « Voir la source » + « Cette offre n'est plus en ligne »),
  deux vignettes avec un vrai aperçu du contenu (`vignette-document.tsx`, `apercuDuCv` /
  `apercuDeLaLettre`) qui ouvrent la **lecture** (`/candidatures/[id]/lecture?document=cv|lettre`,
  `ecran-lecture-dossier.tsx` : CV section par section, lettre paragraphe par paragraphe, signature
  du CV), fichiers exportés du dossier (PDF/Word, ouverts dans le navigateur), « J'ai candidaté » /
  « Finalement non » avec la date longue et une phrase de confirmation, bouton bleu flottant
  « Continuer dans l'atelier » → `/atelier/[dossierId]` (chemin écrit, `as Chemin` : la route est à
  l'atelier), « Supprimer ce dossier » discret en bas. Relecture toutes les 2 s tant que
  `adaptation = en_cours`.
- **Feuille « As-tu candidaté à cette offre ? »** : `components/feuille-candidature.tsx`, export
  nommé `FeuilleCandidature({ visible, dossierId, onFermer, onMarque? })`, hook
  `use-feuille-candidature.ts`. « Oui, c'est fait » marque le dossier, pose « C'est noté. Bonne
  chance ! » dans le retour discret et `router.navigate("/dossiers")` ; « Pas encore » referme sans
  déplacer. À appeler par l'atelier après un export/envoi.
- **Consentement IA** : usage `application` ajouté à `UsageIa` et `TEXTES_IA` (« Adapter ton CV et
  écrire ta lettre pour une offre » ; envoi : « ton CV et l'offre, pour les rapprocher »).
- Routes déclarées dans `(app)/_layout.tsx` (`candidatures/[id]/index`, `candidatures/[id]/lecture`,
  fondu depuis le bas comme un détail d'offre).

`npm run check` vert (507 tests), `npx expo export --platform ios` produit un paquet. **Rien n'a été
lancé sur simulateur ni appareil** : la liste, le glissement, la feuille, le pied flottant et les
vignettes ne sont vérifiés que par les tests et l'empaquetage. **À regarder à l'écran** : la hauteur
des vignettes (`aspect-[0.78]`), le glissement sous une carte animée (Swipeable + FadeInDown), le
voile de la feuille sur Android, « Voir l'offre » quand `lireOffre` répond autre chose qu'un 404 (on
suppose alors que l'offre existe). **Reste** : la route `/atelier/[dossierId]` (agent atelier),
l'appel de `FeuilleCandidature` depuis l'atelier, un essai sur iPhone contre la production.

## Session du 2026-11-05 — Mises à jour toutes seules (EAS Update), porte de version, publicité native élargie (Fable)

**Trois livrables de Marc**, commits `fe595f1` (version), `63932d1` (EAS Update), `f81edaf`
(store_url validée), `24c5db8` (signature des mises à jour), `a0ed391` (publicité). `npm run check`
vert (471 tests), `npx expo export --platform ios` produit un paquet, `npx expo prebuild --platform
ios --no-install` passe (`ios/` reste ignoré). **Rien n'a été lancé sur appareil ni simulateur** :
tout ce qui suit est vérifié par les tests et l'empaquetage, pas à l'écran.

### 1. Mises à jour « toutes seules » — EAS Update (`feat(mises-a-jour)`)

- `expo-updates` + `expo-application` installés. `app.json` : `runtimeVersion: { policy: "appVersion" }`,
  `updates.url` EAS (projet `f16b05cf-…`), `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`,
  **signature** (`codeSigningCertificate: ./certs/certificate.pem`, `codeSigningMetadata`
  `{ keyid: main, alg: rsa-v1_5-sha256 }`). `eas.json` : canaux `development` / `preview` /
  `production` (un par profil). Fait avec `eas update:configure` (la CLI avait réécrit tout
  `app.json` avec la config résolue ; seules les deux clés utiles ont été gardées).
- **Pourquoi `appVersion` et pas `fingerprint`** : avec `fingerprint`, le runtime est une empreinte
  des modules natifs calculée **sur la machine qui publie** ; si le `node_modules` local diffère de
  celui d'EAS Build (fréquent en solo, après un `npm install` partiel), `eas update` publie vers un
  runtime qu'aucune build n'a — en silence. Avec `appVersion`, le runtime est `0.1.0`, lisible, et
  la règle tient en une ligne : **tout changement natif (nouveau module avec du natif, plugin dans
  `app.json`, montée de SDK) ⇒ bumper `version` dans `app.json` puis `eas build`**. Une mise à jour
  OTA ne touche alors jamais une build qui n'a pas le natif qu'il lui faut. À reconsidérer le jour
  où plusieurs personnes publient.
- `features/demarrage/hooks/use-mise-a-jour.ts` (testé, `expo-updates` moqué) : le natif vérifie
  et télécharge au lancement, la mise à jour s'applique **au prochain lancement** ; revérification
  au retour au premier plan après 6 h ; si une mise à jour est téléchargée et que l'app reste
  ouverte **20 min**, bande discrète « Une amélioration est prête — Relancer »
  (`components/bande-demarrage.tsx`, en haut, fermable pour la session). Jamais de rechargement
  forcé.
- **Clé privée** : `keys/private-key.pem` a été générée sur ce poste puis **déplacée le 2026-11-05 vers `~/.karria/eas-update-private-key.pem`** (mode 600, hors dépôt ; à sauvegarder ailleurs par Marc)
  (`npx expo-updates codesigning:generate …`), `keys/` est ignoré par git. **Elle n'existe nulle
  part ailleurs** : à ranger tout de suite (trousseau, gestionnaire de mots de passe). Perdue =
  impossible de publier une mise à jour pour les builds qui embarquent ce certificat (il faudrait
  régénérer la paire et rebuilder). Le certificat public `certs/certificate.pem` est versionné et
  embarqué dans chaque build (vérifié dans `ios/Karria/Supporting/Expo.plist`).

**Gestes qui restent à Marc (EAS) — rien n'a été publié :**

1. Fait : la clé est dans `~/.karria/eas-update-private-key.pem` ; en garder une copie sûre (gestionnaire de mots de passe).
2. `npx eas-cli@latest whoami` (le poste est connecté en `marc29`), sinon `eas login`.
3. **Une nouvelle build est indispensable** : une mise à jour OTA ne s'applique qu'aux builds qui
   contiennent `expo-updates` (et ce certificat). `npx eas-cli@latest build --platform ios --profile
production` (puis Android), et soumettre aux magasins. Les builds d'avant ce commit ne recevront
   jamais rien.
4. Ensuite, à chaque changement JS/assets sans natif :
   `npx eas-cli@latest update --channel production --message "<ce qui change>" --private-key-path
keys/private-key.pem --environment production` (vérifier `--environment` : exigé depuis le SDK 55 ;
   `npx eas-cli@latest update --help` fait foi). Pour tester avant : `--channel preview` sur une build
   `preview`.
5. Vérification manuelle : fermer complètement l'app, la rouvrir (téléchargement), la refermer, la
   rouvrir (application) — **jusqu'à deux lancements à froid**. Santé : `eas-update-insights`.
6. Changement natif ⇒ bumper `version` dans `app.json` **avant** `eas build` (voir ci-dessus).

### 2. Porte de version — `GET /app/release` (`feat(version)`, `fix(version)`)

- Contrat `docs/contrat-api-version.md`, faux serveur `lib/dev/version-simule.ts` (`ok` par défaut ;
  `EXPO_PUBLIC_SIMULATION_VERSION=requise|disponible` pour exercer l'écran et la bande). La route est
  **en cours de livraison côté API** (autre agent) ; `/app/` est déclaré servi par la v2 : tant
  qu'elle répond 404, l'app ne fait rien (voulu).
- `features/demarrage` : `services/version.ts` (règles pures : build entier sinon rien, 6 h,
  bande ≤ 1/jour, `requise` sans magasin ⇒ `disponible`, **`urlDeMagasin`** : https + hôte exact
  `apps.apple.com` / `play.google.com`, sinon `null`), `api/version.api.ts`,
  `services/etat-version.ts` (store), `hooks/use-porte-de-version.ts` (lancement + retour au premier
  plan après 6 h, `expo-application › nativeBuildVersion`), `screens/ecran-version-obsolete.tsx`
  (orbe, « Une nouvelle version de Karria t'attend », un seul bouton « Mettre à jour »), montés à la
  racine (`app/_layout.tsx`) — l'écran bloquant remplace toute la navigation. `disponible` : bande au
  lancement (≤ 1/jour, date dans `lib/magasin-local.ts`) + badge « Nouvelle version » dans l'en-tête
  du Profil (`BadgeEnTete.onPress`, nouveau). Tests : règles, hook, écran, bande, faux serveur.
- **À vérifier sur iPhone** : le `CFBundleVersion` d'une build EAS est bien un entier (sinon la
  porte se tait, par construction).

### 3. Publicité native : plus d'impressions, sans oppression (`feat(publicite)`)

- **Audit de l'existant** : fil des offres (une toutes les 7 offres, plafond 8, jamais en tête,
  réserve préchargée) et détail d'une offre (sous le descriptif ; il n'y a pas d'« offres
  similaires » dans l'app, donc rien à placer avant). Les deux conservés.
- **Nouveaux emplacements** (`hooks/use-annonce-emplacement.ts`, un objet par emplacement, chargé
  en arrière-plan, détruit en partant, rien sans pub) : **galerie des modèles** (une carte au format
  modèle après la 3e, `components/carte-annonce-modele.tsx`, `regles-publicite › insererApres`) ;
  **CV** (sous la dernière section de `cv-rempli`) ; **attente d'import** (pendant « Je lis ton
  CV… » seulement, sous la phrase ; retirée dès les notes). **Pas d'écran de notifications en liste**
  dans l'app (seulement l'écran qui propose de les activer, avec un bouton principal) : aucun
  emplacement ajouté là, à reprendre si une liste naît.
- **Règles** : un seul emplacement par écran ; jamais au-dessus d'un bouton principal ; **jamais dans
  les 2 s suivant un toucher** (`services/calme-tactile.ts` : la racine note chaque toucher, le fil
  comme les emplacements attendent le calme avant de _montrer_) ; UMP/ATT et drapeau sans pub
  inchangés et respectés au plus bas.
- **Compteur d'impressions** (`services/journal-impressions.ts`) : sur l'événement `IMPRESSION` du
  SDK (le chiffre colle à la console AdMob), par emplacement et par jour, 7 jours, magasin local ;
  `lireImpressions()` donne la forme à envoyer. **Aucune route d'envoi n'existe côté API** : journal
  local seulement, groupage à brancher le jour où `POST /ads/impressions` existe.
- **Non vérifié à l'écran** : la hauteur de `NativeMediaView` dans la tuile modèle (si le média
  déborde ou reste vide sur appareil, c'est là), la grille à 2 colonnes avec l'annonce en 4e cellule,
  l'annonce pendant l'import sur un vrai téléphone. `EXPO_PUBLIC_ADMOB_TEST_MODE=true` en dev.

## Session du 2026-11-04 (soir) — Profil : écran noir, e-mail sous le nom, refonte du soutien (Fable)

**Trois demandes de Marc**, dans l'onglet Profil. Commits `6224a82`, `ef4415a`, `42ed2a9`.

**1. L'onglet Profil qui devient tout noir** (`fix(onglets)`). Aucun geste de l'app ne change
d'onglet par glissement : ni la barre (`barre-onglets.tsx`, des `Pressable`), ni les onglets
d'expo-router 57 (pas de pager), ni l'écran profil. La mécanique des scènes (opacité par
`sceneStyleInterpolator`, détachement natif de l'onglet Profil, qui est toujours « à droite »
donc toujours détaché quand il n'est pas affiché) a été exercée sur simulateur, invité et
connecté, avec des glissements sur le contenu, la barre et le bord : l'écran revient toujours.
**Ce qui rend l'écran entièrement noir**, reproduit sur simulateur : une erreur de rendu non
rattrapée — React démonte tout l'arbre, et en production il ne reste que le fond. La cause
trouvée : le fil des offres (`FlatList`, monté derrière les autres onglets) recevait une
nouvelle identité de `viewabilityConfigCallbackPairs` dès que la session changeait
(`signalerVisibles` dépend d'`invite`), et FlatList lève « Changing
viewabilityConfigCallbackPairs on the fly is not supported » : se connecter depuis le Profil →
écran noir, exactement le symptôme. Corrigé par `offres/hooks/use-visibilite-stable.ts` (une
paire créée une fois, rappel courant par référence) ; et `components/frontiere-erreur.tsx` posé
à la racine : une erreur de rendu affiche désormais « Karria a trébuché », le message
technique et « Reprendre ». **À vérifier sur l'iPhone de Marc** : si le noir revient après un
glissement, la frontière en affichera la cause — la rapporter telle quelle.

**2. Sous le nom** (`fix(profil)`) : l'adresse e-mail complète, jamais « @partie-locale »
(`services/identite.ts › sousLeNom`, test de la carte).

**3. Soutien** (`feat(soutien)`) : section « Soutenir Karria », puis deux surfaces. « Karria
sans pub » : entrée compacte dorée (mini-fil où l'annonce s'efface, prix, « sans engagement »)
qui ouvre une feuille plein format (trois bénéfices, prix, un seul bouton bleu, Stripe) ; le
paiement part après la fermeture de la feuille (`onDismiss`, iOS) ; état « Tu es sans pub »
valorisé. « Nous offrir un café » : quatre tuiles typographiques, ressort sur la tuile choisie,
bouton caramel (ton `chaleur`, jeton `--color-chaleur-foreground`), plus d'émoji. Hook et API
inchangés. Vu sur simulateur, sombre et clair, serveur simulé. **Non vérifié** : le retour
Stripe réel sur appareil (la feuille se ferme avant l'ouverture du navigateur — à regarder).

**Vu en passant, pas corrigé** : sur le simulateur, la barre d'onglets se dessine parfois
sans sa pilule de verre sur l'onglet Offres (après un remontage) ; la capsule « Parler à
l'équipe » chevauche « Se connecter » sur le profil invité.

## Session du 2026-11-04 (soir) — missions en puces, validation, suggestions à la saisie (Fable)

**Demande de Marc** : (1) les missions d'une expérience une par une, en puces ; (2) validation
et cohérence des champs d'édition du CV, erreurs près du champ, « Enregistrer » bloqué tant que
c'est incohérent ; (3) suggestions à la saisie « comme dans les grandes apps » (poste,
entreprise, ville, école, diplôme, compétence, langue). API : `karria_api_v2` `1b6e70c` +
`1eb0164` (ADR-0028, **en production**, table matérialisée : 17 070 villes, 19 959 entreprises,
22 855 intitulés ; 10–22 ms par recherche).

**Livré (`src/features/cv/`, commits `340d934`, `611587f`, `462a1ec`)** :

- **Puces** (`components/edition/liste-puces.tsx`) : `ListePuces` pour les missions — « Ajouter
  une mission » ouvre un champ, « Terminé » du clavier ou la coche pose la puce et garde le champ
  ouvert, croix pour retirer, toucher une puce la modifie à sa place, plafond 15 / 300 caractères.
  `Puce` et `ChampAjout` sont réutilisés par compétences, langues, centres d'intérêt
  (`formulaires-listes-courtes.tsx`). **Pas de réordonnancement** (deux flèches par puce
  doubleraient chaque ligne ; glisser = module natif) : retirer puis rajouter.
- **Validation** (`services/validation-edition.ts`, pur, testé) : dates (`début ≤ fin`, pas de fin
  future sauf « en cours », pas de début futur ni avant 1950, « obtention » pour les formations),
  formats (e-mail, téléphone 6–15 chiffres, lien http(s) avec ou sans schéma — jamais
  `javascript:`), requis (prénom, nom, un canal de contact, poste/entreprise, diplôme/école,
  libellé + adresse d'un lien), bornes (1 500 / 150 / 10 liens). Deux natures : **incohérent**
  s'affiche tout de suite et **bloque** le bouton (`m.bloque`, feuille d'élément comprise) ;
  **requis** s'affiche à la première tentative. Les `422` du serveur se posent par-dessus, les
  liens ligne par ligne (`liens.0.url`).
- **Suggestions** (`hooks/use-suggestions.ts`, `components/edition/champ-avec-suggestions.tsx`,
  `api/cv.api.ts › lireSuggestions`) : 200 ms de calme, numéro de demande (une réponse en retard
  est ignorée), liste **insérée** sous le champ actif (pas de menu flottant coupé par la feuille),
  toucher = remplir + fermer, saisie libre toujours possible, panne silencieuse (journalisée).
  Branché sur : poste visé, ville (coordonnées), poste/entreprise/lieu (expérience),
  diplôme/établissement/lieu (formation), compétences, langues. Faux serveur
  `lib/dev/cv-simule.ts › GET /cv/suggestions` (petit vocabulaire, même classement que l'API).
  Contrat : `docs/contrat-api-cv.md`.

`npm run check` vert (401 tests), `npx expo export --platform ios` produit un paquet. **Non
exercé à l'écran** (pas de simulateur lancé) : la liste de suggestions sous le clavier dans la
feuille `pageSheet`, le `blur` à 150 ms avant le toucher d'une proposition (voir le commentaire
dans `champ-avec-suggestions.tsx` — si un toucher « ne prend pas » sur iPhone, c'est là), les
puces sur Android. **Reste** : essai sur iPhone contre la production ; relire les messages ;
l'index propose encore des intitulés d'annonces moches (« Rayon Surgele Employe (E) Libre
Service ») — le nettoyage vit côté API (`domain/suggestions.py › clean_label`).

## Session du 2026-11-04 — import d'abord, CV modifiable à la main (Fable)

**Demande de Marc** (essai sur appareil) : (1) tout corriger à la main depuis le CV
fini ; (2) importer ou photographier un CV existant devient la voie principale, avec des
notes de lecture **honnêtes** pendant l'import, et l'on atterrit sur le CV avec « à vérifier ».
API : `karria_api_v2` commit `6a33a8f` (en production). Contrat : `docs/contrat-api-cv.md`.

**Livré (`src/features/cv/`)** :

- **Entrée** (`components/invitation-cv.tsx`) : « Ton CV, refait par Karria. » + trois
  sources — Photographier · PDF ou Word · Mes photos — et « Créer de zéro, en parlant » en
  retrait. Chaque source ouvre `/cv/importer?source=camera|fichier|galerie`.
- **Import** (`screens/ecran-import-cv.tsx`, `hooks/use-ecran-import-cv.ts`,
  `hooks/use-import-cv.ts`, `hooks/use-choix-fichiers.ts`) : sélecteur (appareil photo page
  après page avec « Ajouter une page ? », galerie multiple, fichier), consentement IA avant,
  orbe active + « Je lis ton CV… » pendant l'appel (5–10 s), puis **notes de lecture tirées
  du compte rendu réel** du serveur (`services/import.ts › lignesDeLecture` : nom, parcours
  « chez X, Y et Z », compte des formations/compétences, éléments écartés, ce qui manque),
  révélées une à une, puis « Ton CV est importé. Vérifie d'abord tes coordonnées… » et
  « Voir mon CV ». Erreurs par raison, « Réessayer » avec les mêmes fichiers. Arrière-plan :
  une coupure réseau pendant la lecture relit `GET /cv/me` et retrouve l'import s'il a abouti.
  Pas de flux pendant l'appel (le serveur n'en a pas) — voir `karria_api_v2/docs/PLUS-TARD.md`.
- **CV** (`components/cv-rempli.tsx`) : bandeau « Ton CV est importé » (fermable), pastille
  « À vérifier » sur coordonnées / expériences / formations tant que la section n'a pas été
  ouverte (`services/verification.ts`, en mémoire pour la session), pastilles ambrées pour ce
  qui **manque** (téléphone, dates…) calculées depuis le CV, crayon sur chaque section.
- **Édition** (`/cv/modifier/[section]`, `screens/ecran-modifier-cv.tsx`,
  `hooks/use-modifier-cv.ts`, `components/edition/*`) : identité (prénom, nom, poste visé),
  coordonnées (+ liens), à-propos, expériences et formations (liste : monter/descendre,
  supprimer, ajouter, feuille `pageSheet` par élément, **enregistrement à chaque geste**),
  compétences/langues/intérêts (pastilles, niveau par toucher), photo (prendre, choisir,
  retirer). Dates par `SelecteurMois` (année ‹ ›, grille des mois, « Année seule »,
  « Effacer »), jamais de `AAAA-MM` tapé. Formulaires simples : « Enregistrer » → « Enregistré »
  → retour ; saisies non enregistrées gardées en mémoire (`services/brouillons-edition.ts`)
  et restituées à la visite suivante. Erreurs `422 chapter_invalid` sous les champs.
- **Création** : « J'ai déjà un CV » dans la conversation ouvre l'écran d'import (remplace).
- **Faux serveur** `lib/dev/cv-simule.ts` : `POST /cv/import` écrit le CV et rend `ImportRead`
  (sans téléphone, pour exercer « à vérifier ») ; `PUT /cv/me/chapters/{c}`.

**Deux défauts trouvés sur simulateur, corrigés, qui dépassent le CV** :

1. `lib/http.ts` : depuis le SDK 57 le `fetch` global est celui d'Expo (« winter ») et son
   `FormData` refuse la forme `{ uri, name, type }` (« Unsupported FormDataPart
   implementation ») — **tous** les envois de fichiers échouaient (photo du CV, import, médias
   de l'équipe). Le multipart passe désormais par `XMLHttpRequest` (`envoyerMultipart`).
2. Un sélecteur système (photos, fichiers) demandé pendant que la feuille de consentement se
   ferme ne se présente jamais sur iOS ; `use-import-cv` attend 450 ms après l'accord. Le
   même risque existe pour la photo de la création (`use-creation-cv`, après
   `photo_enhancement`) — non corrigé là, à surveiller.

**Vérifié sur le simulateur iPhone 17 (Maestro, API locale sur 8001 avec PostgreSQL
Homebrew + stockage mémoire, extraction Gemini réelle)** : entrée → « Mes photos » →
consentement → galerie (image réelle d'un CV) → « Je lis ton CV… » → notes (« Marc Takoumba —
… », « 4 expériences trouvées, chez Papiers Express, Zoumani et Karria… ») = exactement
`cv.imported kept={experiences: 4, educations: 2, skills: 29, languages: 2}` du journal →
« Ton CV est importé » → CV avec bandeau et « À vérifier » → crayon coordonnées → ville
modifiée → 422 sur un lien vide (affiché) → lien retiré → « Enregistré » → CV mis à jour,
« À vérifier » retiré des coordonnées. Captures dans le rapport de session.
**Non exercé à l'écran** : appareil photo (pas de caméra sur simulateur), « PDF ou Word »
(sélecteur Fichiers ; le PDF a été testé par le cas d'usage réel côté API), listes
(réordonner, feuille d'élément), sélecteur de mois, photo, Android, mode clair, Marc sur
iPhone contre la production.

`npm run check` vert, `npx expo export --platform ios` produit un paquet. Aucun module natif
ajouté.

**Prochaine étape (Marc)** : l'éditeur de CV en temps réel par offre. **Reste** : relire les
textes ; `expo-image-picker` sur iPhone réel (plusieurs pages) ; retirer l'« à vérifier » du
store au redémarrage est voulu (session seulement).

## Session du 2026-10-31 (suite) — « tri rapide et filtres par mode » — FAIT PAR OPUS, À RELIRE PAR FABLE

**Demande de Marc** (écran « Pour toi ») : « si je filtre, il filtre sur toutes les offres
alors que je suis sur ma recherche » ; un tri rapide sur l'écran, sobre.

**Cause du bug** : surtout **côté API** (ADR-0027 de `karria_api_v2`) — un jeton d'accès
expiré (15 min) sur `/job-matches/me` était servi en **invité** (tout le corpus, 200, sans
401 donc sans renouvellement). Corrigé côté serveur : `401 session_expired`, que `lib/http.ts`
renouvelle et rejoue (aucune mise à jour de l'app nécessaire pour ce point). Côté app, deux
défauts aggravants corrigés : options de filtre lues **sans** `mode` (et jamais relues au
changement de vue ou à la connexion), filtres **partagés** entre les deux vues.

**Livré** :

- `hooks/use-fil-offres.ts` — réglages **par vue** (`reglages: Record<ModeDuFil, {filtres,
tri}>`) : filtrer « Ma recherche » ne touche pas « Toutes les offres » ; repasser d'une vue
  à l'autre retrouve ses réglages (choix documenté en en-tête : le plus prévisible, rien ne
  fuit d'une vue à l'autre, rien n'est perdu). Options lues avec le **mode servi**, relues au
  changement de vue, à la connexion (`relance`) et à « tirer pour actualiser ». Une nouvelle
  recherche de Karria remet à zéro les réglages de « Ma recherche » seulement et demande
  `mode=search`. `tri` à `null` = défaut du mode, **non envoyé** (pas de double chargement au
  démarrage). `422 nearest_unavailable` → « Plus proches » retiré des deux vues, rechargement.
- `api/offres.api.ts` — `parametresDuFil(…, tri)` → `sort=relevance|fresh|nearest` ;
  `lireOptionsDeFiltre(mode)` ; `Fil.tri`, `Fil.procheDisponible` ; `Offre.distanceKm`
  (tolère un serveur sans ces champs).
- `components/rangee-tri.tsx` — sous le sélecteur de vue : trois mots séparés de « · »,
  actif en gras, sans pastille ni icône ; `radiogroup`/`radio` + `checked` ; `hitSlop` pour
  44 pt. Choix : recherche → Pertinence · Plus récentes · Plus proches ; « Toutes les
  offres » → Plus récentes · Plus proches ; « Plus proches » caché sans recherche localisée ;
  rangée cachée s'il ne reste qu'un choix (invité). **Pas de retour haptique** : le projet
  n'a pas `expo-haptics`, et l'ajouter serait un module natif (non fait).
- `hooks/use-ecran-offres.ts` — le repli « à explorer » ne vaut **qu'en Pertinence** ; en
  « Plus récentes » / « Plus proches », tout le fil retenu s'affiche dans l'ordre demandé (la
  pastille « À explorer » reste sur la carte). Sous-titre « les plus proches d'abord » en
  « Toutes les offres ».
- `carte-offre.tsx` — « Persan · à 6 km » en tri « Plus proches » (`libelleDistance`,
  au km, « à moins d'1 km »), la distance ne se coupe jamais.
- Serveur simulé : `sort` (dont `422 nearest_unavailable`), `nearest_available`,
  `distance_km`, `filter-options?mode=`.
- Contrat `docs/contrat-api-offres.md` : « Le tri », « Session expirée », champs nouveaux.
- Tests : `use-fil-offres.test.tsx` (premiers tests de hook du fil : filtres par vue, options
  par mode, tri envoyé, repli 422), simulé, `libelleDistance`. `npm run check` vert.

**Aucun module natif ajouté.** **Non vérifié** : l'écran n'a pas été lancé (ni simulateur ni
iPhone) — rendu de la rangée, alignement avec le résumé, distance sur la carte à contrôler.

## Session du 2026-10-31 (suite) — « Parler à l'équipe » — ÉCRIT PAR OPUS, À RELIRE PAR FABLE

**Demande de Marc** : depuis le Profil, un bouton flottant « Parler à l'équipe » ouvre un
échange avec les **humains** de l'équipe (pas l'IA) : texte, message vocal, images /
captures ; réponses en direct, notification à chaque réponse ; sobre, aura, aucune pastille
d'icône ni badge « IA », pas d'orbe (c'est le visage de Karria l'IA).

**Nouveau domaine `src/features/equipe/`** (API : module `support` de `karria_api_v2`,
ADR-0026 ; contrat `docs/contrat-api-equipe.md`) :

- `components/bouton-parler-equipe.tsx` — capsule en verre au-dessus de la barre d'onglets,
  à droite, sur le Profil (invité compris : la porte `equipe` s'ouvre, puis l'échange par
  `useReprise`). Point bleu discret quand l'équipe a répondu (`GET /support/me/unread`,
  relu au focus et au retour au premier plan). Le défilement du Profil réserve `pb-56`.
- `screens/ecran-equipe.tsx` + `hooks/use-ecran-equipe.ts` — route `/equipe` (pile de
  `(app)`), `FlatList` inversée, accueil « Un mot pour l'équipe » en tête, séparateurs de
  jour, réponses signées « L'équipe Karria ». Envois **optimistes** (estompés), en échec :
  raison + toucher pour réessayer / « Retirer » (le fichier local est gardé jusqu'au succès).
- **Temps réel** — `hooks/use-direct-equipe.ts` + `ouvrirFlux` (`api/equipe.api.ts`) :
  WebSocket natif de React Native, `Authorization` en en-tête (3ᵉ argument du constructeur),
  `since` = dernier message connu. Ouvert seulement écran affiché + premier plan + session ;
  reconnexion 1→30 s ; `4401` → une seule nouvelle tentative (l'ouverture relit d'abord
  `/support/me/unread`, ce qui renouvelle la session). Retour au premier plan : relecture
  complète du fil (repli, URL signées neuves) + `POST /support/me/read`. Chaque réponse reçue
  en direct envoie `{"type":"read"}` sur le flux : le serveur ne pousse pas de notification
  pour ce qu'on lit déjà. Fusion par identifiant (`services/fil.ts`) : le flux renvoie aussi
  nos propres messages.
- **Vocal** — `hooks/use-vocal.ts` (`expo-audio`, `HIGH_QUALITY` → `.m4a` envoyé en
  `audio/mp4`, durée envoyée, arrêt et envoi automatiques à 5 min, < 0,8 s ignoré) ;
  lecture par **un seul** lecteur partagé (`use-lecteur-vocal.ts`), onde en classes du thème.
- **Images** — `hooks/use-image-equipe.ts` (galerie ou appareil photo, sans recadrage,
  qualité 0,85 → JPEG) ; aperçu plein écran avant envoi (`apercu-image.tsx`) ; toucher une
  image du fil l'agrandit.
- **Notification** `support` (contrat v1) → pile `["/profil", "/equipe"]`, canal `compte` ;
  la bannière interne se tait si l'échange est ouvert (`services/presence.ts`, lu par
  `use-centre-notifications.ts`). `docs/contrat-notifications.md` à jour.
- Faux serveur `src/lib/dev/equipe-simule.ts` (routes `/support/` + flux en mémoire :
  « l'équipe » répond 3,5 s après chaque message) ; `/support/` ajouté à `SERVI_PAR_LA_V2` ;
  `ouvrirFluxSimule` a son double dans `absent-en-production.ts`.
- Icônes `bulle`, `lecture`, `pause` ; porte `equipe` (« Écris à l'équipe »).
- `app.json` : textes d'autorisation micro / photos / appareil photo élargis à l'équipe
  (Info.plist : **à reprendre au prochain build natif**, aucun module natif ajouté —
  `expo-audio`, `expo-image-picker`, `expo-image` étaient déjà là).

**Vérifié** : `npm run check` vert (tsc, eslint, prettier, 41 suites / 329 tests Jest),
`npx expo export --platform ios` (dev et production) produit un paquet. **Non vérifié** :
l'écran n'a **pas** été lancé sur simulateur ni appareil (rendu, clavier, enregistrement et
lecture audio, WebSocket réel depuis le téléphone). Côté API, le WebSocket de production
répond bien (fermeture `4401` sans session valide à travers Traefik).

**Comment l'équipe répond** : console `https://api.karria.fr/api/v1/internal/support/console`
(jeton `SUPPORT__ADMIN_TOKEN`, voir `karria_api_v2/docs/REPRISE.md`) ; un courriel part à
`mtakoumba@gmail.com` à chaque nouveau message (une fois par rafale).

**Reste** : relecture par Fable ; essai réel sur iPhone (vocal enregistré puis écouté dans la
console, image depuis la galerie, réponse en direct, notification écran fermé) ; textes
d'autorisation au prochain build.

## Session du 2026-10-31 (suite) — dictée immersive, transcription en direct

**Demande de Marc** : un message vocal à Karria au niveau de ChatGPT voix / Siri — l'animation
suit la voix, le texte s'écrit **pendant** qu'on parle, on relit et corrige avant d'envoyer,
rien ne part tout seul. Même expérience dans la création du CV.

**Nouveau domaine `src/features/dictee/`** (partagé par l'agent et le CV ; l'ancien
`cv/hooks/use-micro.ts` et `transcrire` de `cv.api.ts` y ont déménagé) :

- `services/dictee.ts` — machine d'états pure (`repos → demarrage → ecoute → cloture |
transcription → repos`), deux modes : **appareil** (reconnaissance du téléphone, partiels en
  direct) et **serveur** (enregistrement + `POST /voice/transcribe`, le repli). Elle rend un
  **texte**, jamais un envoi ; une fin imprévue (silence, interruption, erreur) garde ce qui a
  été entendu. 23 tests (`dictee.test.ts`).
- `hooks/use-dictee.ts` — `expo-speech-recognition@~57.1.1` (jamsch ; module Expo, nouvelle
  architecture ; étiquette `sdk-57`) : `fr-FR`, `interimResults`, `continuous`,
  `requiresOnDeviceRecognition`, `addsPunctuation`, `volumechange` toutes les 80 ms → valeur
  partagée Reanimated (aucun rendu React par mesure). Mode appareil seulement si
  `isRecognitionAvailable() && supportsOnDeviceRecognition()`, sinon repli serveur ; une erreur
  `language-not-supported` / `service-not-allowed` sans texte bascule aussi sur le serveur.
  Limite **2 min** (`LIMITE_MS`), minuterie en `text-warning` les 15 dernières secondes. Les
  événements du module sont globaux : chaque instance ne traite que les siens (panneau agent
  monté en permanence + écran CV).
- `components/zone-dictee.tsx` — remplace le champ dans la capsule : texte confirmé + partiel
  estompé (défile au dernier mot), ✕ annuler, **orbe vivante** (`ecoute`, `niveauAudio`
  partagé, `active` pendant les attentes), minuterie, ✓ « Terminer et relire » (bleu plein).
  Fondu d'entrée/sortie coupé par « réduire les animations ». Pas d'onde décorative : l'orbe
  est la seule animation (règle de Marc), plus l'aura.
- `Aura` : props `ecoute` et `niveau` — respiration plus rapide, et le niveau de la voix
  gonfle le calque (palier **haut** seulement, comme le souffle).
- Agent : `Compositeur` → bouton micro quand le champ est vide (flèche sinon) ; le texte dicté
  **s'ajoute au brouillon** (`ajouterAuBrouillon`) ; le problème du micro s'affiche là où les
  erreurs d'envoi. CV : `SaisieReponse` idem ; la phase `ecoute` a disparu de `use-creation-cv`,
  la dictée pose le texte dans `texte` — **l'envoi automatique de la transcription (V1) n'existe
  plus**, l'utilisateur relit puis envoie.

**Consentement IA** — décision à relire par Marc : la dictée sur l'appareil n'envoie rien à
un tiers → aucun accord demandé pour écouter ; l'envoi à Karria reste derrière `useActionIa`
(`assistant`, `cv_creation`). Le repli serveur demande `avecConsentement("transcription")`
**avant** d'ouvrir le micro, et un `403` rouvre la feuille (événement `transcrire-encore`).
**Limite connue** : sur iOS, `requiresOnDeviceRecognition` n'est appliqué que si le moteur de la
langue le permet, sinon Apple reconnaît par son réseau sans le dire ; `supportsOnDeviceRecognition()`
est lu pour la **langue du téléphone**, pas pour `fr-FR`. Un francophone sur iPhone récent est
sur place ; un téléphone en anglais avec dictée fr… passe probablement par Apple. À mentionner
dans la politique de confidentialité (« service de dictée du système »), ou exiger le repli
serveur partout si Marc préfère.

**Natif** : `app.json` → plugin `expo-speech-recognition` (`NSSpeechRecognitionUsageDescription`,
`NSMicrophoneUsageDescription` harmonisé avec `expo-audio`, `RECORD_AUDIO` + `queries`
Android). **Recompilation obligatoire** (iPhone de Marc : voir la session précédente). Jest :
module simulé dans `jest.setup.ts` (téléphone sans reconnaissance → repli).

`npm run check` vert (308 tests), `npx expo export --platform ios` produit un paquet.

**Non vérifié** : la reconnaissance réelle (le simulateur n'a pas de micro) — Marc doit tester
sur son iPhone : partiels en français, ponctuation, ✓ puis correction, limite 2 min, refus de
permission, et Android (bip de début/fin du `SpeechRecognizer`, modèle hors-ligne fr à
télécharger sur certains appareils).

**Fin du travail (relecture + vérification) faite par Opus — à relire par Fable.** Corrections
de la relecture (commits `fix(dictee)` sur `main`) :

- **Rideau refermé micro ouvert** : `PanneauAgent` reste monté derrière le rideau → la dictée
  continuait d'écouter. `useEcranAssistant(ouvert, …)` annule la dictée dès que le rideau se
  ferme (`RideauAgent` passe `ouvert`).
- **Session audio iOS** : le module la laisse active en `playAndRecord`/`measurement` (baisse le
  son de ce qui joue ensuite). Rendue (`setAudioSessionActiveIOS(false)`) à l'événement `end`,
  même après une annulation (`systemeEngage`), et au démontage. Le délai de clôture (2,5 s)
  coupe aussi le moteur (`abort`). Repli serveur : `setAudioModeAsync({allowsRecording:false})`
  à l'arrêt, en échec, et au démontage en plein enregistrement.
- **Autorisation de la reconnaissance refusée, micro permis** : repli serveur (avec l'accord
  IA) au lieu du message « va dans les Réglages ».
- **`useMicro`** : `useAudioRecorderState` interrogeait le natif toutes les 80 ms en permanence
  (panneau monté à vie) et rendait l'écran 12×/s pendant le repli ; remplacé par une mesure
  pendant l'enregistrement seulement, écrite dans la valeur partagée `niveau`.
- CV : écrire efface le message du micro (comme l'agent). Texte d'autorisation iOS : retiré
  « sur ton téléphone » (iOS affiche juste au-dessus « les données seront envoyées à Apple »).

**Vérifié sur simulateur** (iPhone 17, build debug du worktree, Metro 8082) : le module natif
est lié, l'écran assistant s'ouvre, l'appui micro passe en zone d'écoute (« J'ouvre le
micro… ») et iOS demande la reconnaissance vocale avec notre texte. **Pas pu aller plus loin** :
aucun outil pour toucher l'écran du simulateur (pas d'idb, osascript sans accès
d'accessibilité) — transcription en direct, ✓, relecture et repli serveur restent à éprouver
sur l'iPhone. Remarque hors périmètre : en invité, `karria://offres?karria=1` déclenche
« Cannot update a component (InvitationConnexion…) while rendering » (`ouvrirPorte` appelé
pendant le rendu dans `use-ecran-offres`).

## Session du 2026-10-31 — sobriété visuelle, orbe unique, latence de l'aura

- **Plus de pastilles d'icônes** (demande de Marc : « ça fait très IA ») : les listes de l'invitation,
  de la feuille de connexion, du consentement IA, de l'activation des notifications et de la
  suppression de compte sont des phrases simples séparées d'un filet. `GAINS`, `RAISONS`,
  `CE_QUI_DISPARAIT` sont désormais des `string[]`. Les indicateurs fonctionnels (coche, cadenas
  des modèles, boutons du carrousel) restent.
- **Une seule orbe** : `EcranAVenir` (onglet Candidatures) utilise `OrbeVivante` + `SymboleKarria`
  comme le reste de l'app ; `components/orbe.tsx` (orbe SVG dégradée) supprimé. Règle : toute
  apparition de Karria passe par `OrbeVivante`.
- **Latence à l'ouverture** : l'aura animait `cx`/`cy` de cercles SVG plein écran via
  `useAnimatedProps` → react-native-svg redessinait tout le SVG à chaque image, au processeur sur le
  fil principal iOS. Chaque nappe est maintenant un SVG dessiné une fois dans une `Animated.View`
  déplacée par `transform` (compositeur seul). Démarrage vérifié : aucune attente réseau
  (session et aiguillage = lectures locales). À noter : un build **debug** reste bien plus lent que
  Release — juger la fluidité sur Release.
- **iPhone de Marc** (« Iph Marc (2) », iPhone 13) : build Release installé (API `api.karria.fr`).
  `expo run:ios --device` échoue en Wi-Fi au moment d'installer (NWError 60) : compiler avec
  `npx expo run:ios --device 00008110-000909A43EF0401E --configuration Release`, puis installer avec
  `xcrun devicectl device install app --device B4C52085-EEC2-5014-81EC-B499370CEDD2 <Karria.app>`.
- Commit `6259695` ; 285 tests verts, tsc et eslint propres.

## Session du 2026-10-30 — mode invité (5.1.1 v) et consentement à l'IA (5.1.2 i)

Commit `f8a6344` sur `main` (`karria-app-full`), API `1192117` sur `Karria-api-full`
(déployée, migration 13 appliquée). `npm run check` vert (285 tests),
`npx expo export --platform ios` produit un paquet.

**Mode invité** — Apple avait refusé Karria pour la connexion exigée au lancement :

- Accueil : « Commencer » (feuille de connexion) et **« Découvrir les offres »**
  (`useAccueil.decouvrir`, choix retenu dans `lib/invite.ts` ; à l'ouverture suivante,
  l'aiguillage ouvre le fil ; la déconnexion efface le choix).
- `app/(app)/_layout.tsx` ne redirige plus sans session : un invité lit le fil
  (production, `GET /job-matches/me` sans jeton → `all_offers`), le détail et « Voir
  l'annonce d'origine », la galerie et le détail d'un modèle. Rien n'est écrit : pas
  de « vu », pas d'interaction, pas de vue de modèle, pas de lecture de `/payments`.
  La feuille de filtres cache l'« Affichage » (ces filtres parlent d'un compte).
- **La porte** (`features/auth/hooks/use-porte.ts`, `porte-store.ts`,
  `services/porte.ts`) : `exiger(raison, intention)` ouvre l'invitation
  (`components/invitation-connexion.tsx`, feuille `FeuilleConnexion` partagée avec
  l'accueil : orbe, ce qu'un compte apporte, e-mail / Google / Apple, « Pas
  maintenant ») et retient l'intention (`lib/intention.ts`). Après la connexion,
  `useReprise(cle, action)` rejoue le geste là où l'on était : garder (fil et
  détail), écarter, Karria, créer / importer le CV, obtenir un modèle. Le parcours
  e-mail **revient** (`dismissAll`) au lieu de rejouer l'aiguillage ; Google/Apple
  ferment seulement la feuille (`useConnexionSociale({ apresConnexion })`).
- Profil invité (`components/profil-invite.tsx`), Paramètres invité (apparence,
  documents, version, « Se connecter »). `useSoutien(actif)` ne lit rien sans compte.
- AdMob : inchangé, les mêmes règles de consentement UMP s'appliquent à l'invité.

**Consentement à l'IA** — contrat `docs/contrat-api-consentement-ia.md` :

- Store `features/auth/services/consentement-ia.ts` (état recopié depuis `GET
/auth/me` au profil et par les routes `/auth/me/ai-consent`), `useActionIa()` :
  `avecConsentement(usage, action)` devant Karria (`use-conversation`),
  l'interprétation, la dictée (avant d'allumer le micro), la photo améliorée
  (`use-creation-cv`) et l'import (`use-import-cv`, avant le sélecteur) ; un `403
ai_consent_required` du serveur rouvre la feuille et rejoue le geste.
- Feuille `components/feuille-consentement-ia.tsx` (orbe ; « Ce qui part » avec
  l'outil courant en tête ; « Chez qui, et pourquoi » avec les fournisseurs **du
  serveur** ; « Ce que je ne fais jamais » + lien politique ; « J'accepte et je
  continue » / « Pas maintenant »). Montée une fois dans `(app)/_layout.tsx`, comme
  l'invitation. Paramètres → « Karria et l'IA » = la même feuille en consultation
  (date, version, « Retirer mon consentement »).
- Faux serveur : `lib/dev/consentement-simule.ts` (routes `ai-consent`, porte sur
  `/cv/draft/interpret`, `/voice/transcribe`, `/cv/import`, `/cv/photo?enhance`,
  `/assistant/messages`).
- Correctif trouvé sur le simulateur : l'instantané de `useSyncExternalStore` doit être
  **référentiellement stable** (un objet neuf à chaque lecture = boucle de rendu).

**Vérifié sur le simulateur iPhone 17 (captures dans le rapport de session)** :
accueil avec « Découvrir les offres », fil invité contre la **production** (210 586
offres), invitation à se connecter (depuis l'orbe ✦), feuille de consentement (en
simulation, ouverte par l'inspecteur Hermes faute de pouvoir taper — pas de permission
d'accessibilité pour `osascript`). **Non vérifié à l'écran** : la reprise du geste après
une vraie connexion (il faut un code e-mail ou Google/Apple réel — Marc), la feuille
en mode clair, Android. Deux plantages pendant la session venaient de l'inspecteur
(`hermes::vm::Debugger`, segfault sur une expression qui lève) — pas de l'app.

**Marc doit** : tester la reprise après connexion (garder une offre en invité, se
connecter, vérifier le signet) ; relire les textes de la porte (`services/porte.ts`) et
de la feuille d'IA ; héberger `https://karria.fr/confidentialite` (le lien de la feuille).

## Session du 2026-10-29 (suite) — paiements Stripe : sans pub, cafés, modèles Premium

**Décision de Marc** : Stripe seul, dans le navigateur, comme Zoumani (validée par Apple).
Aucun achat intégré, aucun RevenueCat, **aucun SDK Stripe dans le binaire** (PassKit →
question Apple Pay en revue). `app.json` : `expo-audio` sans lecture ni enregistrement en
arrière-plan (plus de `UIBackgroundModes`) — à garder.

**Livré** (contrat `docs/contrat-api-paiements.md`, servi par `karria_api_v2` depuis le
29/10 mais **éteint** tant que les clés Stripe ne sont pas posées) :

- **Carte de soutien** (`features/soutien/components/carte-soutien.tsx`, remplace
  `carte-cafe.tsx`) : le mot de l'équipe, puis « Profiter de Karria sans pub » (4,99 €/mois,
  sans engagement, bouton principal) et « Nous offrir un café » (sélecteur 1 / 2 / 3 / 5 avec
  les prix du serveur, bouton de contour). États : squelette ; interrupteur éteint → le mot
  seul ; sans pub actif → « Tu es sans pub », date de renouvellement ou de fin, avertissement
  si prélèvement en échec, « Gérer mon abonnement » (portail Stripe) ; merci après un café.
- **Flux** (`hooks/use-soutien.ts`, `api/soutien.api.ts`, `services/attente.ts`) :
  `POST /payments/checkout-session` → `WebBrowser.openAuthSessionAsync(url,
"karria://paiement/retour")` → la page de retour de l'API referme la session → relecture
  de `GET /payments/status/{id}` (`fulfilled`) et `GET /payments/me`, jamais l'adresse.
  En simulation, pas de navigateur : `lib/dev/paiements-simule.ts` livre à la 2e relecture.
- **Sans pub = plus d'AdMob** : `lib/sans-pub.ts` (drapeau abonnable), recopié depuis
  `GET /payments/me` à l'ouverture de la session et au retour au premier plan
  (`use-droits-connectes.ts`, monté dans `app/(app)/_layout.tsx`), au focus du profil, et
  remis à faux à la déconnexion. `reserve-annonces.ts` refuse de démarrer/charger et libère
  tout ; `use-annonces-de-liste` rend une table vide ; `use-annonce-detail` rend `null`.
- **Modèles Premium** : « Débloquer ce modèle · 4,99 € » (prix du serveur, `prixLisible`)
  → même flux Stripe → « Ajouté à ta collection ! » quand `fulfilled`. Désactivé avec
  l'explication si l'interrupteur est éteint.
- **Interrupteur par plateforme** : `enabled.ios|android` du catalogue et de `/payments/me`
  (`PAYMENTS__IOS_ENABLED` côté serveur) → aucun bouton de paiement quand il est éteint.
- **Reprise des modifications de Marc** (accueil « doodle » + feuille de connexion, carte
  d'identité en ligne, « Mon profil », pastille « Nouvelle » retirée, écran de chargement sans
  aura) : gardées, en-têtes de documentation rétablis, jetons à la place des `/60` `/20`.
  Corrigé : le détail d'une offre a **sa propre annonce** (`use-annonce-detail.ts`, une
  instance par ouverture, détruite à la sortie) au lieu de réutiliser celle de l'emplacement 0
  du fil ; plus de fausse carte « Sponsorisé — Karria AI Pro » ; plus de `console.log`
  « vue pub comptabilisée ».
- Route `app/(app)/paiement/retour.tsx` (lien arrivé hors session → profil).
  `lib/monnaie.ts` (`euros`, `centimesDepuisTexte`).

`npm run check` vert (261 tests), `npx expo export --platform ios` produit un paquet.
**Non vérifié à l'écran** (pas de clé Stripe ni de simulateur lancé dans cette session) :
la carte en clair/sombre, le retour de la session du navigateur sur appareil, Android.

**Marc doit** : poser les clés Stripe (voir `karria_api_v2/docs/REPRISE.md` et
`DEPLOIEMENT.md`), tester avec les cartes de test, puis relire la carte sur le simulateur.

## Session du 2026-10-29 — relecture Fable : performance sur appareils modestes, push, AdMob

**Verdict sur l'aura et l'orbe (question de Marc).** Oui, telles quelles, elles coûtaient sur un
Android d'entrée de gamme — pas par le calcul des grains (2 600 grains ≈ 1,5 ms sur le fil
d'interface) mais par le **GPU** : l'aura peint trois dégradés radiaux de 2 à 3 écrans de
surface **et** change l'opacité/l'échelle du calque entier à chaque image (calque hors écran +
recomposition) ; l'orbe floute (rayon ≈ 17 px pour 120 pt) un calque de la taille de sa boîte.
Et les **cinq onglets** gardaient chacun leur aura animée hors écran. Rien de tout cela ne se
voyait sur l'iPhone 17 du simulateur.

**Fait** (`src/hooks/qualite-visuelle.ts`, pur et testé ; `use-qualite-visuelle.ts`) :

- un **palier visuel** décidé une fois par session (`expo-device` : année de classe, mémoire ;
  `PixelRatio` ; plateforme) : `haut` / `moyen` / `bas` ; iOS part du haut, Android du moyen ;
- **aura** : ne bouge que si son écran est au premier plan et l'app active ; `moyen` → dérive
  sans souffle (opacité/échelle fixes : plus de calque hors écran) ; `bas` → image fixe ;
  mouvement réduit respecté comme avant ;
- **orbe** : `moyen` → 60 % des grains (plafond 1 400) et flou de moitié ; `bas` → 35 %
  (plafond 600), **pas de flou**, horloge à 30 images/s (Skia ne redessine que quand elle
  avance) ; pauses existantes (hors écran, arrière-plan, mouvement réduit) gardées.
- Non mesuré sur un vrai Android (pas d'appareil ici) : les seuils (`2017`, `2020`, `3,5 Go`,
  densité `2,5`) sont des choix raisonnés à ajuster au premier retour.

**Push et AdMob — corrigé** : un changement de jeton pendant un envoi est **rejoué** (il était
fusionné et perdu jusqu'au prochain lancement) ; l'expiration de la bannière ne compte plus
comme « écartée » ; API `getLastNotificationResponse` synchrones (les `…Async` sont dépréciées
en SDK 57) ; plus d'effet dans un `setState` (Paramètres) ; un lien `url` ne pousse qu'un
identifiant de forme connue, sans paramètres ; un refus **passager** du consentement UMP n'est
plus gardé pour la session ; les annonces natives **expirent** (50 min, `destroy()` puis
rechargement) et sont libérées à la déconnexion ; `maxAdContentRating: T` ; clés de liste
stables ; plus de style en ligne dans la carte d'annonce.

**À Marc — modifications non commitées dans l'arbre, non touchées** (`ecran-detail-offre.tsx`,
`use-detail-offre.ts`, `carte-cafe.tsx`, `ecran-bienvenue.tsx`, `carte-identite.tsx`…) :

1. le détail d'une offre réutilise **la même** `NativeAd` que l'emplacement 0 du fil (trafic
   invalide pour Google) et affiche à défaut une fausse carte « Sponsorisé — Karria AI Pro » :
   à retirer, ou lui donner son propre emplacement ; le `console.log` « vue pub comptabilisée »
   de `use-detail-offre.ts` ne compte rien ;
2. la carte café passe par Stripe Checkout (API `payments`) : règle 3.1.1 de l'App Store — voir
   `karria_api_v2/docs/adr/0023-encaissements-stripe.md` ; l'API répond 503 tant que la clé
   n'est pas posée.

**Reste (AdMob, à décider)** : `NativeMediaView` absent de la carte (la politique AdMob
demande un média ou une image ; le validateur n'a rien dit) ; `skAdNetworkItems` absent
d'`app.json` (attribution iOS) ; `userTrackingUsageDescription` déclaré deux fois.

`npm run check` vert (240 tests), `npx expo export --platform ios` produit un paquet.

## Session du 2026-10-25 (suite) — notifications de niveau « grande app », AdMob, tuile sans logo

- **Tuile d'entreprise** : les initiales sur leur teinte sont toujours dessinées ; le logo se
  pose par-dessus (tuile blanche) seulement à `onLoad`. Plus de tuile blanche vide pendant le
  chargement ; cadre fixe, aucun saut.
- **Notifications** (`features/notifications`, contrat **`docs/contrat-notifications.md`**,
  partagé avec l'API, commit API `0f96581`) :
  - charge v1 `{ v, type, id?, count?, campaign?, url }` ; 9 types ; validée par
    `services/routeur-notifications.ts` (`lireNotification`, `destinationDe` → pile d'écrans,
    repli `url` puis fil) ;
  - `services/aiguilleur.ts` (pur, testé) : dédoublonnage (identifiant + issue) du lancement à
    froid, attente de la session / de la navigation / des écrans d'entrée (`peutNaviguer`),
    destination la plus récente gardée ;
  - `hooks/use-centre-notifications.ts`, monté à la **racine** (`CentreDeNotifications` dans
    `app/_layout.tsx`) : premier plan = bannière interne (6 s, `components/banniere-notification.tsx`,
    plus de bannière système), arrière-plan, lancement à froid ; pile reconstruite
    (`dismissAll` → onglet → détail) ; pastille effacée à l'ouverture et au retour au premier plan ;
  - canaux Android `offres` (haute), `documents`, `compte` (+ `defaut`) ; catégories iOS
    homonymes à `customDismissAction` ;
  - mesure : port `services/analytique.ts` (journal en dev) — `received` (premier plan),
    `opened`, `dismissed` (bannière, iOS) ; aucun fournisseur branché ;
  - `assistant` ouvre le rideau Karria via `/offres?karria=1` (`use-ecran-offres`).
  - `use-appareil-connecte` ne fait plus que l'enregistrement de l'appareil.
- **AdMob** (`features/publicite`, nouveau domaine) — dépendances `react-native-google-mobile-ads`
  ~17.4.0 et `expo-tracking-transparency` ~57.0.2 (accord de Marc) :
  - ordre UMP (`gatherConsent`) → ATT (iOS, appareil réel) → configuration → `initialize`,
    lancé 2,5 s après l'affichage du fil (jamais au premier écran) ; non personnalisées si refus ;
  - réserve (`hooks/reserve-annonces.ts`) : requêtes une par une (700 ms), un emplacement = une
    annonce, préchargement de tous les emplacements du fil ;
  - règles (`services/regles-publicite.ts`) : jamais en tête, une toutes les 7 offres
    (`EXPO_PUBLIC_ADMOB_FEED_INTERVAL`, borné 4–20), plafond 8 par liste ; une annonce absente
    n'entre pas dans la liste (aucun trou) ;
  - `components/carte-annonce.tsx` : carte native au style des offres, « Sponsorisé » visible,
    AdChoices en haut à droite ; pas de média (vidéo non affichée) ;
  - blocs : test en dev/`EXPO_PUBLIC_ADMOB_TEST_MODE=true`, réels via
    `EXPO_PUBLIC_ADMOB_NATIVE_IOS` / `_ANDROID` (posés dans `eas.json` production, IDs V1) ;
    absents en production → pas de pub ;
  - Paramètres : ligne « Choix publicitaires » quand UMP l'exige (EEE) ;
  - IDs d'application V1 dans `app.json` (plugin) ; `prebuild` + `pod install` faits.
  - Pas d'annonce dans Karria ni le CV ; pas d'interstitiel ni de récompensée. Galerie Modèles :
    non faite (optionnelle).
- **Marc doit** : héberger `https://karria.fr/app-ads.txt` =
  `google.com, pub-3330048630750788, DIRECT, f08c47fec0942fa0` ; publier dans AdMob
  (Confidentialité et messages) un message **RGPD** (et l'explication IDFA iOS) pour les deux
  applications ; vérifier que les blocs natifs V1 sont toujours actifs ; renseigner l'URL du
  développeur (karria.fr) dans les fiches App Store / Play.
- **Vérifié sur le simulateur iPhone 17** (build natif refait) : l'app démarre, logos et
  initiales dans le fil, annonces natives de **test** affichées (« Sponsorisé », AdChoices),
  validateur AdMob « No implementation issues found » — avec un intervalle forcé à 1 le temps de
  la capture, remis à 7 avant commit. En mode test, un échec d'UMP n'empêche pas les annonces
  (non personnalisées) ; en production, il les coupe.
- **Non vérifié** : un vrai toucher de notification (appareil physique requis — pas de jeton sur
  simulateur), les canaux Android, l'effacement iOS, la bannière interne en conditions réelles,
  le formulaire UMP (dépend du message publié dans la console), Android en général.

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
| Connexion                  | Google, Apple, code e-mail ; session à rotation (`lib/http.ts`, `lib/session.ts`). **Mode invité** (2026-10-30) : le fil, le détail et la galerie se lisent sans compte ; la porte (`use-porte.ts`) demande un compte au geste et le reprend après. **Consentement à l'IA** avant le premier outil d'IA (`contrat-api-consentement-ia.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Notifications              | Écran d'activation à la 1re connexion. Enregistrement de l'appareil à chaque ouverture, retrait à la déconnexion. Contrat v1 typé (`docs/contrat-notifications.md`), routeur + aiguilleur, bannière interne, canaux, pastille (`features/notifications`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Offres                     | **Branchées sur la production** (`docs/contrat-api-offres.md`) : identifiants UUID, deux modes du fil (toutes les offres récentes / recherche) ; sélecteur « Ma recherche / Toutes les offres » sous l'en-tête dès que le serveur rend un `criteria_summary`. Changer de vue ne change que le paramètre `mode` (`all_offers` / `search`) de `GET /job-matches/me` : les critères restent, **les alertes restent actives** (plus de `DELETE`/`PUT /search/criteria`, plus de stockage sur l'appareil — `recherche-en-pause.ts` supprimé le 2026-10-24). Une nouvelle recherche Karria remet le mode « déduit ». Offres vues envoyées par lots, écarter une offre depuis le détail. Pas d'analyse par offre dans la V2. La feuille de filtres reste celle de la V1.                                                                                                                                                                                                                                                                                                                                                                         |
| Karria                     | `POST /assistant/messages` au contrat `docs/contrat-api-recherche.md` : statut, réponses rapides et élargissements comptés en capsules sous la réponse, « Voir les N offres » referme le rideau sur un fil rechargé.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Modèles                    | Onglet et détail au contrat `docs/contrat-api-modeles.md` (UUID, `pages`, corps de `POST /user-templates/me` réduit à `template_id`). **Servis par le faux serveur** `lib/dev/modeles-simule.ts` : `/templates/` répond 404 en production (vérifié le 2026-10-24). Il sert les 3 modèles du PoC (Meridian, Marketing, Minimalist) avec leurs **vrais aperçus** (WebP dans `lib/dev/modeles/`, absents du paquet de production) et un `thumbnail_blurhash` (champ **proposé** au contrat). **Bascule** : ajouter `"/templates/"` et `"/user-templates/"` à `SERVI_PAR_LA_V2` (`lib/dev/serveur-simule.ts`), rien d'autre. Images `expo-image` en cache mémoire+disque, clé `modele-<id>-v<version>`. Ouverture : zoom natif sur iOS 18+, zoom Reanimated mesuré (`hooks/use-ouverture-modele.ts`) sur Android, aucun en mouvement réduit ; le détail s'affiche aussitôt depuis la galerie (`modeleConnu`). Pastille et puce « Premium » (or, jetons `premium-texte`, `surface-premium`, `border-premium`). Lien `karria://modeles?categorie=étudiant`. Puces : hauteur fixe, défileur `grow-0 shrink-0` (corrige l'étirement à une carte). |
| CV                         | **Import d'abord** (2026-11-04) : photographier, PDF/Word ou galerie → `POST /cv/import` écrit le CV ; notes de lecture réelles, puis CV avec « À vérifier » et ce qui manque. **Édition à la main** de chaque section (`/cv/modifier/[section]`). Création en conversation gardée pour qui n'a pas de CV : 8 chapitres, texte ou voix, jet validé ou corrigé, photo avec amélioration IA.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Orbe                       | `OrbeVivante` est une sphère de particules Skia sur un tourbillon chromatique (`components/orbe-vivante.tsx`, maths dans `orbe-particules.ts`). Même API + `ecoute`, `niveauAudio`. Réglages dans l'en-tête du fichier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Profil                     | Minimaliste et chaleureux : identité en ligne (avatar caramel, nom, pseudonyme), raccourci CV, **carte de soutien** (`features/soutien`, 2026-10-29) = un mot signé de l'équipe sur crème, « Profiter de Karria sans pub » (4,99 €/mois, Stripe, portail pour gérer) et « Nous offrir un café » (1/2/3/5 tasses, prix du serveur). Contrat `docs/contrat-api-paiements.md`. Jetons : `chaleur`, `surface-chaleur`, `border-chaleur`, Premium. **Pas encore vérifié à l'écran** après la refonte du 29/10.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
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
`docs/contrat-api-offres.md`, `docs/contrat-api-consentement-ia.md`,
`docs/contrat-api-recherche.md` (ces deux
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
- Dépendances ajoutées le 2026-10-25 : `react-native-google-mobile-ads`, `expo-tracking-transparency` (natives, plugins dans `app.json`).
- Dépendances ajoutées le 2026-10-23 : `expo-document-picker` (import de CV), `@shopify/react-native-skia` (orbe). Toutes deux natives : `prebuild` + `pod install` faits, build installé sur le simulateur iPhone 17 (`53F41CC0-710B-40C4-AB4B-8F6942FF60DF`).

## Ce qui reste (par priorité)

0. **Modèles** : dès que la v2 sert `/templates/` (curl `https://api.karria.fr/api/v1/templates/` → 401 et non 404), faire la bascule `SERVI_PAR_LA_V2` ci-dessus et vérifier la galerie contre la production. Faire valider par l'agent backend le champ proposé `thumbnail_blurhash`. Tester le zoom Reanimated sur un émulateur Android (non vérifié) et le Profil en mode clair.

1. **Paiements (Stripe seul, décidé le 2026-10-29)** : tout est codé (voir la session du
   2026-10-29, suite). Reste à Marc : les clés Stripe côté API, un passage en mode test avec
   les cartes de test, la relecture de la carte de soutien sur le simulateur.
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
7. L'onglet Dossiers ; « Ce que Karria sait de moi » (`/assistant/memory`) dans les réglages ; l'éditeur de CV par offre (Marc).

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
