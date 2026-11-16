/**
 * L'aura derrière le fil, suspendue pendant que la liste défile.
 *
 * ═══ Pourquoi un composant à part ═══
 *
 * L'aura s'arrête au début de chaque geste et repart quand la liste se
 * pose. Tant que cet état vivait dans `EcranOffres`, chaque début et
 * chaque fin de défilement redessinaient **tout l'écran** — en-tête,
 * liste, bouton ✦ — pile au moment où le doigt bougeait : c'était
 * l'accroche ressentie au défilement. Ici, l'état ne touche que l'aura ;
 * l'écran la pilote par une référence (`suspendre`, `relacher`,
 * `reprendre`), sans se redessiner.
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";

import { Aura } from "@/components/aura";

/** Ce que l'écran peut demander à l'aura pendant le défilement. */
export interface PiloteAura {
  /** Le doigt pose la liste en mouvement : l'aura s'arrête. */
  suspendre: () => void;
  /** Le geste finit ; l'inertie peut prendre le relais, l'aura attend un peu. */
  relacher: () => void;
  /** La liste est posée : l'aura repart. */
  reprendre: () => void;
}

/** Après la fin du geste, le temps laissé à l'inertie pour prendre le relais. */
const ATTENTE_INERTIE_MS = 150;

interface Props {
  /** Faux quand un panneau couvre le fond (l'agent ouvert). */
  visible: boolean;
  ref?: Ref<PiloteAura>;
}

export function AuraDuFil({ visible, ref }: Props) {
  const [deplacement, setDeplacement] = useState(false);
  const reprise = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annuler = useCallback(() => {
    if (reprise.current !== null) clearTimeout(reprise.current);
    reprise.current = null;
  }, []);
  useEffect(() => annuler, [annuler]);

  useImperativeHandle(
    ref,
    () => ({
      suspendre: () => {
        annuler();
        setDeplacement(true);
      },
      relacher: () => {
        annuler();
        reprise.current = setTimeout(() => setDeplacement(false), ATTENTE_INERTIE_MS);
      },
      reprendre: () => {
        annuler();
        setDeplacement(false);
      },
    }),
    [annuler],
  );

  return <Aura visible={visible && !deplacement} />;
}
