/**
 * La traduction des messages et des trames du flux : le reste de
 * l'application ne voit jamais la forme du serveur.
 */

import { describe, expect, it, jest } from "@jest/globals";

import { lireTrame, versMessage } from "./equipe.api";

const VOCAL = {
  id: "m1",
  author: "team" as const,
  kind: "voice" as const,
  body: null,
  attachment: {
    url: "https://storage/x.m4a",
    content_type: "audio/mp4",
    size_bytes: 10,
    duration_ms: 7_400,
  },
  created_at: "2026-10-31T09:12:44.120391Z",
};

describe("versMessage", () => {
  it("traduit un vocal de l'équipe", () => {
    expect(versMessage(VOCAL)).toEqual({
      id: "m1",
      auteur: "equipe",
      sorte: "vocal",
      texte: null,
      piece: { url: "https://storage/x.m4a", type: "audio/mp4", dureeMs: 7_400 },
      creeLe: "2026-10-31T09:12:44.120391Z",
    });
  });

  it("traduit un texte de la personne", () => {
    const m = versMessage({
      ...VOCAL,
      author: "user",
      kind: "text",
      body: "Bonjour",
      attachment: null,
    });
    expect(m).toMatchObject({
      auteur: "moi",
      sorte: "texte",
      texte: "Bonjour",
      piece: null,
    });
  });
});

describe("lireTrame", () => {
  it("rend le message d'une trame `message`", () => {
    expect(lireTrame(JSON.stringify({ type: "message", message: VOCAL }))?.id).toBe("m1");
  });

  it("ignore le ping, l'inconnu et l'illisible", () => {
    const avertir = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(lireTrame(JSON.stringify({ type: "ping" }))).toBeNull();
    expect(lireTrame(JSON.stringify({ type: "autre", message: VOCAL }))).toBeNull();
    expect(lireTrame("{pas du json")).toBeNull();
    expect(avertir).toHaveBeenCalledTimes(1);
    avertir.mockRestore();
  });
});
