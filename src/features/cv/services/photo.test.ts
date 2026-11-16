/**
 * Les messages de l'amélioration de photo (`photo.ts`) : chaque raison du
 * serveur a son mot humain, sans jargon, et dit quoi faire.
 */

import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import {
  dateDeRetour,
  mentionPortraits,
  messageDAmelioration,
  TEXTES_PHOTO,
} from "./photo";

describe("Le message d'une amélioration en échec", () => {
  it("distingue un refus (changer de photo) d'une panne (réessayer plus tard)", () => {
    expect(
      messageDAmelioration(new ErreurApi("x", 422, "photo_enhance_refused")),
    ).toMatch(/une autre/);
    expect(
      messageDAmelioration(new ErreurApi("x", 503, "photo_enhance_unavailable")),
    ).toMatch(/quelques minutes/);
  });

  it("explique l'absence de photo ou de CV, et le réseau", () => {
    expect(messageDAmelioration(new ErreurApi("x", 409, "photo_missing"))).toMatch(
      /d'abord une photo/,
    );
    expect(messageDAmelioration(new ErreurApi("x", 404, "cv_not_found"))).toMatch(
      /n'existe plus/,
    );
    expect(messageDAmelioration(new ErreurApi("x", 0))).toMatch(/Pas de connexion/);
  });

  it("ne laisse jamais passer un jargon serveur", () => {
    for (const cause of [
      new Error("boom"),
      new ErreurApi("photo_enhance_refused", 500, "autre_chose"),
      undefined,
    ]) {
      const message = messageDAmelioration(cause);
      expect(message).not.toMatch(/_/);
      expect(message).toMatch(/Réessaie/);
    }
  });

  it("dit quand les portraits reviennent, une fois le quota du mois atteint", () => {
    const message = messageDAmelioration(
      new ErreurApi("x", 429, "portrait_quota_exceeded", undefined, {
        resets_at: "2026-12-01T00:00:00+00:00",
      }),
    );
    expect(message).toMatch(/le 1er décembre/);
    expect(message).not.toMatch(/_/);
    expect(
      messageDAmelioration(new ErreurApi("x", 429, "portrait_quota_exceeded")),
    ).toMatch(/le mois prochain/);
  });

  it("promet une photo plus pro, jamais une autre personne", () => {
    expect(TEXTES_PHOTO.promesse).toMatch(/lumière, fond neutre, cadrage/);
    expect(TEXTES_PHOTO.comparaison).toMatch(/Même personne/);
  });
});

describe("Le compteur des portraits du mois", () => {
  const quota = {
    abonne: false,
    limite: 3,
    utilises: 0,
    restants: 3,
    repartLe: "2026-12-01T00:00:00Z",
  };

  it("dit ce qui reste, au singulier comme au pluriel", () => {
    expect(mentionPortraits(quota)).toBe("3 portraits retravaillés restants ce mois-ci.");
    expect(mentionPortraits({ ...quota, utilises: 2, restants: 1 })).toBe(
      "1 portrait retravaillé restant ce mois-ci.",
    );
  });

  it("à zéro, dit quand le compteur repart", () => {
    expect(mentionPortraits({ ...quota, utilises: 3, restants: 0 })).toBe(
      "Tu as utilisé tes 3 portraits du mois. Les prochains le 1er décembre.",
    );
  });

  it("ne montre rien à un abonné, sauf au garde-fou de l'usage raisonnable", () => {
    const abonne = { ...quota, abonne: true, limite: 30, restants: 27 };
    expect(mentionPortraits(abonne)).toBeNull();
    expect(mentionPortraits({ ...abonne, utilises: 30, restants: 0 })).toMatch(
      /usage raisonnable.*le 1er décembre/,
    );
  });

  it("au quota atteint, propose Karria sans pub au gratuit, pas à l'abonné", () => {
    const details = { resets_at: "2026-12-01T00:00:00+00:00" };
    expect(
      messageDAmelioration(
        new ErreurApi("x", 429, "portrait_quota_exceeded", undefined, {
          ...details,
          subscriber: false,
        }),
      ),
    ).toMatch(/Les prochains le 1er décembre/);
    expect(
      messageDAmelioration(
        new ErreurApi("x", 429, "portrait_quota_exceeded", undefined, {
          ...details,
          subscriber: true,
        }),
      ),
    ).not.toMatch(/sans pub/);
  });

  it("écrit la date de retour en français, et survit à une date illisible", () => {
    expect(dateDeRetour("2027-01-01T00:00:00Z")).toBe("le 1er janvier");
    expect(dateDeRetour("2026-11-15T00:00:00Z")).toBe("le 15 novembre");
    expect(dateDeRetour("pas une date")).toBe("le mois prochain");
  });
});
