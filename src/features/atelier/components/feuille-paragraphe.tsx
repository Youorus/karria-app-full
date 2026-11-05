/**
 * Un paragraphe de la lettre (ou l'objet, la formule) : à la main, ou par Karria.
 *
 * ═══ Deux voies, toujours ═══
 *
 * Le champ en haut, « Enregistrer » dans l'en-tête : je modifie. Dessous,
 * pour un paragraphe, « Karria réécrit » avec une consigne courte
 * facultative (« plus court », « cite mon expérience chez Zara »). Quand
 * elle a réécrit, l'ancien et le nouveau sont là, et l'on garde l'un ou
 * l'autre — le nouveau est déjà sur la feuille, le choix se fait en le
 * voyant.
 *
 * Toucher l'expéditeur ou l'entreprise n'ouvre pas de formulaire : ces
 * lignes viennent du CV et de l'offre, et la feuille le dit.
 */

import { useState } from "react";

import { BoutonAction } from "@/components/bouton-action";
import { ChampTexte } from "@/components/champ-texte";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { ChampMultiligne } from "@/features/cv/components/edition/champ-multiligne";

import type { Reecriture } from "../hooks/use-lettre";
import type { CibleLettre } from "../services/chemins";
import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

const LONGUEURS: Record<CibleLettre["partie"], number> = {
  objet: 200,
  destinataire: 200,
  formule: 300,
  paragraphe: 1_200,
  "hors-lettre": 0,
};

const TITRES: Record<CibleLettre["partie"], string> = {
  objet: "L'objet",
  destinataire: "La formule d'appel",
  formule: "La formule de politesse",
  paragraphe: "Ce paragraphe",
  "hors-lettre": "Ces informations",
};

interface Props {
  cible: CibleLettre;
  texte: string;
  reecriture: Reecriture | null;
  reecritureEnCours: boolean;
  onApercu: (texte: string) => void;
  onEnregistrer: (texte: string) => void;
  onReecrire: (consigne: string) => void;
  onGarderNouveau: () => void;
  onGarderAncien: () => void;
  onFermer: () => void;
}

function Contenu({
  cible,
  texte,
  reecriture,
  reecritureEnCours,
  onApercu,
  onEnregistrer,
  onReecrire,
  onGarderNouveau,
  onGarderAncien,
  onFermer,
}: Props) {
  const [valeur, setValeur] = useState(texte);
  const [consigne, setConsigne] = useState("");
  const max = LONGUEURS[cible.partie];
  const tropLong = valeur.length > max;
  const vide = valeur.trim() === "";

  if (cible.partie === "hors-lettre") {
    return (
      <FeuilleBasse visible titre={TITRES["hors-lettre"]} onFermer={onFermer}>
        <Texte className="text-body leading-6 text-muted-foreground">
          {TEXTES.lettreHorsLettre}
        </Texte>
      </FeuilleBasse>
    );
  }

  if (reecriture !== null) {
    return (
      <FeuilleBasse visible titre="Karria a réécrit" onFermer={onGarderNouveau}>
        <VStack className="gap-3">
          <VStack className="gap-0.5">
            <Texte className="text-caption text-foreground-faint">{TEXTES.avant}</Texte>
            <Texte className="text-footnote leading-5 text-muted-foreground">
              {reecriture.avant}
            </Texte>
          </VStack>
          <VStack className="gap-0.5">
            <Texte className="text-caption text-foreground-faint">{TEXTES.apres}</Texte>
            <Texte className="text-body leading-6 text-foreground">
              {reecriture.apres}
            </Texte>
          </VStack>
        </VStack>
        <HStack className="gap-3 pt-2">
          <Box className="flex-1">
            <BoutonAction
              libelle={TEXTES.lettreGarderAncien}
              ton="secondaire"
              onPress={onGarderAncien}
            />
          </Box>
          <Box className="flex-1">
            <BoutonAction
              libelle={TEXTES.lettreGarderNouveau}
              onPress={onGarderNouveau}
            />
          </Box>
        </HStack>
      </FeuilleBasse>
    );
  }

  return (
    <FeuilleBasse
      visible
      hauteur="pleine"
      titre={TITRES[cible.partie]}
      onFermer={onFermer}
      action={{
        libelle: "Enregistrer",
        desactive: tropLong || vide || valeur === texte || reecritureEnCours,
        onPress: () => onEnregistrer(valeur),
      }}
    >
      <ChampMultiligne
        libelle=""
        accessibilityLabel={TITRES[cible.partie]}
        lignes={cible.partie === "paragraphe" ? 6 : 2}
        value={valeur}
        onChangeText={(t) => {
          setValeur(t);
          onApercu(t);
        }}
        erreur={
          tropLong ? `${max.toLocaleString("fr-FR")} caractères au plus.` : undefined
        }
        autoCapitalize="sentences"
        autoFocus
      />
      {cible.partie === "paragraphe" ? (
        <VStack className="gap-3 rounded-carte border border-border-subtle bg-card p-4">
          <HStack className="items-center gap-2">
            <Box className="h-1.5 w-1.5 rounded-full bg-primary" />
            <Texte className="font-bold text-footnote text-foreground">
              {TEXTES.lettreKarria}
            </Texte>
          </HStack>
          <ChampTexte
            libelle=""
            placeholder={TEXTES.lettreConsignePlaceholder}
            accessibilityLabel={TEXTES.lettreConsigne}
            value={consigne}
            onChangeText={setConsigne}
            maxLength={300}
            autoCapitalize="sentences"
          />
          <BoutonAction
            libelle={TEXTES.lettreKarria}
            ton="secondaire"
            enCours={reecritureEnCours}
            libelleEnCours="Karria réécrit…"
            onPress={() => onReecrire(consigne)}
          />
        </VStack>
      ) : null}
    </FeuilleBasse>
  );
}

/** Montée à l'ouverture : la saisie part du texte du moment, sans effet. */
export function FeuilleParagraphe(props: Props & { visible: boolean }) {
  if (!props.visible) return null;
  return <Contenu {...props} />;
}
