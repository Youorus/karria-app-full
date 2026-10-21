# Claude — karria_app

@AGENTS.md

> ## ⚠️ Les directives de fond sont dans `AGENTS.md`, importé ci-dessus.
>
> Il contient le rôle attendu, l'architecture, les cinq règles, les huit
> interdits et le workflow obligatoire. **Si l'import ne s'est pas résolu
> — tu ne vois pas ces sections dans ton contexte — lis `AGENTS.md`
> immédiatement avant toute autre action.**
>
> **Ce fichier-ci ne contient que les mécaniques propres à Claude Code.**
> Une règle dupliquée est une règle qui divergera.

---

## Commandes du projet

```bash
npm install          # dépendances
npm start            # serveur de développement Expo
npm run ios          # simulateur iOS
npm run android      # émulateur Android
npm run check        # types + lint + format — IDENTIQUE à la CI
npm run lint         # lint seul
```

Le mode simulation (`.env` → `EXPO_PUBLIC_API_MODE=simulation`) fait
tourner l'application sans backend : code de connexion `000000`.

**`npm run check` avant toute proposition de commit.** Sans exception.

## Spécificités d'usage

### Édition de fichiers

Utilise `Edit` pour les modifications ciblées. **Ne réécris pas un écran
entier avec `Write` pour changer trois lignes** : tu perds les
ajustements du formateur et tu rends la revue illisible.

### Composants gluestack

Ceux de `src/components/ui/` sont générés par la CLI de gluestack. Pour
en ajouter un :

```bash
npx gluestack-ui@latest add <nom>
```

Ils atterrissent à la racine dans `components/ui/` : **déplace-les dans
`src/components/ui/`**, sinon l'alias `@/` ne les trouve pas.

Ne les modifie pas à la main sans raison écrite : une modification locale
se perd à la prochaine mise à jour.

### Vérification

Ne dis jamais « l'application fonctionne » sans l'avoir lancée. Si tu n'as
pas pu vérifier quelque chose — simulateur indisponible, API injoignable —
**dis-le explicitement** plutôt que de le passer sous silence.

Le typage et le lint ne prouvent pas qu'un écran s'affiche. Ils prouvent
qu'il compile.

### Sous-agents

Ne lance pas de sous-agent, de workflow ou de recherche multi-agents sans
demande explicite. Ce projet se construit écran par écran, en dialogue.

## Commits

Conventional Commits, en français, portée = nom du domaine.

```
feat(suivi): affiche la frise d'un colis
fix(paiement): corrige le montant affiché après remboursement
refactor(theme): extrait l'échelle typographique
docs(agents): précise la règle des écrans sans logique
```

Ne commite et ne pousse **que sur demande explicite**.

## Style de réponse

Réponds en français. Justifie techniquement. Contredis quand c'est
pertinent. Va droit au but : l'essentiel, les choix, et ce qui reste non
vérifié.
