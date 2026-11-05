/**
 * Le détail d'une offre — l'écran de la V1 (`(home)/[id].tsx`).
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - l'en-tête : « ‹ Offres » à gauche, la pilule Partager / Garder à droite ;
 * - le bloc d'identité : tuile 68 (rayon 20) et, à sa droite,
 *   l'entreprise en capitales puis le titre très gras ; dessous, les
 *   étiquettes lieu / contrat / salaire (vert) ;
 * - **l'annonce native du détail, au-dessus du pli** (2026-11-05) : entre
 *   les étiquettes et la description, quand il y en a une et que la
 *   personne n'est pas sans pub — posée en bas, après la description, elle
 *   n'était vue (donc comptée) que si l'on défilait jusqu'à elle. Jamais
 *   au-dessus du bouton principal, qui vit dans le pied flottant. Elle
 *   arrive en fondu et la description glisse sous elle (`LinearTransition`)
 *   plutôt que de sauter ;
 * - « Description — L'annonce », avec son chargeur ;
 * - dans le pied flottant : **« Adapter mon CV à cette offre »** (l'action
 *   principale, en bleu : elle ouvre le dossier et l'atelier,
 *   `features/atelier`) et « Voir l'annonce d'origine », en contour.
 *
 * Les étiquettes disent tout ce que l'API type : lieu, contrat,
 * télétravail, horaires, expérience, salaire, et la source de l'annonce.
 *
 * ═══ L'entrée ═══
 *
 * Chaque bloc monte en fondu, décalé : l'écran se compose sous les yeux
 * plutôt que d'apparaître d'un bloc.
 */

import { Pressable, ScrollView } from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";
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
import { SALAIRE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";

import { BlocAnalyse } from "../components/bloc-analyse";
import { TuileEntreprise } from "../components/tuile-entreprise";
import { useDetailOffre } from "../hooks/use-detail-offre";
import { contratCourt, salaireLisible } from "../services/presentation";

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
    annonce,
    chargement,
    erreur,
    etatDescription,
    enregistrement,
    basculerSignet,
    partager,
    postuler,
    adapterCv,
    ouvertureDossier,
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
              </VStack>
            </Animated.View>

            {/* L'annonce porte son propre fondu (`CarteAnnonce`) ; la clé fixe
                garde la description sous elle entre deux rendus. */}
            {annonce !== null ? <CarteAnnonce annonce={annonce} /> : null}

            <Animated.View
              key="description"
              entering={entree(2)}
              layout={reduit ? undefined : LinearTransition.duration(260)}
            >
              <BlocAnalyse etat={etatDescription} texte={offre.description} />
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Les actions, en pied flottant — le même que le détail d'un modèle.
          Une seule en bleu : adapter son CV. L'annonce d'origine, en contour. */}
      {offre !== null ? (
        <PiedFlottant>
          <Pressable
            onPress={adapterCv}
            disabled={ouvertureDossier}
            className={`h-[52px] flex-row items-center justify-center gap-2 rounded-[14px] bg-primary ${
              ouvertureDossier ? "opacity-60" : ""
            }`}
            accessibilityRole="button"
            accessibilityState={{ busy: ouvertureDossier }}
          >
            <Texte className="font-bold text-callout text-primary-foreground">
              {ouvertureDossier ? "J'ouvre ton dossier…" : "Adapter mon CV à cette offre"}
            </Texte>
          </Pressable>
          {offre.lienCandidature !== null ? (
            <Pressable
              onPress={postuler}
              className="h-[48px] flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-border-champ"
              accessibilityRole="link"
            >
              <Texte className="font-bold text-callout text-foreground">
                Voir l&apos;annonce d&apos;origine
              </Texte>
              <Icone
                nom="ouvrir"
                couleur={couleurs.texte}
                taille={15}
                graisse="semibold"
              />
            </Pressable>
          ) : null}
        </PiedFlottant>
      ) : null}
    </Box>
  );
}
