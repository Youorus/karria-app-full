/**
 * La frontière d'erreur de l'application : ce qu'on voit quand un écran
 * lève une erreur au rendu.
 *
 * ═══ Pourquoi elle existe ═══
 *
 * Sans elle, une erreur de rendu non rattrapée démonte l'arbre React
 * entier : en version de production, il ne reste que le fond — un écran
 * **noir**, sans message, dont on ne sort qu'en tuant l'application. C'est
 * ce que Marc a vu dans l'onglet Profil (2026-11-04). En développement, la
 * boîte rouge masquait le phénomène.
 *
 * Elle ne corrige aucune cause : elle garantit qu'une cause **se voit** —
 * le message technique est affiché, petit, pour qu'un essai sur appareil
 * puisse le rapporter — et qu'on peut repartir sans tuer l'application.
 *
 * ═══ Une classe, par obligation ═══
 *
 * React n'offre les frontières d'erreur qu'aux composants de classe
 * (`getDerivedStateFromError`). C'est la seule classe du dépôt, et c'est
 * pour cela.
 *
 * ═══ Posée sous les fournisseurs ═══
 *
 * Elle est montée dans `app/_layout.tsx`, sous le thème et le fond : elle
 * doit pouvoir lire ses classes pour dessiner son propre écran.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

import { BoutonAction } from "@/components/bouton-action";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

interface Props {
  children: ReactNode;
}

interface Etat {
  erreur: Error | null;
}

export class FrontiereErreur extends Component<Props, Etat> {
  state: Etat = { erreur: null };

  static getDerivedStateFromError(erreur: Error): Etat {
    return { erreur };
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    // La cause reste dans le journal, avec l'arbre où elle est née :
    // c'est ce qu'on lit sur l'appareil branché quand l'écran a noirci.
    console.error("[karria] erreur de rendu rattrapée", erreur, info.componentStack);
  }

  // Remonter les enfants depuis zéro : l'état qui a provoqué l'erreur est
  // le plus souvent transitoire (une session qui change, une liste qui se
  // reconfigure).
  repartir = () => this.setState({ erreur: null });

  render() {
    const { erreur } = this.state;
    if (erreur === null) return this.props.children;

    return (
      <Box style={{ flex: 1 }} className="justify-center bg-background px-6">
        <VStack className="gap-3">
          <Texte
            accessibilityRole="header"
            className="font-display text-title text-foreground"
          >
            Karria a trébuché.
          </Texte>
          <Texte className="text-body leading-6 text-muted-foreground">
            {
              "Un écran n'a pas pu s'afficher. Rien n'est perdu : reprends, et si ça se reproduit, dis-le à l'équipe."
            }
          </Texte>
          <Texte className="text-caption text-foreground-faint" selectable>
            {erreur.message}
          </Texte>
          <Box className="pt-3">
            <BoutonAction libelle="Reprendre" onPress={this.repartir} />
          </Box>
        </VStack>
      </Box>
    );
  }
}
