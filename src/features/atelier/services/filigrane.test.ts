/**
 * Le filigrane (`filigrane.ts`) : la ligne d'information, et la règle qui
 * fait monter — ou non — la proposition d'abonnement. Jamais bloquant, rien
 * pour un abonné, rien quand le serveur ne sait pas encore.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import type { DroitsFiligrane } from "../types/atelier.types";
import {
  doitProposer,
  ligneFiligrane,
  oublierPropositions,
  peutRegenererSansFiligrane,
  retenirProposition,
} from "./filigrane";

function droits(partiel: Partial<DroitsFiligrane> = {}): DroitsFiligrane {
  return {
    abonne: false,
    gratuitsParMois: 3,
    utilises: 1,
    restants: 2,
    filigraneAuProchain: false,
    repartLe: "2026-12-01T00:00:00Z",
    ...partiel,
  };
}

describe("La ligne d'information", () => {
  it("avant l'export : ce qu'il reste, ou le filigrane à venir", () => {
    expect(ligneFiligrane(droits(), null)).toBe(
      "Il te reste 2 CV sans filigrane ce mois-ci",
    );
    expect(ligneFiligrane(droits({ restants: 1, utilises: 2 }), null)).toBe(
      "Il te reste 1 CV sans filigrane ce mois-ci",
    );
    expect(
      ligneFiligrane(
        droits({ restants: 0, utilises: 3, filigraneAuProchain: true }),
        null,
      ),
    ).toBe("Ce CV portera le filigrane Karria");
  });

  it("ne dit rien à un abonné, ni quand le serveur ne sait pas", () => {
    expect(ligneFiligrane(droits({ abonne: true, restants: 0 }), null)).toBeNull();
    expect(ligneFiligrane(droits({ abonne: true }), { filigrane: false })).toBeNull();
    expect(ligneFiligrane(null, null)).toBeNull();
    // Ancien serveur : `watermarked` absent vaut faux, et rien n'est affiché.
    expect(ligneFiligrane(null, { filigrane: false })).toBeNull();
  });

  it("une fois le document là, dit ce qui est — pas ce qui sera", () => {
    const epuises = droits({ restants: 0, utilises: 3, filigraneAuProchain: true });
    expect(ligneFiligrane(epuises, { filigrane: true })).toBe(
      "Ce CV porte le filigrane Karria",
    );
    // Le troisième CV du mois est sorti sans filigrane : c'est le suivant qui l'aura.
    expect(ligneFiligrane(epuises, { filigrane: false })).toBe(
      "Ton prochain CV portera le filigrane Karria",
    );
    expect(ligneFiligrane(droits(), { filigrane: false })).toBe(
      "Il te reste 2 CV sans filigrane ce mois-ci",
    );
    // Le fait se dit même sans compteur (lecture en échec).
    expect(ligneFiligrane(null, { filigrane: true })).toBe(
      "Ce CV porte le filigrane Karria",
    );
  });
});

describe("La proposition d'abonnement", () => {
  beforeEach(() => oublierPropositions());

  const filigrane = { id: "exp_1", filigrane: true };

  it("monte pour un document filigrané, là où l'offre est ouverte", () => {
    expect(doitProposer({ exporte: filigrane, sansPub: false, offreOuverte: true })).toBe(
      true,
    );
  });

  it("ne monte ni sans filigrane, ni pour un abonné, ni paiements coupés, ni sans export", () => {
    expect(
      doitProposer({
        exporte: { id: "exp_1", filigrane: false },
        sansPub: false,
        offreOuverte: true,
      }),
    ).toBe(false);
    expect(doitProposer({ exporte: filigrane, sansPub: true, offreOuverte: true })).toBe(
      false,
    );
    expect(
      doitProposer({ exporte: filigrane, sansPub: false, offreOuverte: false }),
    ).toBe(false);
    expect(doitProposer({ exporte: null, sansPub: false, offreOuverte: true })).toBe(
      false,
    );
  });

  it("ne monte qu'une fois par export", () => {
    retenirProposition("exp_1");
    expect(doitProposer({ exporte: filigrane, sansPub: false, offreOuverte: true })).toBe(
      false,
    );
    expect(
      doitProposer({
        exporte: { id: "exp_2", filigrane: true },
        sansPub: false,
        offreOuverte: true,
      }),
    ).toBe(true);
  });

  it("après l'abonnement, un CV filigrané peut se refaire sans", () => {
    expect(peutRegenererSansFiligrane(filigrane, true)).toBe(true);
    expect(peutRegenererSansFiligrane(filigrane, false)).toBe(false);
    expect(peutRegenererSansFiligrane({ filigrane: false }, true)).toBe(false);
    expect(peutRegenererSansFiligrane(null, true)).toBe(false);
  });
});
