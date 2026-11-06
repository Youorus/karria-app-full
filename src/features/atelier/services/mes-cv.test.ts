import { describe, expect, it } from "@jest/globals";

import type { Export } from "../types/atelier.types";
import {
  exportsLibres,
  libelleDuModele,
  ligneDeCreation,
  sousTitreDesCv,
} from "./mes-cv";

function exporte(partiel: Partial<Export>): Export {
  return {
    id: "exp_1",
    genre: "cv",
    modele: { id: "tpl", libelle: "Meridian" },
    dossierId: null,
    creeLe: "2026-11-01T10:00:00Z",
    pdf: "https://x/1.pdf",
    docx: null,
    ats: null,
    couleur: null,
    styleLettre: null,
    ...partiel,
  };
}

describe("Mes CV", () => {
  it("ne garde que les CV sans dossier, du plus récent au plus ancien", () => {
    const liste = exportsLibres([
      exporte({ id: "ancien", creeLe: "2026-10-01T10:00:00Z" }),
      exporte({ id: "dossier", dossierId: "dos_1" }),
      exporte({ id: "lettre", genre: "lettre" }),
      exporte({ id: "recent", creeLe: "2026-11-05T10:00:00Z" }),
    ]);
    expect(liste.map((e) => e.id)).toEqual(["recent", "ancien"]);
  });

  it("dit quand le CV a été créé, et avec quel modèle", () => {
    const maintenant = new Date("2026-11-05T12:00:00");
    expect(ligneDeCreation(exporte({ creeLe: "2026-11-04T09:00:00" }), maintenant)).toBe(
      "Créé hier",
    );
    expect(ligneDeCreation(exporte({ creeLe: "pas une date" }), maintenant)).toBe("Créé");
    expect(libelleDuModele(exporte({}))).toBe("Meridian");
    expect(libelleDuModele(exporte({ modele: null }))).toBe("Modèle retiré");
  });

  it("compte les CV dans le sous-titre", () => {
    expect(sousTitreDesCv(0)).toBe("Tes CV mis en page, prêts à envoyer");
    expect(sousTitreDesCv(1)).toBe("1 CV mis en page");
    expect(sousTitreDesCv(3)).toBe("3 CV mis en page");
  });
});
