/**
 * Les paramètres — l'écran « Réglages » de la V1, derrière la roue du
 * profil.
 *
 * ═══ L'ordre des sections ═══
 *
 * Ce qu'on touche souvent en haut (l'apparence, les notifications), ce
 * qu'on lit une fois au milieu (les documents, la version), ce qu'on fait
 * rarement et qu'on regrette parfois en bas (se déconnecter, supprimer).
 * La suppression est une ligne rouge sans chevron, la dernière : visible,
 * jamais sous le pouce par hasard.
 *
 * ═══ L'apparence ═══
 *
 * Le sélecteur à trois positions de la V1 (Sombre / Clair / Système),
 * avec une icône par position. La bascule est immédiate — c'est le
 * fournisseur de thème qui l'applique à toute l'application.
 */

import { Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone, type NomIcone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { PermissionPush } from "@/features/notifications/types/appareils.types";
import type { Theme } from "@/theme/preference";
import { useCouleurs } from "@/theme/use-couleurs";

import { GroupeReglages, LigneReglage } from "../components/ligne-reglage";
import { useParametres } from "../hooks/use-parametres";

const APPARENCES: { valeur: Theme; libelle: string; icone: NomIcone }[] = [
  { valeur: "sombre", libelle: "Sombre", icone: "lune" },
  { valeur: "clair", libelle: "Clair", icone: "soleil" },
  { valeur: "systeme", libelle: "Système", icone: "appareil" },
];

/** Ce que dit la ligne des notifications, et ce qu'on peut y faire. */
const NOTIFICATIONS: Record<PermissionPush, { etat: string; action: string }> = {
  granted: { etat: "Activées", action: "Régler" },
  denied: { etat: "Désactivées dans les réglages du téléphone", action: "Ouvrir" },
  undetermined: { etat: "Pas encore activées", action: "Activer" },
};

export function EcranParametres() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const {
    theme,
    changerTheme,
    notifications,
    gererNotifications,
    choixPublicitaires,
    gererChoixPublicitaires,
    lire,
    seDeconnecter,
    supprimerLeCompte,
    retour,
    version,
  } = useParametres();

  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(360).delay(60 + rang * 60);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour retour="Profil" onRetour={retour} />
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-10 pt-1"
          showsVerticalScrollIndicator={false}
        >
          <Texte
            accessibilityRole="header"
            className="font-display text-title-lg tracking-tighter text-foreground"
          >
            Paramètres
          </Texte>

          <Animated.View entering={entree(0)}>
            <VStack className="gap-2">
              <Texte className="px-1 font-bold text-caption uppercase tracking-wide text-foreground-faint">
                Apparence
              </Texte>
              <HStack className="rounded-carte border border-border-subtle bg-card p-1.5">
                {APPARENCES.map((a) => {
                  const choisi = theme === a.valeur;
                  return (
                    <Pressable
                      key={a.valeur}
                      onPress={() => changerTheme(a.valeur)}
                      className={`min-h-touch flex-1 items-center justify-center gap-1 rounded-tuile py-2 ${
                        choisi ? "bg-primary" : ""
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={`Apparence ${a.libelle}`}
                      accessibilityState={{ selected: choisi }}
                    >
                      <Icone
                        nom={a.icone}
                        couleur={choisi ? couleurs.surPrimaire : couleurs.estompe}
                        taille={17}
                      />
                      <Texte
                        className={`font-bold text-footnote ${
                          choisi ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {a.libelle}
                      </Texte>
                    </Pressable>
                  );
                })}
              </HStack>
            </VStack>
          </Animated.View>

          <Animated.View entering={entree(1)}>
            <GroupeReglages titre="Notifications">
              <LigneReglage
                icone={notifications === "denied" ? "clocheBarree" : "cloche"}
                titre="Notifications"
                detail={
                  notifications === null ? "Lecture…" : NOTIFICATIONS[notifications].etat
                }
                action={
                  notifications === null ? null : NOTIFICATIONS[notifications].action
                }
                onPress={notifications === null ? undefined : gererNotifications}
              />
            </GroupeReglages>
          </Animated.View>

          <Animated.View entering={entree(2)}>
            <GroupeReglages titre="À propos">
              <LigneReglage
                icone="dossiers"
                titre="Conditions d'utilisation"
                onPress={() => lire("conditions")}
              />
              <LigneReglage
                icone="bouclier"
                titre="Politique de confidentialité"
                onPress={() => lire("confidentialite")}
              />
              {choixPublicitaires ? (
                <LigneReglage
                  icone="bouclier"
                  titre="Choix publicitaires"
                  detail="Ce que les annonces peuvent utiliser."
                  onPress={gererChoixPublicitaires}
                />
              ) : null}
              <LigneReglage icone="info" titre="Version" detail={`Karria v${version}`} />
            </GroupeReglages>
          </Animated.View>

          <Animated.View entering={entree(3)}>
            <GroupeReglages titre="Compte">
              <LigneReglage
                icone="deconnexion"
                titre="Se déconnecter"
                detail="Tes données restent, tu te reconnectes quand tu veux."
                onPress={seDeconnecter}
              />
              <LigneReglage
                icone="corbeille"
                titre="Supprimer mon compte"
                detail="Définitif. On te demande d'abord pourquoi."
                onPress={supprimerLeCompte}
                ton="destructif"
              />
            </GroupeReglages>
          </Animated.View>

          <Animated.View entering={entree(4)}>
            <Texte className="pt-2 text-center text-footnote text-foreground-faint">
              Fait avec ❤️ pour booster ta carrière
            </Texte>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}
