/**
 * Le CV, une fois créé ou importé — l'écran CV de la V1, qui se modifie.
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - la carte de profil (rayon 32) : photo ou initiales, nom, poste visé en
 *   pastille, téléphone, ville, e-mail ;
 * - le texte « À propos » ;
 * - les sections, chacune avec son icône en tuile, son titre et son
 *   compteur : Expériences, Formations, Compétences, Langues, Centres
 *   d'intérêt.
 *
 * ═══ Tout se modifie, à la main ═══
 *
 * Décision de Marc (2026-11-04) : ce que Karria a mal compris doit se
 * corriger ici, directement. Chaque carte porte son crayon ; la photo et
 * l'identité, les coordonnées, l'à-propos ont le leur. Un toucher ouvre le
 * formulaire de la section (`/cv/modifier/<section>`).
 *
 * ═══ Après un import : « à vérifier » ═══
 *
 * Un bandeau sobre dit que le CV est importé et quoi relire d'abord ; les
 * sections concernées portent une pastille « À vérifier » tant qu'on ne les
 * a pas ouvertes. Indépendamment de l'import, ce qui **manque** au CV (pas
 * de téléphone, pas de dates) ressort en pastilles ambrées, calculées
 * depuis le CV : elles restent justes après chaque modification.
 */

import { Image } from "expo-image";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Icone, type NomIcone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { periodeLisible } from "../services/chapitres";
import { libelleManquant } from "../services/import";
import { sectionDuManquant } from "../services/verification";
import type { ChampManquant, CleChapitre, Cv } from "../types/cv.types";

function PastilleAVerifier() {
  return (
    <Box className="rounded-full bg-surface-primary px-2 py-0.5">
      <Texte className="font-bold text-caption text-primary">À vérifier</Texte>
    </Box>
  );
}

function PastilleManque({ texte }: { texte: string }) {
  return (
    <Box className="rounded-full bg-surface-warning px-2.5 py-0.5">
      <Texte className="font-bold text-caption text-warning">{texte}</Texte>
    </Box>
  );
}

function Crayon({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full bg-remplissage"
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={libelle}
    >
      <Icone nom="crayon" couleur={couleurs.texte} taille={14} />
    </Pressable>
  );
}

function Section({
  icone,
  titre,
  nombre,
  rang,
  aVerifier,
  manques,
  onModifier,
  children,
}: {
  icone: NomIcone;
  titre: string;
  nombre: number;
  rang: number;
  aVerifier: boolean;
  manques: ChampManquant[];
  onModifier: () => void;
  children: ReactNode;
}) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const [ouverte, setOuverte] = useState(aVerifier);
  const remplie = nombre > 0;

  return (
    <Animated.View
      entering={reduit ? undefined : FadeInDown.duration(320).delay(120 + rang * 60)}
    >
      <VStack
        className={`rounded-[28px] border bg-card ${
          aVerifier ? "border-primary" : "border-border-subtle"
        }`}
      >
        <HStack className="items-center gap-3 p-4">
          <Pressable
            onPress={() => setOuverte((o) => !o)}
            disabled={!remplie}
            className="flex-1 flex-row items-center gap-3"
            accessibilityRole="button"
            accessibilityState={{ expanded: ouverte, disabled: !remplie }}
            accessibilityLabel={`${titre}, ${nombre} élément${nombre > 1 ? "s" : ""}`}
          >
            <Box
              className={`h-10 w-10 items-center justify-center rounded-[14px] ${
                remplie ? "bg-surface-primary" : "bg-remplissage"
              }`}
            >
              <Icone
                nom={icone}
                couleur={remplie ? couleurs.primaire : couleurs.estompe}
                taille={17}
              />
            </Box>
            <VStack className="flex-1 gap-1">
              <HStack className="items-center gap-2">
                <Texte className="font-bold text-callout text-foreground">{titre}</Texte>
                {aVerifier ? <PastilleAVerifier /> : null}
              </HStack>
              {manques.length > 0 ? (
                <HStack className="flex-wrap gap-1">
                  {manques.map((m) => (
                    <PastilleManque key={m} texte={libelleManquant(m)} />
                  ))}
                </HStack>
              ) : null}
            </VStack>
            <Box
              className={`rounded-full px-2.5 py-0.5 ${remplie ? "bg-surface-primary" : "bg-remplissage"}`}
            >
              <Texte
                className={`font-bold text-caption ${remplie ? "text-primary" : "text-foreground-faint"}`}
              >
                {nombre}
              </Texte>
            </Box>
          </Pressable>
          <Crayon libelle={`Modifier ${titre}`} onPress={onModifier} />
        </HStack>
        {ouverte && remplie ? (
          <Animated.View entering={FadeIn.duration(200)} className="gap-3 px-4 pb-4">
            {children}
          </Animated.View>
        ) : null}
      </VStack>
    </Animated.View>
  );
}

