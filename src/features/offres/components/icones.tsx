/**
 * Les icônes des offres, dessinées dans l'esprit de la V1.
 *
 * La V1 employait Ionicons (`location-outline`, `time-outline`,
 * `wallet-outline`…). On en redessine les seules formes utiles, au même
 * trait fin et arrondi, plutôt que d'embarquer un jeu entier pour huit
 * symboles (voir AGENTS.md §6.5 sur les dépendances).
 */

import type { ColorValue } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface Props {
  couleur: ColorValue;
  taille?: number;
}

const TRAIT = 1.8;

function Cadre({
  taille = 16,
  children,
}: {
  taille?: number;
  children: React.ReactNode;
}) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function IconeLieu({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.3} stroke={couleur} strokeWidth={TRAIT} />
    </Cadre>
  );
}

export function IconeHorloge({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Circle cx={12} cy={12} r={8.5} stroke={couleur} strokeWidth={TRAIT} />
      <Path
        d="M12 7.5V12l3 2"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinecap="round"
      />
    </Cadre>
  );
}

export function IconePortefeuille({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Rect
        x={3.5}
        y={6}
        width={17}
        height={13}
        rx={2.5}
        stroke={couleur}
        strokeWidth={TRAIT}
      />
      <Path d="M16 12.5h4.5" stroke={couleur} strokeWidth={TRAIT} strokeLinecap="round" />
      <Path
        d="M5 6l9-2.5 1 2.5"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinejoin="round"
      />
    </Cadre>
  );
}

export function IconeMallette({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Rect
        x={3.5}
        y={7}
        width={17}
        height={12}
        rx={2.5}
        stroke={couleur}
        strokeWidth={TRAIT}
      />
      <Path d="M9 7V5.5h6V7M3.5 12.5h17" stroke={couleur} strokeWidth={TRAIT} />
    </Cadre>
  );
}

export function IconeImmeuble({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M5 20V5.5h9V20M14 9.5h5V20M3.5 20h17M8 9h3M8 12.5h3M8 16h3"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinecap="round"
      />
    </Cadre>
  );
}

export function IconeCalendrier({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Rect
        x={4}
        y={5.5}
        width={16}
        height={14}
        rx={2.5}
        stroke={couleur}
        strokeWidth={TRAIT}
      />
      <Path
        d="M8 3.5v4M16 3.5v4M4 10h16"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinecap="round"
      />
    </Cadre>
  );
}

export function IconePartager({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M12 15V4M8 7.5 12 3.5l4 4M6 11v7.5h12V11"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Cadre>
  );
}

export function IconeSignet({ couleur, taille, plein }: Props & { plein?: boolean }) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M6.5 4h11v16l-5.5-4-5.5 4V4Z"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinejoin="round"
        fill={plein ? couleur : "none"}
      />
    </Cadre>
  );
}

export function IconeEtincelle({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5ZM18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z"
        fill={couleur}
      />
    </Cadre>
  );
}

export function IconeReglages({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M4 7h9M17 7h3M4 17h3M11 17h9"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinecap="round"
      />
      <Circle cx={15} cy={7} r={2.2} stroke={couleur} strokeWidth={TRAIT} />
      <Circle cx={9} cy={17} r={2.2} stroke={couleur} strokeWidth={TRAIT} />
    </Cadre>
  );
}

export function IconeEtoile({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.8Z"
        fill={couleur}
      />
    </Cadre>
  );
}

export function IconeEclair({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6l1-8Z" fill={couleur} />
    </Cadre>
  );
}

export function IconeTrophee({ couleur, taille }: Props) {
  return (
    <Cadre taille={taille}>
      <Path
        d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"
        stroke={couleur}
        strokeWidth={TRAIT}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Cadre>
  );
}
