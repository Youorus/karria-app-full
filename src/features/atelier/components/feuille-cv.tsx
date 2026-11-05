/**
 * La feuille : le CV (ou la lettre) rendu par le serveur, sous les doigts.
 *
 * ═══ Une WebView, une seule, jamais rechargée ═══
 *
 * Le premier HTML part en `source` ; chaque rendu suivant est **injecté**
 * (`__karria.remplacer`) : le corps et les styles changent, la page ne
 * repart pas de zéro, les polices restent chargées, le défilement reste —
 * pas de blanc, pas de saut (voir `services/script-feuille.ts`). Le patch
 * à la frappe passe par la même porte (`__karria.patcher`).
 *
 * ═══ Ce que la vue décide, et ce qu'elle ne décide pas ═══
 *
 * Elle affiche ce qu'on lui donne (`html`) et remonte deux faits : un
 * élément touché (`onToucher(chemin)`), le nombre de pages réel
 * (`onPages`). Quoi en faire — ouvrir un formulaire, relancer un rendu —
 * est au hook. Elle confie `patcher` et `choisir` par `onPoignee` (et non
 * par `ref`) : ce sont des gestes sur le document, pas de l'état React — et
 * le compilateur React traite tout ce qui passe par `ref` comme une
 * référence lue au rendu, jusque dans l'objet qui la porte.
 *
 * ═══ Le mode sombre, autour ═══
 *
 * Le fond de la WebView et celui injecté dans la page sont le fond de
 * Karria du mode courant ; la feuille `.page`, elle, reste blanche : c'est
 * du papier, et c'est ce qui sera imprimé.
 *
 * ═══ Pincer, défiler ═══
 *
 * Le zoom est celui du moteur (`viewport` : `user-scalable=yes`, ×4) —
 * avec son inertie et ses butées, que rien en JavaScript n'égale. Les
 * liens du CV ne naviguent pas : la feuille n'est pas un navigateur.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { PRIMAIRE, FOND } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import {
  codeDeChoix,
  codeDePatch,
  codeDeRemplacement,
  messageDepuis,
  preparerHtml,
  scriptDeLaFeuille,
} from "../services/script-feuille";

export interface FeuilleCvHandle {
  /** Met à jour le texte des éléments ancrés, tout de suite. */
  patcher: (patches: { chemin: string; texte: string }[]) => void;
  /** Met en lumière un élément (ou aucun). */
  choisir: (chemin: string | null) => void;
}

interface Props {
  /** Le HTML du dernier rendu. La feuille ne se monte qu'avec un premier rendu. */
  html: string;
  /** Reçoit les gestes sur le document au montage, `null` au démontage. */
  onPoignee: (poignee: FeuilleCvHandle | null) => void;
  onToucher: (chemin: string) => void;
  onPages?: (pages: number | null) => void;
  /** Vrai quand la page a dit « prêt » : la feuille s'affiche. */
  onPret?: () => void;
}

/** Les requêtes que la page a le droit de charger : elle-même, et notre stockage. */
const ORIGINE = "https://storage.karria.fr";

export function FeuilleCv({ html, onPoignee, onToucher, onPages, onPret }: Props) {
  const { mode } = useCouleurs();
  const habillage = { fond: FOND[mode], accent: PRIMAIRE[mode] };
  const webview = useRef<WebView>(null);
  // Le HTML du premier chargement, figé : changer `source` rechargerait tout.
  const [sourceInitiale] = useState(() => preparerHtml(html, habillage));
  const pret = useRef(false);
  const dernierHtml = useRef<string>(sourceInitiale);
  const cheminChoisi = useRef<string | null>(null);

  const injecter = useCallback((code: string) => {
    if (!pret.current) return;
    webview.current?.injectJavaScript(code);
  }, []);

  useEffect(() => {
    onPoignee({
      patcher: (patches) => {
        if (patches.length > 0) injecter(codeDePatch(patches));
      },
      choisir: (chemin) => {
        cheminChoisi.current = chemin;
        injecter(codeDeChoix(chemin));
      },
    });
    return () => onPoignee(null);
  }, [onPoignee, injecter]);

  // Premier HTML : la source. Suivants : remplacés dans la page, sans recharger.
  useEffect(() => {
    const prepare = preparerHtml(html, { fond: FOND[mode], accent: PRIMAIRE[mode] });
    if (prepare === dernierHtml.current) return;
    dernierHtml.current = prepare;
    injecter(codeDeRemplacement(prepare));
  }, [html, mode, injecter]);

  const surMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const message = messageDepuis(e.nativeEvent.data);
      if (message === null) return;
      if (message.type === "pret") {
        pret.current = true;
        onPret?.();
        // Un rendu arrivé pendant le chargement, ou un élément à remettre en lumière.
        if (dernierHtml.current !== sourceInitiale) {
          injecter(codeDeRemplacement(dernierHtml.current));
        }
        if (cheminChoisi.current !== null) injecter(codeDeChoix(cheminChoisi.current));
        return;
      }
      if (message.type === "toucher") {
        cheminChoisi.current = message.chemin;
        onToucher(message.chemin);
        return;
      }
      onPages?.(message.pages);
    },
    [onToucher, onPages, onPret, injecter, sourceInitiale],
  );

  return (
    <WebView
      ref={webview}
      // `baseUrl` sur notre stockage : les polices et la photo se chargent
      // comme depuis la même origine, sans dépendre d'en-têtes CORS.
      source={{ html: sourceInitiale, baseUrl: `${ORIGINE}/` }}
      originWhitelist={["*"]}
      injectedJavaScript={scriptDeLaFeuille()}
      onMessage={surMessage}
      onShouldStartLoadWithRequest={(requete) =>
        // La page elle-même, et rien d'autre : un lien du CV ne navigue pas.
        requete.url === "about:blank" ||
        requete.url.startsWith(`${ORIGINE}/`) ||
        requete.navigationType !== "click"
      }
      // Le fond du mode courant sous la page, pour qu'aucun blanc ne
      // paraisse pendant le chargement ou au-delà du contenu.
      style={{ flex: 1, backgroundColor: habillage.fond }}
      containerStyle={{ backgroundColor: habillage.fond }}
      scalesPageToFit
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      bounces={false}
      showsHorizontalScrollIndicator={false}
      allowsLinkPreview={false}
      javaScriptEnabled
      domStorageEnabled={false}
      textZoom={100}
      accessibilityLabel="Ton CV, tel qu'il sera exporté. Touche un élément pour le modifier."
    />
  );
}
