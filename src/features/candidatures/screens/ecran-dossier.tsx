/**
 * Le détail d'un dossier : ce qu'on a généré pour cette offre, et où l'on
 * en est.
 *
 * ═══ De haut en bas ═══
 *
 * 1. « ‹ Candidatures », puis le titre de l'offre en grand, l'entreprise,
 *    et l'état en une phrase (« Candidaté le 3 nov. »).
 * 2. L'offre figée, compacte — avec « Voir l'offre », ou la source si
 *    elle a quitté l'index.
 * 3. Les deux feuilles côte à côte : le CV adapté et la lettre, avec un
 *    vrai bout de leur contenu ; toucher ouvre la lecture.
 * 4. Les exports déjà faits (PDF, Word) pour ce dossier, s'il y en a.
 * 5. « J'ai candidaté » / « Finalement non », avec la date.
 * 6. En bas, flottant : « Continuer dans l'atelier » — l'unique bouton
 *    bleu. « Supprimer » reste discret, tout en bas du défilement.
 *
 * Pendant l'adaptation, la feuille du CV dit « Karria adapte ton CV… » et
 * l'écran se relit tout seul (dans le hook).
 */

import { Pressable, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { PiedAction } from "@/components/pied-action";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteOffreFigee } from "../components/carte-offre-figee";
import { PointEtat } from "../components/point-etat";
import { VignetteDocument } from "../components/vignette-document";
import { useDossier } from "../hooks/use-dossier";
import { dateCourte, dateLongue, TEXTES } from "../services/presentation";
import type { ExportDossier } from "../types/candidatures.types";

/** La place réservée au pied flottant par la zone défilante. */
const HAUTEUR_PIED = 120;

