/**
 * La matière de l'orbe : ce que les écrans supposent d'elle.
 *
 * Le nombre de particules reste dans ses bornes quelle que soit la
 * taille, la déformation ne fait jamais sortir une particule de son
 * enveloppe, et la roue chromatique couvre bien tout le spectre.
 */

import { describe, expect, it } from "@jest/globals";

import {
  PARTICULES_MAX,
  PARTICULES_MIN,
  deplacer,
  nombreDeParticules,
  roueChromatique,
  semerLesParticules,
  versComposantes,
} from "./orbe-particules";

describe("Le nombre de particules", () => {
  it("croît avec la surface, entre le plancher et le plafond", () => {
    expect(nombreDeParticules(16, "ios", 3)).toBe(PARTICULES_MIN);
    expect(nombreDeParticules(60, "ios", 3)).toBe(900);
    expect(nombreDeParticules(120, "ios", 3)).toBe(PARTICULES_MAX);
  });

  it("en donne moins à un appareil moyen, et bien moins à un appareil modeste", () => {
    expect(nombreDeParticules(120, "ios", 3, "moyen")).toBe(1_400);
    expect(nombreDeParticules(120, "ios", 3, "bas")).toBe(600);
    expect(nombreDeParticules(60, "ios", 3, "bas")).toBe(315);
    expect(nombreDeParticules(16, "android", 2, "bas")).toBe(PARTICULES_MIN);
  });

  it("en donne moins à Android, et encore moins à un écran peu dense", () => {
    expect(nombreDeParticules(60, "android", 3)).toBeLessThan(
      nombreDeParticules(60, "ios", 3),
    );
    expect(nombreDeParticules(60, "android", 2)).toBeLessThan(
      nombreDeParticules(60, "android", 3),
    );
  });
});

describe("La graine", () => {
  it("pose chaque particule sur la sphère unité, les satellites au-delà", () => {
    const g = semerLesParticules(500);
    expect(g.x).toHaveLength(500);
    for (let i = 0; i < 500; i += 1) {
      const norme = Math.hypot(g.x[i] ?? 0, g.y[i] ?? 0, g.z[i] ?? 0);
      expect(norme).toBeCloseTo(1, 5);
      expect(g.rayon[i]).toBeGreaterThanOrEqual(1);
    }
    expect(g.rayon.filter((r) => r > 1)).toHaveLength(60);
  });

  it("est déterministe : deux orbes de même taille sont jumelles", () => {
    expect(semerLesParticules(50)).toEqual(semerLesParticules(50));
  });
});

describe("Le déplacement", () => {
  it("garde chaque particule dans son enveloppe, à tout instant", () => {
    const g = semerLesParticules(300);
    const amplitude = 0.12;
    for (let t = 0; t < 40; t += 0.37) {
      for (let i = 0; i < 300; i += 1) {
        const p = deplacer(g, i, t, amplitude);
        const orbite = g.rayon[i] ?? 1;
        const distance = Math.hypot(p.x, p.y, p.profondeur);
        // Pour une particule de surface, la profondeur n'est pas mise à
        // l'échelle : la distance projetée reste sous le rayon gonflé.
        expect(distance).toBeLessThanOrEqual(orbite * (1 + 1.6 * amplitude) + 0.06);
        // La dérive verticale (± 0,05) peut faire effleurer la profondeur
        // au-delà de 1 : c'est la seule tolérance admise.
        expect(Math.abs(p.profondeur)).toBeLessThanOrEqual(1.06);
      }
    }
  });

  it("bouge : deux instants donnent deux positions", () => {
    const g = semerLesParticules(10);
    expect(deplacer(g, 3, 0, 0.08)).not.toEqual(deplacer(g, 3, 1, 0.08));
  });
});

describe("La roue chromatique", () => {
  it("couvre 360° et se referme sur sa première teinte", () => {
    const roue = roueChromatique(12);
    expect(roue).toHaveLength(13);
    expect(roue[0]).toBe("hsl(0, 100%, 62%)");
    expect(roue[6]).toBe("hsl(180, 100%, 62%)");
    expect(roue[12]).toBe(roue[0]);
  });
});

describe("Les composantes d'une couleur", () => {
  it("lit un hexadécimal long ou court", () => {
    expect(versComposantes("#1e90ff")).toEqual([30 / 255, 144 / 255, 1]);
    expect(versComposantes("#fff")).toEqual([1, 1, 1]);
  });
});
