/**
 * Ce que l'app injecte dans la page rendue, et comment elle lui parle.
 *
 * ═══ Le HTML est préparé avant d'entrer dans la WebView ═══
 *
 * `preparerHtml` pose dans `<head>` une balise `viewport` et une feuille de
 * style de l'atelier : le fond de Karria autour de la page, l'ombre de la
 * feuille, la mise en lumière de l'élément touché. Avant le chargement, pas
 * après : sinon la page apparaît d'abord blanche et nue, puis saute.
 *
 * ═══ Le viewport fait l'échelle ═══
 *
 * La page fait 210 mm de large (794 px). Déclarer `width=826` dans le
 * viewport demande au moteur de dessiner 826 px logiques dans la largeur
 * de l'écran : la page A4 tient entière, et **pincer pour zoomer** est
 * celui du système (jusqu'à ×4), avec son inertie et ses butées — rien à
 * réécrire en JavaScript, rien à mesurer.
 *
 * ═══ Remplacer sans recharger ═══
 *
 * Le rendu au repos n'est pas rechargé (`source` changerait, la page
 * repartirait de zéro, blanc compris) : on parse le nouveau document, on
 * remplace le corps et les styles, puis on **rejoue les scripts** de la
 * page (un script posé par `innerHTML` ne s'exécute pas) — c'est lui qui
 * calcule l'ajustement et pose `window.karriaFit`. Les polices restent
 * chargées, le défilement reste où il est. C'est ce choix, plutôt que deux
 * WebView en fondu : une seule page en mémoire, et rien à synchroniser.
 *
 * Le HTML inséré est celui que **notre** API a rendu : le même que celui
 * chargé en `source` au départ, dans une WebView sans cookie ni session,
 * isolée de l'app (seul `postMessage` en sort). Y insérer du HTML n'ouvre
 * rien de plus que le chargement initial.
 *
 * ═══ Les messages ═══
 *
 * La page → l'app : `{ type: "toucher", chemin }` quand on touche un
 * élément ancré, `{ type: "ajuste", pages }` quand l'ajustement est fait.
 * L'app → la page : `window.__karria.patcher([...])`, `remplacer(html)`,
 * `choisir(chemin)`. Ce fichier ne fait que fabriquer les chaînes : pur,
 * testable.
 */

export const LARGEUR_PAGE_PX = 794;
const MARGE_PX = 16;
export const LARGEUR_VIEWPORT = LARGEUR_PAGE_PX + MARGE_PX * 2;

export interface Habillage {
  /** Le fond de Karria, autour de la feuille (`FOND[mode]`). */
  fond: string;
  /** La couleur d'action, pour l'élément touché (`PRIMAIRE[mode]`). */
  accent: string;
}

export type MessageFeuille =
  | { type: "toucher"; chemin: string }
  | { type: "ajuste"; pages: number | null }
  | { type: "pret" };

function styleAtelier(h: Habillage): string {
  return `
<style data-karria="atelier">
  html { background: ${h.fond}; -webkit-text-size-adjust: 100%; }
  body { margin: 0; padding: ${MARGE_PX}px 0 ${MARGE_PX * 2}px; background: ${h.fond}; display: flex; flex-direction: column; align-items: center; }
  .page { box-shadow: 0 12px 40px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.08); margin: 0 ${MARGE_PX}px; }
  [data-chemin] { cursor: pointer; border-radius: 3px; transition: background-color .15s ease-out, box-shadow .15s ease-out; -webkit-tap-highlight-color: transparent; }
  [data-chemin].karria-touche { background-color: ${h.accent}22; box-shadow: 0 0 0 4px ${h.accent}22; }
</style>`;
}

const META_VIEWPORT = `<meta name="viewport" content="width=${LARGEUR_VIEWPORT}, minimum-scale=0.1, maximum-scale=4, user-scalable=yes">`;

/** Le HTML du serveur, habillé pour l'atelier. */
export function preparerHtml(html: string, habillage: Habillage): string {
  const insertion = `${META_VIEWPORT}${styleAtelier(habillage)}`;
  const tete = /<head[^>]*>/i.exec(html);
  if (tete !== null) {
    const fin = tete.index + tete[0].length;
    return `${html.slice(0, fin)}${insertion}${html.slice(fin)}`;
  }
  return `<!doctype html><html><head>${insertion}</head><body>${html}</body></html>`;
}

