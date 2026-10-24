/**
 * Les icônes de Karria : natives sur chaque système.
 *
 * ═══ Pourquoi `expo-symbols` ═══
 *
 * SF Symbols sur iOS, Material Symbols sur Android : chaque utilisateur
 * voit les icônes de son système, au trait et au rendu exacts de ses
 * autres applications — c'est ce qui fait qu'une application paraît
 * « native » sans qu'on sache dire pourquoi. Sur iOS, ce sont de vrais
 * symboles vectoriels qui suivent la taille du texte ; sur Android, la
 * police Material est embarquée dans le paquet (aucun réseau requis).
 *
 * La V1 mélangeait Ionicons et lucide ; ce catalogue en reprend les
 * mêmes sens, un nom par usage.
 *
 * ═══ Un catalogue, pas des noms libres ═══
 *
 * Chaque icône a son nom iOS **et** son nom Android, vérifiés à la
 * compilation (`SFSymbol`, `AndroidSymbol`) : une icône manquante sur une
 * plateforme ne peut pas passer inaperçue jusqu'à l'appareil.
 */

import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import type { ColorValue } from "react-native";

interface Paire {
  ios: SFSymbol;
  android: AndroidSymbol;
}

export const ICONES = {
  dossiers: { ios: "doc.text", android: "description" },
  dossiersPlein: { ios: "doc.text.fill", android: "description" },
  cv: { ios: "doc", android: "draft" },
  cvPlein: { ios: "doc.fill", android: "draft" },
  modeles: { ios: "square.stack.3d.up", android: "stacks" },
  modelesPlein: { ios: "square.stack.3d.up.fill", android: "stacks" },
  profil: { ios: "person", android: "person" },
  profilPlein: { ios: "person.fill", android: "person" },
  filtres: { ios: "slider.horizontal.3", android: "tune" },
  etincelles: { ios: "sparkles", android: "auto_awesome" },
  haut: { ios: "chevron.up", android: "keyboard_arrow_up" },
  retour: { ios: "chevron.left", android: "arrow_back" },
  suivant: { ios: "chevron.right", android: "chevron_right" },
  fermer: { ios: "xmark", android: "close" },
  coche: { ios: "checkmark", android: "check" },
  lieu: { ios: "mappin.and.ellipse", android: "location_on" },
  contrat: { ios: "briefcase", android: "work" },
  salaire: { ios: "eurosign.circle", android: "euro" },
  signet: { ios: "bookmark", android: "bookmark" },
  signetPlein: { ios: "bookmark.fill", android: "bookmark_added" },
  partager: { ios: "square.and.arrow.up", android: "share" },
  calendrier: { ios: "calendar", android: "calendar_month" },
  vu: { ios: "eye", android: "visibility" },
  envoye: { ios: "paperplane", android: "send" },
  ouvrir: { ios: "arrow.up.right", android: "north_east" },
  pouceHaut: { ios: "hand.thumbsup", android: "thumb_up" },
  pouceBas: { ios: "hand.thumbsdown", android: "thumb_down" },
  entreprise: { ios: "building.2", android: "apartment" },
  eclair: { ios: "bolt.fill", android: "bolt" },
  alerte: { ios: "exclamationmark.circle", android: "error" },
  info: { ios: "info.circle", android: "info" },
  etoile: { ios: "star.fill", android: "star" },
  tendance: { ios: "chart.line.uptrend.xyaxis", android: "trending_up" },
  photo: { ios: "person.crop.square", android: "account_box" },
  lettre: { ios: "envelope", android: "mail" },
  cadenas: { ios: "lock.fill", android: "lock" },
  agrandir: { ios: "arrow.up.left.and.arrow.down.right", android: "open_in_full" },
  micro: { ios: "mic.fill", android: "mic" },
  arreter: { ios: "stop.fill", android: "stop" },
  envoyer: { ios: "arrow.up", android: "arrow_upward" },
  crayon: { ios: "pencil", android: "edit" },
  identite: { ios: "person.text.rectangle", android: "badge" },
  arobase: { ios: "at", android: "alternate_email" },
  telephone: { ios: "phone", android: "call" },
  citation: { ios: "quote.opening", android: "format_quote" },
  diplome: { ios: "graduationcap", android: "school" },
  langue: { ios: "globe", android: "language" },
  coeur: { ios: "heart", android: "favorite" },
  coeurPlein: { ios: "heart.fill", android: "favorite" },
  tasse: { ios: "cup.and.saucer.fill", android: "coffee" },
  camera: { ios: "camera", android: "photo_camera" },
  galerie: { ios: "photo.on.rectangle", android: "photo_library" },
  importer: { ios: "square.and.arrow.down", android: "download" },
  ajouter: { ios: "plus", android: "add" },
  passer: { ios: "forward", android: "skip_next" },
  // Le profil et ses paramètres.
  reglages: { ios: "gearshape", android: "settings" },
  lune: { ios: "moon", android: "dark_mode" },
  soleil: { ios: "sun.max", android: "light_mode" },
  appareil: { ios: "iphone", android: "smartphone" },
  cloche: { ios: "bell", android: "notifications" },
  clocheBarree: { ios: "bell.slash", android: "notifications_off" },
  deconnexion: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  corbeille: { ios: "trash", android: "delete" },
  couronne: { ios: "crown", android: "workspace_premium" },
  bouclier: { ios: "lock.shield", android: "shield" },
  fete: { ios: "party.popper", android: "celebration" },
  loupeBarree: { ios: "magnifyingglass", android: "search_off" },
  question: { ios: "questionmark.circle", android: "help" },
  cocheCercle: { ios: "checkmark.circle", android: "check_circle" },
  main: { ios: "hand.wave", android: "waving_hand" },
} as const satisfies Record<string, Paire>;

export type NomIcone = keyof typeof ICONES;

interface Props {
  nom: NomIcone;
  couleur: ColorValue;
  taille?: number;
  /** Graisse du trait, alignée sur celle du texte voisin. */
  graisse?: "regular" | "medium" | "semibold" | "bold";
}

export function Icone({ nom, couleur, taille = 20, graisse = "regular" }: Props) {
  return (
    <SymbolView
      name={ICONES[nom]}
      tintColor={couleur}
      size={taille}
      weight={graisse}
      // Décorative par défaut : le libellé accessible appartient au bouton
      // qui la contient, pas à l'icône.
      accessible={false}
    />
  );
}