function LigneExport({
  exporte,
  maintenant,
  onPress,
}: {
  exporte: ExportDossier;
  maintenant: Date;
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  const formats = [
    exporte.pdf === null ? null : "PDF",
    exporte.docx === null ? null : "Word",
  ]
    .filter((f): f is string => f !== null)
    .join(" · ");
  const quand = dateCourte(exporte.creeLe, maintenant);
  return (
    <Pressable
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 py-2"
      accessibilityRole="button"
      accessibilityLabel={`${exporte.genre === "cv" ? "CV" : "Lettre"} exporté ${quand ?? ""}, ${formats}`}
      accessibilityHint="Ouvre le fichier"
    >
      <Icone
        nom={exporte.genre === "cv" ? "cv" : "lettre"}
        couleur={couleurs.estompe}
        taille={18}
      />
      <VStack className="flex-1">
        <Texte className="font-bold text-footnote text-foreground" numberOfLines={1}>
          {exporte.genre === "cv" ? "CV" : "Lettre de motivation"}
          {exporte.modele === null ? "" : ` · ${exporte.modele}`}
        </Texte>
        <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
          {[formats, quand === null ? null : `exporté ${quand}`]
            .filter(Boolean)
            .join(" — ")}
        </Texte>
      </VStack>
      <Icone nom="ouvrir" couleur={couleurs.estompe} taille={14} />
    </Pressable>
  );
}

export function EcranDossier() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const {
    dossier,
    etat,
    apercuCv,
    apercuLettre,
    chargement,
    erreur,
    exports,
    offreDansLIndex,
    enregistrement,
    note,
    maintenant,
    marquerCandidate,
    retirerCandidate,
    ouvrirOffre,
    ouvrirDocument,
    ouvrirExport,
    ouvrirAtelier,
    supprimer,
    recharger,
    retour,
  } = useDossier();

  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(380).delay(60 + rang * 60);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour retour="Candidatures" onRetour={retour} />

        {chargement ? (
          <Box className="flex-1 items-center justify-center">
            <ChargeurKarria />
          </Box>
        ) : dossier === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={erreur ?? TEXTES.erreurDetail}
              action={recharger}
              libelleAction="Réessayer"
            />
          </Box>
        ) : (
          <>
            <ScrollView
              contentContainerClassName="gap-5 px-5 pt-2"
              contentContainerStyle={{ paddingBottom: HAUTEUR_PIED }}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View entering={entree(0)}>
                <VStack space="sm">
                  <Texte
                    accessibilityRole="header"
                    className="font-display text-title-lg leading-9 tracking-tighter text-foreground"
                  >
                    {dossier.offre.titre}
                  </Texte>
                  <Texte className="text-callout text-muted-foreground" numberOfLines={1}>
                    {[dossier.offre.entreprise, dossier.offre.ville]
                      .filter((d): d is string => d !== null)
                      .join(" · ")}
                  </Texte>
                  {etat !== null ? <PointEtat etat={etat} grand /> : null}
                  {erreur !== null ? (
                    <MessageErreur
                      message={erreur}
                      action={recharger}
                      libelleAction="Réessayer"
                    />
                  ) : null}
                </VStack>
              </Animated.View>

              <Animated.View entering={entree(1)}>
                <CarteOffreFigee
                  offre={dossier.offre}
                  dansLIndex={offreDansLIndex}
                  maintenant={maintenant}
                  onOuvrir={ouvrirOffre}
                />
              </Animated.View>

              <Animated.View entering={entree(2)}>
                <HStack space="md" className="items-start">
                  <VignetteDocument
                    titre="CV adapté"
                    sousTitre={
                      dossier.adaptation === "en_cours"
                        ? "Karria adapte ton CV…"
                        : dossier.adaptation === "echouee"
                          ? "L'adaptation n'a pas abouti"
                          : `Généré ${dateCourte(dossier.creeLe, maintenant) ?? ""}`
                    }
                    lignes={apercuCv}
                    action={
                      dossier.adaptation === "en_cours"
                        ? "Quelques secondes"
                        : dossier.adaptation === "echouee"
                          ? "Relancer dans l'atelier"
                          : "Lire le CV adapté"
                    }
                    onPress={() =>
                      dossier.adaptation === "faite"
                        ? ouvrirDocument("cv")
                        : ouvrirAtelier()
                    }
                  />
                  <VignetteDocument
                    titre="Lettre"
                    sousTitre={
                      dossier.lettre === null
                        ? "Pas encore de lettre"
                        : `Mise à jour ${dateCourte(dossier.modifieLe, maintenant) ?? ""}`
                    }
                    lignes={apercuLettre}
                    action={
                      dossier.lettre === null
                        ? "L'écrire dans l'atelier"
                        : "Lire la lettre"
                    }
                    onPress={() =>
                      dossier.lettre === null ? ouvrirAtelier() : ouvrirDocument("lettre")
                    }
                  />
                </HStack>
              </Animated.View>

              {exports.length > 0 ? (
                <Animated.View entering={entree(3)}>
                  <VStack className="rounded-carte border border-border-subtle bg-card px-4 py-2">
                    <Texte className="pt-2 font-bold text-footnote text-foreground">
                      Fichiers exportés
                    </Texte>
                    {exports.map((e, i) => (
                      <Box
                        key={e.id}
                        className={i > 0 ? "border-t border-border-subtle" : ""}
                      >
                        <LigneExport
                          exporte={e}
                          maintenant={maintenant}
                          onPress={() => ouvrirExport(e)}
                        />
                      </Box>
                    ))}
                  </VStack>
                </Animated.View>
              ) : null}

              <Animated.View entering={entree(4)}>
                <VStack
                  space="sm"
                  className="rounded-carte border border-border-subtle bg-card p-4"
                >
                  {dossier.candidateLe !== null ? (
                    <>
                      <HStack space="sm" className="items-center">
                        <Icone nom="cocheCercle" couleur={couleurs.succes} taille={18} />
                        <Texte className="flex-1 font-bold text-body text-foreground">
                          Candidaté le {dateLongue(dossier.candidateLe)}
                        </Texte>
                      </HStack>
                      <BoutonAction
                        libelle={TEXTES.finalementNon}
                        ton="discret"
                        enCours={enregistrement}
                        libelleEnCours="Un instant…"
                        onPress={retirerCandidate}
                      />
                    </>
                  ) : (
                    <>
                      <Texte className="text-body text-muted-foreground">
                        Tu as envoyé ce dossier ? Dis-le ici : il passera en « candidaté »
                        avec la date.
                      </Texte>
                      <BoutonAction
                        libelle={TEXTES.candidate}
                        ton="secondaire"
                        enCours={enregistrement}
                        libelleEnCours="Un instant…"
                        onPress={marquerCandidate}
                      />
                    </>
                  )}
                  {note !== null ? (
                    <Animated.View
                      entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
                      exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)}
                    >
                      <Texte
                        className="text-center text-footnote text-success"
                        accessibilityRole="alert"
                      >
                        {note}
                      </Texte>
                    </Animated.View>
                  ) : null}
                </VStack>
              </Animated.View>

              <Animated.View entering={entree(5)}>
                <Pressable
                  onPress={supprimer}
                  className="min-h-touch items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`${TEXTES.supprimer} ce dossier`}
                >
                  <Texte className="text-footnote text-destructive">
                    {TEXTES.supprimer} ce dossier
                  </Texte>
                </Pressable>
              </Animated.View>
            </ScrollView>

            <PiedAction flottant>
              <BoutonAction
                libelle={TEXTES.continuerAtelier}
                ton="principal"
                onPress={ouvrirAtelier}
                iconeFin={
                  <Icone
                    nom="suivant"
                    couleur={couleurs.surPrimaire}
                    taille={14}
                    graisse="bold"
                  />
                }
              />
            </PiedAction>
          </>
        )}
      </SafeAreaView>
    </Box>
  );
}
