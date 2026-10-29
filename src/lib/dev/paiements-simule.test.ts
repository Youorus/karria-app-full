/**
 * Le faux serveur des paiements : il fige ce que la carte de soutien et le
 * détail d'un modèle attendent du contrat `docs/contrat-api-paiements.md`.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import { reinitialiserModeles, repondreModeles } from "./modeles-simule";
import {
  estUneRoutePaiement,
  reinitialiserPaiements,
  repondrePaiements,
} from "./paiements-simule";

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = repondrePaiements(methode, chemin, corps);
  const texte = await reponse.text();
  return { statut: reponse.status, corps: texte === "" ? undefined : JSON.parse(texte) };
}

describe("le faux serveur des paiements", () => {
  beforeEach(() => {
    reinitialiserPaiements();
    reinitialiserModeles();
  });

  it("reconnaît ses routes", () => {
    expect(estUneRoutePaiement("/payments/me")).toBe(true);
    expect(estUneRoutePaiement("/payments/status/cs_1?x=1")).toBe(true);
    expect(estUneRoutePaiement("/templates/")).toBe(false);
  });

  it("sert le catalogue dans la forme du contrat", async () => {
    const { statut, corps } = await appeler("GET", "/payments/catalog");
    expect(statut).toBe(200);
    expect(corps.ad_free).toMatchObject({ amount_cents: 499, interval: "month" });
    expect(corps.coffees.map((c: { count: number }) => c.count)).toEqual([1, 2, 3, 5]);
    expect(corps.enabled).toEqual({ ios: true, android: true });
  });

  it("un café s'ouvre, se livre à la seconde relecture, et compte", async () => {
    const ouverture = await appeler("POST", "/payments/checkout-session", {
      payment_type: "coffee",
      coffee_count: 3,
    });
    expect(ouverture.statut).toBe(201);
    expect(ouverture.corps).toMatchObject({ payment_type: "coffee", amount_cents: 799 });

    const id = ouverture.corps.session_id;
    expect((await appeler("GET", `/payments/status/${id}`)).corps.fulfilled).toBe(false);
    expect((await appeler("GET", `/payments/status/${id}`)).corps.fulfilled).toBe(true);
    const moi = await appeler("GET", "/payments/me");
    expect(moi.corps.thanks.coffees).toBe(3);
    expect(moi.corps.ad_free.active).toBe(false);
  });

  it("refuse un palier inconnu et un second abonnement", async () => {
    const palier = await appeler("POST", "/payments/checkout-session", {
      payment_type: "coffee",
      coffee_count: 4,
    });
    expect(palier.statut).toBe(422);
    expect(palier.corps.error.details.reason).toBe("coffee_count_out_of_bounds");

    const abonnement = await appeler("POST", "/payments/checkout-session", {
      payment_type: "ad_free",
    });
    const id = abonnement.corps.session_id;
    await appeler("GET", `/payments/status/${id}`);
    await appeler("GET", `/payments/status/${id}`);
    expect((await appeler("GET", "/payments/me")).corps.ad_free.active).toBe(true);

    const second = await appeler("POST", "/payments/checkout-session", {
      payment_type: "ad_free",
    });
    expect(second.statut).toBe(409);
    expect(second.corps.error.details.reason).toBe("subscription_already_active");
  });

  it("le portail exige un paiement connu, et résilie en fin de période", async () => {
    expect((await appeler("POST", "/payments/portal-session")).statut).toBe(404);
    const abonnement = await appeler("POST", "/payments/checkout-session", {
      payment_type: "ad_free",
    });
    const id = abonnement.corps.session_id;
    await appeler("GET", `/payments/status/${id}`);
    await appeler("GET", `/payments/status/${id}`);
    expect((await appeler("POST", "/payments/portal-session")).statut).toBe(201);
    expect(
      (await appeler("GET", "/payments/me")).corps.ad_free.cancel_at_period_end,
    ).toBe(true);
  });

  it("un modèle Premium s'achète et rejoint « les miens »", async () => {
    const galerie = JSON.parse(
      await repondreModeles("GET", "/templates/", undefined).text(),
    );
    const premium = galerie.find((m: { is_premium: boolean }) => m.is_premium);
    const libre = galerie.find((m: { is_premium: boolean }) => !m.is_premium);

    const refus = await appeler("POST", "/payments/checkout-session", {
      payment_type: "template",
      template_id: libre.id,
    });
    expect(refus.statut).toBe(404);

    const achat = await appeler("POST", "/payments/checkout-session", {
      payment_type: "template",
      template_id: premium.id,
    });
    expect(achat.statut).toBe(201);
    const id = achat.corps.session_id;
    await appeler("GET", `/payments/status/${id}`);
    expect((await appeler("GET", `/payments/status/${id}`)).corps.fulfilled).toBe(true);

    const miens = JSON.parse(
      await repondreModeles("GET", "/user-templates/me", undefined).text(),
    );
    expect(miens.map((p: { template: { id: string } }) => p.template.id)).toContain(
      premium.id,
    );

    const encore = await appeler("POST", "/payments/checkout-session", {
      payment_type: "template",
      template_id: premium.id,
    });
    expect(encore.statut).toBe(409);
    expect(encore.corps.error.details.reason).toBe("template_already_owned");
  });

  it("un statut inconnu répond 404", async () => {
    expect((await appeler("GET", "/payments/status/cs_x")).statut).toBe(404);
  });
});
