/**
 * Finaliser — le dossier prêt : score, documents, envoi, et la question.
 *
 * ═══ L'anatomie ═══
 *
 * Pendant la génération : l'orbe, « Karria met en page… », une annonce
 * native. Puis, de haut en bas : le cadran ATS et sa phrase ; les points
 * qui feraient la différence, chacun avec « Je corrige » ; les deux
 * documents, CV et lettre, avec PDF et Word ; en pied, deux actions —
 * « Envoyer par e-mail » en bleu, et rien d'autre en bleu.
 *
 * La feuille « As-tu candidaté ? » (domaine Candidatures) monte après un
 * téléchargement ou un envoi ; « Oui » renvoie vers Candidatures.
 *
 * Une seconde annonce native, une fois les documents là : sous le score et
 * ses points, au-dessus des documents — loin du bouton bleu du pied.
 *
 * En mode **libre** (« Nouveau CV ») : un seul document, pas de lettre, pas
 * de question ; « Voir mes CV » sous le document ramène à la liste.
 */

import { Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { HAUTEUR_PIED_FLOTTANT, PiedFlottant } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { FeuilleCandidature } from "@/features/candidatures/components/feuille-candidature";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";
import { useCouleurs } from "@/theme/use-couleurs";

import { BoutonFormat } from "../components/bouton-format";
import { CadranAts } from "../components/cadran-ats";
import { FeuilleEnvoi } from "../components/feuille-envoi";
import { PastilleCouleur } from "../components/pastille-couleur";
import { PastilleModele } from "../components/pastille-modele";
import { TEXTES, useFinaliser, type Document, type Format } from "../hooks/use-finaliser";
import type { Export } from "../types/atelier.types";

function CarteDocument({
  document,
  titre,
  detail,
  exporte,
  telechargement,
  onTelecharger,
}: {
  document: Document;
  titre: string;
  detail: string;
  exporte: Export | null;
  telechargement: { document: Document; format: Format } | null;
  onTelecharger: (format: Format) => void;
}) {
  const couleurs = useCouleurs();
  return (
    <HStack className="items-center gap-3 rounded-carte border border-border-subtle bg-card p-4">
      <Box className="h-12 w-10 items-center justify-center rounded-[6px] border border-border-champ bg-background">
        <Icone
          nom={document === "cv" ? "cv" : "lettre"}
          couleur={couleurs.estompe}
          taille={16}
        />
      </Box>
      <VStack className="flex-1 gap-0.5">
        <Texte className="font-bold text-body text-foreground">{titre}</Texte>
        <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
          {exporte === null ? "Pas encore généré" : detail}
        </Texte>
      </VStack>
      {exporte !== null ? (
        <HStack className="gap-2">
          {exporte.pdf !== null ? (
            <BoutonFormat
              format="pdf"
              enCours={
                telechargement?.document === document && telechargement.format === "pdf"
              }
              desactive={telechargement !== null}
              onPress={() => onTelecharger("pdf")}
            />
          ) : null}
          {exporte.docx !== null ? (
            <BoutonFormat
              format="docx"
              enCours={
                telechargement?.document === document && telechargement.format === "docx"
              }
              desactive={telechargement !== null}
              onPress={() => onTelecharger("docx")}
            />
          ) : null}
        </HStack>
      ) : null}
    </HStack>
  );
}

export function EcranFinaliser({ libre = false }: { libre?: boolean }) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const f = useFinaliser(libre);
  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(380).delay(80 + rang * 70);
  const attente = f.generation || f.optimisation;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteRetour retour="Atelier" onRetour={f.retour} />

        {attente ? (
          <Box className="flex-1 justify-center gap-8 px-6 pb-8">
            <Animated.View entering={reduit ? undefined : FadeIn.duration(400)}>
              <VStack className="items-center gap-6">
                <OrbeVivante taille={120} active>
                  <SymboleKarria taille={44} teinte="reflet" />
                </OrbeVivante>
                <VStack className="items-center gap-2">
                  <Texte
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                    className="text-center font-display text-title-sm tracking-tight text-foreground"
                  >
                    {TEXTES.generation}
                  </Texte>
                  <Texte className="text-center text-body leading-6 text-muted-foreground">
                    {f.libre ? TEXTES.generationPhraseLibre : TEXTES.generationPhrase}
                  </Texte>
                </VStack>
              </VStack>
            </Animated.View>
            {f.annonce !== null ? (
              <Animated.View entering={reduit ? undefined : FadeInDown.duration(380)}>
                <CarteAnnonce annonce={f.annonce} />
              </Animated.View>
            ) : null}
          </Box>
        ) : f.exportCv === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={f.erreur ?? TEXTES.exportIntrouvable}
              action={f.reessayer}
              libelleAction="Réessayer"
            />
          </Box>
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-6 pt-2"
            contentContainerStyle={{ paddingBottom: HAUTEUR_PIED_FLOTTANT }}
            showsVerticalScrollIndicator={false}
          >
            {f.score !== null && f.phrase !== null ? (
              <Animated.View entering={entree(0)}>
                <CadranAts score={f.score} phrase={f.phrase} />
              </Animated.View>
            ) : null}

            {f.points.length > 0 ? (
              <Animated.View entering={entree(1)}>
                <VStack className="gap-3">
                  <Texte className="font-display text-callout text-foreground">
                    {TEXTES.atsPoints}
                  </Texte>
                  {f.points.map((p) => (
                    <VStack
                      key={p.cle}
                      className="gap-2 rounded-carte border border-border-subtle bg-card p-4"
                    >
                      <Texte className="font-bold text-body text-foreground">
                        {p.libelle}
                      </Texte>
                      <Texte className="text-footnote leading-5 text-muted-foreground">
                        {p.conseil}
                      </Texte>
                      <Pressable
                        onPress={() => f.corriger(p)}
                        className="min-h-touch flex-row items-center gap-1 self-start"
                        accessibilityRole="button"
                      >
                        <Texte className="font-bold text-footnote text-primary">
                          {TEXTES.jeCorrige}
                        </Texte>
                        <Icone
                          nom="suivant"
                          couleur={couleurs.primaire}
                          taille={12}
                          graisse="bold"
                        />
                      </Pressable>
                    </VStack>
                  ))}
                  {f.score?.conseilAtsSafe ? (
                    <BoutonAction
                      libelle={TEXTES.optimiser}
                      ton="secondaire"
                      onPress={f.optimiser}
                    />
                  ) : null}
                </VStack>
              </Animated.View>
            ) : null}

            {f.annonceScore !== null ? (
              <Animated.View entering={reduit ? undefined : FadeIn.duration(300)}>
                <CarteAnnonce annonce={f.annonceScore} />
              </Animated.View>
            ) : null}

            <Animated.View entering={entree(2)}>
              <VStack className="gap-3">
                <Texte className="font-display text-callout text-foreground">
                  {f.libre ? TEXTES.finaliserTitreLibre : TEXTES.finaliserTitre}
                </Texte>
                <CarteDocument
                  document="cv"
                  titre={f.libre ? "Mon CV" : "Mon CV adapté"}
                  detail={
                    f.exportCv.modele?.libelle
                      ? `Modèle ${f.exportCv.modele.libelle} · PDF et Word`
                      : "PDF et Word"
                  }
                  exporte={f.exportCv}
                  telechargement={f.telechargement}
                  onTelecharger={(format) => f.telecharger("cv", format)}
                />
                <HStack className="items-center gap-2">
                  <PastilleModele
                    libelle={f.exportCv.modele?.libelle ?? null}
                    onPress={f.changerDeModele}
                  />
                  <PastilleCouleur
                    couleur={f.exportCv.couleur ?? f.couleurOrigine}
                    posee={f.exportCv.couleur !== null}
                    onPress={f.changerDeCouleur}
                  />
                </HStack>
                {!f.libre && f.dossier?.lettre !== null ? (
                  <CarteDocument
                    document="lettre"
                    titre="Ma lettre de motivation"
                    detail={
                      f.dossier?.offre.entreprise
                        ? `Pour ${f.dossier.offre.entreprise} · PDF et Word`
                        : "PDF et Word"
                    }
                    exporte={f.exportLettre}
                    telechargement={f.telechargement}
                    onTelecharger={(format) => f.telecharger("lettre", format)}
                  />
                ) : null}
                {f.erreur !== null ? (
                  <Texte
                    className="text-footnote text-destructive"
                    accessibilityRole="alert"
                  >
                    {f.erreur}
                  </Texte>
                ) : null}
                {f.envoi.fait !== null ? (
                  <HStack className="items-center gap-2" accessibilityLiveRegion="polite">
                    <Icone
                      nom="coche"
                      couleur={couleurs.succes}
                      taille={13}
                      graisse="bold"
                    />
                    <Texte className="text-footnote text-success">
                      {TEXTES.envoye} à {f.envoi.fait}
                    </Texte>
                  </HStack>
                ) : null}
                {f.libre ? (
                  <BoutonAction
                    libelle={TEXTES.voirMesCv}
                    ton="secondaire"
                    onPress={f.terminer}
                  />
                ) : null}
              </VStack>
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>

      {!attente && f.exportCv !== null ? (
        <PiedFlottant>
          <BoutonAction libelle={TEXTES.envoyerParEmail} onPress={f.ouvrirEnvoi} />
        </PiedFlottant>
      ) : null}

      <FeuilleEnvoi
        visible={f.envoi.ouvert}
        adresseDuCompte={f.adresseDuCompte}
        documents={f.exportLettre === null ? 1 : 2}
        enCours={f.envoi.enCours}
        erreur={f.envoi.erreur}
        onEnvoyer={f.envoyer}
        onFermer={f.fermerEnvoi}
      />
      {!f.libre && f.dossier !== null ? (
        <FeuilleCandidature
          visible={f.question}
          dossierId={f.dossier.id}
          onFermer={f.fermerQuestion}
        />
      ) : null}
    </Box>
  );
}
