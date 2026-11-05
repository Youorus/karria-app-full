/**
 * La lettre — « Et ta lettre ? », puis la feuille.
 *
 * Sans lettre : l'orbe, la question, deux voies (Karria écrit · plus tard).
 * Avec : l'en-tête de l'atelier, la feuille au centre (même composant que
 * le CV), les conseils du rendu en une ligne discrète, et un seul bouton
 * bleu en pied : « Continuer » vers Finaliser. Toucher un paragraphe ouvre
 * la feuille basse : je modifie, ou Karria réécrit.
 */

import { Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { PiedFlottant } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { FeuilleCv } from "../components/feuille-cv";
import { FeuilleParagraphe } from "../components/feuille-paragraphe";
import { TEXTES, useLettre } from "../hooks/use-lettre";

export function EcranLettre() {
  const couleurs = useCouleurs();
  const l = useLettre();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <HStack className="items-center justify-between px-3 pb-1 pt-1">
          <Pressable
            onPress={l.retour}
            className="min-h-touch flex-1 flex-row items-center pr-3"
            accessibilityRole="button"
            accessibilityLabel="Retour au CV"
          >
            <Icone
              nom="retour"
              couleur={couleurs.primaire}
              taille={22}
              graisse="semibold"
            />
            <VStack className="flex-1">
              <Texte
                className="font-bold text-footnote text-foreground"
                numberOfLines={1}
              >
                Ma lettre
              </Texte>
              <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
                {l.dossier?.offre.entreprise ?? ""}
              </Texte>
            </VStack>
          </Pressable>
          {l.enregistrement === "fait" ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <HStack
                className="items-center gap-1 pr-2"
                accessibilityLiveRegion="polite"
              >
                <Icone nom="coche" couleur={couleurs.succes} taille={11} graisse="bold" />
                <Texte className="text-caption text-success">Enregistré</Texte>
              </HStack>
            </Animated.View>
          ) : l.enregistrement === "erreur" ? (
            <Texte className="pr-2 text-caption text-destructive">Non enregistré</Texte>
          ) : null}
        </HStack>

        {l.chargement ? (
          <Box className="flex-1 items-center justify-center">
            <ChargeurKarria />
          </Box>
        ) : l.erreur !== null || l.dossier === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={l.erreur ?? "Ce dossier n'a pas pu être chargé."}
              action={l.retour}
              libelleAction="Revenir"
            />
          </Box>
        ) : l.lettre === null ? (
          <Box className="flex-1 justify-center gap-8 px-6 pb-8">
            <VStack className="items-center gap-6">
              <OrbeVivante taille={120} active={l.ebauche}>
                <SymboleKarria taille={44} teinte="reflet" />
              </OrbeVivante>
              <VStack className="items-center gap-2">
                <Texte
                  accessibilityRole="header"
                  className="text-center font-display text-title tracking-tight text-foreground"
                >
                  {TEXTES.lettreTitre}
                </Texte>
                <Texte className="text-center text-body leading-6 text-muted-foreground">
                  {TEXTES.lettrePhrase}
                </Texte>
              </VStack>
            </VStack>
            <VStack className="gap-3">
              <BoutonAction
                libelle={TEXTES.lettreEbaucher}
                onPress={l.ecrireAvecKarria}
                enCours={l.ebauche}
                libelleEnCours={TEXTES.lettreEbauche}
              />
              <BoutonAction
                libelle={TEXTES.lettrePasser}
                ton="discret"
                onPress={l.passer}
                desactive={l.ebauche}
              />
            </VStack>
          </Box>
        ) : (
          <Box style={{ flex: 1 }}>
            {l.html === null ? (
              <Box className="flex-1 items-center justify-center">
                <ChargeurKarria libelle="Karria met en page…" />
              </Box>
            ) : (
              <FeuilleCv html={l.html} onPoignee={l.poserFeuille} onToucher={l.toucher} />
            )}
            {l.erreurRendu !== null ? (
              <Box className="absolute left-4 right-4 top-2 rounded-carte bg-card px-4 py-2 shadow-sm">
                <Texte className="text-center text-footnote text-muted-foreground">
                  {l.erreurRendu}
                </Texte>
              </Box>
            ) : null}
          </Box>
        )}
      </SafeAreaView>

      {l.lettre !== null && !l.chargement ? (
        <PiedFlottant aide={l.conseils[0] ?? null}>
          <BoutonAction libelle="Continuer" onPress={l.continuer} />
        </PiedFlottant>
      ) : null}

      <FeuilleParagraphe
        key={
          l.cible === null
            ? "aucune"
            : `${l.cible.partie}-${"index" in l.cible ? l.cible.index : 0}`
        }
        visible={l.cible !== null}
        cible={l.cible ?? { partie: "hors-lettre" }}
        texte={l.texteDeCible}
        reecriture={l.reecriture}
        reecritureEnCours={l.reecritureEnCours}
        onApercu={l.apercu}
        onEnregistrer={l.enregistrerTexte}
        onReecrire={l.reecrire}
        onGarderNouveau={l.garderNouveau}
        onGarderAncien={l.garderAncien}
        onFermer={l.fermerCible}
      />
    </Box>
  );
}
