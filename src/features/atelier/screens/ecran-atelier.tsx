/**
 * L'atelier — l'écran, c'est le CV.
 *
 * ═══ L'anatomie ═══
 *
 * - en haut : « ‹ Offre », le nom de l'entreprise et le poste en petit,
 *   annuler / rétablir à droite ; l'état d'enregistrement en un mot ;
 * - la note discrète de Karria, si elle a déjà appliqué quelque chose ;
 * - la feuille, pleine largeur, pincer pour zoomer, défiler les pages ;
 *   dessus, en haut à gauche, la **pastille du modèle** (« Meridian ·
 *   Changer ») qui rouvre « Avec quel modèle ? » à tout moment, la **pastille
 *   de la couleur** (un rond de la couleur, « Couleur ») qui ouvre « Quelle
 *   couleur ? », et à droite le nombre de pages ;
 * - la barre basse en capsule : Modifier · Karria · Mise en avant ·
 *   Intitulé · Finaliser.
 *
 * Pendant l'adaptation : l'attente immersive remplace la feuille (orbe,
 * phrase honnête, annonce native), puis la feuille arrive. En échec :
 * « Réessayer » ou « Continuer à la main ».
 *
 * Les feuilles basses sont montées une fois, ouvertes par l'état du hook.
 *
 * En mode **libre** (`/atelier/libre`, « Nouveau CV ») : le même écran sur le
 * CV de base, sans Karria ni note, et « Finaliser » mène droit aux exports.
 */

import { Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChargeurKarria } from "@/components/chargeur-karria";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { AttenteAdaptation } from "../components/attente-adaptation";
import { BarreAtelier } from "../components/barre-atelier";
import { FeuilleCouleur } from "../components/feuille-couleur";
import { FeuilleCv } from "../components/feuille-cv";
import { FeuilleIntitule } from "../components/feuille-intitule";
import { FeuilleKarria } from "../components/feuille-karria";
import { FeuilleMiseEnAvant } from "../components/feuille-mise-en-avant";
import { FeuilleUnePage } from "../components/feuille-une-page";
import { FeuilleModele } from "../components/feuille-modele";
import { FeuilleModifier } from "../components/feuille-modifier";
import { NoteKarria } from "../components/note-karria";
import { PastilleCouleur } from "../components/pastille-couleur";
import { PastilleModele } from "../components/pastille-modele";
import { useAtelier } from "../hooks/use-atelier";
import { useChoixModele } from "../hooks/use-choix-modele";
import { cleDeCible } from "../hooks/use-edition-element";
import { TEXTES } from "../services/presentation";

function BoutonRond({
  icone,
  libelle,
  onPress,
  desactive,
  retourne = false,
}: {
  icone: "retour" | "suivant";
  libelle: string;
  onPress: () => void;
  desactive: boolean;
  retourne?: boolean;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      hitSlop={6}
      className={`h-9 w-9 items-center justify-center rounded-full ${desactive ? "opacity-30" : ""}`}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={{ disabled: desactive }}
    >
      <Box className={retourne ? "-scale-x-100" : ""}>
        <Icone nom={icone} couleur={couleurs.texte} taille={16} graisse="semibold" />
      </Box>
    </Pressable>
  );
}

