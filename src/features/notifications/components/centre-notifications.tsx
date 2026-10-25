/**
 * Le centre des notifications, posé par la racine au-dessus de la
 * navigation. Sans rendu propre : il branche `useCentreNotifications` et
 * dessine sa bannière quand il y en a une.
 */

import { useCentreNotifications } from "../hooks/use-centre-notifications";
import { BanniereNotification } from "./banniere-notification";

export function CentreDeNotifications() {
  const { banniere, ouvrirBanniere, fermerBanniere } = useCentreNotifications();
  return (
    <BanniereNotification
      banniere={banniere}
      onOuvrir={ouvrirBanniere}
      onFermer={fermerBanniere}
    />
  );
}
