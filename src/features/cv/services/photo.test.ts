/**
 * Les messages de l'amélioration de photo (`photo.ts`) : chaque raison du
 * serveur a son mot humain, sans jargon, et dit quoi faire.
 */

import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import { messageDAmelioration, TEXTES_PHOTO } from "./photo";

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

  it("promet une photo plus pro, jamais une autre personne", () => {
    expect(TEXTES_PHOTO.promesse).toMatch(/lumière, fond neutre, cadrage/);
    expect(TEXTES_PHOTO.comparaison).toMatch(/Même personne/);
  });
});
