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

  it("sert la galerie et le détail dans la forme que l'app lit", async () => {
    const galerie = await appeler("GET", "/templates/?active_only=true");
    expect(galerie.statut).toBe(200);
    expect(galerie.corps.length).toBeGreaterThan(0);
    expect(galerie.corps[0]).toMatchObject({
      id: 1,
      label: "Classique",
      is_premium: false,
    });

    const detail = await appeler("GET", "/templates/2");
    expect(detail.statut).toBe(200);
    expect(detail.corps.cover_letters).toHaveLength(1);

    const avis = await appeler("GET", "/templates/2/reviews");
    expect(avis.statut).toBe(200);
    expect(avis.corps.items.length).toBeGreaterThan(0);

    expect((await appeler("POST", "/templates/2/view")).statut).toBe(204);
  });

  it("répond 404 pour un modèle inconnu", async () => {
    const reponse = await appeler("GET", "/templates/999");
    expect(reponse.statut).toBe(404);
    expect(reponse.corps.error.code).toBe("template_not_found");
  });

  it("offre un modèle gratuit, qui rejoint « les miens »", async () => {
    expect((await appeler("GET", "/user-templates/me")).corps).toHaveLength(1);
    const obtention = await appeler("POST", "/user-templates/me", {
      template_id: 4,
      acquisition_type: "free",
    });
    expect(obtention.statut).toBe(201);
    const miens = await appeler("GET", "/user-templates/me");
    expect(miens.corps.map((p: { template: { id: number } }) => p.template.id)).toEqual([
      1, 4,
    ]);
  });

  it("refuse d'offrir un modèle Pro", async () => {
    const reponse = await appeler("POST", "/user-templates/me", { template_id: 3 });
    expect(reponse.statut).toBe(422);
    expect(reponse.corps.error.code).toBe("template_not_free");
  });
});