function Element({
  titre,
  sous,
  detail,
}: {
  titre: string;
  sous?: string | null;
  detail?: string | null;
}) {
  return (
    <VStack className="gap-0.5 border-l-2 border-primary pl-3">
      <Texte className="font-bold text-body text-foreground">{titre}</Texte>
      {sous ? (
        <Texte className="text-footnote text-muted-foreground">{sous}</Texte>
      ) : null}
      <Texte
        className={`text-footnote ${detail ? "text-foreground-faint" : "text-warning"}`}
      >
        {detail ?? "Dates à préciser"}
      </Texte>
    </VStack>
  );
}

function Puces({ elements }: { elements: string[] }) {
  return (
    <HStack className="flex-wrap gap-2">
      {elements.map((e, i) => (
        <Box key={`${e}-${i}`} className="rounded-full bg-remplissage px-3 py-1">
          <Texte className="text-footnote text-foreground">{e}</Texte>
        </Box>
      ))}
    </HStack>
  );
}

interface Props {
  cv: Cv;
  aVerifier: readonly CleChapitre[];
  importRecent: boolean;
  manquants: ChampManquant[];
  onModifier: (section: CleChapitre) => void;
  onTerminerVerification: () => void;
}

export function CvRempli({
  cv,
  aVerifier,
  importRecent,
  manquants,
  onModifier,
  onTerminerVerification,
}: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const nom =
    cv.identite === null ? "Mon CV" : `${cv.identite.prenom} ${cv.identite.nom}`.trim();
  const initiales = nom
    .split(/\s+/)
    .map((m) => m[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const manquesDe = (section: CleChapitre) =>
    manquants.filter((m) => sectionDuManquant(m) === section);
  const manquesContact = manquesDe("contact");
  const manquesIdentite = manquesDe("identity");

  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pb-36 pt-4"
      showsVerticalScrollIndicator={false}
    >
      {importRecent ? (
        <Animated.View entering={reduit ? undefined : FadeInDown.duration(380)}>
          <HStack className="items-start gap-3 rounded-carte border border-primary bg-surface-primary p-4">
            <Icone nom="etincelles" couleur={couleurs.primaire} taille={16} />
            <VStack className="flex-1 gap-1">
              <Texte className="font-bold text-callout text-foreground">
                Ton CV est importé.
              </Texte>
              <Texte className="text-footnote leading-5 text-muted-foreground">
                Vérifie d&apos;abord tes coordonnées, puis que tes expériences et tes
                formations sont à jour. Touche le crayon d&apos;une section pour la
                corriger.
              </Texte>
            </VStack>
            <Pressable
              onPress={onTerminerVerification}
              className="h-9 w-9 items-center justify-center rounded-full"
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="C'est bon, masquer"
            >
              <Icone
                nom="fermer"
                couleur={couleurs.estompe}
                taille={13}
                graisse="semibold"
              />
            </Pressable>
          </HStack>
        </Animated.View>
      ) : null}

      <Animated.View entering={reduit ? undefined : FadeInDown.duration(380)}>
        <VStack
          className={`items-center gap-3 rounded-[32px] border bg-card p-6 ${
            aVerifier.includes("contact") ? "border-primary" : "border-border-subtle"
          }`}
        >
          <Pressable
            onPress={() => onModifier("photo")}
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-primary"
            accessibilityRole="button"
            accessibilityLabel="Changer la photo"
          >
            {cv.photo !== null ? (
              <Image
                source={{ uri: cv.photo }}
                // `expo-image` ne lit pas les classes : la taille en style.
                style={{ width: 96, height: 96 }}
                contentFit="cover"
                accessibilityLabel="Ta photo de CV"
              />
            ) : (
              <Texte className="font-display text-title text-primary">{initiales}</Texte>
            )}
          </Pressable>
          <Pressable
            onPress={() => onModifier("identity")}
            className="items-center gap-1.5"
            accessibilityRole="button"
            accessibilityLabel="Modifier mon identité et mon poste visé"
          >
            <HStack className="items-center gap-2">
              <Texte className="text-center font-display text-title text-foreground">
                {nom}
              </Texte>
              <Icone nom="crayon" couleur={couleurs.estompe} taille={13} />
            </HStack>
            {cv.identite?.titre ? (
              <Box className="rounded-full bg-surface-primary px-3 py-1">
                <Texte className="font-bold text-footnote text-primary">
                  {cv.identite.titre}
                </Texte>
              </Box>
            ) : manquesIdentite.length > 0 ? (
              <PastilleManque texte={libelleManquant(manquesIdentite[0])} />
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => onModifier("contact")}
            className="w-full items-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="Modifier mes coordonnées"
          >
            <HStack className="items-center gap-2">
              <Texte className="font-bold text-caption uppercase tracking-widest text-muted-foreground">
                Coordonnées
              </Texte>
              {aVerifier.includes("contact") ? <PastilleAVerifier /> : null}
              <Icone nom="crayon" couleur={couleurs.estompe} taille={12} />
            </HStack>
            {cv.contact !== null &&
            (cv.contact.telephone || cv.contact.ville || cv.contact.email) ? (
              <HStack className="flex-wrap justify-center gap-x-4 gap-y-1">
                {cv.contact.telephone ? (
                  <HStack className="items-center gap-1">
                    <Icone nom="telephone" couleur={couleurs.estompe} taille={11} />
                    <Texte className="text-footnote text-muted-foreground">
                      {cv.contact.telephone}
                    </Texte>
                  </HStack>
                ) : null}
                {cv.contact.ville ? (
                  <HStack className="items-center gap-1">
                    <Icone nom="lieu" couleur={couleurs.estompe} taille={11} />
                    <Texte className="text-footnote text-muted-foreground">
                      {cv.contact.ville}
                    </Texte>
                  </HStack>
                ) : null}
                {cv.contact.email ? (
                  <HStack className="items-center gap-1">
                    <Icone nom="arobase" couleur={couleurs.estompe} taille={11} />
                    <Texte className="text-footnote text-muted-foreground">
                      {cv.contact.email}
                    </Texte>
                  </HStack>
                ) : null}
              </HStack>
            ) : null}
            {manquesContact.length > 0 ? (
              <HStack className="flex-wrap justify-center gap-1">
                {manquesContact.map((m) => (
                  <PastilleManque key={m} texte={libelleManquant(m)} />
                ))}
              </HStack>
            ) : null}
          </Pressable>
        </VStack>
      </Animated.View>

      <Animated.View entering={reduit ? undefined : FadeInDown.duration(380).delay(60)}>
        <Pressable
          onPress={() => onModifier("summary")}
          className="gap-2 rounded-carte bg-surface-primary p-4"
          accessibilityRole="button"
          accessibilityLabel="Modifier l'à-propos"
        >
          <HStack className="items-center gap-2">
            <Icone nom="citation" couleur={couleurs.primaire} taille={14} />
            <Texte className="flex-1 font-bold text-caption uppercase tracking-widest text-primary">
              À propos
            </Texte>
            <Icone nom="crayon" couleur={couleurs.primaire} taille={13} />
          </HStack>
          {cv.presentation ? (
            <Texte className="text-body leading-6 text-foreground">
              {cv.presentation}
            </Texte>
          ) : (
            <Texte className="text-footnote text-muted-foreground">
              Quelques phrases sur toi, à la première personne. Touche pour écrire.
            </Texte>
          )}
        </Pressable>
      </Animated.View>

      <Section
        icone="contrat"
        titre="Expériences"
        nombre={cv.experiences.length}
        rang={0}
        aVerifier={aVerifier.includes("experiences")}
        manques={manquesDe("experiences")}
        onModifier={() => onModifier("experiences")}
      >
        {cv.experiences.map((e, i) => (
          <Element
            key={`${e.poste}-${i}`}
            titre={e.poste}
            sous={[e.entreprise, e.lieu].filter(Boolean).join(" · ")}
            detail={periodeLisible(e.debut, e.fin, e.enCours)}
          />
        ))}
      </Section>
      <Section
        icone="diplome"
        titre="Formations"
        nombre={cv.formations.length}
        rang={1}
        aVerifier={aVerifier.includes("educations")}
        manques={manquesDe("educations")}
        onModifier={() => onModifier("educations")}
      >
        {cv.formations.map((f, i) => (
          <Element
            key={`${f.diplome}-${i}`}
            titre={f.diplome}
            sous={f.ecole}
            detail={periodeLisible(f.debut, f.fin, f.enCours)}
          />
        ))}
      </Section>
      <Section
        icone="eclair"
        titre="Compétences"
        nombre={cv.competences.length}
        rang={2}
        aVerifier={false}
        manques={manquesDe("skills")}
        onModifier={() => onModifier("skills")}
      >
        <Puces elements={cv.competences.map((c) => c.nom)} />
      </Section>
      <Section
        icone="langue"
        titre="Langues"
        nombre={cv.langues.length}
        rang={3}
        aVerifier={false}
        manques={[]}
        onModifier={() => onModifier("skills")}
      >
        <Puces elements={cv.langues.map((l) => `${l.langue} · ${l.niveau}`)} />
      </Section>
      <Section
        icone="coeur"
        titre="Centres d'intérêt"
        nombre={cv.interets.length}
        rang={4}
        aVerifier={false}
        manques={[]}
        onModifier={() => onModifier("interests")}
      >
        <Puces elements={cv.interets.map((i) => i.nom)} />
      </Section>
    </ScrollView>
  );
}
