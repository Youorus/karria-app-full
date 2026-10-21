/**
 * La route de l'écran de bienvenue.
 *
 * Un fichier de `app/` est une **adresse**, pas un écran : il délègue.
 * L'écran vit dans son domaine, avec sa logique et ses composants.
 */

import { EcranBienvenue } from "@/features/auth/screens/ecran-bienvenue";

export default function RouteBienvenue() {
  return <EcranBienvenue />;
}
