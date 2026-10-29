/**
 * La carte de soutien du profil — un mot de l'équipe, et deux façons d'aider.
 *
 * ═══ Le parti pris ═══
 *
 * Chaleureuse et sobre, dans la lignée du profil « minimaliste et très
 * chaleureux » voulu par Marc : une surface crème (`surface-chaleur`), un
 * filet caramel, un mot signé — puis deux tuiles, chacune une invitation :
 *
 * - **« Profiter de Karria sans pub »**, en or discret (les jetons Premium) :
 *   le prix mensuel, la mention « sans engagement, résiliable à tout
 *   moment », et le seul bouton bleu plein de l'écran ;
 * - **« Nous offrir un café »**, sur la crème : une rangée segmentée de
 *   1 / 2 / 3 / 5 tasses avec leur prix, et un bouton de contour.
 *
 * Les prix sont ceux du serveur ; rien n'est écrit ici. Une ligne discrète
 * dit que le paiement se fait chez Stripe, dans le navigateur.
 *
 * ═══ Les états ═══
 *
 * - squelette tant que le catalogue n'est pas lu ;
 * - interrupteur éteint (serveur) : le mot de l'équipe seul, sans paiement ;
 * - sans pub actif : la tuile dorée devient « Tu es sans pub » avec la date
 *   et « Gérer mon abonnement » (le portail Stripe) ; un prélèvement en échec
 *   s'annonce en avertissement ;
 * - après un café : un cœur caramel, un merci, et « En offrir un autre ».
 *
 * ═══ Les tasses en émoji ═══
 *
 * « ☕ / ☕☕ / ☕☕☕ / ☕☕☕+ » se lit d'un coup d'œil ; masquées au lecteur
 * d'écran, qui lit « Cinq cafés, 12,99 € » à la place.
 */

