/**
 * Le détail d'un modèle — `(templates)/[templateId]` de la V1.
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - « ‹ Modèles » et Partager (le même en-tête que le détail d'une offre) ;
 * - le carrousel : le CV puis ses lettres, plein écran au toucher ;
 * - la catégorie en capitales bleues (et la pastille Premium), le nom, la ligne de statistiques
 *   (vues, utilisations, note), les étiquettes (avec la couleur et la
 *   police du modèle), la description, « Lettre de motivation incluse »,
 *   puis « Avis et notes » ;
 * - en pied, la barre d'action.
 *
 * ═══ La cohérence avec le reste ═══
 *
 * Même en-tête de retour, même entrée décalée des blocs, même pied fixe
 * que le détail d'une offre : d'un onglet à l'autre, un détail se lit et
 * se quitte de la même façon.
 */

import { ScrollView } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { HAUTEUR_PIED_FLOTTANT } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { PREMIUM } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { BarreActionModele } from "../components/barre-action-modele";
import { CarrouselApercus } from "../components/carrousel-apercus";
import { PastillePremium } from "../components/pastille-premium";
import { useDetailModele } from "../hooks/use-detail-modele";
import { capitaliser, compteCompact, noteLisible } from "../services/presentation";

function Statistique({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <VStack className="flex-1 items-center gap-0.5">
      <Texte className="font-display text-callout text-foreground">{valeur}</Texte>
      <Texte className="text-caption text-muted-foreground">{libelle}</Texte>
    </VStack>
  );
}

function Etiquette({ children }: { children: React.ReactNode }) {
  return (
    <HStack className="items-center gap-1.5 rounded-xs bg-remplissage px-2.5 py-1">
      {children}
    </HStack>
  );
}

