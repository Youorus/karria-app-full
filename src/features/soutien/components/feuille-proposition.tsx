/**
 * La feuille qui propose Karria sans pub au moment où une limite se voit —
 * un CV sorti avec le filigrane, les portraits du mois épuisés.
 *
 * ═══ Non bloquante, par construction ═══
 *
 * Une demi-feuille (`FeuilleBasse`) : elle laisse l'écran visible derrière,
 * se ferme d'un toucher sur le voile, d'un glissement, de la croix, du
 * retour Android — et de son bouton secondaire, qui dit le refus avec les
 * mots de la personne. Rien n'est retenu derrière elle : le document, la
 * photo, tout reste disponible.
 *
 * ═══ Un seul bouton plein ═══
 *
 * Le bouton principal mène au parcours d'abonnement existant (l'offre du
 * profil) ; l'appelant l'ouvre **après** la fermeture (`apresFermeture`),
 * parce qu'iOS ne présente pas un écran par-dessus une fenêtre qui se ferme.
 *
 * La feuille basse vient de l'atelier : c'est la seule du projet qui sache
 * rester à mi-hauteur. Aucun mot n'est écrit ici — `services/proposition.ts`.
 */

import { BoutonAction } from "@/components/bouton-action";
import { Texte } from "@/components/texte";
import { VStack } from "@/components/ui/vstack";
import { FeuilleBasse } from "@/features/atelier/components/feuille-basse";

import type { TextesProposition } from "../services/proposition";

interface Props {
  visible: boolean;
  textes: TextesProposition;
  /** Le bouton principal : l'appelant ferme, puis ouvre l'offre. */
  onAccepter: () => void;
  /** Le bouton secondaire, la croix, le voile, le glissement. */
  onFermer: () => void;
  /** Une fois la fenêtre native rendue : le moment d'ouvrir l'offre. */
  apresFermeture?: () => void;
}

export function FeuilleProposition({
  visible,
  textes,
  onAccepter,
  onFermer,
  apresFermeture,
}: Props) {
  return (
    <FeuilleBasse
      visible={visible}
      titre={textes.titre}
      onFermer={onFermer}
      apresFermeture={apresFermeture}
      pied={
        <VStack className="gap-2">
          <BoutonAction libelle={textes.accepter} multiligne onPress={onAccepter} />
          <BoutonAction
            libelle={textes.refuser}
            ton="secondaire"
            multiligne
            onPress={onFermer}
          />
        </VStack>
      }
    >
      <Texte className="text-body leading-6 text-muted-foreground">{textes.texte}</Texte>
    </FeuilleBasse>
  );
}
