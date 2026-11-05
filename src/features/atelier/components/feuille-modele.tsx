/**
 * « Avec quel modèle ? » — choisir, et avoir envie d'un autre.
 *
 * ═══ La page derrière est l'aperçu ═══
 *
 * Une demi-feuille : toucher un modèle possédé redessine le CV au-dessus,
 * avec les vraies données. Les vignettes de la galerie servent de repères
 * (image en cache, flou pendant le chargement) ; l'aperçu, lui, est vivant.
 *
 * ═══ Trois rangées, un ton ═══
 *
 * Le modèle courant, grand, avec sa coche. Puis « Tes modèles ». Puis les
 * Premium qu'on n'a pas, avec le prix du serveur et une phrase qui donne
 * envie sans pousser : un paiement unique, le modèle reste à soi. Pas de
 * compte à rebours, pas de « plus que », rien de doré qui clignote — l'or
 * du Premium est celui de la galerie, en pastille. Le bouton de la feuille
 * est « Garder ce modèle » : on peut toujours ne rien changer.
 *
 * ═══ L'achat sans quitter l'atelier ═══
 *
 * Toucher un Premium ouvre Stripe ; à la livraison, le modèle s'applique de
 * lui-même et la carte passe dans « Tes modèles ». Pendant ce temps, la
 * carte le dit (« Paiement en cours… »).
 */

import { Image } from "expo-image";
import { Pressable, ScrollView } from "react-native";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { PastillePremium } from "@/features/modeles/components/pastille-premium";
import { prixLisible } from "@/features/modeles/services/presentation";
import type { Modele } from "@/features/modeles/types/modeles.types";
import { AURA } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { ChoixModele } from "../hooks/use-choix-modele";
import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

const LARGEUR_CARTE = 112;

function Vignette({ modele, largeur }: { modele: Modele; largeur: number }) {
  const hauteur = Math.round(largeur / 0.72);
  if (modele.miniature === null) {
    return (
      <Box
        style={{ width: largeur, height: hauteur }}
        className="items-center justify-center bg-remplissage"
      >
        <SymboleKarria taille={22} />
      </Box>
    );
  }
  return (
    <Image
      source={{
        uri: modele.miniature,
        cacheKey: `modele-${modele.id}-v${modele.version}`,
      }}
      placeholder={modele.flou === null ? undefined : { blurhash: modele.flou }}
      cachePolicy="memory-disk"
      style={{ width: largeur, height: hauteur }}
      contentFit="cover"
      contentPosition="top"
      transition={200}
      accessible={false}
    />
  );
}

