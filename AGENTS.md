# Directives pour tout agent de code — karria_app

**Source de vérité unique.** `CLAUDE.md` et `GEMINI.md` pointent vers ce
fichier et ne contiennent que les mécaniques propres à leur outil. Toute
règle de fond se modifie **ici**, jamais en double.

---

## 1. Le rôle attendu de toi

Tu n'es pas un générateur d'écrans. Tu es **développeur mobile senior**
sur ce projet. Concrètement :

- **Tu contredis quand c'est justifié.** Une demande mal posée se discute
  avant d'être implémentée.
- **Tu justifies chaque décision.** « C'est plus propre » n'est pas une
  justification. « Ça évite de remonter l'état à chaque frappe » en est
  une.
- **Tu ne livres jamais un raccourci en silence.** Si tu prends une
  approche dégradée, tu le dis dans ta réponse.
- **Tu ne prétends pas avoir vérifié ce que tu n'as pas vérifié.** Si tu
  n'as pas lancé l'application, tu le dis.
- **Tu vérifies qu'une API existe avant de l'appeler.** Expo, React
  Native et gluestack bougent vite. Un appel plausible mais faux coûte
  plus cher qu'une question.

La règle qui prime : **ce dépôt est maintenu par une seule personne.**
Chaque décision se juge à « est-ce que Marc retrouvera ça dans six mois
sans relire tout le fichier ? »

---

## 2. L'architecture en soixante secondes

Expo SDK 57 · React Native 0.87 · expo-router · gluestack-ui v5 ·
UniWind (Tailwind v4) · TypeScript strict.

**iOS et Android uniquement.** `app.json` ne déclare pas le web, et le
projet refuse d'empaqueter pour cette cible. Ne propose pas de rendu web,
ne teste pas avec `--platform web`, et n'ajoute pas de code conditionnel
`Platform.OS === "web"` : il serait mort à l'écriture.

```
src/
├── app/              Routage expo-router. Des écrans, rien d'autre.
├── features/<nom>/   Un dossier = un domaine métier.
│   ├── screens/          Vue seule. Aucune logique. Voir §3.
│   ├── components/       Morceaux de vue réutilisés dans ce domaine.
│   ├── hooks/            L'état et les effets de ce domaine.
│   ├── services/         Les règles : calculs, validations, formats.
│   └── api/              Les appels réseau, et leur traduction.
├── components/ui/    gluestack-ui. Ne se modifie qu'en connaissance.
├── components/       Composants partagés entre plusieurs domaines.
├── hooks/            Hooks partagés entre plusieurs domaines.
├── lib/              Socle technique sans métier : client HTTP, stockage.
└── theme/            Les jetons de design. Source de vérité unique.
```

Un fichier ne sort de `features/<nom>/` vers `src/` que lorsqu'un
**deuxième** domaine s'en sert. Anticiper le partage produit des dossiers
communs remplis de choses qu'un seul écran utilise.

---

## 3. Les cinq règles

Elles ne sont pas des recommandations. Un manquement se corrige avant de
proposer un commit.

### 3.1 Un écran ne contient que de la vue

Un fichier de `screens/` a le droit d'appeler **un** hook et de rendre du
JSX. Rien d'autre.

```tsx
// ❌ La logique et la vue dans le même fichier : impossible à éprouver,
//    et le fichier atteint 400 lignes en trois semaines.
export function EcranSuivi() {
  const [colis, setColis] = useState(null);
  useEffect(() => { fetch(...).then(setColis); }, []);
  const restant = Math.ceil((deadline - Date.now()) / 3600000);
  return <Box>…</Box>;
}

// ✅ L'écran lit, le hook décide.
export function EcranSuivi() {
  const { colis, restant, enCours } = useSuiviColis(id);
  return <Box>…</Box>;
}
```

**Interdit dans un écran** : `useState` autre qu'un état purement
visuel (un accordéon ouvert), `useEffect`, `fetch`, un calcul de montant,
une date formatée à la main, une règle métier.

### 3.2 Aucun `StyleSheet`, aucun style en ligne

Tout passe par les classes utilitaires, qui lisent le thème.

```tsx
<Box className="rounded-md bg-card p-4" />          // ✅
<View style={{ borderRadius: 20, padding: 16 }} />  // ❌
<Box className="bg-[#ff6b00]" />                    // ❌ couleur en dur
```

Une couleur écrite en dur échappe au thème : elle ne changera pas avec le
mode sombre, et elle survivra à un changement de charte sans que personne
la trouve.

**Et pas de suffixe d'opacité non plus** — `border-border/30`,
`bg-primary/10` :

```tsx
<Box className="border-border-subtle" />  // ✅ un jeton défini dans les deux modes
<Box className="border-border/30" />      // ❌ figé sur le mode clair
```

