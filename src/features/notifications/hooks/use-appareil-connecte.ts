/**
 * Le garde de l'appareil, monté avec l'espace connecté.
 *
 * ═══ Ce qu'il fait, et quand ═══
 *
 * 1. **Au montage** — donc à chaque ouverture avec une session — il
 *    enregistre l'appareil. Toujours, même sans permission : le serveur
 *    sait alors qu'un téléphone existe et sur quelle version il tourne.
 * 2. **Quand le système renouvelle le jeton**, il le renvoie. Un jeton
 *    périmé côté serveur, c'est une notification qui part dans le vide
 *    sans que personne ne le voie.
 *
 * Les notifications **touchées** ne passent plus par ici : elles peuvent
 * arriver avant la session (lancement à froid, session pas encore relue),
 * donc elles sont reçues à la racine par `use-centre-notifications`, qui
 * les garde jusqu'à ce qu'on puisse naviguer.
 *
 * ═══ Pourquoi dans la mise en page et non dans la racine ═══
 *
 * La racine existe avant qu'on sache si quelqu'un est connecté, et la
 * route des appareils exige une session. Le groupe `(app)` n'est monté
 * que connecté : le garde naît avec la session et meurt avec elle.
 */

import { useEffect } from "react";

import { surChangementDeJeton } from "../services/notifications";
import { synchroniserAppareil } from "./synchroniser-appareil";

export function useAppareilConnecte(): void {
  useEffect(() => {
    void synchroniserAppareil();
    return surChangementDeJeton(() => void synchroniserAppareil());
  }, []);
}