export function EcranAtelier({ libre = false }: { libre?: boolean }) {
  const couleurs = useCouleurs();
  const a = useAtelier(libre);
  const feuilleModifier = a.feuille?.type === "modifier" ? a.feuille : null;
  const choix = useChoixModele(
    a.feuille?.type === "modele",
    a.modeles,
    a.possedes,
    a.modeleId,
    a.choisirModele,
    a.couleur,
  );

  const attente =
    a.dossier !== null &&
    (a.dossier.adaptation === "en_cours" ||
      (a.dossier.adaptation === "echouee" && !a.continuerALaMain));

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <HStack className="items-center justify-between px-3 pb-1 pt-1">
          <Pressable
            onPress={a.retour}
            className="min-h-touch flex-1 flex-row items-center pr-3"
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Icone
              nom="retour"
              couleur={couleurs.primaire}
              taille={22}
              graisse="semibold"
            />
            <VStack className="flex-1">
              <Texte
                className="font-bold text-footnote text-foreground"
                numberOfLines={1}
              >
                {a.dossier?.offre.entreprise ?? TEXTES.nouveauCv}
              </Texte>
              <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
                {a.dossier?.offre.titre ?? TEXTES.nouveauCvSousTitre}
              </Texte>
            </VStack>
          </Pressable>
          <HStack className="items-center gap-1">
            {a.enregistrement === "fait" ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <HStack
                  className="items-center gap-1 pr-1"
                  accessibilityLiveRegion="polite"
                >
                  <Icone
                    nom="coche"
                    couleur={couleurs.succes}
                    taille={11}
                    graisse="bold"
                  />
                  <Texte className="text-caption text-success">Enregistré</Texte>
                </HStack>
              </Animated.View>
            ) : a.enregistrement === "erreur" ? (
              <Texte className="pr-1 text-caption text-destructive">Non enregistré</Texte>
            ) : null}
            <BoutonRond
              icone="retour"
              libelle="Annuler"
              onPress={a.annuler}
              desactive={!a.peutAnnuler}
            />
            <BoutonRond
              icone="retour"
              retourne
              libelle="Rétablir"
              onPress={a.retablir}
              desactive={!a.peutRetablir}
            />
          </HStack>
        </HStack>

        {a.note !== null && !attente ? (
          <NoteKarria
            texte={a.note.texte}
            occupee={a.decision !== null}
            onVoir={() => a.ouvrir({ type: "karria" })}
            onRevenir={() =>
              a.note?.propositions.forEach((p) => a.decider(p.id, "revenir"))
            }
            onFermer={a.fermerNote}
          />
        ) : null}

        {a.chargement ? (
          <Box className="flex-1 items-center justify-center">
            <ChargeurKarria />
          </Box>
        ) : a.erreur !== null || a.cv === null ? (
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message={
                a.erreur ??
                (a.libre
                  ? "Ton CV n'a pas pu être chargé."
                  : "Ce dossier n'a pas pu être chargé.")
              }
              action={a.retour}
              libelleAction="Revenir"
            />
          </Box>
        ) : attente && a.dossier !== null ? (
          <AttenteAdaptation
            etat={a.dossier.adaptation === "en_cours" ? "en_cours" : "echouee"}
            annonce={a.annonce}
            relance={a.relance}
            onReessayer={a.relancer}
            onContinuer={a.continuerSansKarria}
          />
        ) : (
          <Box style={{ flex: 1 }}>
            {a.html === null ? (
              <Box className="flex-1 items-center justify-center">
                <ChargeurKarria libelle="Karria met en page…" />
              </Box>
            ) : (
              <FeuilleCv
                onPoignee={a.poserFeuille}
                html={a.html}
                onToucher={a.toucher}
                onPages={a.surPages}
              />
            )}
            {a.erreurRendu !== null ? (
              <Box className="absolute left-4 right-4 top-2 rounded-carte bg-card px-4 py-2 shadow-sm">
                <Texte className="text-center text-footnote text-muted-foreground">
                  {a.erreurRendu}
                </Texte>
              </Box>
            ) : (
              <HStack
                className="absolute left-4 right-4 top-2 items-center justify-between"
                pointerEvents="box-none"
              >
                <HStack className="shrink items-center gap-2">
                  <PastilleModele
                    libelle={a.modele?.libelle ?? null}
                    onPress={() => a.ouvrir({ type: "modele" })}
                  />
                  <PastilleCouleur
                    couleur={a.couleur ?? a.couleurOrigine}
                    posee={a.couleur !== null}
                    onPress={() => a.ouvrir({ type: "couleur" })}
                  />
                </HStack>
              </HStack>
            )}
          </Box>
        )}
      </SafeAreaView>

      {!a.chargement && a.cv !== null && a.erreur === null && !attente ? (
        <BarreAtelier
          enAttente={a.enAttente}
          avecKarria={!a.libre}
          pages={a.erreurRendu === null ? a.pages : 1}
          onPages={() => a.ouvrir({ type: "une-page" })}
          onGeste={(geste) => {
            // « Finaliser » passe d'abord par la lettre (« Et ta lettre ? »),
            // qui mène à Finaliser ; on ne saute pas une étape du dossier.
            // Sans dossier, il n'y a pas de lettre : droit aux exports.
            if (geste === "finaliser") (a.libre ? a.allerAFinaliser : a.allerALaLettre)();
            else if (geste === "modifier") a.ouvrir({ type: "modifier", cible: null });
            else a.ouvrir({ type: geste });
          }}
        />
      ) : null}

      <FeuilleModifier
        key={cleDeCible(feuilleModifier?.cible ?? null)}
        visible={feuilleModifier !== null}
        cible={feuilleModifier?.cible ?? null}
        cv={a.cv}
        propositions={a.propositions}
        decision={a.decision}
        onSection={a.changerSection}
        onElement={a.changerElement}
        onChoisirCible={(cible) => a.ouvrir({ type: "modifier", cible })}
        onDecider={(p, d) => a.decider(p.id, d)}
        onFermer={a.fermer}
      />
      <FeuilleKarria
        visible={a.feuille?.type === "karria"}
        propositions={a.propositions}
        couverture={a.dossier?.couverture ?? null}
        decision={a.decision}
        onDecider={(p, d) => a.decider(p.id, d)}
        onToutAccepter={a.toutAccepter}
        onFermer={a.fermer}
      />
      <FeuilleMiseEnAvant
        visible={a.feuille?.type === "mise-en-avant"}
        cv={a.cv}
        miseEnAvant={a.miseEnAvant}
        onFermer={a.fermer}
      />
      <FeuilleUnePage
        visible={a.feuille?.type === "une-page"}
        cv={a.cv}
        pages={a.pages}
        miseEnAvant={a.miseEnAvant}
        onFermer={a.fermer}
      />
      <FeuilleIntitule
        visible={a.feuille?.type === "intitule"}
        titre={a.cv?.identite?.titre ?? null}
        onApercu={(t) => a.apercu("identity.headline", t)}
        onEnregistrer={a.changerIntitule}
        onFermer={() => {
          a.apercu("identity.headline", a.cv?.identite?.titre ?? "");
          a.fermer();
        }}
      />
      <FeuilleModele
        visible={a.feuille?.type === "modele"}
        choix={choix}
        modeleId={a.modeleId}
        onFermer={a.garderModele}
      />
      <FeuilleCouleur
        visible={a.feuille?.type === "couleur"}
        couleur={a.couleur}
        origine={a.couleurOrigine}
        onChoisir={a.choisirCouleur}
        onFermer={a.garderCouleur}
      />
    </Box>
  );
}
