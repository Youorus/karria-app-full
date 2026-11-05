/**
 * « Intitulé » : le poste visé, toujours à portée.
 *
 * Un champ avec les suggestions de l'index (`kind=title`), pré-rempli par
 * l'adaptation de Karria. Chaque frappe se voit sur la feuille (aperçu),
 * « Enregistrer » la retient. Un conseil, une fois : un intitulé, c'est le
 * poste qu'on vise, formulé comme dans les offres.
 */

import { useState } from "react";

import { Texte } from "@/components/texte";
import { ChampAvecSuggestions } from "@/features/cv/components/edition/champ-avec-suggestions";
import { TITRE_LONGUEUR_MAX } from "@/features/cv/services/validation-edition";

import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

interface Props {
  visible: boolean;
  titre: string | null;
  onApercu: (titre: string) => void;
  onEnregistrer: (titre: string) => void;
  onFermer: () => void;
}

function Contenu({ titre, onApercu, onEnregistrer, onFermer }: Omit<Props, "visible">) {
  const [valeur, setValeur] = useState(titre ?? "");
  const tropLong = valeur.length > TITRE_LONGUEUR_MAX;

  return (
    <FeuilleBasse
      visible
      hauteur="pleine"
      titre={TEXTES.intituleTitre}
      onFermer={onFermer}
      action={{
        libelle: "Enregistrer",
        desactive: tropLong || valeur === (titre ?? ""),
        onPress: () => {
          onEnregistrer(valeur);
          onFermer();
        },
      }}
    >
      <ChampAvecSuggestions
        kind="title"
        libelle=""
        placeholder="Ex. : Conseillère de vente"
        accessibilityLabel={TEXTES.intituleTitre}
        value={valeur}
        onChangeText={(t) => {
          setValeur(t);
          onApercu(t);
        }}
        erreur={tropLong ? `${TITRE_LONGUEUR_MAX} caractères au plus.` : undefined}
        autoCapitalize="sentences"
        autoFocus
        returnKeyType="done"
      />
      <Texte className="text-footnote leading-5 text-muted-foreground">
        {TEXTES.intituleAide}
      </Texte>
    </FeuilleBasse>
  );
}

/** Montée à l'ouverture : la saisie part de l'intitulé du moment, sans effet. */
export function FeuilleIntitule({ visible, ...props }: Props) {
  if (!visible) return null;
  return <Contenu {...props} />;
}
