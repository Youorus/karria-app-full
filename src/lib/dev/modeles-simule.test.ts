/**
 * Le faux serveur des modèles : il fige ce que l'onglet Modèles attend.
 *
 * Ce que ces tests protègent : la galerie et le détail répondent (c'est
 * leur absence qui cassait l'onglet) ; un modèle gratuit s'obtient et se
 * retrouve dans « les miens » ; un modèle Pro ne s'obtient pas par cette
 * route ; un identifiant inconnu répond 404 et non une route inconnue.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  estUneRouteModele,
  reinitialiserModeles,
  repondreModeles,
} from "./modeles-simule";

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = repondreModeles(methode, chemin, corps);
  const texte = await reponse.text();
  return { statut: reponse.status, corps: texte === "" ? undefined : JSON.parse(texte) };
}

describe("le faux serveur des modèles", () => {
  beforeEach(reinitialiserModeles);

  it("reconnaît les routes des modèles, avec ou sans requête", () => {
    expect(estUneRouteModele("/templates/?active_only=true")).toBe(true);
    expect(estUneRouteModele("/user-templates/me")).toBe(true);
    expect(estUneRouteModele("/job-matches/me")).toBe(false);
  });

  it("sert la galerie et le détail dans la forme du contrat", async () => {
    const galerie = await appeler("GET", "/templates/");
    expect(galerie.statut).toBe(200);
    expect(galerie.corps).toHaveLength(3);
    const [meridian, , premium] = galerie.corps;
    expect(meridian).toMatchObject({ label: "Meridian", is_premium: false });
    expect(meridian.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(meridian).toHaveProperty("signed_thumbnail_url");
    expect(meridian).toHaveProperty("thumbnail_blurhash");
    expect(premium.is_premium).toBe(true);

    const detail = await appeler("GET", `/templates/${meridian.id}`);
    expect(detail.statut).toBe(200);
    expect(detail.corps.pages).toEqual([
      expect.objectContaining({ kind: "cv", label: "CV" }),
    ]);

    const avis = await appeler("GET", `/templates/${meridian.id}/reviews`);
    expect(avis.statut).toBe(200);
    expect(avis.corps.items.length).toBeGreaterThan(0);

    expect((await appeler("POST", `/templates/${meridian.id}/view`)).statut).toBe(204);
  });

  it("répond 404 pour un modèle inconnu", async () => {
    const reponse = await appeler(
      "GET",
      "/templates/00000000-0000-0000-0000-000000000000",
    );
    expect(reponse.statut).toBe(404);
    expect(reponse.corps.error.code).toBe("template_not_found");
  });

  it("offre un modèle gratuit, qui rejoint « les miens »", async () => {
    const [meridian, marketing] = (await appeler("GET", "/templates/")).corps;
    expect((await appeler("GET", "/user-templates/me")).corps).toHaveLength(1);
    const obtention = await appeler("POST", "/user-templates/me", {
      template_id: marketing.id,
    });
    expect(obtention.statut).toBe(201);
    const miens = await appeler("GET", "/user-templates/me");
    expect(miens.corps.map((p: { template: { id: string } }) => p.template.id)).toEqual([
      meridian.id,
      marketing.id,
    ]);
  });

  it("refuse d'offrir un modèle Premium", async () => {
    const premium = (await appeler("GET", "/templates/")).corps[2];
    const reponse = await appeler("POST", "/user-templates/me", {
      template_id: premium.id,
    });
    expect(reponse.statut).toBe(422);
    expect(reponse.corps.error.code).toBe("template_not_free");
  });
});
