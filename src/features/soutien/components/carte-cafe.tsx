/**
 * La carte « offrir un café » du profil — un mot de l'équipe, et une tasse
 * à offrir si l'on veut.
 *
 * ═══ Le parti pris : peu, et chaleureux ═══
 *
 * Marc l'a voulue minimaliste et très chaleureuse (2026-10-24). Donc :
 * plus de dégradé, plus de grand titre, plus de promesse répétée. Une
 * surface crème (`surface-chaleur`), un filet caramel, une tasse, un
 * message court écrit comme une personne l'écrirait, signé. Puis une
 * rangée sobre de trois tasses et un seul bouton.
 *
 * Tant que l'achat intégré n'est pas branché (port `pourboire`), le
 * bouton dit « Bientôt » et ne répond pas ; une ligne discrète explique.
 *
 * Après un café : un cœur caramel, un merci, et « En offrir un autre » en
 * discret — le merci reste, il ne disparaît pas tout seul.
 *
 * ═══ Les tasses en émoji ═══
 *
 * « ☕ / ☕☕ / ☕☕☕ » se lit d'un coup d'œil, partout, sans icône à
 * dessiner. Elles sont masquées au lecteur d'écran, qui lit « Deux
 * cafés » à la place.
 */

import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { CHALEUR } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import {
  libelleDOffre,
  nomDesTasses,
  tassesDessinees,
  TEXTES,
} from "../services/presentation";

function Enveloppe({ children }: { children: ReactNode }) {
  return (
    <VStack className="gap-5 rounded-carte border border-border-chaleur bg-surface-chaleur p-6">
      {children}
    </VStack>
  );
}

export function CarteCafe({ soutien }: { soutien: Soutien }) {
  const { mode } = useCouleurs();
  const reduit = useReducedMotion();
  const chaleur = CHALEUR[mode];
  const { catalogue, choix, offreChoisie, envoi, merci, erreur } = soutien;

  if (catalogue === null) {
    return (
      <Enveloppe>
        <Box className="h-3 w-32 rounded-full bg-border-chaleur" />
        <Box className="h-16 w-full rounded-md bg-border-chaleur" />
      </Enveloppe>
    );
  }

  if (merci) {
    return (
      <Enveloppe>
        <Animated.View entering={reduit ? undefined : FadeIn.duration(320)}>
          <VStack className="items-center gap-3 py-2">
            <Icone nom="coeurPlein" couleur={chaleur} taille={28} />
            <Texte className="text-center font-display text-title-sm text-foreground">
              {TEXTES.merciTitre}
            </Texte>
            <Texte className="text-center text-body leading-7 text-muted-foreground">
              {TEXTES.merciTexte}
            </Texte>
          </VStack>
        </Animated.View>
        <BoutonAction
          libelle={TEXTES.encoreUn}
          ton="discret"
          onPress={soutien.recommencer}
        />
      </Enveloppe>
    );
  }

  const disponible = catalogue.disponible;

  return (
    <Enveloppe>
      <HStack className="items-center gap-2">
        <Icone nom="tasse" couleur={chaleur} taille={15} />
        <Texte className="font-bold text-footnote text-chaleur">{TEXTES.surtitre}</Texte>
      </HStack>

      <VStack className="gap-2">
        <Texte className="text-body leading-7 text-foreground">{TEXTES.message}</Texte>
        <Texte className="text-footnote italic text-muted-foreground">
          {TEXTES.signature}
        </Texte>
      </VStack>

      {/* Une seule rangée, sur une piste discrète : on choisit sa tasse
          comme on choisit un segment, sans trois cartes qui se disputent
          l'attention. */}
      <HStack
        className="gap-1 rounded-full border border-border-chaleur p-1"
        accessibilityRole="radiogroup"
      >
        {catalogue.offres.map((offre) => {
          const actif = offre.tasses === choix;
          return (
            <Pressable
              key={offre.produitId}
              onPress={() => soutien.choisir(offre.tasses)}
              className={`min-h-touch flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-2 ${
                actif ? "bg-card" : ""
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={
                offre.prix === null
                  ? nomDesTasses(offre.tasses)
                  : `${nomDesTasses(offre.tasses)}, ${offre.prix}`
              }
            >
              <Texte className="text-footnote" accessible={false}>
                {tassesDessinees(offre.tasses)}
              </Texte>
              {offre.prix !== null ? (
                <Texte
                  className={`font-bold text-caption ${actif ? "text-chaleur" : "text-muted-foreground"}`}
                  numberOfLines={1}
                >
                  {offre.prix}
                </Texte>
              ) : null}
            </Pressable>
          );
        })}
      </HStack>

      <VStack className="gap-2">
        <BoutonAction
          libelle={libelleDOffre(offreChoisie, disponible)}
          ton="secondaire"
          enCours={envoi}
          desactive={!disponible}
          onPress={disponible ? soutien.offrir : undefined}
          accessibilityHint={disponible ? undefined : TEXTES.bientot}
        />
        {erreur !== null ? (
          <Texte className="text-center text-footnote text-destructive">{erreur}</Texte>
        ) : !disponible ? (
          <Texte className="text-center text-footnote text-foreground-faint">
            {TEXTES.bientot}
          </Texte>
        ) : null}
      </VStack>
    </Enveloppe>
  );
}
