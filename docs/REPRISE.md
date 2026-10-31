# Reprise — état de `karria_app`

> Document de passation. À lire en premier par toute personne ou IA qui
> reprend le travail, avec `AGENTS.md`. Mis à jour à chaque fin de session.

**Dernière mise à jour : 2026-10-31**

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
| CV                         | Création en conversation : 8 chapitres, texte ou voix, jet validé ou corrigé, photo avec amélioration IA. Puis l'écran CV de la V1. **Import d'un CV existant** (« J'ai déjà un CV », `expo-document-picker` → `POST /cv/import`) : les chapitres extraits arrivent en propositions à valider une à une ; seuls les chapitres validés comptent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
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
