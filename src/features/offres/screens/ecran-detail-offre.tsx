/**
 * Le détail d'une offre — l'écran de la V1 (`(home)/[id].tsx`).
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - l'en-tête : « ‹ Offres » à gauche, la pilule Partager / Garder à droite ;
 * - le bloc d'identité : tuile 68 (rayon 20) et, à sa droite,
 *   l'entreprise en capitales puis le titre très gras ; dessous, les
 *   étiquettes lieu / contrat / salaire (vert) ;
 * - « Description — Analyse par Karria », avec son chargeur ;
 * - « Voir l'annonce d'origine », dans le pied flottant.
 *
 * Le pied « Créer mon CV / Créer ma lettre » de la V1 arrive avec le
 * Studio (onglet CV) ; d'ici là, l'action est l'annonce d'origine.
 *
 * ═══ L'entrée ═══
 *
 * Chaque bloc monte en fondu, décalé : l'écran se compose sous les yeux
 * plutôt que d'apparaître d'un bloc.
 */

import { Image } from "expo-image";
import { Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone, type NomIcone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { HAUTEUR_PIED_FLOTTANT, PiedFlottant } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { SALAIRE, SUR_PRIMAIRE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { BlocAnalyse } from "../components/bloc-analyse";
import { useDetailOffre } from "../hooks/use-detail-offre";
import {
  contratCourt,
  initiales,
  salaireLisible,
  teinteDeTuile,
} from "../services/presentation";

function Etiquette({
  icone,
  libelle,
  vert = false,
}: {
  icone: NomIcone;
  libelle: string;
  vert?: boolean;
}) {
  const couleurs = useCouleurs();
  return (
    <HStack
      space="xs"
      className={`items-center rounded-etiquette px-3 py-2 ${vert ? "bg-salaire" : "bg-remplissage"}`}
    >
      <Icone nom={icone} couleur={vert ? SALAIRE : couleurs.estompe} taille={14} />
      <Texte
        className={`font-bold text-footnote ${vert ? "text-salaire-foreground" : "text-foreground"}`}
      >
        {libelle}
      </Texte>
    </HStack>
  );
}

export function EcranDetailOffre() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const {
    offre,
    chargement,
    erreur,
    etatAnalyse,
    analyse,
    enregistrement,
    basculerSignet,
    partager,
    postuler,
    recharger,
    retour,
  } = useDetailOffre();

  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(380).delay(80 + rang * 70);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour
          retour="Offres"
          onRetour={retour}
          actions={
            offre === null
              ? []
              : [
                  { icone: "partager", libelle: "Partager l'offre", onPress: partager },
                  {
                    icone: offre.enregistree ? "signetPlein" : "signet",
                    libelle: offre.enregistree
                      ? "Retirer de mes offres"
                      : "Garder l'offre",
                    onPress: basculerSignet,
                    active: offre.enregistree,
                    desactivee: enregistrement,
                  },
                ]
          }
        />

        {chargement ? (
          <Box className="flex-1 items-center justify-center">
            <ChargeurKarria />
          </Box>
        ) : offre === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={erreur ?? "Offre introuvable."}
              action={recharger}
              libelleAction="Réessayer"
            />
          </Box>
        ) : (
          <ScrollView
            contentContainerClassName="gap-4 p-5"
            contentContainerStyle={{ paddingBottom: HAUTEUR_PIED_FLOTTANT }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={entree(0)}>
              <HStack space="md" className="items-center">
                <Box
                  className="h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-border-subtle"
                  // Teinte calculée de l'identifiant, comme le détail de la V1.
                  style={
                    offre.logo === null
                      ? { backgroundColor: teinteDeTuile(offre.id) }
                      : undefined
                  }
                >
                  {offre.logo !== null ? (
                    <Image
                      source={{ uri: offre.logo }}
                      style={{ width: "80%", height: "80%" }}
                      contentFit="contain"
                      accessibilityLabel={offre.entreprise ?? "Logo de l'entreprise"}
                    />
                  ) : (
                    <Texte className="font-display text-title text-on-scrim">
                      {initiales(offre.entreprise)}
                    </Texte>
                  )}
                </Box>
                <VStack space="xs" className="flex-1">
                  <Texte className="font-bold text-footnote uppercase tracking-widest text-muted-foreground">
                    {offre.entreprise ?? "Entreprise"}
                  </Texte>
                  <Texte
                    accessibilityRole="header"
                    className="font-display text-title leading-[30px] tracking-tight text-foreground"
                  >
                    {offre.titre}
                  </Texte>
                </VStack>
              </HStack>
            </Animated.View>

            <Animated.View entering={entree(1)}>
              <HStack className="flex-wrap gap-2">
                {offre.ville !== null ? (
                  <Etiquette icone="lieu" libelle={offre.ville} />
                ) : null}
                {offre.contrats.map((c) => (
                  <Etiquette key={c} icone="contrat" libelle={contratCourt(c)} />
                ))}
                {salaireLisible(offre.salaire) !== null ? (
                  <Etiquette
                    icone="salaire"
                    libelle={salaireLisible(offre.salaire) ?? ""}
                    vert
                  />
                ) : null}
              </HStack>
            </Animated.View>

            <Animated.View entering={entree(2)}>
              <BlocAnalyse etat={etatAnalyse} analyse={analyse} />
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* L'action, en pied flottant — le même que le détail d'un modèle. */}
      {offre !== null && offre.lienCandidature !== null ? (
        <PiedFlottant>
          <Pressable
            onPress={postuler}
            className="h-[52px] flex-row items-center justify-center gap-2 rounded-[14px] bg-primary"
            accessibilityRole="link"
          >
            <Texte className="font-bold text-callout text-primary-foreground">
              Voir l&apos;annonce d&apos;origine
            </Texte>
            <Icone
              nom="ouvrir"
              couleur={SUR_PRIMAIRE[couleurs.mode]}
              taille={16}
              graisse="semibold"
            />
          </Pressable>
        </PiedFlottant>
      ) : null}
    </Box>
  );
}
