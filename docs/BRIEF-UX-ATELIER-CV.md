# Brief — refonte UI/UX de l'atelier CV de Karria (de l'édition à l'export)

> Document à remettre tel quel à une IA (ou à un designer-développeur) chargée
> d'auditer puis d'améliorer l'expérience de l'éditeur de CV de Karria.
> Rédigé le 2026-11-14 par l'agent qui a construit la version actuelle, pour
> Marc Takoumba (SEYA LABS), seul mainteneur du produit.

---

## 0. Ta mission, en une page

Tu reçois une application mobile (Expo / React Native) et son API (FastAPI).
Le parcours **« CV »** fonctionne de bout en bout : importer ou créer un CV,
le mettre en page dans un modèle avec rendu en temps réel, l'adapter à une
offre avec l'aide de Karria (l'IA du produit), choisir modèle et couleur,
tenir sur une page ou non, finaliser (score ATS, PDF, Word), envoyer par
e-mail, retrouver ses CV.

Le parcours est complet mais **pas encore assez simple**. L'auteur actuel a
atteint ses limites sur le visuel et l'ergonomie. Ta mission :

1. **Auditer** chaque écran du parcours (liste exhaustive au § 4), sur
   appareil ou simulateur, iOS et Android, mode clair et sombre.
2. **Produire un plan priorisé** d'améliorations UI/UX, et les
   justifications (pas de « c'est plus joli » : une raison d'usage).
3. **Implémenter** ces améliorations dans les règles du dépôt (§ 6), en
   gardant les comportements qui marchent (§ 4 les détaille) et en
   corrigeant ceux qui fatiguent.
4. **Prouver** chaque changement : captures avant/après, `npm run check`
   vert, et une entrée dans `docs/REPRISE.md`.

Le niveau visé : **une personne de 16 ans comme de 60 ans, pressée, peu à
l'aise avec le numérique, doit faire son CV et l'envoyer sans réfléchir à
l'outil.** Marc le formule ainsi : « on est face à des gens qui ont la
flemme », « l'ergonomie doit être super simple et intuitive ». Aucune
fatigue mentale : un geste évident à chaque étape, un seul bouton bleu par
écran, rien qui demande de deviner.

