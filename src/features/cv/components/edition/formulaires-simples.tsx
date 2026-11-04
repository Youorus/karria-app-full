/**
 * Les formulaires d'une seule valeur : identité, coordonnées, à propos.
 *
 * Contrôlés : la valeur vient du hook, chaque frappe remonte par
 * `onChange`. Rien n'est calculé ici — le hook garde le brouillon et juge
 * (`validation-edition.ts`), le serveur revalide. Les erreurs arrivent par
 * champ (`erreurs.prenom`, `erreurs["liens.0.url"]`…), déjà traduites en
 * noms français par le hook. Le poste visé et la ville proposent ce que
 * l'index connaît (`ChampAvecSuggestions`).
 */

import { Pressable } from "react-native";

import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Contact, Identite, Lien, Presentation } from "../../types/cv.types";
import { ChampAvecSuggestions } from "./champ-avec-suggestions";
import { ChampMultiligne } from "./champ-multiligne";

type Erreurs = Record<string, string>;

export function FormulaireIdentite({
  valeur,
  onChange,
  erreurs,
}: {
  valeur: Identite;
  onChange: (v: Identite) => void;
  erreurs: Erreurs;
}) {
  return (
    <VStack className="gap-4">
      <ChampTexte
        libelle="Prénom"
        value={valeur.prenom}
        onChangeText={(prenom) => onChange({ ...valeur, prenom })}
        erreur={erreurs.prenom}
        autoCapitalize="words"
        textContentType="givenName"
        returnKeyType="next"
      />
      <ChampTexte
        libelle="Nom"
        value={valeur.nom}
        onChangeText={(nom) => onChange({ ...valeur, nom })}
        erreur={erreurs.nom}
        autoCapitalize="words"
        textContentType="familyName"
        returnKeyType="next"
      />
      <ChampAvecSuggestions
        kind="title"
        libelle="Poste visé"
        aide="Affiché sous ton nom. Ex. : Conseillère de vente."
        value={valeur.titre ?? ""}
        onChangeText={(titre) =>
          onChange({ ...valeur, titre: titre === "" ? null : titre })
        }
        erreur={erreurs.titre}
        autoCapitalize="sentences"
        returnKeyType="done"
      />
    </VStack>
  );
}

function LigneLien({
  lien,
  erreurLibelle,
  erreurUrl,
  onChange,
  onSupprimer,
}: {
  lien: Lien;
  erreurLibelle?: string;
  erreurUrl?: string;
  onChange: (l: Lien) => void;
  onSupprimer: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <VStack className="gap-2 rounded-carte border border-border-subtle bg-card p-3">
      <HStack className="items-center justify-between">
        <Texte className="font-bold text-footnote text-foreground">Lien</Texte>
        <Pressable
          onPress={onSupprimer}
          className="h-9 w-9 items-center justify-center rounded-full"
          accessibilityRole="button"
          accessibilityLabel="Retirer ce lien"
        >
          <Icone nom="corbeille" couleur={couleurs.destructif} taille={15} />
        </Pressable>
      </HStack>
      <ChampTexte
        libelle=""
        placeholder="Libellé (LinkedIn, Portfolio…)"
        accessibilityLabel="Libellé du lien"
        value={lien.libelle}
        onChangeText={(libelle) => onChange({ ...lien, libelle })}
        erreur={erreurLibelle}
        autoCapitalize="words"
      />
      <ChampTexte
        libelle=""
        placeholder="https://…"
        accessibilityLabel="Adresse du lien"
        value={lien.url}
        onChangeText={(url) => onChange({ ...lien, url })}
        erreur={erreurUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        textContentType="URL"
      />
    </VStack>
  );
}

export function FormulaireContact({
  valeur,
  onChange,
  erreurs,
}: {
  valeur: Contact;
  onChange: (v: Contact) => void;
  erreurs: Erreurs;
}) {
  const couleurs = useCouleurs();
  const vide = (t: string) => (t.trim() === "" ? null : t);
  return (
    <VStack className="gap-4">
      <ChampTexte
        libelle="Téléphone"
        value={valeur.telephone ?? ""}
        onChangeText={(t) => onChange({ ...valeur, telephone: vide(t) })}
        erreur={erreurs.telephone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        returnKeyType="next"
      />
      <ChampTexte
        libelle="E-mail"
        value={valeur.email ?? ""}
        onChangeText={(t) => onChange({ ...valeur, email: vide(t) })}
        erreur={erreurs.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <ChampAvecSuggestions
        kind="city"
        libelle="Ville"
        value={valeur.ville ?? ""}
        onChangeText={(t) => onChange({ ...valeur, ville: vide(t) })}
        erreur={erreurs.ville}
        autoCapitalize="words"
        textContentType="addressCity"
        returnKeyType="done"
      />
      <VStack className="gap-3">
        <Texte className="font-bold text-footnote text-foreground">Liens</Texte>
        {valeur.liens.map((lien, i) => (
          <LigneLien
            key={i}
            lien={lien}
            erreurLibelle={erreurs[`liens.${i}.libelle`]}
            erreurUrl={erreurs[`liens.${i}.url`]}
            onChange={(l) =>
              onChange({
                ...valeur,
                liens: valeur.liens.map((x, j) => (j === i ? l : x)),
              })
            }
            onSupprimer={() =>
              onChange({ ...valeur, liens: valeur.liens.filter((_, j) => j !== i) })
            }
          />
        ))}
        {erreurs.liens ? (
          <Texte className="text-footnote text-destructive">{erreurs.liens}</Texte>
        ) : null}
        {valeur.liens.length < 10 ? (
          <Pressable
            onPress={() =>
              onChange({ ...valeur, liens: [...valeur.liens, { libelle: "", url: "" }] })
            }
            className="min-h-touch flex-row items-center gap-2"
            accessibilityRole="button"
          >
            <Icone
              nom="ajouter"
              couleur={couleurs.primaire}
              taille={15}
              graisse="semibold"
            />
            <Texte className="font-bold text-footnote text-primary">
              Ajouter un lien
            </Texte>
          </Pressable>
        ) : null}
      </VStack>
    </VStack>
  );
}

export function FormulairePresentation({
  valeur,
  onChange,
  erreurs,
}: {
  valeur: Presentation;
  onChange: (v: Presentation) => void;
  erreurs: Erreurs;
}) {
  return (
    <ChampMultiligne
      libelle="À propos"
      aide="Trois à cinq phrases, à la première personne. Vide, la rubrique disparaît du CV."
      lignes={7}
      value={valeur.texte}
      onChangeText={(texte) => onChange({ texte })}
      erreur={erreurs.texte}
      maxLength={1500}
      autoCapitalize="sentences"
    />
  );
}