export function EcranDetailModele() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const {
    modele,
    avis,
    chargement,
    complet,
    erreur,
    acquisition,
    paiementsActifs,
    obtenir,
    partager,
    retour,
    voirLaGalerie,
    recharger,
  } = useDetailModele();

  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(380).delay(80 + rang * 70);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour
          retour="Modèles"
          onRetour={retour}
          actions={
            modele === null
              ? []
              : [{ icone: "partager", libelle: "Partager le modèle", onPress: partager }]
          }
        />

        {chargement && modele === null ? (
          <Box className="flex-1 items-center justify-center">
            <ChargeurKarria />
          </Box>
        ) : modele === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={erreur ?? "Modèle introuvable."}
              action={recharger}
              libelleAction="Réessayer"
            />
          </Box>
        ) : (
          <>
            <ScrollView
              // La place du pied flottant, pour que la dernière ligne ne
              // finisse jamais sous les boutons.
              contentContainerStyle={{ paddingBottom: HAUTEUR_PIED_FLOTTANT }}
              showsVerticalScrollIndicator={false}
            >
              <CarrouselApercus
                idModele={modele.id}
                version={modele.version}
                apercus={modele.apercus}
                flou={modele.flou}
              />

              <VStack className="gap-5 px-5 pt-5">
                <Animated.View entering={entree(0)}>
                  <VStack className="gap-1">
                    <HStack className="items-center justify-between gap-3">
                      <Texte className="font-bold text-footnote uppercase tracking-widest text-primary">
                        {capitaliser(modele.categorie)}
                      </Texte>
                      {modele.premium ? <PastillePremium grande /> : null}
                    </HStack>
                    <Texte
                      accessibilityRole="header"
                      className="font-display text-title leading-[34px] tracking-tight text-foreground"
                    >
                      {modele.libelle}
                    </Texte>
                  </VStack>
                </Animated.View>

                <Animated.View entering={entree(1)}>
                  <HStack className="rounded-carte border border-border-subtle bg-card py-4">
                    <Statistique valeur={compteCompact(modele.vues)} libelle="vues" />
                    <Box className="w-px bg-border-subtle" />
                    <Statistique
                      valeur={compteCompact(modele.utilisations)}
                      libelle="utilisations"
                    />
                    <Box className="w-px bg-border-subtle" />
                    <Statistique
                      valeur={noteLisible(modele.note, modele.nombreDAvis)}
                      libelle={
                        modele.nombreDAvis > 0 ? `${modele.nombreDAvis} avis` : "note"
                      }
                    />
                  </HStack>
                </Animated.View>

                <Animated.View entering={entree(2)}>
                  <HStack className="flex-wrap gap-2">
                    {modele.couleur !== null ? (
                      <Etiquette>
                        <Box
                          className="h-3 w-3 rounded-full border border-border-subtle"
                          // La couleur du modèle : une donnée, pas la charte.
                          style={{ backgroundColor: modele.couleur }}
                        />
                        <Texte className="text-footnote text-foreground">
                          {modele.couleur}
                        </Texte>
                      </Etiquette>
                    ) : null}
                    {modele.police !== null ? (
                      <Etiquette>
                        <Texte className="text-footnote text-foreground">
                          {modele.police}
                        </Texte>
                      </Etiquette>
                    ) : null}
                    {modele.avecPhoto ? (
                      <Etiquette>
                        <Icone nom="photo" couleur={couleurs.estompe} taille={12} />
                        <Texte className="text-footnote text-foreground">
                          Avec photo
                        </Texte>
                      </Etiquette>
                    ) : null}
                    {modele.etiquettes.map((e) => (
                      <Etiquette key={e}>
                        <Texte className="text-footnote lowercase text-foreground">
                          {e}
                        </Texte>
                      </Etiquette>
                    ))}
                  </HStack>
                </Animated.View>

                {modele.description !== null ? (
                  <Animated.View entering={entree(3)}>
                    <Texte className="text-body leading-6 text-muted-foreground">
                      {modele.description}
                    </Texte>
                  </Animated.View>
                ) : null}

                {modele.avecLettre ? (
                  <Animated.View entering={entree(4)}>
                    <HStack className="items-start gap-3 rounded-carte bg-surface-primary p-4">
                      <Icone nom="lettre" couleur={couleurs.primaire} taille={20} />
                      <VStack className="flex-1 gap-0.5">
                        <Texte className="font-bold text-body text-foreground">
                          Lettre de motivation incluse
                        </Texte>
                        <Texte className="text-footnote text-muted-foreground">
                          Une lettre assortie, aux mêmes couleurs, pour postuler avec un
                          dossier cohérent.
                        </Texte>
                      </VStack>
                    </HStack>
                  </Animated.View>
                ) : null}

                <Animated.View entering={entree(5)}>
                  <VStack className="gap-3">
                    <Texte className="font-display text-callout text-foreground">
                      Avis et notes
                    </Texte>
                    {avis === null || avis.avis.length === 0 ? (
                      <Texte className="text-footnote text-foreground-faint">
                        Aucun avis pour l&apos;instant.
                      </Texte>
                    ) : (
                      avis.avis.map((a) => (
                        <VStack
                          key={a.id}
                          className="gap-1.5 rounded-carte border border-border-subtle bg-card p-4"
                        >
                          <HStack className="items-center gap-2">
                            <Box className="h-7 w-7 items-center justify-center rounded-full bg-surface-primary">
                              <Texte className="font-bold text-caption text-primary">
                                {a.initiales}
                              </Texte>
                            </Box>
                            <Texte className="flex-1 font-bold text-footnote text-foreground">
                              {a.auteur}
                            </Texte>
                            <HStack className="gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Icone
                                  key={i}
                                  nom="etoile"
                                  couleur={
                                    i < a.note ? PREMIUM[couleurs.mode] : couleurs.contour
                                  }
                                  taille={11}
                                />
                              ))}
                            </HStack>
                          </HStack>
                          {a.titre ? (
                            <Texte className="font-bold text-footnote text-foreground">
                              {a.titre}
                            </Texte>
                          ) : null}
                          {a.texte ? (
                            <Texte className="text-footnote text-muted-foreground">
                              {a.texte}
                            </Texte>
                          ) : null}
                        </VStack>
                      ))
                    )}
                  </VStack>
                </Animated.View>
              </VStack>
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      {/* Hors de la zone sûre : le pied flottant calcule lui-même sa
          distance au bord, au-dessus de l'indicateur d'accueil. */}
      {modele !== null && complet ? (
        <BarreActionModele
          modele={modele}
          acquisition={acquisition}
          paiementsActifs={paiementsActifs}
          onObtenir={obtenir}
          onVoirLaGalerie={voirLaGalerie}
        />
      ) : null}
    </Box>
  );
}
