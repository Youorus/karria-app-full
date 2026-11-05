/**
 * La barre d'action du détail — `template-detail-action-bar` de la V1.
 *
 * Un seul bouton (52 pt, rayon 14), dans le pied flottant, dont le libellé
 * et la couleur suivent
 * l'état, comme dans la V1 :
 *
 * - déjà possédé → « Utiliser ce modèle », en vert : l'atelier libre, sur
 *   le CV de la personne, dans ce modèle — ou « Continuer dans l'atelier »
 *   quand un dossier y est ouvert (acheté pendant qu'on adaptait son CV) :
 *   le dossier prend ce modèle ;
 * - gratuit → « Obtenir ce modèle », puis « Ajout en cours… », puis
 *   « Ajouté à ta collection ! » ;
 * - Premium → « Débloquer ce modèle · 4,99 € » en or, avec le cadenas : le
 *   prix est celui du serveur, et l'achat passe par Stripe dans le
 *   navigateur ; « Paiement en cours… » le temps d'y aller et d'en revenir.
 *   Si les paiements sont éteints pour cette plateforme, le bouton le dit.
 *
 * « Voir tous les modèles » reste accessible par le retour : le bouton du
 * pied est pour l'action qu'on vient chercher, pas pour revenir en arrière.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { PiedFlottant } from "@/components/pied-flottant";
import { AURA } from "@/theme";

import type { EtatAcquisition } from "../hooks/use-detail-modele";
import { prixLisible } from "../services/presentation";
import type { Modele } from "../types/modeles.types";

interface Props {
  modele: Modele;
  acquisition: EtatAcquisition;
  paiementsActifs: boolean;
  onObtenir: () => void;
  /** Un modèle à soi : l'atelier, avec les données de la personne. */
  onUtiliser: () => void;
  /** Un dossier est ouvert dans l'atelier : le bouton le dit. */
  atelierEnCours?: boolean;
}

export function BarreActionModele({
  modele,
  acquisition,
  paiementsActifs,
  onObtenir,
  onUtiliser,
  atelierEnCours = false,
}: Props) {
  const possede = acquisition === "possede" || acquisition === "ajoute";
  const occupe = acquisition === "en-cours" || acquisition === "paiement";
  const prix = prixLisible(modele.prix);

  const libelle = possede
    ? atelierEnCours
      ? "Continuer dans l'atelier"
      : "Utiliser ce modèle"
    : acquisition === "en-cours"
      ? "Ajout en cours…"
      : acquisition === "paiement"
        ? "Paiement en cours…"
        : modele.premium
          ? prix === null
            ? "Débloquer ce modèle"
            : `Débloquer ce modèle · ${prix}`
          : "Obtenir ce modèle";

  const aide = possede
    ? atelierEnCours
      ? "Ce modèle est à toi — ton CV en cours le prend dans l'atelier."
      : acquisition === "ajoute"
        ? "Ajouté à ta collection ! Ton CV s'y met en page dans l'atelier."
        : "Ce modèle est à toi — ton CV s'y met en page dans l'atelier."
    : acquisition === "erreur"
      ? modele.premium
        ? "Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant."
        : "L'ajout n'a pas abouti. Réessaie dans un instant."
      : acquisition === "en-attente"
        ? "Paiement pas encore confirmé. Si tu as payé, le modèle apparaîtra ici dans quelques minutes."
        : acquisition === "paiement"
          ? "Paiement sécurisé par Stripe, dans ton navigateur."
          : modele.premium && !paiementsActifs
            ? "L'achat des modèles Premium n'est pas disponible dans cette version de l'app."
            : modele.premium
              ? "Paiement unique, sécurisé par Stripe. Le modèle reste à toi."
              : null;

  const fond = possede ? "bg-success" : modele.premium ? "bg-premium" : "bg-primary";
  const desactive =
    occupe ||
    acquisition === "en-attente" ||
    (modele.premium && !possede && !paiementsActifs);

  return (
    <PiedFlottant aide={aide}>
      <Pressable
        onPress={possede ? onUtiliser : onObtenir}
        disabled={desactive}
        className={`h-[52px] items-center justify-center rounded-[14px] ${fond} ${
          desactive ? "opacity-60" : ""
        }`}
        accessibilityRole="button"
        accessibilityState={{ disabled: desactive, busy: occupe }}
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
