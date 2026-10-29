/**
 * L'orbe vivante : Karria, en petit, qui vit.
 *
 * ═══ Ce qu'on voit ═══
 *
 * Une sphère faite de milliers de grains fins qui coulent comme une
 * matière en mouvement — la sphère tourne, chaque grain dérive à son
 * rythme, et la surface ondule —, posée sur un tourbillon flou de la roue
 * chromatique entière. Au centre, ce que l'écran y pose (le K, une
 * flèche). C'est la **même** orbe sur le bouton du fil, dans l'agent,
 * dans la création du CV et sur l'écran des notifications : un seul
 * personnage.
 *
 * ═══ Pourquoi Skia, et un seul appel de dessin ═══
 *
 * Des milliers de points animés à 60 images par seconde ne tiennent ni
 * en vues React Native (une vue par point : le compositeur s'effondre à
 * quelques centaines) ni en SVG (recalcul de l'arbre à chaque image).
 * Skia dessine tous les grains d'un coup (`Atlas` : un petit disque
 * doux, estampé N fois avec une transformation et une teinte par grain),
 * depuis deux tampons partagés que le fil d'interface remplit à chaque
 * image. React ne rend qu'une fois ; aucune mise à jour d'état par image.
 *
 * ═══ Le temps ═══
 *
 * Une horloge en secondes avance à chaque image, **multipliée par une
 * vitesse** qui glisse doucement d'un état à l'autre (repos, écoute,
 * réflexion). Comme les mouvements sont des sinusoïdes du temps, aucune
 * boucle à refermer, et un changement d'état n'a jamais de saut : seule
 * la cadence change. L'amplitude de l'ondulation suit le niveau audio
 * quand Karria écoute.
 *
 * ═══ La batterie, et les appareils modestes ═══
 *
 * L'horloge s'arrête quand l'écran n'est plus au premier plan, quand
 * l'application passe en arrière-plan, et quand le système demande moins
 * de mouvement — l'orbe reste alors une image fixe, sans tourbillon qui
 * tourne. Le nombre de grains dépend de la taille, de l'appareil et de son
 * **palier visuel** (`orbe-particules.ts`, `hooks/qualite-visuelle.ts`) ;
 * les états changent la vitesse, jamais le nombre.
 *
 * Ce qui coûte, par image : deux passes de trigonométrie par grain sur le
 * fil d'interface (≈ 0,3 µs chacune : 2 600 grains ≈ 1,5 ms), une estampe
 * par grain au GPU (bon marché, un seul appel), et surtout le **flou
 * gaussien** du tourbillon — un calque hors écran de la taille de la
 * boîte, flouté sur un rayon de 14 % de la sphère, soit ~17 px pour l'orbe
 * de 120 pt : sur un GPU d'entrée de gamme c'est le poste le plus lourd.
 * Palier **moyen** : flou réduit de moitié et 60 % des grains. Palier
 * **bas** : pas de flou (le tourbillon reste, net), 35 % des grains, et une
 * image sur deux — l'horloge n'avance qu'à 30 images par seconde, et Skia ne
 * redessine que quand elle avance.
 *
 * ═══ Les couleurs ═══
 *
 * Les grains sont teintés de l'aura (glacier en haut et devant, violet en
 * bas et derrière, bleu entre les deux) ; le tourbillon est le spectre
 * entier, qui par définition n'est pas une couleur de charte. Le disque
 * estampé est un **masque** — une coupole d'opacité, sans couleur
 * propre — que la teinte du grain multiplie.
 *
 * ═══ Régler ═══
 *
 * Le nombre de grains : `nombreDeParticules` (orbe-particules.ts). Leur
 * finesse : `taillePoint`. La cadence et l'ondulation par état : `ETATS`.
 * L'éclat du tourbillon : `opaciteTourbillon` ; son flou : `flou`.
 */

import {
  Atlas,
  Blur,
  Canvas,
  Circle,
  Group,
  Paint,
  RadialGradient,
  Skia,
  SweepGradient,
  TileMode,
  drawAsImageFromPicture,
  useColorBuffer,
  useRSXformBuffer,
  type SkImage,
} from "@shopify/react-native-skia";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, PixelRatio, Platform } from "react-native";
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { useQualiteVisuelle } from "@/hooks/use-qualite-visuelle";
import { AURA } from "@/theme";

