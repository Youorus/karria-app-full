/**
 * Le faux serveur de la porte de mise à jour : la forme du contrat
 * `docs/contrat-api-version.md`, et le forçage par l'environnement.
 */

import { describe, expect, it } from "@jest/globals";

import { estUneRouteVersion, repondreVersion } from "./version-simule";

async function lire(reponse: Response) {
  return { statut: reponse.status, corps: JSON.parse(await reponse.text()) };
}

describe("le faux serveur de la version", () => {
  it("reconnaît sa route, paramètres compris", () => {
    expect(estUneRouteVersion("/app/release?platform=ios&build=3")).toBe(true);
    expect(estUneRouteVersion("/app/releases")).toBe(false);
  });

  it("répond « ok » par défaut, avec l'adresse du magasin de la plateforme", async () => {
    const { statut, corps } = await lire(
      repondreVersion("GET", "/app/release?platform=android&build=3", undefined),
    );
    expect(statut).toBe(200);
    expect(corps).toMatchObject({ status: "ok", minimum_build: 1 });
    expect(corps.store_url).toContain("play.google.com");
    expect(typeof corps.latest_build).toBe("number");
  });

  it("exige une mise à jour quand l'environnement le force", async () => {
    const { corps } = await lire(
      repondreVersion("GET", "/app/release?platform=ios&build=3", "requise"),
    );
    expect(corps.status).toBe("update_required");
    expect(corps.minimum_build).toBeGreaterThan(3);
    expect(corps.store_url).toContain("apps.apple.com");
  });

  it("propose une mise à jour quand l'environnement le force", async () => {
    const { corps } = await lire(
      repondreVersion("GET", "/app/release?platform=ios&build=3", "disponible"),
    );
    expect(corps.status).toBe("update_available");
  });

  it("refuse une plateforme ou une build inconnues", async () => {
    expect(
      (await lire(repondreVersion("GET", "/app/release?platform=web&build=3"))).statut,
    ).toBe(422);
    expect(
      (await lire(repondreVersion("GET", "/app/release?platform=ios&build=x"))).statut,
    ).toBe(422);
    expect(
      (await lire(repondreVersion("POST", "/app/release?platform=ios&build=1"))).statut,
    ).toBe(405);
  });
});
