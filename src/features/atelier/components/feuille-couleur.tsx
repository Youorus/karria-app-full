/**
 * « Quelle couleur ? » — la couleur principale du CV, à voir en direct.
 *
 * ═══ La page derrière est l'aperçu ═══
 *
 * Une demi-feuille, comme pour le modèle : toucher une couleur redessine le
 * CV au-dessus, avec les vraies données. On ne montre pas de nuancier
 * abstrait, on montre le CV.
 *
 * ═══ Ce que la couleur change ═══
 *
 * Le serveur habille le **décor** du modèle — bandes, filets, frises, puces,
 * pictogrammes — et laisse le texte tel quel (ADR-0034 § 2026-11-06) ; un
 * texte posé sur une bande qui ne se lirait plus passe en blanc ou en noir.
 * La WebView rend ce que le serveur renvoie : rien à recoloriser ici. Le
 * sous-titre le dit en une phrase ; la pastille « D'origine » est la couleur
 * du décor du modèle (`modele.couleur`, mesurée en galerie).
 *
 * ═══ Trois gestes, du plus simple au plus précis ═══
 *
 * 1. Une rangée de **pastilles** : la couleur d'origine du modèle en premier
 *    (« D'origine »), puis dix teintes sobres nommées. Un toucher suffit.
 * 2. Un **curseur de nuance** : la teinte choisie, du plus clair au plus
 *    sombre. On fait glisser ; la feuille suit au repos. C'est la seule
 *    animation de la feuille, et elle répond au doigt.
 * 3. Un **code couleur** pour qui l'a (charte d'une école, d'une entreprise) :
 *    `#1A5276`, validé doucement — pas de message tant que le code peut encore
 *    devenir juste.
 *
 * « Revenir à la couleur d'origine » n'apparaît que quand une couleur est
 * posée. « Garder cette couleur » ferme la feuille ; glisser la feuille vers
 * le bas vaut pareil : rien n'est perdu, la couleur est déjà sur le CV.
 *
 * ═══ Lisible dans les deux modes ═══
 *
 * La coche sur une pastille prend le noir ou le blanc selon la luminance de
 * la couleur (`surCouleur`), pas le ton de l'écran : une pastille claire en
 * mode sombre garde une coche sombre. Tout ce qui se touche fait 44 pt.
 */

import { useMemo, useState } from "react";
import { Pressable, ScrollView, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { BoutonAction } from "@/components/bouton-action";
import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import {
  erreurDeCode,
  memeTeinte,
  normaliserCode,
  nuance,
  PALETTE,
  pisteDeNuance,
  positionDeNuance,
  surCouleur,
} from "../services/couleur";
import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

const PASTILLE = 44;
const CURSEUR = 32;
const PISTE = 44;
const PAS = 12;
/** Quand ni le modèle ni la personne n'ont de couleur : un bleu sobre, pour partir. */
const TEINTE_DE_DEPART = "#1F3A5F";

function Pastille({
  hex,
  nom,
  courante,
  onPress,
}: {
  hex: string;
  nom: string;
  courante: boolean;
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className="items-center gap-1.5"
      style={{ width: PASTILLE + 12 }}
      accessibilityRole="button"
      accessibilityLabel={nom}
      accessibilityState={{ selected: courante }}
    >
      <Box
        className="items-center justify-center rounded-full"
        style={{
          width: PASTILLE,
          height: PASTILLE,
          backgroundColor: hex,
          borderWidth: courante ? 2.5 : 0,
          borderColor: couleurs.texte,
        }}
      >
        {courante ? (
          <Icone nom="coche" couleur={surCouleur(hex)} taille={14} graisse="bold" />
        ) : null}
      </Box>
      <Texte
        className={`text-caption ${courante ? "font-bold text-foreground" : "text-muted-foreground"}`}
        numberOfLines={1}
      >
        {nom}
      </Texte>
    </Pressable>
  );
}

function CurseurDeNuance({
  couleur,
  onNuance,
}: {
  couleur: string;
  /** La couleur à cette position ; `fin` vrai quand le doigt se lève. */
  onNuance: (hex: string, fin: boolean) => void;
}) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const largeur = useSharedValue(0);
  const x = useSharedValue(0);
  const enGlisse = useSharedValue(false);
  const [largeurVue, setLargeurVue] = useState(0);
  // La piste suit la teinte de la couleur courante.
  const piste = useMemo(() => pisteDeNuance(couleur, PAS), [couleur]);
  // Le curseur se place sur la clarté — sauf pendant un glissement, où c'est
  // le doigt qui commande (`x`). Lu dans le style animé : pas d'effet.
  const position = positionDeNuance(couleur);

  const emettre = (position: number, fin: boolean) => {
    onNuance(nuance(couleur, position), fin);
  };

  const glisser = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      enGlisse.set(true);
      const l = largeur.get();
      if (l <= 0) return;
      const px = Math.min(l, Math.max(0, e.x));
      x.set(px);
      scheduleOnRN(emettre, px / l, false);
    })
    .onUpdate((e) => {
      const l = largeur.get();
      if (l <= 0) return;
      const px = Math.min(l, Math.max(0, e.x));
      x.set(px);
      scheduleOnRN(emettre, px / l, false);
    })
    .onFinalize(() => {
      enGlisse.set(false);
      const l = largeur.get();
      if (l <= 0) return;
      scheduleOnRN(emettre, x.get() / l, true);
    });

  const styleCurseur = useAnimatedStyle(() => {
    if (enGlisse.get() || largeurVue === 0) {
      return { transform: [{ translateX: x.get() - CURSEUR / 2 }] };
    }
    const cible = position * largeurVue;
    return {
      transform: [
        {
          translateX:
            (reduit ? cible : withTiming(cible, { duration: 180 })) - CURSEUR / 2,
        },
      ],
    };
  });

  const surLayout = (e: LayoutChangeEvent) => {
    const l = e.nativeEvent.layout.width;
    largeur.set(l);
    setLargeurVue(l);
  };

  return (
    <VStack className="gap-2">
      <GestureDetector gesture={glisser}>
        <Animated.View
          style={{ height: PISTE, justifyContent: "center" }}
          accessibilityRole="adjustable"
          accessibilityLabel={TEXTES.couleurNuance}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(position * 100) }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            const pas = e.nativeEvent.actionName === "increment" ? 0.1 : -0.1;
            emettre(Math.min(1, Math.max(0, position + pas)), true);
          }}
        >
          <Box
            className="flex-row overflow-hidden rounded-full"
            style={{ height: PISTE - 16 }}
            onLayout={surLayout}
          >
            {piste.map((hex, i) => (
              <Box key={`${i}-${hex}`} style={{ flex: 1, backgroundColor: hex }} />
            ))}
          </Box>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                width: CURSEUR,
                height: CURSEUR,
                borderRadius: CURSEUR / 2,
                backgroundColor: couleur,
                borderWidth: 3,
                borderColor: couleurs.surface,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 3,
              },
              styleCurseur,
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <HStack className="justify-between">
        <Texte className="text-caption text-muted-foreground">
          {TEXTES.couleurPlusClair}
        </Texte>
        <Texte className="text-caption text-muted-foreground">
          {TEXTES.couleurPlusSombre}
        </Texte>
      </HStack>
    </VStack>
  );
}

