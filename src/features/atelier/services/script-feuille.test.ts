import { describe, expect, it } from "@jest/globals";

import {
  codeDePatch,
  messageDepuis,
  preparerHtml,
  scriptDeLaFeuille,
} from "./script-feuille";

const habillage = { fond: "#0e0d0c", accent: "#1877f2" };

describe("le HTML préparé pour l'atelier", () => {
  it("pose le viewport et le style juste après <head>", () => {
    const html = preparerHtml(
      '<!doctype html><html><head><title>fit</title></head><body><div class="page"></div></body></html>',
      habillage,
    );
    const tete = html.indexOf("<head>") + "<head>".length;
    expect(html.slice(tete)).toMatch(/^<meta name="viewport" content="width=826/);
    expect(html).toContain("background: #0e0d0c");
    expect(html).toContain(".karria-touche");
    expect(html.indexOf("<title>")).toBeGreaterThan(html.indexOf("data-karria"));
  });

  it("enveloppe un fragment sans <head>", () => {
    const html = preparerHtml('<div class="page">x</div>', habillage);
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<div class="page">x</div>');
  });
});

describe("les messages", () => {
  it("lit un toucher et un ajustement, ignore le reste", () => {
    expect(messageDepuis('{"type":"toucher","chemin":"summary"}')).toEqual({
      type: "toucher",
      chemin: "summary",
    });
    expect(messageDepuis('{"type":"ajuste","pages":2}')).toEqual({
      type: "ajuste",
      pages: 2,
    });
    expect(messageDepuis('{"type":"ajuste","pages":"x"}')).toEqual({
      type: "ajuste",
      pages: null,
    });
    expect(messageDepuis('{"type":"toucher"}')).toBeNull();
    expect(messageDepuis("pas du json")).toBeNull();
  });

  it("fabrique un patch qui tient dans une chaîne JavaScript", () => {
    const code = codeDePatch([{ chemin: "summary", texte: "L'« à propos »" }]);
    expect(code).toContain('"chemin":"summary"');
    expect(code).toMatch(/true;$/);
  });

  it("le script expose l'API attendue", () => {
    const script = scriptDeLaFeuille();
    for (const nom of ["patcher", "remplacer", "choisir", "data-chemin", "karriaFit"]) {
      expect(script).toContain(nom);
    }
  });
});
