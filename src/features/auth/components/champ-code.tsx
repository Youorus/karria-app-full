/**
 * La saisie du code à six chiffres.
 *
 * ═══ Un seul champ, six cases dessinées ═══
 *
 * Six vrais champs seraient une erreur : le clavier se referme entre
 * chacun, le collage d'un code copié ne remplit que la première case, et
 * la correction oblige à revenir case par case. Ici il n'y a **qu'un**
 * champ, rendu invisible, et six cases qui affichent son contenu. Le
 * collage marche, la touche retour marche, et la suggestion du code reçu
 * par e-mail — que le système propose au-dessus du clavier — remplit tout
 * d'un geste.
 *
 * ═══ Le champ ne valide rien ═══
 *
 * Il remonte des chiffres, six au plus. C'est l'écran du code qui décide
 * d'envoyer au sixième (`ecran-code.tsx`) : un champ de saisie qui
 * appellerait le serveur ne se réutiliserait nulle part.
 *
 * ═══ Deux libellés, et pourquoi ═══
 *
 * Le conteneur est nommé pour qu'un lecteur d'écran annonce ce qu'on
 * attend et ce qui est saisi. Le champ réel l'est aussi (A26) : c'est lui
 * qui reçoit le focus du clavier, et un champ sans nom est annoncé
 * « champ de texte » tout court sur Android.
 */

import { useRef, useState } from "react";
import { Pressable, TextInput } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Texte } from "@/components/texte";
import { contourDeChamp } from "@/components/contour-champ";

const LONGUEUR = 6;

export function ChampCode({
  valeur,
  onChange,
  erreur = false,
  editable = true,
}: {
  valeur: string;
  onChange: (code: string) => void;
  erreur?: boolean;
  editable?: boolean;
}) {
  const champ = useRef<TextInput>(null);
  const [actif, setActif] = useState(false);

  const cases = Array.from({ length: LONGUEUR }, (_, rang) => valeur[rang] ?? "");
  const rangCourant = Math.min(valeur.length, LONGUEUR - 1);

  return (
    <Pressable
      onPress={() => champ.current?.focus()}
      accessibilityRole="none"
      // Le champ réel est invisible : sans ce libellé, un lecteur d'écran
      // n'annoncerait que six cases vides sans dire ce qu'on y met.
      accessibilityLabel={`Code de vérification à ${LONGUEUR} chiffres`}
      accessibilityValue={{
        text: valeur.length === 0 ? "vide" : valeur.split("").join(" "),
      }}
    >
      <HStack space="sm" className="justify-between">
        {cases.map((chiffre, rang) => {
          const vise = actif && rang === rangCourant;
          const contour = contourDeChamp({ actif: vise, erreur });
          return (
            <Box
              // Les cases sont une position, pas une donnée : leur rang est
              // une clé stable, contrairement au chiffre qui s'y trouve.
              key={rang}
              className={`h-champ flex-1 items-center justify-center rounded-champ bg-card ${contour}`}
            >
              {/* Un tiret plutôt qu'un vide : six cadres nus ne disent
                  pas qu'on attend un chiffre par case, et l'on tape
                  parfois tout dans le premier. */}
              <Texte
                className={
                  chiffre === ""
                    ? "text-title text-foreground-faint"
                    : "font-bold text-title text-foreground"
                }
              >
                {chiffre === "" ? "–" : chiffre}
              </Texte>
            </Box>
          );
        })}
      </HStack>

      <TextInput
        ref={champ}
        value={valeur}
        onChangeText={(saisie) => onChange(saisie.replace(/\D/g, "").slice(0, LONGUEUR))}
        onFocus={() => setActif(true)}
        onBlur={() => setActif(false)}
        editable={editable}
        accessibilityLabel={`Code de vérification à ${LONGUEUR} chiffres`}
        keyboardType="number-pad"
        // Ce que le système lit dans l'e-mail pour proposer le code
        // au-dessus du clavier. Sans lui, il faut basculer d'application.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LONGUEUR}
        // Invisible mais présent : `display: none` le retirerait de
        // l'arbre natif et le clavier ne s'ouvrirait plus.
        className="absolute h-full w-full opacity-0"
        caretHidden
      />
    </Pressable>
  );
}
