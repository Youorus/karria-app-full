/**
 * Le premier jet : ce que Karria a compris, déjà au format du CV.
 *
 * ═══ Pourquoi il ressemble déjà à un CV ═══
 *
 * On ne montre pas « des champs remplis » mais **la ligne de CV** telle
 * qu'elle sera imprimée : le poste en gras, l'entreprise, les dates, les
 * missions en puces. On juge mieux un résultat qu'un formulaire — et
 * c'est le moment « waouh » de chaque réponse.
 *
 * ═══ Deux gestes, pas plus ═══
 *
 * « C'est ça » valide ; « Corriger » rouvre la parole pour dire ce qui
 * ne va pas. Quand Karria a un doute (une date manquante), il le dit
 * sous le jet, sans bloquer : on peut valider quand même.
 */

import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { DEFINITIONS, periodeLisible } from "../services/chapitres";
import type { Jet } from "../types/cv.types";

function Puce({ children }: { children: string }) {
  return (
    <Box className="rounded-full bg-surface-primary px-3 py-1">
      <Texte className="font-medium text-footnote text-primary">{children}</Texte>
    </Box>
  );
}

function Ligne({ texte, discret = false }: { texte: string | null; discret?: boolean }) {
  if (texte === null || texte === "") return null;
  return (
    <Texte
      className={
        discret ? "text-footnote text-muted-foreground" : "text-body text-foreground"
      }
    >
      {texte}
    </Texte>
  );
}

function Contenu({ jet }: { jet: Jet }) {
  switch (jet.chapitre) {
    case "identity":
      return (
        <VStack className="gap-1">
          <Texte className="font-display text-title text-foreground">
            {jet.donnees.prenom} {jet.donnees.nom}
          </Texte>
          <Ligne texte={jet.donnees.titre} discret />
        </VStack>
      );
    case "contact":
      return (
        <VStack className="gap-1.5">
          <Ligne texte={jet.donnees.email} />
          <Ligne texte={jet.donnees.telephone} />
          <Ligne texte={jet.donnees.ville} discret />
          {jet.donnees.liens.map((l) => (
            <Ligne
              key={l.url}
              texte={`${l.libelle} · ${l.url.replace(/^https?:\/\//, "")}`}
              discret
            />
          ))}
        </VStack>
      );
    case "summary":
      return (
        <Texte className="text-body leading-6 text-foreground">{jet.donnees.texte}</Texte>
      );
    case "experiences":
      return (
        <VStack className="gap-1.5">
          <Texte className="font-bold text-callout text-foreground">
            {jet.donnees.poste}
          </Texte>
          <Ligne
            texte={[jet.donnees.entreprise, jet.donnees.lieu].filter(Boolean).join(" · ")}
            discret
          />
          <Ligne
            texte={periodeLisible(
              jet.donnees.debut,
              jet.donnees.fin,
              jet.donnees.enCours,
            )}
            discret
          />
          {jet.donnees.missions.map((m) => (
            <HStack key={m} className="gap-2 pl-1">
              <Texte className="text-body text-primary">•</Texte>
              <Texte className="flex-1 text-body text-foreground">{m}</Texte>
            </HStack>
          ))}
        </VStack>
      );
    case "educations":
      return (
        <VStack className="gap-1.5">
          <Texte className="font-bold text-callout text-foreground">
            {jet.donnees.diplome}
          </Texte>
          <Ligne texte={jet.donnees.ecole} discret />
          <Ligne
            texte={periodeLisible(
              jet.donnees.debut,
              jet.donnees.fin,
              jet.donnees.enCours,
            )}
            discret
          />
        </VStack>
      );
    case "skills":
      return (
        <VStack className="gap-3">
          {jet.donnees.competences.length > 0 ? (
            <HStack className="flex-wrap gap-2">
              {jet.donnees.competences.map((c) => (
                <Puce key={c.nom}>{c.nom}</Puce>
              ))}
            </HStack>
          ) : null}
          {jet.donnees.langues.length > 0 ? (
            <HStack className="flex-wrap gap-2">
              {jet.donnees.langues.map((l) => (
                <Puce key={l.langue}>{`${l.langue} · ${l.niveau}`}</Puce>
              ))}
            </HStack>
          ) : null}
        </VStack>
      );
    case "interests":
      return (
        <HStack className="flex-wrap gap-2">
          {jet.donnees.interets.map((i) => (
            <Puce key={i.nom}>{i.nom}</Puce>
          ))}
        </HStack>
      );
    case "photo":
      return null;
  }
}

interface Props {
  jet: Jet;
  relance: string | null;
  occupe: boolean;
  onValider: () => void;
  onCorriger: () => void;
}

export function CarteJet({ jet, relance, occupe, onValider, onCorriger }: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const definition = DEFINITIONS[jet.chapitre];

  return (
    <Animated.View entering={reduit ? undefined : FadeInUp.springify().damping(18)}>
      <VStack className="gap-4 rounded-carte border border-border-subtle bg-card p-5">
        <HStack className="items-center gap-2">
          <Icone nom={definition.icone} couleur={couleurs.primaire} taille={14} />
          <Texte className="font-bold text-caption uppercase tracking-widest text-primary">
            {definition.titre}
          </Texte>
        </HStack>

        <Contenu jet={jet} />

        {relance !== null ? (
          <HStack className="items-start gap-2 rounded-tuile bg-surface-warning p-3">
            <Icone nom="info" couleur={couleurs.avertissement} taille={14} />
            <Texte className="flex-1 text-footnote text-foreground">{relance}</Texte>
          </HStack>
        ) : null}

        <HStack className="gap-3">
          <Box className="flex-1">
            <BoutonAction
              libelle="Corriger"
              ton="secondaire"
              onPress={onCorriger}
              desactive={occupe}
              icone={<Icone nom="crayon" couleur={couleurs.texte} taille={14} />}
            />
          </Box>
          <Box className="flex-1">
            <BoutonAction
              libelle="C'est ça"
              onPress={onValider}
              enCours={occupe}
              icone={
                <Icone
                  nom="coche"
                  couleur={couleurs.surPrimaire}
                  taille={14}
                  graisse="bold"
                />
              }
            />
          </Box>
        </HStack>
      </VStack>
    </Animated.View>
  );
}
