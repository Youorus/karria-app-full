/**
 * L'enregistrement de l'appareil auprès du serveur, et sa traduction.
 *
 * ═══ Le contrat ═══
 *
 * `PUT /devices/{installation_id}` remplace la fiche entière à chaque
 * appel — au démarrage, après la réponse à la permission, et quand le
 * jeton change. Un `PUT` et non un `POST` : l'appareil est **nommé** par
 * l'application (son identifiant d'installation), le serveur ne lui en
 * attribue pas, et rejouer l'appel ne crée rien de plus.
 *
 * `DELETE /devices/{installation_id}` à la déconnexion, **avant** de
 * révoquer la session : la route exige d'être authentifié, et une fois
 * les jetons oubliés il serait trop tard. Le serveur ne doit plus envoyer
 * de notification à un téléphone où personne n'est connecté.
 *
 * Les échecs ne sont pas traités ici : les hooks qui appellent décident
 * de ce qu'ils font d'un enregistrement raté — et c'est toujours « rien
 * de visible, une trace dans les journaux ».
 */

import { http } from "@/lib/http";
import type {
  Appareil,
  AppareilBrut,
  Enregistrement,
  EnregistrementBrut,
} from "../types/appareils.types";

function versBrut(appareil: Appareil): AppareilBrut {
  return {
    platform: appareil.plateforme,
    push_token: appareil.jetonPush,
    push_permission: appareil.permissionPush,
    os_name: appareil.osNom,
    os_version: appareil.osVersion,
    device_brand: appareil.marque,
    device_manufacturer: appareil.fabricant,
    device_model: appareil.modele,
    device_model_id: appareil.modeleId,
    device_year_class: appareil.anneeClasse,
    is_physical_device: appareil.appareilPhysique,
    app_version: appareil.versionApp,
    app_build: appareil.buildApp,
    locale: appareil.langue,
    timezone: appareil.fuseauHoraire,
    region: appareil.region,
  };
}

function versEnregistrement(brut: EnregistrementBrut): Enregistrement {
  return { installationId: brut.installation_id, pushActif: brut.push_enabled };
}

export async function enregistrerAppareil(
  installationId: string,
  appareil: Appareil,
): Promise<Enregistrement> {
  return versEnregistrement(
    await http.put<EnregistrementBrut>(`/devices/${installationId}`, versBrut(appareil)),
  );
}

export async function desinscrireAppareil(installationId: string): Promise<void> {
  await http.delete(`/devices/${installationId}`);
}
