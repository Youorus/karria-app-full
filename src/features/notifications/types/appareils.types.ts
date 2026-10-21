/**
 * Les types de l'enregistrement d'appareil.
 *
 * `…Brut` est la forme réseau de `PUT /devices/{installation_id}` — le
 * contrat partagé avec `karria_api` (`docs/contrat-api-appareils.md`, côté
 * serveur). Le reste est ce que l'application manipule ; la traduction se
 * fait dans `api/`, une fois.
 *
 * ═══ Pourquoi autant de champs ═══
 *
 * Chacun répond à une question que le support se posera : « sur quelle
 * version le bug se produit-il ? » (`versionApp`, `buildApp`), « est-ce un
 * vieux téléphone ? » (`anneeClasse`), « à quelle heure envoyer la
 * notification du matin ? » (`fuseauHoraire`). Aucun n'identifie la
 * personne : c'est l'appareil qu'on décrit, et l'identifiant
 * d'installation ne sort jamais du téléphone autrement.
 */

export type Plateforme = "ios" | "android";

/** Ce que le système dit de la permission, dans les mots du contrat. */
export type PermissionPush = "granted" | "denied" | "undetermined";

export interface Appareil {
  plateforme: Plateforme;
  /** Le jeton Expo (`ExponentPushToken[…]`), ou `null` si l'appareil n'en
   *  a pas : permission refusée, simulateur, projet EAS absent. */
  jetonPush: string | null;
  permissionPush: PermissionPush;
  osNom: string;
  osVersion: string;
  marque: string | null;
  fabricant: string | null;
  modele: string | null;
  modeleId: string | null;
  /** L'« année » de l'appareil selon Expo : un repère de puissance. */
  anneeClasse: number | null;
  appareilPhysique: boolean;
  versionApp: string;
  buildApp: string | null;
  langue: string | null;
  fuseauHoraire: string | null;
  region: string | null;
}

export interface AppareilBrut {
  platform: Plateforme;
  push_token: string | null;
  push_permission: PermissionPush;
  os_name: string;
  os_version: string;
  device_brand: string | null;
  device_manufacturer: string | null;
  device_model: string | null;
  device_model_id: string | null;
  device_year_class: number | null;
  is_physical_device: boolean;
  app_version: string;
  app_build: string | null;
  locale: string | null;
  timezone: string | null;
  region: string | null;
}

export interface EnregistrementBrut {
  installation_id: string;
  push_enabled: boolean;
}

export interface Enregistrement {
  installationId: string;
  /** La décision du serveur : il peut joindre cet appareil. */
  pushActif: boolean;
}
