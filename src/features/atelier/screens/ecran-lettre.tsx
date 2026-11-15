/**
 * La lettre — « Et ta lettre ? », puis la feuille.
 *
 * Sans lettre : l'orbe, la question, deux voies (Karria écrit · plus tard).
 * Avec : l'en-tête de l'atelier, la feuille au centre (même composant que
 * le CV) avec la pastille du modèle à la même place que dans l'atelier —
 * et, si le modèle a une lettre assortie, la pastille « Du modèle · Sobre »
 * juste à sa droite —, les conseils du rendu en une ligne discrète, et un
 * seul bouton bleu en pied : « Continuer » vers Finaliser. Toucher un
 * paragraphe ouvre la feuille basse : je modifie, ou Karria réécrit.
 */

import { Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { FeuilleCv } from "../components/feuille-cv";
import { FeuilleModele } from "../components/feuille-modele";
import { FeuilleParagraphe } from "../components/feuille-paragraphe";
import { PastilleModele } from "../components/pastille-modele";
import { PastilleStyleLettre } from "../components/pastille-style-lettre";
import { useChoixModele } from "../hooks/use-choix-modele";
import { TEXTES, useLettre } from "../hooks/use-lettre";

export function EcranLettre() {
  const couleurs = useCouleurs();
  const l = useLettre();
  const choix = useChoixModele(
    l.feuilleModele,
    l.modeles,
    l.possedes,
    l.modeleId,
    l.choisirModele,
  );

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <HStack className="items-center justify-between px-3 pb-1 pt-1">
          <Pressable
            onPress={l.retour}
            className="min-h-touch flex-1 flex-row items-center pr-3"
            accessibilityRole="button"
            accessibilityLabel={l.retourLibelle}
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
            <Animated.View
              entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
            >
              <HStack
                className="items-center gap-1 pr-2"
                accessibilityLiveRegion="polite"
              >
                <Icone nom="coche" couleur={couleurs.succes} taille={11} graisse="bold" />
                <Texte className="text-caption text-success">Enregistré</Texte>
              </HStack>
            </Animated.View>
          ) : null}
        </HStack>

        {l.enregistrement === "erreur" ? (
          <Texte
            accessibilityRole="alert"
            className="px-4 py-1 text-footnote text-destructive"
          >
            Lettre non enregistrée. Vérifie ta connexion et réessaie.
          </Texte>
        ) : null}
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
          <ScrollView
            contentContainerClassName="grow justify-center gap-8 px-6 py-5"
            showsVerticalScrollIndicator={false}
          >
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
                multiligne
                onPress={l.ecrireAvecKarria}
                enCours={l.ebauche}
                libelleEnCours={TEXTES.lettreEbauche}
              />
              <BoutonAction
                libelle={
                  l.depuisFinaliser ? "Revenir sans lettre" : "Continuer sans lettre"
                }
                multiligne
                ton="discret"
                onPress={l.passer}
                desactive={l.ebauche}
              />
            </VStack>
          </ScrollView>
        ) : (
          <Box className="min-h-0 flex-1">
            {l.erreurRendu !== null ? (
              <Box className="mx-3 mb-2 rounded-carte bg-card px-4 py-2">
                <Texte className="text-center text-footnote text-muted-foreground">
                  {l.erreurRendu}
                </Texte>
              </Box>
            ) : (
              <HStack className="flex-wrap items-center gap-2 px-3 pb-2">
                <PastilleModele
                  libelle={l.modele?.libelle ?? null}
                  onPress={l.ouvrirModele}
                />
                {l.lettreAssortie ? (
                  <PastilleStyleLettre
                    style={l.styleLettre}
                    onChoisir={l.choisirStyleLettre}
                  />
                ) : null}
              </HStack>
            )}
            {l.html === null ? (
              <Box className="flex-1 items-center justify-center">
                <ChargeurKarria libelle="Karria met en page…" />
              </Box>
            ) : (
              <FeuilleCv html={l.html} onPoignee={l.poserFeuille} onToucher={l.toucher} />
            )}
          </Box>
        )}

        {l.lettre !== null && !l.chargement ? (
          <VStack className="gap-2 border-t border-border-subtle bg-background px-5 py-3">
            {l.conseils[0] ? (
              <Texte className="text-footnote text-muted-foreground">
                {l.conseils[0]}
              </Texte>
            ) : null}
            <BoutonAction
              libelle={
                l.depuisFinaliser ? "Retour aux documents" : "Finaliser les documents"
              }
              multiligne
              onPress={l.continuer}
              enCours={l.enregistrement === "en-cours"}
              libelleEnCours="Enregistrement…"
              desactive={l.reecritureEnCours}
            />
          </VStack>
        ) : null}
      </SafeAreaView>

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
      <FeuilleModele
        visible={l.feuilleModele}
        choix={choix}
        modeleId={l.modeleId}
        onFermer={l.fermerModele}
      />
    </Box>
  );
}
