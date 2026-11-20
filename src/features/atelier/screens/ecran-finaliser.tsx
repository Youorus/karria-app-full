/**
 * Finaliser rend les documents disponibles et donne la priorité à l'envoi.
 * Les formats, la lettre facultative et les conseils restent accessibles.
 *
 * Le filigrane (ADR-0040 de l'API) : une ligne discrète pendant la génération
 * et sous le CV, une feuille de proposition qu'on ferme d'un geste quand le
 * CV sort filigrané, « Régénérer sans filigrane » après l'abonnement. Aucune
 * de ces trois choses ne conditionne « Télécharger » ni « Envoyer ».
 */

import { Image } from "expo-image";
import { useCallback, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { FeuilleCandidature } from "@/features/candidatures/components/feuille-candidature";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";
import { FeuilleProposition } from "@/features/soutien/components/feuille-proposition";
import { REGENERER_SANS_FILIGRANE } from "@/features/soutien/services/proposition";
import { useCouleurs } from "@/theme/use-couleurs";

import { FeuilleBasse } from "../components/feuille-basse";
import { FormatsExport } from "../components/formats-export";
import { CarteOptimisation, LigneOptimisee } from "../components/carte-optimisation";
import { FeuilleEnvoi } from "../components/feuille-envoi";
import { VerdictAts } from "../components/verdict-ats";
import { TEXTES, useFinaliser, type Document, type Format } from "../hooks/use-finaliser";
import { useSuiteApresFeuille } from "../hooks/use-suite-apres-feuille";
import { libellePoints, phraseResserre } from "../services/presentation";
import type { ControleAts, Export } from "../types/atelier.types";

const LARGEUR_APERCU = 64;
const HAUTEUR_APERCU = Math.round(LARGEUR_APERCU * 1.414);

function CarteDocument({
  document,
  titre,
  detail,
  exporte,
  telechargement,
  onTelecharger,
  onVoir,
}: {
  document: Document;
  titre: string;
  detail: string;
  exporte: Export | null;
  telechargement: { document: Document; format: Format } | null;
  onTelecharger: (format: Format) => void;
  /** « Voir mon CV » : l'aperçu plein écran, quand les pages en image existent. */
  onVoir: () => void;
}) {
  const couleurs = useCouleurs();
  const formats = useSuiteApresFeuille();
  const apercu = exporte?.apercus[0] ?? null;
  const peutVoir = apercu !== null || exporte?.pdf != null || exporte?.docx != null;
  const voir = document === "cv" ? TEXTES.voirMonCv : TEXTES.voirMaLettre;
  return (
    <VStack className="gap-3 rounded-carte border border-border-subtle bg-card p-4">
      <HStack className="items-center gap-3">
        <Pressable
          onPress={onVoir}
          disabled={!peutVoir}
          accessibilityRole="imagebutton"
          accessibilityLabel={voir}
          className="min-h-touch min-w-touch items-center justify-center active:opacity-80"
        >
          {apercu !== null ? (
            <Box className="overflow-hidden rounded-[4px] border border-border-champ bg-fond-logo">
              <Box className="absolute bottom-1 right-1 z-10 h-5 w-5 items-center justify-center rounded-full bg-scrim-fort">
                <Icone nom="agrandir" couleur={couleurs.surVoile} taille={9} />
              </Box>
              <Image
                source={{ uri: apercu, cacheKey: `export-${exporte?.id ?? ""}-0` }}
                cachePolicy="memory-disk"
                style={{ width: LARGEUR_APERCU, height: HAUTEUR_APERCU }}
                contentFit="cover"
                contentPosition="top"
                transition={200}
                accessible={false}
              />
            </Box>
          ) : (
            <Box className="h-12 w-10 items-center justify-center rounded-[6px] border border-border-champ bg-background">
              <Icone
                nom={document === "cv" ? "cv" : "lettre"}
                couleur={couleurs.estompe}
                taille={16}
              />
            </Box>
          )}
        </Pressable>
        <VStack className="flex-1 gap-0.5">
          <Texte className="font-bold text-body text-foreground">{titre}</Texte>
          <Texte className="text-footnote text-muted-foreground">
            {exporte === null ? "Pas encore généré" : detail}
          </Texte>
        </VStack>
      </HStack>
      {exporte !== null && (exporte.pdf !== null || exporte.docx !== null) ? (
        <BoutonAction
          libelle="Télécharger"
          accessibilityLabel={`Télécharger : ${titre}`}
          ton="secondaire"
          multiligne
          enCours={telechargement?.document === document}
          libelleEnCours="Téléchargement…"
          desactive={telechargement !== null}
          onPress={formats.ouvrir}
        />
      ) : null}
      <FeuilleBasse
        visible={formats.visible}
        titre="Choisir un format"
        sousTitre={titre}
        onFermer={formats.fermer}
        apresFermeture={formats.apresFermeture}
      >
        <FormatsExport
          pdf={exporte?.pdf != null}
          word={exporte?.docx != null}
          onTelecharger={(format) => formats.terminer(() => onTelecharger(format))}
        />
      </FeuilleBasse>
    </VStack>
  );
}

/**
 * « Ce qui ferait la différence », replié par défaut : utile, mais fatigant
 * à lire d'emblée (Marc, 2026-11-13). Un toucher l'ouvre.
 */
function PointsRepliables({ points }: { points: ControleAts[] }) {
  const couleurs = useCouleurs();
  const [ouvert, setOuvert] = useState(false);
  return (
    <VStack className="rounded-carte border border-border-subtle bg-card">
      <Pressable
        onPress={() => setOuvert((o) => !o)}
        className="min-h-touch flex-row items-center gap-3 px-4 py-3"
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={libellePoints(points.length)}
      >
        <Icone nom="tendance" couleur={couleurs.estompe} taille={15} />
        <Texte className="flex-1 font-bold text-footnote text-foreground">
          {libellePoints(points.length)}
        </Texte>
        <Box style={{ transform: [{ rotate: ouvert ? "-90deg" : "90deg" }] }}>
          <Icone nom="suivant" couleur={couleurs.estompe} taille={12} graisse="bold" />
        </Box>
      </Pressable>
      {ouvert
        ? points.map((p) => (
            <VStack key={p.cle} className="gap-1 border-t border-border-subtle px-4 py-3">
              <Texte className="font-bold text-footnote text-foreground">
                {p.libelle}
              </Texte>
              <Texte className="text-footnote leading-5 text-muted-foreground">
                {p.conseil}
              </Texte>
            </VStack>
          ))
        : null}
    </VStack>
  );
}

/** Le CV a été resserré pour tenir sur une page : on le dit, et on mène à l'atelier. */
function NoteResserre({ phrase, onAjuster }: { phrase: string; onAjuster: () => void }) {
  const couleurs = useCouleurs();
  return (
    <VStack className="gap-2 rounded-carte border border-border-subtle bg-card px-4 py-3">
      <HStack className="items-center gap-2">
        <Icone nom="info" couleur={couleurs.estompe} taille={14} />
        <Texte className="flex-1 font-bold text-footnote text-foreground">
          {TEXTES.resserreTitre}
        </Texte>
      </HStack>
      <Texte className="text-footnote leading-5 text-muted-foreground">{phrase}</Texte>
      <Pressable
        onPress={onAjuster}
        className="min-h-touch flex-row items-center gap-1 self-start"
        accessibilityRole="button"
      >
        <Texte className="font-bold text-footnote text-primary">
          {TEXTES.resserreAjuster}
        </Texte>
        <Icone nom="suivant" couleur={couleurs.primaire} taille={12} graisse="bold" />
      </Pressable>
    </VStack>
  );
}

export function EcranFinaliser({ libre = false }: { libre?: boolean }) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const f = useFinaliser(libre);
  const [envoiFerme, setEnvoiFerme] = useState(true);
  const confirmerFermetureEnvoi = useCallback(() => setEnvoiFerme(true), []);
  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(380).delay(80 + rang * 70);
  const attente = f.generation || f.optimisation;
  const resserre = phraseResserre(f.resserre);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour retour={f.retourLibelle} onRetour={f.retour} />

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
                  {f.filigrane.ligne !== null ? (
                    <Texte className="text-center text-footnote text-muted-foreground">
                      {f.filigrane.ligne}
                    </Texte>
                  ) : null}
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
            contentContainerClassName="gap-5 px-5 pb-6 pt-2"
            showsVerticalScrollIndicator={false}
          >
            {f.score !== null ? (
              <Animated.View entering={entree(0)}>
                <VerdictAts score={f.score} />
              </Animated.View>
            ) : null}

            {f.score !== null ? (
              <Animated.View entering={entree(1)}>
                {f.exportCv.atsSafe ? (
                  <LigneOptimisee />
                ) : f.score.conseilAtsSafe ? (
                  <CarteOptimisation
                    gain={f.gain}
                    enCours={f.optimisation}
                    onOptimiser={f.optimiser}
                  />
                ) : null}
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
                      ? `Modèle ${f.exportCv.modele.libelle}`
                      : "Choisis un format"
                  }
                  exporte={f.exportCv}
                  telechargement={f.telechargement}
                  onTelecharger={(format) => f.telecharger("cv", format)}
                  onVoir={() => f.voirApercu("cv")}
                />
                {f.filigrane.ligne !== null ? (
                  <HStack className="items-center gap-2">
                    <Icone nom="info" couleur={couleurs.estompe} taille={13} />
                    <Texte className="flex-1 text-footnote text-muted-foreground">
                      {f.filigrane.ligne}
                    </Texte>
                  </HStack>
                ) : null}
                {f.filigrane.regenerable ? (
                  <BoutonAction
                    libelle={REGENERER_SANS_FILIGRANE}
                    ton="secondaire"
                    multiligne
                    onPress={f.filigrane.regenerer}
                  />
                ) : null}
                {!f.libre && f.dossier?.lettre != null ? (
                  <CarteDocument
                    document="lettre"
                    titre="Ma lettre de motivation"
                    detail={
                      f.dossier?.offre.entreprise
                        ? `Pour ${f.dossier.offre.entreprise}`
                        : "Choisis un format"
                    }
                    exporte={f.exportLettre}
                    telechargement={f.telechargement}
                    onTelecharger={(format) => f.telecharger("lettre", format)}
                    onVoir={() => f.voirApercu("lettre")}
                  />
                ) : null}
                {!f.libre ? (
                  <BoutonAction
                    libelle={
                      f.dossier?.lettre == null
                        ? "Ajouter une lettre (facultatif)"
                        : "Modifier la lettre"
                    }
                    ton="secondaire"
                    multiligne
                    onPress={f.ouvrirLettre}
                  />
                ) : null}
                {!f.libre && f.dossier?.lettre != null && f.exportLettre === null ? (
                  <Texte
                    accessibilityRole="alert"
                    className="text-footnote text-destructive"
                  >
                    La lettre n’a pas pu être générée. Seul ton CV est prêt à envoyer.
                  </Texte>
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
              </VStack>
            </Animated.View>
            {resserre !== null ? (
              <Animated.View entering={entree(1)}>
                <NoteResserre phrase={resserre} onAjuster={f.changerDeModele} />
              </Animated.View>
            ) : null}

            {f.points.length > 0 ? (
              <Animated.View entering={entree(2)}>
                <PointsRepliables points={f.points} />
              </Animated.View>
            ) : null}

            {f.annonceScore !== null ? (
              <Animated.View entering={reduit ? undefined : FadeIn.duration(300)}>
                <CarteAnnonce annonce={f.annonceScore} />
              </Animated.View>
            ) : null}
          </ScrollView>
        )}
        {!attente && f.exportCv !== null ? (
          <VStack className="border-t border-border-subtle bg-background px-5 py-3">
            <BoutonAction
              libelle={TEXTES.envoyerParEmail}
              multiligne
              onPress={() => {
                setEnvoiFerme(false);
                f.ouvrirEnvoi();
              }}
            />
          </VStack>
        ) : null}
      </SafeAreaView>

      <FeuilleEnvoi
        visible={f.envoi.ouvert}
        adresseDuCompte={f.adresseDuCompte}
        documents={f.exportLettre === null ? 1 : 2}
        enCours={f.envoi.enCours}
        erreur={f.envoi.erreur}
        onEnvoyer={f.envoyer}
        onFermer={f.fermerEnvoi}
        apresFermeture={confirmerFermetureEnvoi}
      />
      {/* Jamais bloquante : le document est déjà là, derrière elle. */}
      <FeuilleProposition
        visible={f.filigrane.proposition.visible}
        textes={f.filigrane.proposition.textes}
        onAccepter={f.filigrane.proposition.accepter}
        onFermer={f.filigrane.proposition.fermer}
        apresFermeture={f.filigrane.proposition.apresFermeture}
      />
      {!f.libre && f.dossier !== null ? (
        <FeuilleCandidature
          visible={f.question && envoiFerme}
          dossierId={f.dossier.id}
          onFermer={f.fermerQuestion}
        />
      ) : null}
    </Box>
  );
}
