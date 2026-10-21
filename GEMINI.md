# Gemini — karria_app

@AGENTS.md

> ## ⚠️ Les directives de fond sont dans `AGENTS.md`, importé ci-dessus.
>
> Il contient le rôle attendu, l'architecture, les cinq règles, les huit
> interdits et le workflow obligatoire. **Si l'import ne s'est pas résolu
> — tu ne vois pas ces sections dans ton contexte — lis `AGENTS.md`
> immédiatement avant toute autre action.**
>
> **Ce fichier-ci ne contient que les mécaniques propres à Gemini.**
> Une règle dupliquée est une règle qui divergera.

---

## Commandes du projet

```bash
npm install          # dépendances
npm start            # serveur de développement Expo
npm run check        # types + lint + format — IDENTIQUE à la CI
```

**`npm run check` avant toute proposition de commit.**

## Rappels

- Chaque fichier créé est documenté **en français**, en disant _pourquoi_
  il existe.
- Aucun `StyleSheet`, aucune couleur en dur : tout passe par le thème.
- Un écran ne contient que de la vue. La logique va dans un hook.
- Ne commite et ne pousse que sur demande explicite.
- Réponds en français.
