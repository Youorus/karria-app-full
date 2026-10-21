/**
 * Le thème, pour les rares API qui n'acceptent pas de classe.
 *
 * ═══ Pourquoi ce fichier existe, et pourquoi il doit rester minuscule ═══
 *
 * `tokens.css` est la source de vérité (AGENTS.md §3.3). Mais quelques
 * API natives veulent une couleur en JavaScript et rien d'autre : la
 * barre d'état, le fond du navigateur entre deux écrans, la couleur d'un
 * curseur, et surtout les **dégradés SVG de l'aura**, que `react-native-svg`
 * ne sait pas lire depuis une classe.
 *
 * Chaque valeur recopiée ici est une divergence en puissance. Chaque
 * constante doit donc correspondre, à l'octet près, au jeton qu'elle
 * nomme dans `tokens.css`. Si tu es tenté d'en ajouter une, vérifie
 * d'abord qu'une classe utilitaire ne ferait pas l'affaire.
 */

/** `--color-background`. */
export const FOND = {
  light: "#f6f8fc",
  dark: "#0e0d0c",
} as const;

/** `--color-primary` : le bleu d'action, pour un curseur ou une flèche. */
export const PRIMAIRE = { light: "#1877f2", dark: "#1877f2" } as const;

/** `--color-primary-foreground` : ce qui se pose sur le bleu. */
export const SUR_PRIMAIRE = { light: "#ffffff", dark: "#ffffff" } as const;

/** `--color-muted-foreground` : le texte de second plan, les indices. */
export const ESTOMPE = { light: "#0f172aad", dark: "#eeeae4b3" } as const;

/** `--color-card`. */
export const SURFACE = { light: "#ffffff", dark: "#1a1816" } as const;

/** `--color-border-subtle`. */
export const CONTOUR = { light: "#0f172a12", dark: "#eeeae417" } as const;

/** `--color-foreground`. */
export const TEXTE = { light: "#0f172a", dark: "#f5f3f0" } as const;

/** `--color-warning`. */
export const AVERTISSEMENT = { light: "#f97316", dark: "#fb923c" } as const;

/** `--color-success`. */
export const SUCCES = { light: "#22c55e", dark: "#4ade80" } as const;

/** `--color-destructive`. */
export const DESTRUCTIF = { light: "#ef4444", dark: "#f87171" } as const;

/** `--color-secondary` : le violet, pour l'icône de l'analyse. */
export const SECONDAIRE = { light: "#a855f7", dark: "#c084fc" } as const;

/** `--color-onglet-inactif` : les icônes au repos de la barre d'onglets. */
export const ONGLET_INACTIF = { light: "#00000061", dark: "#ffffff6b" } as const;

/** `--color-premium` : l'or des modèles Pro et des étoiles (V1). */
export const PREMIUM = { light: "#d4a63a", dark: "#f2c46d" } as const;

/** `--color-salaire-foreground` : l'icône du salaire, identique dans les
 *  deux modes comme dans la V1. */
export const SALAIRE = "#1b5e20";

/** `--color-on-scrim` : identique dans les deux modes, comme le voile. */
export const SUR_VOILE = "#ffffff";

/**
 * Les trois teintes de l'aura (`--color-aura-1/2/3`) : bleu néon, violet,
 * bleu glacier. Identiques dans les deux modes — c'est la signature de
 * Karria, elle ne change pas avec l'heure. Seule leur **intensité** varie,
 * et elle se règle dans le composant qui les dessine.
 */
export const AURA = {
  bleu: "#1e90ff",
  violet: "#a259ff",
  glacier: "#81d4fa",
  /** `--color-aura-reflet` : le « K » blanc posé sur l'orbe. */
  reflet: "#ffffff",
} as const;

export type ModeTheme = keyof typeof FOND;
