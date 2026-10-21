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
 * 3. **Quand une notification est touchée**, il ouvre l'écran que son
 *    `data.url` désigne — qu'elle ait été touchée application ouverte, ou
 *    qu'elle ait servi à la lancer.
 *
 * ═══ Pourquoi dans la mise en page et non dans la racine ═══
 *
 * La racine existe avant qu'on sache si quelqu'un est connecté, et la
 * route des appareils exige une session. Le groupe `(app)` n'est monté
 * que connecté : le garde naît avec la session et meurt avec elle.
 *
 * ═══ Le chemin poussé est une chaîne libre ═══
 *
 * Le routeur typé ne connaît que les routes du projet, et le lien vient
 * du serveur. On le valide (`cheminDepuisUrl`) puis on l'affirme comme
 * `Href` : une route inexistante tombe sur l'écran « introuvable » du
 * routeur, jamais hors de l'application.
 */

import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";

import { cheminDepuisUrl } from "../services/liens";
import {
  notificationQuiALance,
  surChangementDeJeton,
  surNotificationTouchee,
  type DonneesNotification,
} from "../services/notifications";
import { synchroniserAppareil } from "./synchroniser-appareil";

export function useAppareilConnecte(): void {
  const router = useRouter();

  useEffect(() => {
    void synchroniserAppareil();
    return surChangementDeJeton(() => void synchroniserAppareil());
  }, []);

  useEffect(() => {
    let vivant = true;
    const ouvrir = (donnees: DonneesNotification) => {
      const chemin = cheminDepuisUrl(donnees.url);
      if (chemin === null) return;
      router.push(chemin as Href);
    };

    void notificationQuiALance().then((donnees) => {
      if (vivant && donnees !== null) ouvrir(donnees);
    });
    const arreter = surNotificationTouchee(ouvrir);
    return () => {
      vivant = false;
      arreter();
    };
  }, [router]);
}