function Carte({
  modele,
  courant,
  achat,
  onPress,
}: {
  modele: Modele;
  courant: boolean;
  achat: ChoixModele["achat"];
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  const prix = prixLisible(modele.prix);
  const enAchat = achat?.modeleId === modele.id ? achat.etat : null;
  const sousTitre =
    enAchat === "paiement"
      ? TEXTES.modelePaiement
      : enAchat === "en-attente"
        ? "Paiement à confirmer"
        : enAchat === "erreur"
          ? "Réessayer"
          : modele.premium && prix !== null
            ? prix
            : modele.categorie;
  return (
    <Pressable
      onPress={onPress}
      disabled={enAchat === "paiement"}
      className="gap-2"
      style={{ width: LARGEUR_CARTE }}
      accessibilityRole="button"
      accessibilityLabel={`${modele.libelle}${modele.premium && prix ? `, ${prix}` : ""}${courant ? ", modèle actuel" : ""}`}
      accessibilityState={{ selected: courant }}
    >
      <Box
        className={`overflow-hidden rounded-tuile border-2 ${
          courant ? "border-primary" : "border-border-subtle"
        }`}
      >
        <Vignette modele={modele} largeur={LARGEUR_CARTE - 4} />
        {courant ? (
          <Box className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Icone nom="coche" couleur={AURA.reflet} taille={12} graisse="bold" />
          </Box>
        ) : modele.premium ? (
          <Box className="absolute left-1.5 top-1.5">
            <PastillePremium />
          </Box>
        ) : null}
      </Box>
      <VStack className="gap-0">
        <Texte className="font-bold text-footnote text-foreground" numberOfLines={1}>
          {modele.libelle}
        </Texte>
        <Texte
          className={`text-caption ${enAchat === "erreur" ? "text-destructive" : "text-muted-foreground"}`}
          numberOfLines={1}
        >
          {sousTitre}
          {modele.premium && !courant && enAchat === null ? (
            <Texte className="text-caption text-muted-foreground"> </Texte>
          ) : null}
        </Texte>
      </VStack>
      {modele.premium && enAchat === null && !courant ? (
        <Box className="absolute bottom-10 right-1.5 h-6 w-6 items-center justify-center rounded-full bg-scrim-fort">
          <Icone nom="cadenas" couleur={couleurs.surVoile} taille={11} />
        </Box>
      ) : null}
    </Pressable>
  );
}

function Rangee({
  titre,
  phrase,
  modeles,
  achat,
  modeleId,
  onChoisir,
}: {
  titre: string;
  phrase?: string;
  modeles: Modele[];
  achat: ChoixModele["achat"];
  modeleId: string | null;
  onChoisir: (m: Modele) => void;
}) {
  if (modeles.length === 0) return null;
  return (
    <VStack className="gap-2">
      <VStack className="gap-0.5">
        <Texte className="font-bold text-footnote text-foreground">{titre}</Texte>
        {phrase ? (
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {phrase}
          </Texte>
        ) : null}
      </VStack>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pr-5"
      >
        {modeles.map((m) => (
          <Carte
            key={m.id}
            modele={m}
            courant={m.id === modeleId}
            achat={achat}
            onPress={() => onChoisir(m)}
          />
        ))}
      </ScrollView>
    </VStack>
  );
}

interface Props {
  visible: boolean;
  choix: ChoixModele;
  modeleId: string | null;
  onFermer: () => void;
}

export function FeuilleModele({ visible, choix, modeleId, onFermer }: Props) {
  return (
    <FeuilleBasse
      visible={visible}
      titre={TEXTES.modeleTitre}
      onFermer={onFermer}
      pied={<BoutonAction libelle={TEXTES.modeleGarder} onPress={onFermer} />}
    >
      {choix.actuel !== null ? (
        <HStack className="items-center gap-4">
          <Carte modele={choix.actuel} courant achat={choix.achat} onPress={onFermer} />
          <VStack className="flex-1 gap-1">
            <Texte className="text-caption text-foreground-faint">
              {TEXTES.modeleActuel}
            </Texte>
            <Texte className="font-display text-callout text-foreground">
              {choix.actuel.libelle}
            </Texte>
            {choix.actuel.description ? (
              <Texte
                className="text-footnote leading-5 text-muted-foreground"
                numberOfLines={3}
              >
                {choix.actuel.description}
              </Texte>
            ) : null}
          </VStack>
        </HStack>
      ) : null}
      <Rangee
        titre={TEXTES.modeleMiens}
        modeles={choix.miens}
        achat={choix.achat}
        modeleId={modeleId}
        onChoisir={choix.choisir}
      />
      <Rangee
        titre={TEXTES.modeleAutres}
        phrase={
          choix.paiementsActifs
            ? TEXTES.modeleAutresPhrase
            : "L'achat des modèles Premium n'est pas disponible dans cette version."
        }
        modeles={choix.autres}
        achat={choix.achat}
        modeleId={modeleId}
        onChoisir={choix.choisir}
      />
      {choix.achat?.etat === "en-attente" ? (
        <Texte className="text-footnote text-muted-foreground">
          {TEXTES.modeleAttente}
        </Texte>
      ) : choix.achat?.etat === "erreur" ? (
        <Texte className="text-footnote text-destructive">{TEXTES.modeleErreur}</Texte>
      ) : null}
    </FeuilleBasse>
  );
}
