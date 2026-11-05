import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Cv } from "@/features/cv/types/cv.types";

/** Un mockDisque en mémoire, à la forme de `expo-file-system` (File, Directory, Paths). */
const mockDisque = new Map<string, string>();

jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    get exists() {
      return [...mockDisque.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {
      mockDisque.set(`${this.uri}/.dir`, "");
    }
    delete() {
      for (const k of [...mockDisque.keys()])
        if (k.startsWith(`${this.uri}/`)) mockDisque.delete(k);
    }
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    get exists() {
      return mockDisque.has(this.uri);
    }
    textSync() {
      return mockDisque.get(this.uri) ?? "";
    }
    write(contenu: string) {
      mockDisque.set(this.uri, contenu);
    }
    delete() {
      mockDisque.delete(this.uri);
    }
  }
  return {
    Directory,
    File,
    Paths: { cache: { uri: "cache" }, document: { uri: "doc" } },
  };
});

// Après le simulateur : le module lit `expo-file-system` à l'import.
// eslint-disable-next-line import/first
import {
  brouillonPrime,
  ecrireBrouillonAtelier,
  lireBrouillonAtelier,
  fichierDExport,
  oublierBrouillonAtelier,
  oublierTousLesBrouillonsAtelier,
  supprimerExport,
} from "./brouillon-atelier";

const cv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: null },
  contact: null,
  presentation: null,
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "",
};

describe("le brouillon d'atelier", () => {
  beforeEach(() => mockDisque.clear());

  it("s'écrit dans le cache, se relit, et s'oublie", () => {
    ecrireBrouillonAtelier({
      dossierId: "dos_1",
      cv,
      modeleId: "m",
      dernierChemin: "summary",
      ecritLe: "2026-11-05T10:00:00Z",
    });
    expect([...mockDisque.keys()].some((k) => k.startsWith("cache/atelier/"))).toBe(true);
    expect(lireBrouillonAtelier("dos_1")?.modeleId).toBe("m");
    expect(lireBrouillonAtelier("dos_2")).toBeNull();
    oublierBrouillonAtelier("dos_1");
    expect(lireBrouillonAtelier("dos_1")).toBeNull();
  });

  it("efface tout à la déconnexion, et ne lève jamais", () => {
    ecrireBrouillonAtelier({
      dossierId: "a",
      cv,
      modeleId: null,
      dernierChemin: null,
      ecritLe: "2026-11-05T10:00:00Z",
    });
    ecrireBrouillonAtelier({
      dossierId: "b",
      cv,
      modeleId: null,
      dernierChemin: null,
      ecritLe: "2026-11-05T10:00:00Z",
    });
    oublierTousLesBrouillonsAtelier();
    expect(lireBrouillonAtelier("a")).toBeNull();
    expect(lireBrouillonAtelier("b")).toBeNull();
    expect(() => oublierTousLesBrouillonsAtelier()).not.toThrow();
  });

  it("pose les exports sous le répertoire de l'atelier, et la purge les emporte", () => {
    const f = fichierDExport("CV - Awa.pdf");
    expect(f.uri).toBe("cache/atelier/exports/CV - Awa.pdf");
    f.write("pdf");
    expect(f.exists).toBe(true);
    supprimerExport(f);
    expect(f.exists).toBe(false);
    fichierDExport("Lettre.pdf").write("pdf");
    oublierTousLesBrouillonsAtelier();
    expect(mockDisque.has("cache/atelier/exports/Lettre.pdf")).toBe(false);
  });

  it("ignore un fichier illisible", () => {
    mockDisque.set("cache/atelier/x.json", "{pas du json");
    expect(lireBrouillonAtelier("x")).toBeNull();
  });

  it("ne prime que s'il est plus récent que le serveur", () => {
    const b = {
      dossierId: "a",
      cv,
      modeleId: null,
      dernierChemin: null,
      ecritLe: "2026-11-05T10:00:05Z",
    };
    expect(brouillonPrime(b, "2026-11-05T10:00:00Z")).toBe(true);
    expect(brouillonPrime(b, "2026-11-05T10:00:09Z")).toBe(false);
  });
});