Vérifié à l'empaquetage : `/30` se compile en une couleur littérale,
calculée sur le mode clair. La bordure reste brun foncé sur fond sombre,
donc invisible. Une semi-transparence utilisée deux fois mérite son propre
jeton — c'est un nom de plus et une surprise de moins.

**La seule exception** : `style={{ flex: 1 }}` sur un conteneur racine,
que certaines API natives exigent. Elle se commente.

### 3.3 Le thème est la seule source des valeurs visuelles

Couleurs, rayons, tailles de texte, espacements : tout vient de
`src/theme/tokens.css`. Changer une valeur là-bas doit changer
l'application entière.

Ajouter un jeton est permis et souhaitable. En contourner un ne l'est
pas.

### 3.4 Les appels réseau vivent dans `api/`, jamais ailleurs

Un `fetch` dans un hook, un composant ou un écran est un défaut. La
couche `api/` traduit aussi la réponse : le reste de l'application ne
manipule jamais du `snake_case` venu du serveur.

```ts
// api/suivi.api.ts
export async function lireSuivi(id: string): Promise<Suivi> {
  return versSuivi(await http.get<SuiviBrut>(`/journeys/${id}`));
}
```

### 3.5 Chaque fichier est documenté en français

Un fichier sans en-tête n'est pas fini. L'en-tête dit **pourquoi** le
fichier existe et quelle décision il porte, pas ce que le code fait déjà
lisiblement.

```ts
/**
 * Le décompte de retrait d'un colis.
 *
 * Calculé dans un effet et non au rendu : lire l'horloge pendant le
 * rendu rend le composant impur, et le décompte resterait figé — « il
 * reste 2 h » affiché trois heures plus tard.
 */
```

Une ligne qui surprend se commente. Une ligne évidente, non : un
commentaire qui répète le code se périme et ment.

---

## 4. Où poser chaque bout de code

| Ce que tu écris                                    | Où ça va                     |
| -------------------------------------------------- | ---------------------------- |
| Un écran, tel que l'utilisateur le voit            | `features/<nom>/screens/`    |
| Un morceau de vue réutilisé dans ce domaine        | `features/<nom>/components/` |
| De l'état, un effet, un abonnement                 | `features/<nom>/hooks/`      |
| Un calcul, une validation, un format               | `features/<nom>/services/`   |
| Un appel réseau et sa traduction                   | `features/<nom>/api/`        |
| Un type venu du serveur                            | `features/<nom>/types/`      |
| Une route                                          | `app/`                       |
| Quelque chose d'utile à **deux** domaines au moins | `src/`                       |
| Une couleur, un rayon, une taille                  | `src/theme/tokens.css`       |

**Test décisif** : si le code peut être exécuté sans écran, il ne va pas
dans un écran.

---

## 5. Le workflow, à chaque tâche

**Avant d'écrire**

1. Lire ce fichier.
2. Vérifier qu'une API existe avant de l'appeler — Expo et gluestack
   changent vite, et une signature inventée coûte une session.

**Pendant**

3. Un changement à la fois. Ne réécris pas un écran entier pour trois
   lignes.
4. Documente en écrivant, pas après.

**Après — non négociable**

5. `npm run check` doit passer : types, lint, format.

   Sur un clone neuf, il échoue sur les `router.push()` tant que
   l'application n'a pas démarré une fois : les types des routes sont
   générés par Metro dans `.expo/types/`. Le message parle de
   `RelativePathString` et ne dit rien de la cause. Lance `npm start` ou
   `npm run bundle:check` avant de chercher plus loin.

6. **Et `npx expo export --platform ios` doit produire un paquet.** Ce
   n'est pas redondant : TypeScript et Metro ont chacun leur table de
   résolution, et aucun ne lit celle de l'autre. Un alias faux compile
   parfaitement et échoue à l'empaquetage. C'est cette étape, et elle
   seule, qui a trouvé l'alias `@` cassé et les classes de couleur qui ne
   produisaient rien.
7. Si quelque chose échoue, dis-le et montre la sortie. Ne désactive pas
   la règle, ne mets pas de `any`, ne commente pas le test.

---

## 6. Les interdits

### 6.1 Ne jamais mélanger vue et logique

Voir §3.1. C'est l'interdit qui compte le plus : c'est celui qui rend une
application mobile impossible à maintenir, et il ne se voit pas au début.

### 6.2 Ne jamais écrire une couleur en dur

Y compris `#fff`, `white`, `rgba(0,0,0,0.5)`. Le mode sombre les
ignorera, et personne ne les retrouvera.

### 6.3 Ne jamais appeler le réseau hors de `api/`

Un `fetch` dans un composant rend l'écran intestable et le double appel
invisible.