Ce qui ne doit **pas** changer : le fond du produit (import-first, Karria
qui propose sans imposer, un CV = une page sauf si la personne veut deux,
export fidèle à ce qu'on voit), les contrats d'API (sauf extension
documentée), et les règles d'architecture du dépôt.

---

## 1. Le produit et les gens

**Karria** (karria.fr) est une app française de recherche d'emploi : des
offres, un CV, des dossiers de candidature adaptés à chaque offre par une
IA appelée « Karria », des lettres, des modèles de CV (gratuits et Premium à
paiement unique), un abonnement « sans pub », des « cafés » pour soutenir.

**Les personnes** : lycéens et étudiants en alternance, jeunes diplômés,
demandeurs d'emploi de tous âges, personnes en reconversion. Beaucoup
n'ont jamais fait de CV, ne savent pas ce qu'est un ATS, et utilisent
surtout leur téléphone. Le tutoiement est la voix du produit. Le français
est la seule langue.

**La voix** : sobre, honnête, chaleureuse, jamais vendeuse. Pas de
pourcentages criards, pas de compte à rebours, pas de confettis. Quand
Karria travaille, on dit ce qui se passe, on n'invente pas d'étapes.

**Esthétique** : Marc refuse tout ce qui « fait IA » (dégradés violets
génériques, étincelles, cartes vitrées partout, emoji en titres). Il aime
la sobriété des grandes apps natives, les animations qui répondent au
doigt, la typographie nette. Référence de ce qui lui plaît : la galerie des
modèles, l'orbe de Karria, l'écran de mise à jour obligatoire.

**Apple** : l'app est en cours de soumission. Tout doit rester conforme aux
règles de revue (pas de lien de paiement hors Stripe sur mobile sans
raison, pas de contenu placeholder, textes de permissions honnêtes).

---

## 2. Les deux dépôts

| | Application mobile | API |
| --- | --- | --- |
| Dépôt | `https://github.com/Youorus/karria-app-full` (local : `~/WebstormProjects/karria_app`) | `https://github.com/Youorus/Karria-api-full` (local : `~/PycharmProjects/karria_api_v2`) |
| Branche | `main` | `main` — **chaque push déclenche un déploiement en production** (Dokploy). Ne pousse jamais sans `make check` vert ; préfère une branche. |
| Pile | Expo SDK 57, React Native 0.87, expo-router (routes typées), gluestack-ui v5, UniWind (Tailwind v4), TypeScript strict, Jest | FastAPI, Python 3.13, uv, Tortoise ORM + aerich, PostgreSQL, Procrastinate (file), Gotenberg (Chromium → PDF), stockage S3, LLM (Gemini/OpenAI selon la tâche) |
| Vérification | `npm run check` (types, lint, format, tests) | `make check` (ruff, mypy strict, import-linter, ≈3 830 tests) |
| Directives à lire d'abord | `AGENTS.md`, `CLAUDE.md`, `docs/REPRISE.md` | `AGENTS.md`, `CLAUDE.md`, `docs/REPRISE.md`, `docs/adr/` |
| Contrats d'API (côté app) | `docs/contrat-api-cv.md`, `docs/contrat-api-modeles.md`, `docs/contrat-api-documents.md`, `docs/contrat-api-candidatures.md`, `docs/contrat-api-paiements.md` | les mêmes routes, documentées dans les routeurs et `docs/contrat-api-*.md` |
| Feuille de route d'origine de l'atelier | — | `docs/atelier-cv-feuille-de-route.md` (ce qu'on voulait, phase par phase) |

Les deux `REPRISE.md` sont des journaux de session : la section « Où on en
est » et « Ce qui reste » y sont à jour. Lis-les avant de toucher au code.

### Lancer l'app sans backend (recommandé pour l'audit)

```bash
cd ~/WebstormProjects/karria_app
npm install
# .env : EXPO_PUBLIC_API_MODE=simulation  (le vrai serveur est en « reel »)
EXPO_PUBLIC_API_MODE=simulation EXPO_PUBLIC_SIMULATION_CV=rempli npx expo start --dev-client --clear
```

- Code de connexion en simulation : `000000`.
- `EXPO_PUBLIC_SIMULATION_CV=rempli` donne un CV complet ; sans lui, le
  compte est vide (parcours d'import/création).
- `EXPO_PUBLIC_SIMULATION_VERSION=requise` force l'écran de mise à jour.
- Le faux serveur est dans `src/lib/dev/serveur-simule.ts` : il répond à
  toutes les routes du parcours, y compris le rendu HTML de la feuille.
- Une build de développement (dev client) est nécessaire : `npm run ios`
  ou `npm run android`. Pas de web : le projet refuse cette cible.

### Lancer contre la vraie API

`EXPO_PUBLIC_API_MODE=reel` et `EXPO_PUBLIC_API_URL=https://api.karria.fr/api/v1`
(valeurs du `.env`). Un compte de test avec un CV réaliste existe : Marc te
donnera l'adresse e-mail. Rien en production ne doit être modifié sans son
accord (modèles, versions, données d'autres comptes).

### Lancer l'API en local

```bash
cd ~/PycharmProjects/karria_api_v2
make install && make db-up && make migrate-apply && make dev
```

Le rendu PDF exige Gotenberg (`docker run -p 3005:3000 gotenberg/gotenberg`)
et un stockage S3 (MinIO en local, `make storage-provision`). Le rendu HTML
de l'atelier, lui, ne demande que l'API et la base.

---

## 3. L'architecture de l'app en soixante secondes

```
src/
├── app/                 Routes expo-router. Une route = un écran, rien d'autre.
├── features/<domaine>/  screens/ (vue seule) · components/ · hooks/ (état) · services/ (règles pures) · api/ · types/
├── components/          Partagé : bouton-action, champ-texte, en-tete-retour, pied-flottant, visionneuse-pages, orbe-vivante…
├── components/ui/       gluestack-ui généré. Ne pas modifier à la main.
├── theme/tokens.css     TOUTES les valeurs visuelles (couleurs clair/sombre, rayons, tailles). Seule source.
└── lib/                 http, stockage local, serveur simulé, liens système.
```

Domaines concernés par ce brief : `features/cv` (le CV de la personne),
`features/modeles` (galerie et détail), `features/atelier` (l'éditeur,
Finaliser, Mes CV, lecteur, lettre), `features/candidatures` (les dossiers,
l'entrée « Adapter mon CV »), `features/soutien` (achat d'un modèle Premium
depuis l'atelier), `features/publicite` (annonces natives dans le
parcours).

Composants partagés à connaître :

- `components/bouton-action.tsx` : le bouton du produit, tons `principal`
  (le seul bleu plein), `secondaire`, `discret`, `destructif`, `chaleur`,
  `premium`. **Un écran n'a qu'un bouton `principal`.**
- `components/pied-flottant.tsx` / `pied-action.tsx` : le pied fixe des
  détails, capsule de verre.
- `components/en-tete-retour.tsx` : « ‹ Retour » + titre + sous-titre.
- `components/visionneuse-pages.tsx` : feuilleter des pages en image
  (galerie, aperçu d'un export).
- `components/orbe-vivante.tsx` : l'orbe de Karria (attente, questions).
- `features/atelier/components/feuille-basse.tsx` : la demi-feuille
  (bottom sheet) commune à toutes les feuilles de l'atelier.

Le thème : 44 pt minimum pour tout ce qui se touche, jetons sémantiques
(`bg-card`, `text-muted-foreground`, `border-border-subtle`,
`bg-surface-warning`…), définis pour les deux modes. Pas de couleur en
dur, pas de suffixe d'opacité `/30`, pas de `StyleSheet`.

---

## 4. Le parcours, écran par écran

Pour chaque écran : la route, les fichiers, ce qu'il fait aujourd'hui, et
**ce que l'auteur sait déjà d'insatisfaisant** (à vérifier et compléter par
ton audit, pas à prendre pour acquis).

### 4.1 Onglet « CV » — `app/(app)/(onglets)/cv.tsx`

- Écran : `features/cv/screens/ecran-cv.tsx` (hook `use-ecran-cv.ts`).
- Trois états : chargement (le K qui respire), pas de CV (invitation :
  importer ou créer), CV présent (`components/cv-rempli.tsx`, sections
  modifiables).
- En-tête : « Mes CV » en texte et un « + » bleu qui ouvre l'atelier libre
  (« Nouveau CV »).
- Faiblesses connues : le « + » n'est pas compris comme « mettre en page
  mon CV » ; la différence entre « Mon CV » (les données) et « Mes CV »
  (les documents mis en page) n'est pas évidente pour un novice ; la
  liste des sections est longue et sans hiérarchie visuelle forte.

### 4.2 Importer un CV — `app/(app)/cv/importer.tsx`

- Écran : `features/cv/screens/ecran-import-cv.tsx` ; hooks
  `use-import-cv.ts`, `use-ecran-import-cv.ts`, `use-choix-fichiers.ts`.
- API : `POST /cv/import` (PDF, Word, image). L'orbe, une phrase honnête,
  les notes de lecture du serveur qui apparaissent une à une, puis « Voir
  mon CV ».
- Faiblesses : le temps d'attente (5 à 20 s) sans repère ; la consigne de
  vérification après import (coordonnées d'abord) est lue par peu de gens.

### 4.3 Créer un CV avec Karria — `app/(app)/cv/creer.tsx`

- Écran : `features/cv/screens/ecran-creation-cv.tsx` ; hook
  `use-creation-cv.ts` ; dictée (`features/dictee`).
- Une question à la fois, micro d'abord, écrit toujours possible, frise des
  chapitres en haut, mini-CV qui se remplit.
- API : `POST /cv/draft`, `POST /cv/draft/interpret`,
  `PUT /cv/draft/chapters/{chapter}`, `POST /cv/draft/finalize`,
  `POST /voice/transcribe`.
- Faiblesses : long pour un parcours complet ; le mini-CV est petit ; la
  reprise d'un brouillon interrompu n'est pas assez explicite.

### 4.4 Modifier une section — `app/(app)/cv/modifier/[section].tsx`

- Écran : `features/cv/screens/ecran-modifier-cv.tsx` ; hook
  `use-modifier-cv.ts` ; formulaires `features/cv/components/edition/*`
  (champs avec suggestions, sélecteur de mois, puces de missions, photo).
- API : `PUT /cv/me/chapters/{chapter}`, `GET /cv/suggestions`,
  `POST /cv/photo`, `POST /cv/me/photo/enhance`.
- Règles : les incohérences bloquent tout de suite, les manques seulement à
  la première tentative ; brouillons locaux restitués avec une bannière.
- Faiblesses : formulaires denses ; les listes (expériences) s'enregistrent
  geste par geste sans bouton, ce que certains ne comprennent pas ; pas de
  réordonnancement par glisser.

### 4.5 Galerie des modèles — `app/(app)/(onglets)/modeles.tsx` et détail `app/(app)/modele/[id].tsx`

- Écrans : `features/modeles/screens/ecran-galerie.tsx`,
  `ecran-detail-modele.tsx` ; hooks `use-galerie.ts`, `use-detail-modele.ts`,
  `use-ouverture-modele.ts`.
- API : `GET /templates/`, `GET /templates/{id}`,
  `POST /templates/{id}/view`, `GET /templates/{id}/reviews`,
  `POST /templates/{id}/preview` (mon CV dans ce modèle),
  `GET|POST /user-templates/me`, `GET|PUT /user-templates/me/selected`.
- Les neuf modèles actuels sont des **créations Karria** (dérivées puis
  validées par Marc), chacun avec un portrait d'exemple généré. Grille de
  deux colonnes, pastille Premium dorée, carrousel CV + lettres en plein
  écran, « Utiliser ce modèle » ouvre l'atelier avec les données de la
  personne.
- C'est l'écran que Marc préfère : **sa qualité est la référence** pour le
  reste du parcours.

### 4.6 Entrer dans l'atelier

Deux entrées :

- **Depuis une offre** : « Adapter mon CV à cette offre »
  (`features/atelier/hooks/use-entree-atelier.ts`) → `POST /applications`
  crée un dossier et lance l'adaptation par Karria → route
  `app/(app)/atelier/[dossierId]/index.tsx`. Sans CV de base : alerte qui
  mène à l'onglet CV. Sans compte : la porte de connexion, puis reprise
  automatique du geste.
- **Libre** (« Nouveau CV », galerie, Mes CV) : route
  `app/(app)/atelier/libre/index.tsx`, sur le CV de base, sans Karria.
  `use-atelier-avec-modele.ts` partage le geste « ouvrir avec ce modèle ».

### 4.7 L'atelier — l'écran central

- Écran : `features/atelier/screens/ecran-atelier.tsx` (327 lignes, vue
  seule) ; hook `hooks/use-atelier.ts` (**1 181 lignes** : toute la
  logique) ; feuille `components/feuille-cv.tsx` (WebView unique, jamais
  rechargée, `services/script-feuille.ts`) ; barre
  `components/barre-atelier.tsx` ; feuilles basses `feuille-modifier`,
  `feuille-karria`, `feuille-mise-en-avant`, `feuille-intitule`,
  `feuille-modele`, `feuille-couleur`, `feuille-une-page`,
  `feuille-paragraphe` (lettre) ; attente `attente-adaptation.tsx` ; note
  `note-karria.tsx`.
- **Anatomie actuelle** : en haut « ‹ Offre » + entreprise/poste, annuler /
  rétablir, l'état d'enregistrement en un mot ; la feuille pleine largeur
  (pincer pour zoomer, défiler les pages) avec dessus la pastille du
  modèle (« Meridian · Changer »), la pastille de couleur, et le nombre de
  pages ; une ligne « Ton CV fait 2 pages · Tenir sur une page » quand ça
  déborde ; la barre basse en capsule : Modifier · Karria · Mise en avant ·
  Intitulé · Finaliser (Finaliser seul en bleu). En libre : quatre gestes.
- **Trois horloges** : patch local immédiat dans la page à chaque frappe ;
  rendu serveur au repos (400 ms, `services/file-de-rendu.ts`, un seul en
  vol, le dernier gagne) ; sauvegarde différée (1,5 s,
  `PUT /applications/{id}/cv`). Brouillon local dans le cache
  (`services/brouillon-atelier.ts`) ; historique de 50 instantanés
  (`services/historique.ts`).
- **Toucher un élément de la feuille** ouvre `feuille-modifier` avec le
  formulaire existant de la section (pas d'édition en place dans la page).
  Depuis le bouton « Modifier » sans cible : la liste des sections.
- **Karria** (dossier seulement) : propositions à accepter/refuser une à
  une ou toutes, couverture des mots-clés de l'offre en deux rangées de
  pastilles. API `POST /applications/{id}/propositions/{pid}`.
- **Mise en avant** : monter/descendre/masquer par rubrique ; l'ordre des
  rubriques est fixé par le modèle.
- **Modèle** : demi-feuille, le courant en grand, « Tes modèles », puis les
  Premium avec prix ; toucher redessine la feuille ; achat Stripe sans
  quitter l'atelier (`use-choix-modele.ts`, `features/soutien`). API
  `PUT /applications/{id}/template`, `PUT /user-templates/me/selected`.
- **Couleur** : pastilles (« D'origine » + dix teintes), curseur de nuance,
  code hexadécimal ; la feuille suit en direct ; le serveur recolore le
  décor, pas le texte. API `PUT /applications/{id}/color`.
- **Deux pages** : autorisées (décision de Marc : « s'il veut garder ses
  deux pages, qui suis-je pour l'en empêcher »), la seconde page doit être
  propre (le script de mise en page du serveur pousse les éléments
  coupés). « Tenir sur une page » ouvre `feuille-une-page` : état en direct
  (« 2 pages » ambre / « Tient sur une page » vert) et propositions à
  masquer du moins au plus coûteux (`services/une-page.ts`).
- **Faiblesses connues** (à confirmer) :
  - cinq gestes dans la barre, dont deux abstraits pour un novice
    (« Mise en avant », « Intitulé ») ;
  - les pastilles posées sur la feuille masquent un coin du CV et ne sont
    pas perçues comme des boutons ;
  - la ligne « 2 pages » a déjà été refaite deux fois ; Marc l'a trouvée
    « pas visible » et « sans beaucoup de sens » dans sa première forme ;
  - toucher la feuille pour modifier n'est pas découvert spontanément (la
    liste des sections existe pour cela, mais arrive après) ;
  - le premier affichage attend le rendu serveur (200 à 400 ms, plus la
    WebView) : un blanc perceptible ;
  - le zoom est celui du moteur web : sur Android il est moins fluide ;
  - annuler/rétablir ne donnent aucun retour visible de ce qu'ils ont
    annulé ;
  - la couleur offre trois gestes là où la plupart n'en veulent qu'un ;
  - pas d'onboarding, pas de première explication (« touche un élément
    pour le modifier ») ;
  - accessibilité non auditée (36 `accessibilityLabel` dans l'atelier,
    Dynamic Type non vérifié, VoiceOver non testé).

### 4.8 La lettre — `app/(app)/atelier/[dossierId]/lettre.tsx`

- Écran : `features/atelier/screens/ecran-lettre.tsx` ; hook
  `use-lettre.ts` ; feuille commune ; `feuille-paragraphe.tsx` (modifier
  / Karria réécrit) ; `pastille-style-lettre.tsx`.
- API : `POST|PUT /applications/{id}/letter`,
  `POST /applications/{id}/letter/paragraphs/{i}/regenerate`,
  `PUT /applications/{id}/letter-style`, rendu `POST /documents/{template_id}/render`.
- Sans lettre : l'orbe, « Et ta lettre ? », deux voies. Avec : la feuille,
  conseils en une ligne, « Continuer » vers Finaliser.
- Faiblesses : l'étape est obligatoire dans le flux d'un dossier même quand
  on ne veut pas de lettre ; la lettre sobre (sans modèle apparié) est
  austère.

### 4.9 Finaliser — `app/(app)/atelier/[dossierId]/finaliser.tsx` et `atelier/libre/finaliser.tsx`

- Écran : `features/atelier/screens/ecran-finaliser.tsx` (389 lignes) ;
  hook `use-finaliser.ts` (541 lignes) ; `verdict-ats.tsx`,
  `carte-optimisation.tsx`, `cadran-ats.tsx`, `carte-export-cv.tsx`,
  `bouton-format.tsx`, `feuille-envoi.tsx`.
- À l'ouverture : export du CV (`POST /cv/me/generated-cvs`, PDF + DOCX,
  score ATS) et de la lettre (`POST /documents/letters/export`) en
  parallèle ; l'orbe pendant 1 à 3 s ; annonce native pendant l'attente.
- Puis : **le verdict ATS** (carte teintée, « Validé ATS », « 97 % » en
  très grand, « Karria a rendu ton CV compatible à 97 % avec les logiciels
  de tri », le sigle expliqué une fois) ; **la carte « Optimiser pour les
  ATS »** (seul bouton bleu de la zone, gain en points ; c'est l'endroit
  prévu pour une conversion payante plus tard ; après optimisation, une
  ligne « Version optimisée ») ; **« Ce qui fait la différence »**
  (points repliables, sans bouton « Je corrige ») ; **les documents** avec
  vignette d'aperçu et loupe (→ `app/(app)/apercu-export.tsx`,
  `ecran-apercu-export.tsx`, pages en image feuilletées comme en galerie),
  PDF et Word ; en pied **« Envoyer par e-mail »**. Après téléchargement
  ou envoi : la feuille « As-tu candidaté ? » (domaine Candidatures).
- Retour : « ‹ » revient exactement où l'on était (l'atelier, avec son
  état) ; l'export est **identique** à ce qu'on voyait dans l'éditeur
  (plus aucun resserrement silencieux à l'export).
- En libre : un document, pas de lettre, pas de question.
- Faiblesses : l'écran est long ; le lien entre « ce qui fait la
  différence » et une action concrète n'est pas clair ; la mécanique
  PDF/Word (deux boutons par document) alourdit ; le Word est moins
  fidèle que le PDF et rien ne le dit ; l'envoi e-mail n'a pas de message
  libre (c'est voulu : gabarit serveur), mais la feuille doit le dire
  mieux.

### 4.10 Mes CV — `app/(app)/cv/mes-cv.tsx`

- Écran : `features/atelier/screens/ecran-mes-cv.tsx` ; hook
  `use-mes-cv.ts` ; `carte-export-cv.tsx`.
- API : `GET /cv/me/generated-cvs?kind=cv` (filtré sans dossier côté app),
  `DELETE /cv/me/generated-cvs/{id}`, `POST /documents/exports/{id}/send`.
- Cartes du plus récent au plus ancien avec vignette du modèle (depuis la
  galerie), ouvrir (lecteur), télécharger, envoyer, supprimer, « Voir
  avec un autre modèle » ; en pied « Nouveau CV ».
- Faiblesses : un export ne porte pas le CV qui l'a produit (écart de
  contrat connu : « Voir avec un autre modèle » repart du CV courant) ; les
  noms des exports ne sont pas modifiables.

### 4.11 Le lecteur — `app/(app)/lecture-document.tsx`

- Écran : `features/atelier/screens/ecran-lecteur.tsx` ; hook
  `use-lecteur-document.ts`, `use-ouvrir-lecteur.ts` ; `services/lecteur.ts`.
- PDF dans une vue web avec l'en-tête Karria, Télécharger et Partager. Sur
  Android et pour un Word : pas d'aperçu, une phrase l'explique.
- Faiblesses : lent à ouvrir ; l'aperçu en image (§ 4.9) est meilleur et
  pourrait le remplacer partout.

### 4.12 Les dossiers (Candidatures) — `app/(app)/(onglets)/dossiers.tsx`, `candidatures/[id]/*`

- Écrans : `features/candidatures/screens/ecran-candidatures.tsx`,
  `ecran-dossier.tsx`, `ecran-lecture-dossier.tsx`.
- API : `GET /applications`, `GET|DELETE /applications/{id}`,
  `POST /applications/{id}/adapt`, `POST|DELETE /applications/{id}/applied`.
- C'est là qu'on retrouve un CV adapté à une offre et qu'on rouvre
  l'atelier. À auditer surtout pour la cohérence avec Mes CV.

### 4.13 Autour du parcours

- Annonces natives (`features/publicite`) : dans l'attente de l'adaptation,
  sous le score à Finaliser, après la deuxième carte de Mes CV. Jamais à
  côté d'un bouton bleu. L'abonnement « sans pub » les retire.
- Soutien (`features/soutien`) : achat d'un modèle Premium (paiement
  unique Stripe), « sans pub » mensuel ou annuel, cafés. La feuille « sans
  pub » a été refaite sur les études de paywalls (démonstration, deux
  formules, garanties, un seul CTA fixe).
- Mise à jour obligatoire (`features/demarrage`) : écran bloquant avec le
  numéro de version et un bouton vers le store.

---

## 5. Le backend, ce que tu dois en savoir

Module `src/karria/modules/documents/` de l'API (ports & adapters :
`domain/` règles pures, `application/` cas d'usage, `infrastructure/`
rendu, `api/` routeurs).

- **Un modèle** = une spécification JSON (page, polices, styles, en-tête en
  positions absolues, bandes → colonnes → rubriques, décorations) obtenue
  par ingestion d'un PDF puis dérivation (« création Karria »). Le rendu
  HTML (`infrastructure/html_renderer.py`) place le CV de la personne dans
  cette spécification ; un script dans la page ajuste l'espacement, le corps
  des champs trop longs (interlettrage, puis réduction, puis repli), pousse
  ce qui déborde sur la page suivante et laisse les pages propres.
- **Le rendu de l'atelier** : `POST /documents/{template_id}/render` rend le
  HTML **ancré** (`data-chemin` sur chaque élément : `experiences.0.missions.1`)
  que la WebView affiche et que l'app patche à la frappe. 200 à 400 ms,
  90 rendus par minute et par personne.
- **L'export** : `POST /cv/me/generated-cvs` rend PDF (Gotenberg/Chromium,
  le même HTML que l'atelier) et DOCX (`docx_renderer.py`, approximation),
  calcule le score ATS (`domain/ats.py`, `ats_reader.py`), produit les
  aperçus PNG par page (`preview_urls`). Option `ats_safe` pour une version
  optimisée ATS.
- **Couleur** : `domain/palette.py` recolore le décor ; `color` sur le
  dossier ou la sélection de modèle.
- **Lettres** : document à part (`domain/letter.py`), modèle apparié ou
  lettre sobre.
- **Envoi** : `POST /documents/exports/send` → file Procrastinate, gabarit
  d'e-mail minimaliste Karria, état via `GET /documents/sends/{id}`.
- **Dossiers** : module `applications` (adaptation par LLM, propositions,
  lettre, modèle, couleur, « j'ai candidaté »).
- **CV** : module `cv` (import, brouillon conversationnel, chapitres,
  photo, suggestions).

Ce que le backend ne fait pas encore et qui pourrait servir ton audit
(à proposer, pas à faire sans accord) : stocker le CV exact avec un export ;
renommer un export ; un rendu partiel plus rapide pour le premier
affichage ; un endpoint de « pages » sans HTML complet.

Outils utiles côté API : `uv run python scripts/templates.py` (commandes
`derive`, `portraits`, dépôt d'un modèle), `make check`, et des scripts de
diagnostic décrits dans `docs/REPRISE.md`.

---

## 6. Les règles qui ne se discutent pas

Du dépôt (`AGENTS.md` de l'app, résumé) :

1. **Un écran ne contient que de la vue** : un hook, du JSX. Pas de
   `useState` métier, pas d'effet, pas de fetch, pas de calcul.
2. **Aucun `StyleSheet`, aucun style en ligne, aucune couleur en dur,
   aucun suffixe d'opacité** : tout passe par les classes qui lisent
   `src/theme/tokens.css`. Ajouter un jeton est bien ; le contourner, non.
3. **Les appels réseau vivent dans `api/`** et traduisent le `snake_case`.
4. **Chaque fichier a un en-tête en français** qui dit pourquoi il existe
   et quelle décision il porte.
5. **Vérifier qu'une API existe** (Expo, gluestack, Reanimated) avant de
   l'appeler.
6. **iOS et Android uniquement**, jamais de code web.
7. `npm run check` vert avant tout commit. Commits Conventional, en
   français, portée = domaine (`feat(atelier): …`).
8. Ne pas réécrire un écran entier pour trois lignes ; `Edit` ciblé.
9. Pas de sous-agents ni de workflows multi-agents sans demande.

De Marc :

- **Ne jamais pousser sur `main` de l'API sans `make check` vert** : la
  production se déploie toute seule. Idem pour l'app par prudence.
- Ne jamais écrire de secret dans un fichier ou une réponse ; ne jamais
  toucher aux autres applications du serveur de production.
- Ne pas modifier les neuf modèles publiés ni leurs versions en
  production sans son accord.
- Tenir `docs/REPRISE.md` à jour en fin de session dans chaque dépôt :
  ce qui est fait, vu, non vérifié, et ce qui reste.
- Dire ce qui n'a pas été vérifié. « Ça compile » n'est pas « ça marche ».

Design :

- Une seule action bleue par écran ; les autres au ton de l'écran.
- 44 pt minimum pour tout ce qui se touche ; mouvement réduit respecté.
- Les deux modes (clair, sombre) à chaque capture.
- La feuille du CV reste blanche : c'est du papier.
- Texte en français, tutoiement, sans jargon non expliqué (ATS expliqué
  une fois, en petit).
- Pas d'esthétique « IA » : pas de dégradés violets génériques, pas
  d'étincelles, pas d'emoji dans les titres, pas d'ombres portées lourdes.
- Honnêteté des attentes : pas de barre de progression factice.

---

## 7. Ce qu'on attend de toi, dans l'ordre

### Étape 1 — Audit (livrable : `docs/AUDIT-UX-ATELIER.md` dans l'app)

Pour chaque écran du § 4, sur simulateur iOS **et** émulateur Android,
clair **et** sombre, avec le compte `rempli` en simulation :

- une capture annotée ;
- les frictions, classées : **bloquant** (la personne n'y arrive pas),
  **fatigant** (elle y arrive en réfléchissant), **poli** (détail) ;
- pour chaque friction : la cause (information, geste, hiérarchie,
  attente, vocabulaire), et la proposition ;
- un test « personne pressée » : combien de touchers de l'offre au CV
  envoyé ? combien d'écrans ? où hésite-t-on ?
- un test « première fois » : sans rien connaître, comprend-on qu'on peut
  toucher la feuille, changer de modèle, tenir sur une page ?
- accessibilité : Dynamic Type (taille XXL), VoiceOver / TalkBack sur
  l'atelier et Finaliser, contraste des pastilles sur la feuille.

Appuie-toi sur des principes établis (Fitts, Hick, charge cognitive,
divulgation progressive, reconnaissance plutôt que rappel, Apple HIG et
Material 3 pour les gestes natifs) et cite-les quand ils tranchent.

### Étape 2 — Plan priorisé (dans le même document)

Classé par impact pour la personne / coût de réalisation, avec pour
chaque item : écran, fichiers touchés, comportement avant/après, risque,
et si le backend doit bouger. Marc tranche ce plan avant l'étape 3.

### Étape 3 — Implémentation

- Un item = un commit, vérifié (`npm run check`), capturé avant/après.
- Garder les comportements du § 4 qui ne sont pas visés par l'item.
- Les feuilles de l'atelier partagent `feuille-basse.tsx` : une
  amélioration d'ergonomie s'y fait une fois pour toutes.
- Si tu touches `use-atelier.ts`, découpe plutôt que d'ajouter : il fait
  déjà 1 181 lignes.
- Les textes changés se relisent à voix haute : courts, concrets, tutoyés.
- Tout nouveau comportement a un test (Jest côté app, pytest côté API).

### Étape 4 — Preuve et passation

- Captures iOS + Android, clair + sombre, pour chaque écran modifié.
- `npm run check` vert ; `make check` vert si l'API a bougé.
- Entrée datée dans `docs/REPRISE.md` des deux dépôts : fait, vu, non
  vérifié, reste.
- Pas de push sur `main` de l'API sans l'accord de Marc.

---

## 8. Repères factuels pour ne pas repartir de zéro

- Les comptes-rendus détaillés des sessions qui ont construit l'atelier :
  `karria_app/docs/REPRISE.md`, sections du 2026-11-05 (atelier, Mes CV,
  Candidatures) au 2026-11-14 ; `karria_api_v2/docs/REPRISE.md`, sections
  du 2026-11-13 et 2026-11-14 (seconde page, aperçus, exports fidèles,
  créations Karria, en-tête).
- Décisions d'architecture du backend : `karria_api_v2/docs/adr/0020`,
  `0029` (rendu HTML ancré), `0030` (lettre), `0031` (envoi e-mail),
  `0033` (dossiers), `0034` (couleur principale), `0035` (pied de page
  Karria), `0036` (lettre appariée ou sobre), `0037` (ingestion v2).
- Feuille de route d'origine (les intentions) :
  `karria_api_v2/docs/atelier-cv-feuille-de-route.md`.
- Retours de Marc déjà intégrés, à ne pas défaire : le verdict ATS en
  grand avec sa phrase ; la carte « Optimiser » isolée (futur point de
  conversion) ; « ce qui fait la différence » sans bouton de correction ;
  le retour arrière qui revient où l'on était ; les aperçus d'export
  feuilletés comme la galerie ; les deux pages autorisées mais propres ;
  l'information sur les pages lisible et pas posée sur le CV ; l'export
  identique à l'éditeur ; la couleur d'origine du modèle par défaut ; la
  carte « Mon CV » retirée du profil.

---

## 9. Glossaire

- **Atelier** : l'éditeur de CV (feuille en temps réel).
- **Dossier** : une candidature à une offre (CV adapté + lettre).
- **Libre** : l'atelier sans dossier, sur le CV de base (« Nouveau CV »).
- **Karria** : l'IA du produit, toujours nommée, qui propose sans imposer.
- **Feuille** : la WebView qui montre le CV ; **feuille basse** : le panneau
  qui monte du bas (bottom sheet).
- **Mise en avant** : l'ordre et la visibilité des éléments dans une rubrique.
- **Intitulé** : le poste visé affiché en en-tête du CV.
- **ATS** : logiciel de tri des candidatures ; le score mesure la
  lisibilité du CV par ces logiciels.
- **Modèle** : une mise en page ; **création Karria** : modèle dérivé qui
  appartient à Karria ; **Premium** : modèle à paiement unique.
- **Export** : un PDF/DOCX produit par le serveur, avec ses aperçus.
- **REPRISE.md** : le journal de passation de chaque dépôt.
