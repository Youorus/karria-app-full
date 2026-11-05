/**
 * La couleur principale d'un CV : la palette, les nuances, le code couleur.
 *
 * ═══ Ce que le serveur fait, et ce que l'app décide ═══
 *
 * Le serveur (`primary_color`, ADR-0034) remplace la couleur des titres du
 * modèle — et ses teintes dérivées — par celle qu'on lui envoie, en
 * `#RRGGBB`. Tout le reste est un choix d'interface, et vit ici :
 * la **palette** (dix teintes sobres, nommées en français), la **nuance**
 * (la même teinte, plus claire ou plus sombre : on fait glisser la clarté,
 * pas la teinte), le **code couleur** tapé à la main (validé doucement :
 * `#1a2b3c`, `1a2b3c`, `#abc`), et la couleur du texte posé **sur** une
 * pastille (noir ou blanc, selon la luminance).
 *
 * ═══ Pourquoi la clarté, et pas la saturation ═══
 *
 * « Graduer pour avoir des variantes » : sur un CV, la variante utile d'un
 * bleu est un bleu plus foncé (plus sérieux) ou plus clair (plus léger).
 * Un curseur, une dimension : la clarté, bornée pour rester lisible sur du
 * papier blanc (ni blanc cassé, ni noir).
 *
 * Pur, testé.
 */

export interface CouleurNommee {
  nom: string;
  hex: string;
}

/** Dix teintes sobres, du plus classique au plus chaud. */
export const PALETTE: readonly CouleurNommee[] = [
  { nom: "Marine", hex: "#1F3A5F" },
  { nom: "Bleu roi", hex: "#1F4FA3" },
  { nom: "Pétrole", hex: "#1F5F6B" },
  { nom: "Forêt", hex: "#2F5D3A" },
  { nom: "Olive", hex: "#5B6A2F" },
  { nom: "Bordeaux", hex: "#7B1E2B" },
  { nom: "Terre", hex: "#8A5A3C" },
  { nom: "Cuivre", hex: "#B5651D" },
  { nom: "Ardoise", hex: "#3F4A5A" },
  { nom: "Encre", hex: "#1B1B1F" },
];

/** La clarté la plus claire qu'on propose : encore lisible sur du blanc. */
export const CLARTE_MAX = 0.72;
/** La plus sombre : encore une couleur, pas un noir. */
export const CLARTE_MIN = 0.12;

const HEX = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** `#1a2b3c`, `1a2b3c`, `#abc` → `#1A2B3C` ; sinon `null`. */
export function normaliserCode(texte: string): string | null {
  const m = HEX.exec(texte.trim());
  if (m === null) return null;
  const chiffres = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return `#${chiffres.toUpperCase()}`;
}

/** Ce qu'on dit d'un code en cours de frappe : rien tant qu'il peut encore
 *  devenir juste, une phrase quand il ne le pourra plus. */
export function erreurDeCode(texte: string): string | null {
  const t = texte.trim().replace(/^#/, "");
  if (t === "") return null;
  if (!/^[0-9a-fA-F]*$/.test(t)) return "Seulement des chiffres et des lettres de A à F.";
  if (t.length > 6) return "Six caractères au plus, comme #1A5276.";
  if (t.length < 6 && t.length !== 3) return null;
  return null;
}

export interface Hsl {
  /** 0–360. */
  teinte: number;
  /** 0–1. */
  saturation: number;
  /** 0–1. */
  clarte: number;
}

export function hexVersHsl(hex: string): Hsl {
  const code = normaliserCode(hex) ?? "#000000";
  const r = parseInt(code.slice(1, 3), 16) / 255;
  const g = parseInt(code.slice(3, 5), 16) / 255;
  const b = parseInt(code.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const clarte = (max + min) / 2;
  if (max === min) return { teinte: 0, saturation: 0, clarte };
  const d = max - min;
  const saturation = clarte > 0.5 ? d / (2 - max - min) : d / (max + min);
  let teinte: number;
  if (max === r) teinte = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) teinte = ((b - r) / d + 2) * 60;
  else teinte = ((r - g) / d + 4) * 60;
  return { teinte, saturation, clarte };
}

function composante(p: number, q: number, t0: number): number {
  let t = t0;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslVersHex({ teinte, saturation, clarte }: Hsl): string {
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, clarte));
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const h = (((teinte % 360) + 360) % 360) / 360;
    r = composante(p, q, h + 1 / 3);
    g = composante(p, q, h);
    b = composante(p, q, h - 1 / 3);
  }
  const deux = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${deux(r)}${deux(g)}${deux(b)}`.toUpperCase();
}

/** La même teinte, à cette clarté (bornée). */
export function avecClarte(hex: string, clarte: number): string {
  const hsl = hexVersHsl(hex);
  return hslVersHex({
    ...hsl,
    clarte: Math.min(CLARTE_MAX, Math.max(CLARTE_MIN, clarte)),
  });
}

/** La position du curseur de nuance (0 = le plus clair, 1 = le plus sombre). */
export function positionDeNuance(hex: string): number {
  const { clarte } = hexVersHsl(hex);
  const t = (CLARTE_MAX - clarte) / (CLARTE_MAX - CLARTE_MIN);
  return Math.min(1, Math.max(0, t));
}

/** La couleur à cette position du curseur, sur la teinte de `hex`. */
export function nuance(hex: string, position: number): string {
  const t = Math.min(1, Math.max(0, position));
  return avecClarte(hex, CLARTE_MAX - t * (CLARTE_MAX - CLARTE_MIN));
}

/** Les couleurs qui dessinent la piste du curseur, du clair au sombre. */
export function pisteDeNuance(hex: string, pas = 12): string[] {
  return Array.from({ length: pas }, (_, i) => nuance(hex, i / (pas - 1)));
}

/** Même teinte, même saturation : seule la clarté diffère (la nuance d'une couleur). */
export function memeTeinte(a: string, b: string): boolean {
  const ha = hexVersHsl(a);
  const hb = hexVersHsl(b);
  if (ha.saturation < 0.08 && hb.saturation < 0.08) return true;
  const ecart = Math.abs(ha.teinte - hb.teinte);
  return (
    Math.min(ecart, 360 - ecart) <= 4 && Math.abs(ha.saturation - hb.saturation) < 0.06
  );
}

/** Le noir ou le blanc qui se lit sur cette couleur (luminance relative, WCAG). */
export function surCouleur(hex: string): "#0F172A" | "#FFFFFF" {
  const code = normaliserCode(hex) ?? "#000000";
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(parseInt(code.slice(1, 3), 16));
  const g = lin(parseInt(code.slice(3, 5), 16));
  const b = lin(parseInt(code.slice(5, 7), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#0F172A" : "#FFFFFF";
}

/** Le nom de la teinte de la palette dont `hex` est une nuance, sinon `null`. */
export function nomDeTeinte(hex: string): string | null {
  return PALETTE.find((c) => memeTeinte(c.hex, hex))?.nom ?? null;
}

/** La couleur qu'on envoie au serveur : `null` quand c'est celle d'origine. */
export function couleurAEnvoyer(
  couleur: string | null,
  origine: string | null,
): string | null {
  if (couleur === null) return null;
  const code = normaliserCode(couleur);
  if (code === null) return null;
  return origine !== null && normaliserCode(origine) === code ? null : code;
}
