# Karria — application mobile

L'IA de recherche d'emploi de Karria, pour iOS et Android. Refonte complète
de la V1 (`~/WebstormProjects/karria`), sur le socle technique de
`zoumani_app`.

Expo SDK 57 · React Native · expo-router · gluestack-ui v5 · UniWind
(Tailwind v4) · TypeScript strict.

## Démarrer

```bash
npm install
cp .env.example .env     # mode simulation par défaut : aucun backend requis
npm run ios              # construit et lance sur le simulateur iOS
```

En simulation, le code de connexion est **000000**, et Apple / Google
ouvrent une session sans passer par leurs SDK.

## Les règles

Tout est dans [`AGENTS.md`](AGENTS.md) : architecture, cinq règles,
interdits, conventions d'interface. `npm run check` avant toute proposition
de commit.