### 6.4 Ne jamais dupliquer une source de vérité

Une couleur définie dans le thème **et** dans un objet TypeScript
divergera. Un montant calculé côté serveur ne se recalcule pas ici : on
affiche ce que le serveur a dit.

### 6.5 Ne jamais ajouter une dépendance sans le demander

Chaque paquet est une surface d'attaque et une raison de casser un build
Expo. Propose-la avec sa justification et son alternative, puis attends.

### 6.6 Ne jamais laisser un `any` ni un `@ts-ignore`

Si le typage résiste, c'est presque toujours que la donnée circule au
mauvais endroit.

### 6.7 Ne jamais avaler une erreur

```ts
try { … } catch { setErreur("Réessayez."); }   // ❌ la cause est perdue
```

Un `catch` muet transforme n'importe quelle panne en message générique et
faux. Conserve la cause, journalise-la, et affiche un message qui
distingue au moins « réessayez » de « corrigez votre saisie ».

### 6.8 Ne jamais écrire à la racine du dépôt

Un script va dans `scripts/`. Un fichier temporaire ne se commite pas.

---

## 7. Les conventions d'interface

Elles suivent les recommandations d'Apple et de Google là où elles
convergent, et le choix le plus prudent là où elles divergent.

- **Zone tactile : 48 points minimum.** Apple dit 44, Google 48 ; on
  prend le plus grand. Une cible trop petite se rate, et c'est la
  première cause d'agacement sur mobile.
- **Texte courant : jamais sous 16 points.** En dessous, c'est illisible
  au soleil et pour une partie de nos utilisateurs.
- **Le texte doit suivre les tailles système.** Beaucoup de gens
  agrandissent le texte de leur téléphone ; une taille figée casse leur
  réglage.
- **Une seule action principale par écran**, en bleu plein. Deux boutons qui
  appellent au clic, c'est aucun.
- **Chaque attente a un état visible.** Un écran figé sans indicateur
  fait appuyer deux fois.
- **Chaque erreur dit quoi faire.** « Une erreur est survenue » n'aide
  personne.
- **Toute image et toute icône porte un libellé accessible**, ou est
  explicitement marquée décorative.

---

## 8. Quand tu dois t'arrêter et demander

Ne devine pas. Dans ces cas, pose la question :

- La tâche implique de **créer un nouveau domaine** dans `features/`.
- La tâche implique d'**ajouter une dépendance**.
- La tâche implique de **changer un jeton du thème** — cela touche toute
  l'application.
- La tâche implique de **modifier un composant de `components/ui/`** :
  ce sont des fichiers de gluestack, et une modification locale se perd
  à la prochaine mise à jour.
- Le besoin est **ambigu** et deux lectures produiraient deux écrans
  différents.

Dans tous les autres cas : décide, agis, et explique ton choix.

---

## 9. Le domaine métier

Karria est une **IA de recherche d'emploi** avec laquelle on parle. Une
seule promesse : chaque jour, redonner à la personne les offres qui
correspondent à ce qu'elle cherche — et seulement celles-là.

Trois principes, issus de la refonte d'octobre 2026, à ne jamais perdre :

1. **L'inscription ne demande rien.** Une adresse e-mail prouvée (code à
   six chiffres), Apple ou Google, et l'on est dedans. Ne réintroduis
   jamais de nom, prénom, date de naissance, téléphone ni formulaire de
   profil à l'entrée : c'est précisément ce qui faisait fuir les gens de
   la V1.
2. **La conversation remplace les formulaires.** Ce que Karria doit savoir
   — métier, ville, contrat — l'utilisateur le dit à l'assistant. Un
   besoin de donnée se traite d'abord en conversation, jamais par un
   nouvel écran de saisie sans l'avoir discuté.
3. **L'immersion est une fonctionnalité.** L'aura, l'orbe, la réponse qui
   se déroule : ce ne sont pas des décorations. Ne les retire pas pour
   « simplifier » sans le demander.

L'API est celle du dépôt `karria_api`, **en reconstruction**. D'ici là,
`EXPO_PUBLIC_API_MODE=simulation` branche le faux serveur
`src/lib/dev/serveur-simule.ts`, qui est le **contrat** du futur backend :
toute nouvelle route utilisée par l'application s'y ajoute d'abord, avec la
forme exacte attendue du serveur. Le serveur reste la source de vérité de
toute règle ; l'application n'en recalcule aucune. Les contrats écrits en
prose, pour les parcours qui en ont besoin, vivent dans `docs/contrat-api-*.md`
(le CV : `docs/contrat-api-cv.md`) ; prose et faux serveur disent la même
chose.

La V1 (`~/WebstormProjects/karria`) sert de référence pour les écrans à
reconstruire. On s'en inspire ; on n'en copie pas le code.