import {
  deplacer,
  nombreDeParticules,
  roueChromatique,
  semerLesParticules,
  versComposantes,
} from "./orbe-particules";

/** Le côté, en pixels, du disque estampé pour chaque grain. */
const SPRITE = 24;
const RECT_GRAIN = Skia.XYWHRect(0, 0, SPRITE, SPRITE);

/** Les trois états, et ce qu'ils font à la matière. */
const ETATS = {
  repos: { vitesse: 1, amplitude: 0.05, intensite: 0 },
  ecoute: { vitesse: 1.6, amplitude: 0.07, intensite: 0.6 },
  reflexion: { vitesse: 2.6, amplitude: 0.11, intensite: 1 },
} as const;

/** La durée de glissement d'un état à l'autre. */
const TRANSITION = { duration: 650, easing: Easing.out(Easing.cubic) };

const ROUE = roueChromatique(12);
const GLACIER = versComposantes(AURA.glacier);
const BLEU = versComposantes(AURA.bleu);
const VIOLET = versComposantes(AURA.violet);

/** Le disque doux estampé pour chaque grain : fabriqué une fois pour
 *  toute l'application, à la première orbe affichée. */
let grainPartage: SkImage | null = null;
function leGrain(): SkImage | null {
  if (grainPartage !== null) return grainPartage;
  const enregistreur = Skia.PictureRecorder();
  const toile = enregistreur.beginRecording(RECT_GRAIN);
  const pinceau = Skia.Paint();
  pinceau.setAntiAlias(true);
  // Une coupole d'opacité : pleine au centre, nulle au bord. Les
  // composantes de couleur valent 1 pour que la teinte du grain passe
  // telle quelle par la multiplication.
  pinceau.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: SPRITE / 2, y: SPRITE / 2 },
      SPRITE / 2,
      [
        Float32Array.of(1, 1, 1, 1),
        Float32Array.of(1, 1, 1, 0.5),
        Float32Array.of(1, 1, 1, 0),
      ],
      [0, 0.4, 1],
      TileMode.Clamp,
    ),
  );
  toile.drawCircle(SPRITE / 2, SPRITE / 2, SPRITE / 2, pinceau);
  grainPartage = drawAsImageFromPicture(enregistreur.finishRecordingAsPicture(), {
    width: SPRITE,
    height: SPRITE,
  });
  return grainPartage;
}

function borner(valeur: number): number {
  "worklet";
  return Math.min(1, Math.max(0, valeur));
}

/** Un garde à nous : celui de Reanimated accepte `unknown` et ne
 *  restreint donc pas l'union `number | SharedValue<number>`. */
function estPartagee(v: number | SharedValue<number>): v is SharedValue<number> {
  return typeof v !== "number";
}

interface Props {
  /** Diamètre de la sphère, en points. La boîte fait le double : le
   *  tourbillon et les grains satellites débordent de moitié. */
  taille?: number;
  /** Ce qui est posé au centre : le K, une flèche… */
  children?: ReactNode;
  /** Karria réfléchit : la matière s'accélère et ondule davantage. */
  active?: boolean;
  /** Karria écoute : plus vive qu'au repos, et sensible au niveau audio. */
  ecoute?: boolean;
  /** Le niveau du micro, de 0 à 1 : gonfle l'ondulation et l'éclat. Une
   *  valeur partagée évite un rendu React par mesure du micro. */
  niveauAudio?: number | SharedValue<number>;
}

