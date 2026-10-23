/**
 * Les messages d'échec de l'import : chaque raison du contrat a le sien,
 * et il dit quoi faire — la règle d'AGENTS.md §7.
 */

import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";
import { messageDImport } from "./import";

describe("Les messages d'échec de l'import", () => {
  it("distinguent chaque raison du contrat", () => {
    const raisons = [
      "document_type_unsupported",
      "document_too_large",
      "document_too_many_pages",
      "document_empty",
      "document_unreadable",
    ];
    const messages = raisons.map((r) =>
      messageDImport(new ErreurApi("Refusé.", 422, r, "file")),
    );
    expect(new Set(messages).size).toBe(raisons.length);
    expect(messages[0]).toContain("PDF");
    expect(messages[1]).toContain("10 Mo");
    expect(messages[2]).toContain("10 pages");
  });

  it("invitent à réessayer plus tard quand le modèle ne répond pas", () => {
    expect(messageDImport(new ErreurApi("Panne.", 503, "ai_unavailable"))).toContain(
      "Réessaie",
    );
  });

  it("disent que rien n'est parti quand le réseau manque", () => {
    expect(messageDImport(new ErreurApi("Réseau.", 0, "reseau_injoignable"))).toContain(
      "Pas de connexion",
    );
  });

  it("gardent un repli lisible pour une cause inconnue", () => {
    expect(messageDImport(new Error("boum"))).toContain("Réessaie");
  });
});
