/**
 * La lecture d'un document du dossier : le CV adapté, section par
 * section ; la lettre, paragraphe par paragraphe.
 *
 * ═══ Lire, seulement ═══
 *
 * Rien ne se modifie ici — l'atelier est fait pour ça, et un crayon sur
 * chaque ligne ferait croire que ce qu'on retouche ici retouche aussi le
 * CV de base (ce n'est jamais le cas). On lit comme on relirait une
 * feuille sortie de la pochette : titre, puis le texte, dans l'ordre où
 * un recruteur le lira.
 *
 * ═══ La lettre, comme elle sera mise en page ═══
 *
 * Le destinataire, l'objet, les paragraphes, la formule — et la
 * signature, celle du CV, puisque le serveur ne l'envoie pas.
 */

import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { periodeLisible } from "@/features/cv/services/chapitres";
import type { Cv } from "@/features/cv/types/cv.types";

import { useLectureDossier } from "../hooks/use-lecture-dossier";
import { TEXTES } from "../services/presentation";
import type { Lettre } from "../types/candidatures.types";

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <VStack space="sm">
      <Texte
        accessibilityRole="header"
        className="font-bold text-footnote text-muted-foreground"
      >
        {titre}
      </Texte>
      {children}
    </VStack>
  );
}

function LectureCv({ cv }: { cv: Cv }) {
  const nom =
    cv.identite === null ? "Mon CV" : `${cv.identite.prenom} ${cv.identite.nom}`.trim();
  const contact = [cv.contact?.email, cv.contact?.telephone, cv.contact?.ville].filter(
    (c): c is string => typeof c === "string" && c !== "",
  );
  return (
    <VStack space="lg">
      <VStack space="xs">
        <Texte
          accessibilityRole="header"
          className="font-display text-title-lg leading-9 tracking-tighter text-foreground"
        >
          {nom}
        </Texte>
        {cv.identite?.titre ? (
          <Texte className="text-callout text-primary">{cv.identite.titre}</Texte>
        ) : null}
        {contact.length > 0 ? (
          <Texte className="text-footnote text-muted-foreground">
            {contact.join(" · ")}
          </Texte>
        ) : null}
      </VStack>

      {cv.presentation ? (
        <Section titre="À propos">
          <Texte className="text-body leading-6 text-foreground">{cv.presentation}</Texte>
        </Section>
      ) : null}

      {cv.experiences.length > 0 ? (
        <Section titre="Expériences">
          {cv.experiences.map((e, i) => (
            <VStack
              key={i}
              space="xs"
              className={i > 0 ? "border-t border-border-subtle pt-3" : ""}
            >
              <Texte className="font-bold text-body text-foreground">{e.poste}</Texte>
              <Texte className="text-footnote text-muted-foreground">
                {[e.entreprise, e.lieu, periodeLisible(e.debut, e.fin, e.enCours)]
                  .filter((d): d is string => d !== null && d !== "")
                  .join(" · ")}
              </Texte>
              {e.missions.map((m, j) => (
                <HStack key={j} space="sm" className="items-start">
                  <Texte className="text-body text-foreground-faint">•</Texte>
                  <Texte className="flex-1 text-body leading-6 text-foreground">
                    {m}
                  </Texte>
                </HStack>
              ))}
            </VStack>
          ))}
        </Section>
      ) : null}

      {cv.formations.length > 0 ? (
        <Section titre="Formations">
          {cv.formations.map((f, i) => (
            <VStack
              key={i}
              space="xs"
              className={i > 0 ? "border-t border-border-subtle pt-3" : ""}
            >
              <Texte className="font-bold text-body text-foreground">{f.diplome}</Texte>
              <Texte className="text-footnote text-muted-foreground">
                {[f.ecole, f.lieu, periodeLisible(f.debut, f.fin, f.enCours)]
                  .filter((d): d is string => d !== null && d !== "")
                  .join(" · ")}
              </Texte>
            </VStack>
          ))}
        </Section>
      ) : null}

      {cv.competences.length > 0 ? (
        <Section titre="Compétences">
          <Texte className="text-body leading-6 text-foreground">
            {cv.competences.map((c) => c.nom).join(" · ")}
          </Texte>
        </Section>
      ) : null}

      {cv.langues.length > 0 ? (
        <Section titre="Langues">
          <Texte className="text-body leading-6 text-foreground">
            {cv.langues.map((l) => `${l.langue} (${l.niveau})`).join(" · ")}
          </Texte>
        </Section>
      ) : null}

      {cv.interets.length > 0 ? (
        <Section titre="Centres d'intérêt">
          <Texte className="text-body leading-6 text-foreground">
            {cv.interets.map((i) => i.nom).join(" · ")}
          </Texte>
        </Section>
      ) : null}
    </VStack>
  );
}

function LectureLettre({ lettre, cv }: { lettre: Lettre; cv: Cv }) {
  const signature =
    cv.identite === null ? null : `${cv.identite.prenom} ${cv.identite.nom}`.trim();
  return (
    <VStack space="lg">
      <Texte
        accessibilityRole="header"
        className="font-display text-title leading-8 tracking-tight text-foreground"
      >
        {lettre.objet}
      </Texte>
      <Texte className="text-body text-foreground">{lettre.destinataire}</Texte>
      {lettre.paragraphes.map((p, i) => (
        <Texte key={i} className="text-body leading-7 text-foreground">
          {p.texte}
        </Texte>
      ))}
      <Texte className="text-body leading-7 text-foreground">{lettre.formule}</Texte>
      {signature !== null ? (
        <Texte className="font-bold text-body text-foreground">{signature}</Texte>
      ) : null}
    </VStack>
  );
}

export function EcranLectureDossier() {
  const { dossier, document, chargement, erreur, retour } = useLectureDossier();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour retour="Dossier" onRetour={retour} />
        {chargement ? (
          <Box className="flex-1 items-center justify-center">
            <ChargeurKarria />
          </Box>
        ) : dossier === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={erreur ?? TEXTES.erreurDetail}
              action={retour}
              libelleAction="Retour"
            />
          </Box>
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-10 pt-2"
            showsVerticalScrollIndicator={false}
          >
            {document === "lettre" ? (
              dossier.lettre === null ? (
                <VStack space="xs" className="pt-8">
                  <Texte className="text-center font-display text-title-sm text-foreground">
                    Pas encore de lettre
                  </Texte>
                  <Texte className="text-center text-body text-muted-foreground">
                    {
                      "Karria l'écrit dans l'atelier, à partir de l'offre et de ton CV adapté."
                    }
                  </Texte>
                </VStack>
              ) : (
                <LectureLettre lettre={dossier.lettre} cv={dossier.cv} />
              )
            ) : (
              <LectureCv cv={dossier.cv} />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Box>
  );
}
