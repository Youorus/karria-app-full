/**
 * Le CV, une fois créé — l'écran CV de la V1.
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - la carte de profil (rayon 32) : photo ou initiales, nom, métier visé
 *   en pastille, téléphone et ville ;
 * - le texte « À propos » ;
 * - les sections, chacune avec son icône en tuile, son titre et son
 *   compteur : Expériences, Formations, Compétences, Langues, Centres
 *   d'intérêt.
 *
 * Les sections déroulent ici leur contenu. Les actions de modification
 * viendront ensuite (« à voir », a dit Marc) : on n'affiche pas de bouton
 * qui ne mène nulle part.
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
import type { Cv } from "../types/cv.types";

function Section({
  icone,
  titre,
  nombre,
  rang,
  children,
}: {
  icone: NomIcone;
  titre: string;
  nombre: number;
  rang: number;
  children: ReactNode;
}) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const [ouverte, setOuverte] = useState(false);
  const remplie = nombre > 0;

  return (
    <Animated.View
      entering={reduit ? undefined : FadeInDown.duration(320).delay(120 + rang * 60)}
    >
      <VStack className="rounded-[28px] border border-border-subtle bg-card">
        <Pressable
          onPress={() => setOuverte((o) => !o)}
          disabled={!remplie}
          className="flex-row items-center gap-3 p-4"
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
          <Texte className="flex-1 font-bold text-callout text-foreground">{titre}</Texte>
          <Box
            className={`rounded-full px-2.5 py-0.5 ${remplie ? "bg-surface-primary" : "bg-remplissage"}`}
          >
            <Texte
              className={`font-bold text-caption ${remplie ? "text-primary" : "text-foreground-faint"}`}
            >
              {nombre}
            </Texte>
          </Box>
          {remplie ? (
            <Icone
              nom={ouverte ? "haut" : "suivant"}
              couleur={couleurs.estompe}
              taille={13}
            />
          ) : null}
        </Pressable>
        {ouverte ? (
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
      {detail ? (
        <Texte className="text-footnote text-foreground-faint">{detail}</Texte>
      ) : null}
    </VStack>
  );
}

function Puces({ elements }: { elements: string[] }) {
  return (
    <HStack className="flex-wrap gap-2">
      {elements.map((e) => (
        <Box key={e} className="rounded-full bg-remplissage px-3 py-1">
          <Texte className="text-footnote text-foreground">{e}</Texte>
        </Box>
      ))}
    </HStack>
  );
}

export function CvRempli({ cv }: { cv: Cv }) {
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

  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pb-36 pt-4"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={reduit ? undefined : FadeInDown.duration(380)}>
        <VStack className="items-center gap-3 rounded-[32px] border border-border-subtle bg-card p-6">
          <Box className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-primary">
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
          </Box>
          <VStack className="items-center gap-1.5">
            <Texte className="text-center font-display text-title text-foreground">
              {nom}
            </Texte>
            {cv.identite?.titre ? (
              <Box className="rounded-full bg-surface-primary px-3 py-1">
                <Texte className="font-bold text-footnote text-primary">
                  {cv.identite.titre}
                </Texte>
              </Box>
            ) : null}
          </VStack>
          {cv.contact !== null ? (
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
        </VStack>
      </Animated.View>

      {cv.presentation ? (
        <Animated.View entering={reduit ? undefined : FadeInDown.duration(380).delay(60)}>
          <VStack className="gap-2 rounded-carte bg-surface-primary p-4">
            <HStack className="items-center gap-2">
              <Icone nom="citation" couleur={couleurs.primaire} taille={14} />
              <Texte className="font-bold text-caption uppercase tracking-widest text-primary">
                À propos
              </Texte>
            </HStack>
            <Texte className="text-body leading-6 text-foreground">
              {cv.presentation}
            </Texte>
          </VStack>
        </Animated.View>
      ) : null}

      <Section
        icone="contrat"
        titre="Expériences"
        nombre={cv.experiences.length}
        rang={0}
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
      <Section icone="diplome" titre="Formations" nombre={cv.formations.length} rang={1}>
        {cv.formations.map((f, i) => (
          <Element
            key={`${f.diplome}-${i}`}
            titre={f.diplome}
            sous={f.ecole}
            detail={periodeLisible(f.debut, f.fin, f.enCours)}
          />
        ))}
      </Section>
      <Section icone="eclair" titre="Compétences" nombre={cv.competences.length} rang={2}>
        <Puces elements={cv.competences.map((c) => c.nom)} />
      </Section>
      <Section icone="langue" titre="Langues" nombre={cv.langues.length} rang={3}>
        <Puces elements={cv.langues.map((l) => `${l.langue} · ${l.niveau}`)} />
      </Section>
      <Section
        icone="coeur"
        titre="Centres d'intérêt"
        nombre={cv.interets.length}
        rang={4}
      >
        <Puces elements={cv.interets.map((i) => i.nom)} />
      </Section>
    </ScrollView>
  );
}