import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { euros } from "@/lib/monnaie";
import { CHALEUR, PREMIUM_TEXTE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import {
  etatSansPub,
  libelleDOffre,
  nomDesTasses,
  prixMensuel,
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

function MotDeLEquipe({ chaleur }: { chaleur: string }) {
  return (
    <>
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
    </>
  );
}

export function CarteSoutien({ soutien }: { soutien: Soutien }) {
  const { mode } = useCouleurs();
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const chaleur = CHALEUR[mode];
  const or = PREMIUM_TEXTE[mode];
  const { catalogue, facturation, actif, choix, offreChoisie, phase, erreur } = soutien;

  if (catalogue === null) {
    return (
      <Enveloppe>
        <Box className="h-3 w-32 rounded-full bg-border-chaleur" />
        <Box className="h-16 w-full rounded-md bg-border-chaleur" />
        <Box className="h-24 w-full rounded-md bg-border-chaleur" />
      </Enveloppe>
    );
  }

  // L'interrupteur du serveur est éteint pour cette plateforme : on garde le
  // mot de l'équipe, on ne propose aucun paiement.
  if (!actif) {
    return (
      <Enveloppe>
        <MotDeLEquipe chaleur={chaleur} />
      </Enveloppe>
    );
  }

  const sansPub = facturation?.sansPub ?? null;
  const sansPubActif = sansPub?.actif === true;
  const etat = sansPub !== null && sansPubActif ? etatSansPub(sansPub) : null;

  return (
    <Enveloppe>
      <MotDeLEquipe chaleur={chaleur} />

      {/* ── Sans pub ── */}
      <VStack className="gap-3 rounded-md border border-border-premium bg-surface-premium p-4">
        <HStack className="items-center gap-2">
          <Icone nom="couronne" couleur={or} taille={16} graisse="semibold" />
          <Texte className="flex-1 font-display text-callout text-foreground">
            {sansPubActif ? TEXTES.sansPubActifTitre : TEXTES.sansPubTitre}
          </Texte>
          {!sansPubActif ? (
            <Texte className="font-bold text-footnote text-premium-texte">
              {prixMensuel(catalogue.sansPub.prixCentimes)}
            </Texte>
          ) : null}
        </HStack>
        {sansPubActif && etat !== null ? (
          <Texte
            className={`text-footnote leading-5 ${etat.alerte ? "text-warning" : "text-muted-foreground"}`}
            accessibilityRole={etat.alerte ? "alert" : "text"}
          >
            {etat.texte}
          </Texte>
        ) : (
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {TEXTES.sansPubDetail}
          </Texte>
        )}
        {sansPubActif ? (
          <BoutonAction
            libelle={TEXTES.sansPubGerer}
            ton="secondaire"
            enCours={phase === "portail"}
            libelleEnCours="Ouverture…"
            desactive={phase !== "repos" || sansPub?.gerable === false}
            onPress={soutien.gerer}
          />
        ) : (
          <BoutonAction
            libelle={TEXTES.sansPubBouton}
            ton="principal"
            enCours={phase !== "repos" && !soutien.cafeEnCours}
            libelleEnCours={phase === "confirmation" ? TEXTES.attente : "Ouverture…"}
            desactive={phase !== "repos"}
            onPress={soutien.passerSansPub}
          />
        )}
      </VStack>

      {/* ── Café ── */}
      {soutien.merci ? (
        <Animated.View entering={reduit ? undefined : FadeIn.duration(320)}>
          <VStack className="items-center gap-3 py-2">
            <Icone nom="coeurPlein" couleur={chaleur} taille={28} />
            <Texte className="text-center font-display text-title-sm text-foreground">
              {TEXTES.merciTitre}
            </Texte>
            <Texte className="text-center text-body leading-7 text-muted-foreground">
              {TEXTES.merciTexte}
            </Texte>
            <BoutonAction
              libelle={TEXTES.encoreUn}
              ton="discret"
              onPress={soutien.recommencer}
            />
          </VStack>
        </Animated.View>
      ) : (
        <VStack className="gap-3">
          <VStack className="gap-0.5">
            <Texte className="font-display text-callout text-foreground">
              {TEXTES.cafeTitre}
            </Texte>
            <Texte className="text-footnote text-muted-foreground">
              {TEXTES.cafeDetail}
            </Texte>
          </VStack>
          {/* Une seule rangée, sur une piste discrète : on choisit sa tasse
              comme on choisit un segment. */}
          <HStack
            className="gap-1 rounded-full border border-border-chaleur p-1"
            accessibilityRole="radiogroup"
          >
            {catalogue.cafes.map((offre) => {
              const selectionne = offre.tasses === choix;
              return (
                <Pressable
                  key={offre.tasses}
                  onPress={() => soutien.choisir(offre.tasses)}
                  className={`min-h-touch flex-1 items-center justify-center gap-0.5 rounded-full px-1 ${
                    selectionne ? "bg-card" : ""
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectionne }}
                  accessibilityLabel={`${nomDesTasses(offre.tasses)}, ${euros(offre.prixCentimes)}`}
                >
                  <Texte className="text-footnote" accessible={false}>
                    {tassesDessinees(offre.tasses)}
                  </Texte>
                  <Texte
                    className={`font-bold text-caption ${selectionne ? "text-chaleur" : "text-muted-foreground"}`}
                    numberOfLines={1}
                  >
                    {euros(offre.prixCentimes)}
                  </Texte>
                </Pressable>
              );
            })}
          </HStack>
          <BoutonAction
            libelle={libelleDOffre(offreChoisie)}
            ton="secondaire"
            icone={<Icone nom="tasse" couleur={couleurs.texte} taille={16} />}
            enCours={phase !== "repos" && soutien.cafeEnCours}
            libelleEnCours={phase === "confirmation" ? TEXTES.attente : "Ouverture…"}
            desactive={phase !== "repos" || offreChoisie === null}
            onPress={soutien.offrir}
          />
        </VStack>
      )}

      {erreur !== null ? (
        <MessageErreur
          message={erreur}
          action={soutien.effacerErreur}
          libelleAction="Compris"
        />
      ) : null}
      <HStack className="items-center justify-center gap-1.5">
        <Icone nom="bouclier" couleur={couleurs.estompe} taille={12} />
        <Texte className="text-center text-caption text-foreground-faint">
          {TEXTES.stripe}
        </Texte>
      </HStack>
    </Enveloppe>
  );
}
