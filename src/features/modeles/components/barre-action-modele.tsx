/**
 * La barre d'action du détail — `template-detail-action-bar` de la V1.
 *
 * Un seul bouton (52 pt, rayon 14), dans le pied flottant, dont le libellé
 * et la couleur suivent
 * l'état, comme dans la V1 :
 *
 * - déjà possédé → « Voir tous les modèles », en vert, « Ce modèle est
 *   déjà à toi » au-dessus ;
 * - gratuit → « Obtenir ce modèle », puis « Ajout en cours… », puis
 *   « Ajouté à ta collection ! » ;
 * - Premium → « Obtenir ce modèle · 4,99 € » en or, avec le cadenas — désactivé
 *   tant que l'achat intégré n'est pas branché, et il le dit.
 *
 * La génération d'un CV avec ce modèle (« Créer mon CV avec ce modèle »)
 * arrivera avec le Studio, dans l'onglet CV.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { PiedFlottant } from "@/components/pied-flottant";
import { AURA } from "@/theme";

import type { EtatAcquisition } from "../hooks/use-detail-modele";
import type { Modele } from "../types/modeles.types";

interface Props {
  modele: Modele;
  acquisition: EtatAcquisition;
  onObtenir: () => void;
  onVoirLaGalerie: () => void;
}

export function BarreActionModele({
  modele,
  acquisition,
  onObtenir,
  onVoirLaGalerie,
}: Props) {
  const possede = acquisition === "possede" || acquisition === "ajoute";

  const libelle = possede
    ? acquisition === "ajoute"
      ? "Ajouté à ta collection !"
      : "Voir tous les modèles"
    : acquisition === "en-cours"
      ? "Ajout en cours…"
      : modele.premium
        ? `Obtenir ce modèle · ${modele.prix ?? "—"} €`
        : "Obtenir ce modèle";

  const aide = possede
    ? "Ce modèle est à toi — prêt pour ton prochain CV."
    : acquisition === "erreur"
      ? "L'ajout n'a pas abouti. Réessaie dans un instant."
      : modele.premium
        ? "L'achat des modèles Premium arrive bientôt dans l'application."
        : null;

  const fond = possede ? "bg-success" : modele.premium ? "bg-premium" : "bg-primary";
  const desactive = (modele.premium && !possede) || acquisition === "en-cours";

  return (
    <PiedFlottant aide={aide}>
      <Pressable
        onPress={possede ? onVoirLaGalerie : onObtenir}
        disabled={desactive}
        className={`h-[52px] items-center justify-center rounded-[14px] ${fond} ${
          desactive && !modele.premium ? "opacity-60" : ""
        } ${modele.premium && !possede ? "opacity-70" : ""}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: desactive, busy: acquisition === "en-cours" }}
      >
        <HStack className="items-center gap-2">
          {modele.premium && !possede ? (
            <Icone nom="cadenas" couleur={AURA.reflet} taille={15} />
          ) : null}
          {acquisition === "ajoute" ? (
            <Icone nom="coche" couleur={AURA.reflet} taille={16} graisse="bold" />
          ) : null}
          <Texte className="font-bold text-callout text-on-scrim">{libelle}</Texte>
        </HStack>
      </Pressable>
    </PiedFlottant>
  );
}
