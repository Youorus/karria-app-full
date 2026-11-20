/**
 * « Intitulé » : le poste visé, toujours à portée — et la précision dessous.
 *
 * Un champ avec les suggestions de l'index (`kind=title`), pré-rempli par
 * l'adaptation de Karria. Chaque frappe se voit sur la feuille (aperçu),
 * « Enregistrer » la retient. Un conseil, une fois : un intitulé, c'est le
 * poste qu'on vise, formulé comme dans les offres.
 *
 * Juste dessous, la précision facultative (`identity.availability`, ADR-0040
 * de l'API) : ce qu'on cherche et quand on est disponible. C'est là qu'elle
 * va, justement parce que l'intitulé ne doit porter ni « recherche » ni
 * « disponible ». Même aperçu à la frappe, sur son propre chemin ; tant que
 * le modèle n'a pas encore écrit sa ligne (précision vide au dernier rendu),
 * l'aperçu n'a rien à patcher et elle apparaît au rendu qui suit
 * « Enregistrer ».
 */

import { useState } from "react";

import { ChampTexte } from "@/components/champ-texte";
import { Texte } from "@/components/texte";
import { ChampAvecSuggestions } from "@/features/cv/components/edition/champ-avec-suggestions";
import {
  AIDE_PRECISION,
  LIBELLE_PRECISION,
  PRECISION_LONGUEUR_MAX,
  TITRE_LONGUEUR_MAX,
} from "@/features/cv/services/validation-edition";

import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

interface Props {
  visible: boolean;
  titre: string | null;
  precision: string | null;
  onApercu: (titre: string) => void;
  onApercuPrecision: (precision: string) => void;
  onEnregistrer: (titre: string, precision: string) => void;
  onFermer: () => void;
}

function Contenu({
  titre,
  precision,
  onApercu,
  onApercuPrecision,
  onEnregistrer,
  onFermer,
}: Omit<Props, "visible">) {
  const [valeur, setValeur] = useState(titre ?? "");
  const [valeurPrecision, setValeurPrecision] = useState(precision ?? "");
  const tropLong = valeur.length > TITRE_LONGUEUR_MAX;
  const precisionTropLongue = valeurPrecision.length > PRECISION_LONGUEUR_MAX;
  const inchange = valeur === (titre ?? "") && valeurPrecision === (precision ?? "");

  return (
    <FeuilleBasse
      visible
      hauteur="pleine"
      titre={TEXTES.intituleTitre}
      onFermer={onFermer}
      action={{
        libelle: "Enregistrer",
        desactive: tropLong || precisionTropLongue || inchange,
        onPress: () => {
          onEnregistrer(valeur, valeurPrecision);
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
        returnKeyType="next"
      />
      <Texte className="text-footnote leading-5 text-muted-foreground">
        {TEXTES.intituleAide}
      </Texte>
      <ChampTexte
        libelle={LIBELLE_PRECISION}
        aide={AIDE_PRECISION}
        accessibilityLabel={LIBELLE_PRECISION}
        value={valeurPrecision}
        onChangeText={(t) => {
          setValeurPrecision(t);
          onApercuPrecision(t);
        }}
        erreur={
          precisionTropLongue
            ? `${PRECISION_LONGUEUR_MAX} caractères au plus.`
            : undefined
        }
        maxLength={PRECISION_LONGUEUR_MAX}
        autoCapitalize="sentences"
        returnKeyType="done"
      />
    </FeuilleBasse>
  );
}

/** Montée à l'ouverture : la saisie part de l'intitulé du moment, sans effet. */
export function FeuilleIntitule({ visible, ...props }: Props) {
  if (!visible) return null;
  return <Contenu {...props} />;
}
