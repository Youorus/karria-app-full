/**
 * Les règles du fil avec l'équipe : ce qui empêche un message de
 * s'afficher deux fois, un jour d'être mal nommé, une reconnexion de
 * marteler le serveur.
 */

import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import type { EnvoiLocal, MessageEquipe } from "../types/equipe.types";
import {
  delaiReconnexion,
  dernierInstant,
  formaterDuree,
  fusionner,
  libelleJour,
  lignesDuFil,
  problemeEnvoi,
  texteAEnvoyer,
} from "./fil";

function message(
  id: string,
  creeLe: string,
  extra: Partial<MessageEquipe> = {},
): MessageEquipe {
  return {
    id,
    auteur: "moi",
    sorte: "texte",
    texte: id,
    piece: null,
    creeLe,
    ...extra,
  };
}

describe("fusionner", () => {
  it("n'affiche un message qu'une fois, le plus récent l'emportant", () => {
    const a = message("a", "2026-10-31T09:00:00Z");
    const b = message("b", "2026-10-31T09:01:00Z");
    const bNeuf = { ...b, texte: "url fraîche" };
    const fusion = fusionner([a, b], [bNeuf]);
    expect(fusion.map((m) => m.id)).toEqual(["a", "b"]);
    expect(fusion[1].texte).toBe("url fraîche");
  });

  it("range dans l'ordre du temps, quel que soit l'ordre d'arrivée", () => {
    const tard = message("tard", "2026-10-31T10:00:00Z");
    const tot = message("tot", "2026-10-31T08:00:00Z");
    expect(fusionner([tard], [tot]).map((m) => m.id)).toEqual(["tot", "tard"]);
  });
});

describe("dernierInstant", () => {
  it("rend l'instant du dernier message, ou rien", () => {
    expect(dernierInstant([])).toBeNull();
    expect(
      dernierInstant([
        message("a", "2026-10-31T09:00:00Z"),
        message("b", "2026-10-31T09:05:00Z"),
      ]),
    ).toBe("2026-10-31T09:05:00Z");
  });
});

describe("delaiReconnexion", () => {
  it("double à chaque essai, sans dépasser trente secondes", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(delaiReconnexion)).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000,
    ]);
  });
});

describe("formaterDuree", () => {
  it("écrit minutes et secondes", () => {
    expect(formaterDuree(7_400)).toBe("0:07");
    expect(formaterDuree(83_000)).toBe("1:23");
    expect(formaterDuree(null)).toBe("0:00");
  });
});

describe("texteAEnvoyer", () => {
  it("nettoie, et refuse le vide", () => {
    expect(texteAEnvoyer("  bonjour  ")).toBe("bonjour");
    expect(texteAEnvoyer("   \n ")).toBeNull();
  });
});

describe("libelleJour", () => {
  const maintenant = new Date(2026, 9, 31, 15, 0);
  it("dit aujourd'hui, hier, puis la date", () => {
    expect(libelleJour(new Date(2026, 9, 31, 8, 0), maintenant)).toBe("Aujourd'hui");
    expect(libelleJour(new Date(2026, 9, 30, 23, 0), maintenant)).toBe("Hier");
    expect(libelleJour(new Date(2026, 9, 27, 12, 0), maintenant)).toMatch(/^[A-Z]/);
  });
});

describe("lignesDuFil", () => {
  it("pose un séparateur par jour et les envois en dernier", () => {
    const envoi: EnvoiLocal = {
      cle: "local-1",
      sorte: "texte",
      texte: "en route",
      uri: null,
      dureeMs: null,
      etat: "envoi",
      probleme: null,
    };
    const lignes = lignesDuFil(
      [
        message("a", new Date(2026, 9, 30, 10).toISOString()),
        message("b", new Date(2026, 9, 31, 9).toISOString()),
        message("c", new Date(2026, 9, 31, 10).toISOString()),
      ],
      [envoi],
      new Date(2026, 9, 31, 12),
    );
    expect(lignes.map((l) => l.type)).toEqual([
      "jour",
      "message",
      "jour",
      "message",
      "message",
      "envoi",
    ]);
  });
});

describe("problemeEnvoi", () => {
  it("distingue le réseau, le refus et le reste", () => {
    expect(problemeEnvoi(new ErreurApi("x", 0, "reseau_injoignable"))).toMatch(/réseau/);
    expect(
      problemeEnvoi(new ErreurApi("Un message vocal dure cinq minutes au plus.", 422)),
    ).toBe("Un message vocal dure cinq minutes au plus.");
    expect(problemeEnvoi(new Error("?"))).toMatch(/réessayer/);
  });
});