interface Props {
  visible: boolean;
  /** La couleur posée (`#RRGGBB`), ou `null` : celle du modèle. */
  couleur: string | null;
  /** La couleur d'origine du modèle, si on la connaît. */
  origine: string | null;
  /** `null` : revenir à l'origine. `immediat` faux : au repos (le curseur). */
  onChoisir: (couleur: string | null, immediat?: boolean) => void;
  onFermer: () => void;
}

function Contenu({ couleur, origine, onChoisir, onFermer }: Omit<Props, "visible">) {
  const courante = couleur ?? origine ?? TEINTE_DE_DEPART;
  const [code, setCode] = useState(courante);
  const [derniere, setDerniere] = useState(courante);

  // Le champ suit la couleur quand elle vient d'ailleurs (pastille, curseur) ;
  // il garde ce qu'on tape tant que ce n'est pas encore un code. État ajusté
  // pendant le rendu, pas dans un effet.
  if (derniere !== courante) {
    setDerniere(courante);
    if (normaliserCode(code) !== courante) setCode(courante);
  }

  const pastilles: { hex: string; nom: string }[] = [
    ...(origine === null ? [] : [{ hex: origine, nom: TEXTES.couleurOrigine }]),
    ...PALETTE.filter((c) => origine === null || !memeTeinte(c.hex, origine)),
  ];

  return (
    <FeuilleBasse
      visible
      titre={TEXTES.couleurTitre}
      sousTitre={TEXTES.couleurSousTitre}
      onFermer={onFermer}
      pied={<BoutonAction libelle={TEXTES.couleurGarder} onPress={onFermer} />}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-1 pr-5"
        keyboardShouldPersistTaps="handled"
      >
        {pastilles.map((p) => (
          <Pastille
            key={p.hex}
            hex={p.hex}
            nom={p.nom}
            courante={memeTeinte(p.hex, courante)}
            onPress={() => onChoisir(p.hex === origine ? null : p.hex)}
          />
        ))}
      </ScrollView>

      <VStack className="gap-2">
        <Texte className="font-bold text-footnote text-foreground">
          {TEXTES.couleurNuance}
        </Texte>
        <CurseurDeNuance
          couleur={courante}
          onNuance={(hex, fin) => onChoisir(hex, fin)}
        />
      </VStack>

      <ChampTexte
        libelle={TEXTES.couleurCode}
        value={code}
        onChangeText={(t) => {
          setCode(t);
          const hex = normaliserCode(t);
          if (hex !== null) onChoisir(hex);
        }}
        erreur={erreurDeCode(code) ?? undefined}
        aide={TEXTES.couleurCodeAide}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        returnKeyType="done"
        testID="champ-code-couleur"
      />

      {couleur !== null ? (
        <BoutonAction
          libelle={TEXTES.couleurRevenir}
          ton="secondaire"
          onPress={() => onChoisir(null)}
        />
      ) : null}
    </FeuilleBasse>
  );
}

/** Montée à l'ouverture : le champ part de la couleur du moment. */
export function FeuilleCouleur({ visible, ...props }: Props) {
  if (!visible) return null;
  return <Contenu {...props} />;
}
