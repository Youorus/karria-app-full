/**
 * « Parler à l'équipe » — l'échange avec les personnes qui font Karria.
 *
 * ═══ Le parti pris ═══
 *
 * Minimaliste et immersif, dans la maison Karria : l'aura au fond, le fil,
 * le compositeur en verre qui flotte. Rien qui « fasse IA » — pas d'orbe,
 * pas de badge, pas d'étincelles : le titre et la phrase d'accueil disent
 * qu'on écrit à des humains, et les réponses sont signées « L'équipe
 * Karria ».
 *
 * ═══ La liste inversée ═══
 *
 * Le fil est une `FlatList` inversée : le dernier message est en bas, à
 * l'ouverture comme à l'arrivée d'une réponse, sans calcul de défilement.
 * L'accueil est donc son **pied** (affiché en haut).
 *
 * ═══ Le direct, discrètement ═══
 *
 * Quand le flux est coupé, une ligne fine sous l'en-tête le dit
 * (« Reconnexion… ») : la personne sait que la réponse peut tarder à
 * s'afficher, sans alarme. Quand il marche, rien : c'est l'état normal.
 */

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { AccueilEquipe } from "../components/accueil-equipe";
import { ApercuImage } from "../components/apercu-image";
import { BulleEnvoi, BulleEquipe, SeparateurJour } from "../components/bulle-equipe";
import { CompositeurEquipe } from "../components/compositeur-equipe";
import { useEcranEquipe } from "../hooks/use-ecran-equipe";

export function EcranEquipe() {
  const couleurs = useCouleurs();
  const e = useEcranEquipe();

  return (
    // `flex: 1` en style : conteneur racine, exception admise (§3.2).
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <EnTeteRetour retour="Profil" onRetour={e.retour} />
          {e.direct === "coupe" && e.chargement === "pret" ? (
            <Texte
              className="pb-1 text-center text-footnote text-foreground-faint"
              accessibilityLiveRegion="polite"
            >
              Reconnexion… tes messages partent quand même.
            </Texte>
          ) : null}

          {e.chargement === "chargement" && e.vide ? (
            <VStack className="flex-1 items-center justify-center">
              <ActivityIndicator color={couleurs.primaire} />
            </VStack>
          ) : e.chargement === "erreur" && e.vide ? (
            <VStack className="flex-1 justify-center gap-5 px-6">
              <AccueilEquipe vide={false} />
              <Texte className="text-body leading-6 text-foreground">{e.erreur}</Texte>
              <BoutonAction libelle="Réessayer" onPress={e.recharger} />
            </VStack>
          ) : (
            <FlatList
              inverted
              data={e.lignes}
              keyExtractor={(ligne) => ligne.cle}
              contentContainerClassName="gap-3 px-5 pb-3 pt-4"
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<AccueilEquipe vide={e.vide} />}
              renderItem={({ item }) =>
                item.type === "jour" ? (
                  <SeparateurJour libelle={item.libelle} />
                ) : item.type === "message" ? (
                  <BulleEquipe
                    message={item.message}
                    heure={item.heure}
                    lecteur={e.lecteur}
                  />
                ) : (
                  <BulleEnvoi
                    envoi={item.envoi}
                    onReessayer={() => e.reessayer(item.cle)}
                    onRetirer={() => e.abandonner(item.cle)}
                  />
                )
              }
            />
          )}

          <VStack className="gap-2 px-3 pb-2 pt-1">
            {e.probleme !== null ? (
              <Texte className="px-3 text-footnote text-destructive">{e.probleme}</Texte>
            ) : null}
            <CompositeurEquipe
              texte={e.texte}
              onChangeTexte={e.changerTexte}
              peutEnvoyer={e.peutEnvoyer}
              onEnvoyer={e.envoyerTexte}
              enregistre={e.vocal.enregistre}
              dureeMs={e.vocal.dureeMs}
              niveau={e.vocal.niveau}
              onDemarrerVocal={() => void e.vocal.demarrer()}
              onEnvoyerVocal={e.envoyerVocal}
              onAnnulerVocal={e.annulerVocal}
              onImage={e.choisirImage}
            />
          </VStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ApercuImage
        image={e.apercu}
        onEnvoyer={e.confirmerImage}
        onRenoncer={e.renoncerImage}
      />
    </Box>
  );
}
