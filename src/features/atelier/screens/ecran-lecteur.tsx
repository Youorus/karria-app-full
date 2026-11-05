/**
 * Le lecteur : un document, son titre, et deux gestes.
 *
 * L'en-tête est celui de Karria — « ‹ Mes CV », puis « CV · Awa Diallo »
 * en titre, « PDF · Meridian » dessous — et pas celui d'un navigateur
 * avec une adresse de stockage. Le document prend tout le reste ; le pied
 * flottant porte Télécharger et Partager.
 *
 * Sur Android, et pour un Word, l'écran ne montre pas d'aperçu : il le
 * dit en une phrase, avec les deux feuilles de l'illustration des
 * dossiers, et les gestes restent les mêmes.
 */

import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { MessageErreur } from "@/components/message-erreur";
import { PiedFlottant } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { FeuillesDocuments } from "@/features/candidatures/components/feuilles-documents";
import { FOND } from "@/theme";
import { useTheme } from "@/theme/preference";

import {
  useLecteurDocument,
  type EcranLecteur as Modele,
} from "../hooks/use-lecteur-document";
import { TEXTES_LECTEUR } from "../services/lecteur";

function SansApercu({ m }: { m: Modele }) {
  const word = m.mode === "sans-apercu";
  const absent = m.lecteurSysteme === "absent";
  const titre = word
    ? TEXTES_LECTEUR.wordTitre
    : absent
      ? TEXTES_LECTEUR.sansLecteurTitre
      : TEXTES_LECTEUR.ouvertAilleursTitre;
  const phrase = word
    ? TEXTES_LECTEUR.wordPhrase
    : absent
      ? TEXTES_LECTEUR.sansLecteurPhrase
      : TEXTES_LECTEUR.ouvertAilleursPhrase;
  return (
    <VStack space="lg" className="flex-1 items-center justify-center px-8 pb-24">
      <FeuillesDocuments lettre={m.genre === "lettre"} taille="grande" />
      <VStack space="xs" className="items-center">
        <Texte className="text-center font-display text-title-sm text-foreground">
          {titre}
        </Texte>
        <Texte className="text-center text-body leading-6 text-muted-foreground">
          {phrase}
        </Texte>
      </VStack>
      {!word && !absent ? (
        <BoutonAction
          libelle={TEXTES_LECTEUR.ouvrirAilleurs}
          ton="secondaire"
          pleineLargeur={false}
          onPress={m.ouvrirAilleurs}
        />
      ) : null}
    </VStack>
  );
}

/** iOS : la WebView rend le PDF local. Les liens du document (e-mail,
 *  LinkedIn) ne naviguent pas — ce n'est pas un navigateur. */
function Apercu({
  uri,
  repertoire,
  fond,
}: {
  uri: string;
  repertoire: string;
  fond: string;
}) {
  return (
    <WebView
      testID="lecteur-document"
      source={{ uri }}
      originWhitelist={["*"]}
      allowFileAccess
      allowingReadAccessToURL={repertoire}
      onShouldStartLoadWithRequest={(r) => r.url === uri || r.url.startsWith("file:")}
      style={{ flex: 1, backgroundColor: fond }}
      contentInset={{ bottom: Platform.OS === "ios" ? 112 : 0 }}
    />
  );
}

export function EcranLecteur() {
  const m = useLecteurDocument();
  const { mode } = useTheme();
  const pret = m.lecture.etat === "pret";

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteRetour retour={m.retour} onRetour={m.revenir} />
        <VStack className="px-5 pb-3 pt-1">
          <Texte
            accessibilityRole="header"
            numberOfLines={1}
            className="font-display text-title-lg leading-9 tracking-tighter text-foreground"
          >
            {m.titre}
          </Texte>
          <Texte className="text-footnote text-muted-foreground">{m.sousTitre}</Texte>
        </VStack>

        {m.lecture.etat === "chargement" ? (
          <VStack space="md" className="flex-1 items-center justify-center pb-24">
            <ChargeurKarria />
            <Texte className="text-footnote text-muted-foreground">
              {TEXTES_LECTEUR.chargement}
            </Texte>
          </VStack>
        ) : m.lecture.etat === "erreur" ? (
          <Box className="flex-1 justify-center px-5 pb-24">
            <MessageErreur
              message={`${TEXTES_LECTEUR.erreurTitre}. ${m.lecture.message}`}
              action={m.reessayer}
              libelleAction={TEXTES_LECTEUR.reessayer}
            />
          </Box>
        ) : m.mode === "apercu" ? (
          <Apercu
            uri={m.lecture.uri}
            repertoire={m.lecture.repertoire}
            fond={FOND[mode]}
          />
        ) : (
          <SansApercu m={m} />
        )}
      </SafeAreaView>

      {pret ? (
        <PiedFlottant>
          <HStack space="sm">
            <Box className="flex-1">
              <BoutonAction
                libelle={TEXTES_LECTEUR.telecharger}
                ton="secondaire"
                desactive={m.occupe}
                onPress={m.telecharger}
              />
            </Box>
            <Box className="flex-1">
              <BoutonAction
                libelle={TEXTES_LECTEUR.partager}
                desactive={m.occupe}
                onPress={m.partager}
              />
            </Box>
          </HStack>
        </PiedFlottant>
      ) : null}
    </Box>
  );
}
