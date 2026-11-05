/**
 * « Envoyer par e-mail » : à mon adresse, ou à une autre — confirmée.
 *
 * Deux lignes à choisir : l'adresse du compte (pré-remplie, c'est le cas
 * courant : se l'envoyer pour l'avoir sur l'ordinateur), ou une autre
 * adresse à saisir. Avant de partir, l'adresse s'affiche en toutes lettres
 * sur le bouton : « Envoyer à rh@acme.fr ». Le message est celui du
 * serveur, sans texte libre : la feuille le dit, pour qu'on ne cherche pas
 * où écrire un mot.
 */

import { useState } from "react";
import { Pressable } from "react-native";

import { BoutonAction } from "@/components/bouton-action";
import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { emailValide } from "@/features/cv/services/validation-edition";
import { AURA } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

interface Props {
  visible: boolean;
  adresseDuCompte: string | null;
  documents: number;
  enCours: boolean;
  erreur: string | null;
  onEnvoyer: (a: string | null) => void;
  onFermer: () => void;
}

function Choix({
  actif,
  libelle,
  detail,
  onPress,
}: {
  actif: boolean;
  libelle: string;
  detail: string | null;
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-touch flex-row items-center gap-3 rounded-carte border px-4 py-3 ${
        actif ? "border-primary bg-surface-primary" : "border-border-subtle bg-card"
      }`}
      accessibilityRole="radio"
      accessibilityState={{ checked: actif }}
    >
      <Box
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
          actif ? "border-primary bg-primary" : "border-border-champ"
        }`}
      >
        {actif ? (
          <Icone nom="coche" couleur={AURA.reflet} taille={10} graisse="bold" />
        ) : null}
      </Box>
      <VStack className="flex-1">
        <Texte className="font-bold text-body text-foreground">{libelle}</Texte>
        {detail ? (
          <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
            {detail}
          </Texte>
        ) : null}
      </VStack>
      {actif ? null : <Icone nom="suivant" couleur={couleurs.estompe} taille={14} />}
    </Pressable>
  );
}

function Contenu({
  adresseDuCompte,
  documents,
  enCours,
  erreur,
  onEnvoyer,
  onFermer,
}: Props) {
  const [autre, setAutre] = useState(adresseDuCompte === null);
  const [adresse, setAdresse] = useState("");
  const cible = autre ? adresse.trim() : adresseDuCompte;
  const valide = cible !== null && cible !== "" && emailValide(cible);

  return (
    <FeuilleBasse
      visible
      hauteur="pleine"
      titre={TEXTES.envoyerParEmail}
      sousTitre={`${documents === 2 ? "Ton CV et ta lettre, en deux pièces jointes" : "Ton CV, en pièce jointe"}, dans un message signé de ton nom.`}
      onFermer={onFermer}
      pied={
        <BoutonAction
          libelle={
            valide && cible !== null ? `Envoyer à ${cible}` : TEXTES.confirmerEnvoi
          }
          desactive={!valide}
          enCours={enCours}
          libelleEnCours="Envoi…"
          onPress={() => onEnvoyer(autre ? cible : null)}
        />
      }
    >
      {adresseDuCompte !== null ? (
        <Choix
          actif={!autre}
          libelle={TEXTES.aMonAdresse}
          detail={adresseDuCompte}
          onPress={() => setAutre(false)}
        />
      ) : null}
      <Choix
        actif={autre}
        libelle={TEXTES.autreAdresse}
        detail={null}
        onPress={() => setAutre(true)}
      />
      {autre ? (
        <ChampTexte
          libelle=""
          placeholder="prenom.nom@entreprise.fr"
          accessibilityLabel="Adresse e-mail du destinataire"
          value={adresse}
          onChangeText={setAdresse}
          erreur={
            adresse.trim() !== "" && !emailValide(adresse)
              ? "Cette adresse n'a pas l'air valide."
              : undefined
          }
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoFocus
          returnKeyType="done"
        />
      ) : null}
      {erreur !== null ? (
        <HStack className="items-start gap-2 rounded-carte bg-surface-warning px-4 py-3">
          <Texte
            className="flex-1 text-footnote leading-5 text-foreground"
            accessibilityRole="alert"
          >
            {erreur}
          </Texte>
        </HStack>
      ) : null}
    </FeuilleBasse>
  );
}

/** Montée à l'ouverture : le choix part de l'adresse du compte, sans effet. */
export function FeuilleEnvoi(props: Props) {
  if (!props.visible) return null;
  return <Contenu {...props} />;
}