export function OrbeVivante({
  taille = 60,
  children,
  active = false,
  ecoute = false,
  niveauAudio = 0,
}: Props) {
  const reduit = useReducedMotion();
  const auPremierPlan = useIsFocused();
  const palier = useQualiteVisuelle();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const abonnement = AppState.addEventListener("change", (etat) =>
      setAppActive(etat === "active"),
    );
    return () => abonnement.remove();
  }, []);

  const boite = taille * 2;
  const centre = boite / 2;
  const rayon = taille / 2;
  /** Le diamètre d'un grain, en points : fin, mais jamais sous le pixel. */
  const taillePoint = Math.min(3.2, Math.max(1.2, taille * 0.028));

  const nombre = useMemo(
    () => nombreDeParticules(taille, Platform.OS, PixelRatio.get(), palier),
    [taille, palier],
  );
  const graine = useMemo(() => semerLesParticules(nombre), [nombre]);
  const grain = useMemo(() => leGrain(), []);
  // Le même rectangle pour chaque grain : l'atlas exige une entrée par
  // estampe, et un seul objet suffit.
  const sprites = useMemo(
    () => Array.from({ length: nombre }, () => RECT_GRAIN),
    [nombre],
  );

  // ── L'horloge et les réglages, sur le fil d'interface ──
  const temps = useSharedValue(0);
  const vitesse = useSharedValue<number>(ETATS.repos.vitesse);
  const amplitude = useSharedValue<number>(ETATS.repos.amplitude);
  const intensite = useSharedValue<number>(ETATS.repos.intensite);
  const niveauInterne = useSharedValue(0);
  const niveau = estPartagee(niveauAudio) ? niveauAudio : niveauInterne;

  useEffect(() => {
    if (estPartagee(niveauAudio)) return;
    // 80 ms : le temps d'une mesure de micro, pour lisser sans traîner.
    niveauInterne.set(withTiming(borner(niveauAudio), { duration: 80 }));
  }, [niveauAudio, niveauInterne]);

  useEffect(() => {
    const cible = active ? ETATS.reflexion : ecoute ? ETATS.ecoute : ETATS.repos;
    vitesse.set(withTiming(cible.vitesse, TRANSITION));
    amplitude.set(withTiming(cible.amplitude, TRANSITION));
    intensite.set(withTiming(cible.intensite, TRANSITION));
  }, [active, ecoute, vitesse, amplitude, intensite]);

  // En bas de gamme, une image sur deux : le temps avance quand même du
  // vrai temps écoulé, donc la cadence visuelle est la même, moins fluide.
  const cadenceReduite = palier === "bas";
  const attente = useSharedValue(0);
  const avancer = useCallback(
    (image: { timeSincePreviousFrame: number | null }) => {
      "worklet";
      // Bornée : au retour d'une pause, un pas d'une seconde ferait
      // sauter la matière au lieu de la laisser repartir.
      const dt = Math.min((image.timeSincePreviousFrame ?? 0) / 1000, 0.05);
      if (cadenceReduite) {
        const cumule = attente.get() + dt;
        if (cumule < 1 / 32) {
          attente.set(cumule);
          return;
        }
        attente.set(0);
        temps.set(temps.get() + cumule * vitesse.get());
        return;
      }
      temps.set(temps.get() + dt * vitesse.get());
    },
    [temps, vitesse, attente, cadenceReduite],
  );
  const horloge = useFrameCallback(avancer, false);
  const tourne = !reduit && appActive && auPremierPlan;
  useEffect(() => {
    horloge.setActive(tourne);
  }, [tourne, horloge]);

  // ── Les grains ──
  // Deux tampons, deux passes par image : la position calcule le
  // déplacement, la couleur le recalcule. Le doublon est voulu — écrire
  // les teintes depuis la passe des positions reviendrait à modifier un
  // tampon qui n'est pas le nôtre —, et il coûte moins d'une
  // milliseconde pour 2 600 grains sur le fil d'interface.
  const transformations = useRSXformBuffer(nombre, (val, i) => {
    "worklet";
    const p = deplacer(graine, i, temps.get(), amplitude.get() + niveau.get() * 0.16);
    const proche = (p.profondeur + 1) / 2;
    const satellite = (graine.rayon[i] ?? 1) > 1;
    const echelle =
      (taillePoint * (satellite ? 0.7 : 1) * (0.55 + 0.6 * proche)) / SPRITE;
    const demi = (echelle * SPRITE) / 2;
    val.set(echelle, 0, centre + p.x * rayon - demi, centre + p.y * rayon - demi);
  });
  const couleurs = useColorBuffer(nombre, (val, i) => {
    "worklet";
    const p = deplacer(graine, i, temps.get(), amplitude.get() + niveau.get() * 0.16);
    const proche = (p.profondeur + 1) / 2;
    const satellite = (graine.rayon[i] ?? 1) > 1;
    // Glacier en haut et devant, violet en bas et derrière, bleu entre.
    const haut = 1 - (p.y / (graine.rayon[i] ?? 1) + 1) / 2;
    const u = borner(0.5 * haut + 0.5 * proche);
    const bas = u < 0.5;
    const k = bas ? u * 2 : (u - 0.5) * 2;
    const de = bas ? VIOLET : BLEU;
    const vers = bas ? BLEU : GLACIER;
    const eclat = 1 + 0.5 * niveau.get() + 0.15 * intensite.get();
    const lumiere = Math.min(eclat, 1.2);
    const alpha = (satellite ? 0.5 : 0.9) * (0.15 + 0.85 * proche) * eclat;
    // Skia convertit chaque composante en octet et s'arrête net (abort
    // natif, l'application se ferme) au-delà de 1 : l'éclat peut monter à
    // 1,2, d'où les bornes.
    val[0] = borner((de[0] + (vers[0] - de[0]) * k) * lumiere);
    val[1] = borner((de[1] + (vers[1] - de[1]) * k) * lumiere);
    val[2] = borner((de[2] + (vers[2] - de[2]) * k) * lumiere);
    val[3] = borner(alpha);
  });

  // ── Le tourbillon ──
  const rotation = useDerivedValue(() => [{ rotate: temps.get() * 0.6 }]);
  const contreRotation = useDerivedValue(() => [{ rotate: 1.2 - temps.get() * 0.45 }]);
  const opaciteTourbillon = useDerivedValue(() =>
    borner(0.5 + 0.4 * intensite.get() + 0.3 * niveau.get()),
  );
  const origine = { x: centre, y: centre };
  const flou = palier === "haut" ? taille * 0.14 : palier === "moyen" ? taille * 0.07 : 0;

  // ── Le cœur ──
  // Une lueur de l'aura sous les grains : elle rend le K lisible sur un
  // fond clair comme sur un fond sombre, et donne du volume à la sphère.
  const coeur = useMemo(
    () => [
      [...GLACIER, 0.55],
      [...BLEU, 0.78],
      [...VIOLET, 0.42],
      [...VIOLET, 0],
    ],
    [],
  );

  return (
    <Box style={{ width: boite, height: boite }} pointerEvents="box-none">
      <Canvas
        style={{ position: "absolute", width: boite, height: boite }}
        pointerEvents="none"
      >
        <Group
          opacity={opaciteTourbillon}
          layer={
            flou > 0 ? (
              <Paint>
                <Blur blur={flou} />
              </Paint>
            ) : undefined
          }
        >
          <Group transform={rotation} origin={origine}>
            <Circle cx={centre + rayon * 0.1} cy={centre} r={rayon * 1.3}>
              <SweepGradient c={{ x: centre + rayon * 0.1, y: centre }} colors={ROUE} />
            </Circle>
          </Group>
          <Group transform={contreRotation} origin={origine}>
            <Circle cx={centre - rayon * 0.15} cy={centre + rayon * 0.1} r={rayon * 0.95}>
              <SweepGradient
                c={{ x: centre - rayon * 0.15, y: centre + rayon * 0.1 }}
                colors={ROUE}
                start={180}
                end={540}
              />
            </Circle>
          </Group>
        </Group>

        <Circle cx={centre} cy={centre} r={rayon * 0.92}>
          <RadialGradient
            c={{ x: centre - rayon * 0.25, y: centre - rayon * 0.3 }}
            r={rayon * 1.25}
            colors={coeur}
            positions={[0, 0.35, 0.82, 1]}
          />
        </Circle>

        <Atlas
          image={grain}
          sprites={sprites}
          transforms={transformations}
          colors={couleurs}
          colorBlendMode="modulate"
        />
      </Canvas>
      <Box
        className="absolute inset-0 items-center justify-center"
        pointerEvents="box-none"
      >
        {children}
      </Box>
    </Box>
  );
}
