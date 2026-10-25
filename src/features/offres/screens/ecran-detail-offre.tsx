/**
 * Le détail d'une offre — l'écran de la V1 (`(home)/[id].tsx`).
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - l'en-tête : « ‹ Offres » à gauche, la pilule Partager / Garder à droite ;
 * - le bloc d'identité : tuile 68 (rayon 20) et, à sa droite,
 *   l'entreprise en capitales puis le titre très gras ; dessous, les
 *   étiquettes lieu / contrat / salaire (vert) ;
 * - « Description — L'annonce », avec son chargeur ;
 * - « Voir l'annonce d'origine », dans le pied flottant.
 *
 * Le pied « Créer mon CV / Créer ma lettre » de la V1 arrive avec le
 * Studio (onglet CV) ; d'ici là, l'action est l'annonce d'origine. Les
 * étiquettes disent tout ce que l'API type : lieu, contrat, télétravail,
 * horaires, expérience, salaire, et la source de l'annonce.
 *
 * ═══ L'entrée ═══
 *
 * Chaque bloc monte en fondu, décalé : l'écran se compose sous les yeux
 * plutôt que d'apparaître d'un bloc.
 */

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
import { TuileEntreprise } from "../components/tuile-entreprise";
import { useDetailOffre } from "../hooks/use-detail-offre";
import { contratCourt, libelleSource, salaireLisible } from "../services/presentation";

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
    etatDescription,
    enregistrement,
    basculerSignet,
    partager,
    postuler,
    ecarter,
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
                  { icone: "fermer", libelle: "Écarter cette offre", onPress: ecarter },
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
                <TuileEntreprise
                  logo={offre.logoGrand ?? offre.logo}
                  entreprise={offre.entreprise}
                  teinte={offre.id}
                  taille="detail"
                />
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
              <VStack space="sm">
                <HStack className="flex-wrap gap-2">
                  {offre.lieu !== null ? (
                    <Etiquette icone="lieu" libelle={offre.lieu} />
                  ) : null}
                  {offre.contrat !== null ? (
                    <Etiquette icone="contrat" libelle={contratCourt(offre.contrat)} />
                  ) : null}
                  {offre.teletravail !== null && offre.teletravail !== "sur site" ? (
                    <Etiquette icone="appareil" libelle={offre.teletravail} />
                  ) : null}
                  {offre.horaires === "temps partiel" ? (
                    <Etiquette icone="calendrier" libelle={offre.horaires} />
                  ) : null}
                  {offre.experience !== null ? (
                    <Etiquette icone="tendance" libelle={offre.experience} />
                  ) : null}
                  {salaireLisible(offre.salaire) !== null ? (
                    <Etiquette
                      icone="salaire"
                      libelle={salaireLisible(offre.salaire) ?? ""}
                      vert
                    />
                  ) : null}
                </HStack>
                <Texte className="px-1 text-caption text-foreground-faint">
                  {offre.active ? "Publiée sur" : "Expirée · publiée sur"}{" "}
                  {libelleSource(offre.source)}
                </Texte>
              </VStack>
            </Animated.View>

            <Animated.View entering={entree(2)}>
              <BlocAnalyse etat={etatDescription} texte={offre.description} />
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