/** Le script posé après le premier chargement : l'API de la page. */
export function scriptDeLaFeuille(): string {
  return `(function () {
  if (window.__karria) return true;
  var rn = window.ReactNativeWebView;
  function envoyer(m) { if (rn) rn.postMessage(JSON.stringify(m)); }
  var choisi = null;
  function marquer(chemin) {
    var anciens = document.querySelectorAll('.karria-touche');
    for (var i = 0; i < anciens.length; i++) anciens[i].classList.remove('karria-touche');
    choisi = chemin;
    if (!chemin) return;
    var cibles = document.querySelectorAll('[data-chemin="' + chemin + '"]');
    for (var j = 0; j < cibles.length; j++) cibles[j].classList.add('karria-touche');
  }
  function ajuste() {
    var fin = function () {
      requestAnimationFrame(function () {
        var fit = window.karriaFit;
        envoyer({ type: 'ajuste', pages: fit && typeof fit.pages === 'number' ? fit.pages : null });
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fin, fin); else fin();
  }
  document.addEventListener('click', function (e) {
    var cible = e.target && e.target.closest ? e.target.closest('[data-chemin]') : null;
    if (!cible) return;
    e.preventDefault();
    var chemin = cible.getAttribute('data-chemin');
    marquer(chemin);
    envoyer({ type: 'toucher', chemin: chemin });
  }, true);
  window.__karria = {
    patcher: function (patches) {
      for (var i = 0; i < patches.length; i++) {
        var els = document.querySelectorAll('[data-chemin="' + patches[i].chemin + '"]');
        for (var j = 0; j < els.length; j++) els[j].textContent = patches[i].texte;
      }
    },
    choisir: marquer,
    remplacer: function (html) {
      var y = window.scrollY;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var styles = document.head.querySelectorAll('style:not([data-karria]), link[rel="stylesheet"]');
      for (var i = 0; i < styles.length; i++) styles[i].remove();
      var neufs = doc.head.querySelectorAll('style, link[rel="stylesheet"]');
      for (var k = 0; k < neufs.length; k++) {
        if (neufs[k].getAttribute('data-karria')) continue;
        document.head.appendChild(document.importNode(neufs[k], true));
      }
      document.body.innerHTML = doc.body.innerHTML;
      var scripts = doc.querySelectorAll('script');
      for (var s = 0; s < scripts.length; s++) {
        var script = document.createElement('script');
        if (scripts[s].src) script.src = scripts[s].src; else script.textContent = scripts[s].textContent;
        document.body.appendChild(script);
      }
      window.scrollTo(0, y);
      marquer(choisi);
      ajuste();
    }
  };
  envoyer({ type: 'pret' });
  ajuste();
  return true;
})();`;
}

/** Le code d'un patch local, à injecter. */
export function codeDePatch(patches: { chemin: string; texte: string }[]): string {
  return `window.__karria && window.__karria.patcher(${JSON.stringify(patches)}); true;`;
}

/** Le code d'un remplacement du document, à injecter. */
export function codeDeRemplacement(html: string): string {
  return `window.__karria && window.__karria.remplacer(${JSON.stringify(html)}); true;`;
}

export function codeDeChoix(chemin: string | null): string {
  return `window.__karria && window.__karria.choisir(${JSON.stringify(chemin)}); true;`;
}

/** Un message de la page, ou `null` s'il n'en a pas la forme. */
export function messageDepuis(brut: string): MessageFeuille | null {
  try {
    const m: unknown = JSON.parse(brut);
    if (typeof m !== "object" || m === null) return null;
    const type = (m as { type?: unknown }).type;
    if (type === "toucher") {
      const chemin = (m as { chemin?: unknown }).chemin;
      return typeof chemin === "string" && chemin !== "" ? { type, chemin } : null;
    }
    if (type === "ajuste") {
      const pages = (m as { pages?: unknown }).pages;
      return { type, pages: typeof pages === "number" && pages > 0 ? pages : null };
    }
    if (type === "pret") return { type };
    return null;
  } catch {
    return null;
  }
}
