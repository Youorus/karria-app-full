/**
 * Le faux serveur des offres fige le contrat `docs/contrat-api-offres.md`
 * et `docs/contrat-api-recherche.md`.
 *
 * Ces tests protègent ce que les écrans supposent : des identifiants UUID,
 * les deux modes du fil, les effectifs des filtres, les offres vues, et
 * une conversation qui lance une recherche, propose des élargissements
 * **comptés**, et les applique quand on les touche.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  accepterConsentementIa,
  retirerConsentementIa,
  VERSION_SIMULEE,
} from "./consentement-simule";
import { reinitialiserOffres, repondreOffres } from "./offres-simule";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface Match {
  id: string;
  job_offer_id: string;
  score_normalized: number | null;
  match_quality: string | null;
  reasons: string[];
  is_new: boolean;
  feed_seen: boolean;
  saved: boolean;
  dismissed: boolean;
  distance_km: number | null;
  job_offer: {
    id: string;
    summary: null;
    excerpt: string;
    description: string | null;
    location_label: string | null;
    remote: string | null;
    source: string;
  };
}

interface Corps {
  items: Match[];
  count: number;
  has_next: boolean;
  mode: string;
  criteria_summary: string | null;
  sort: string;
  nearest_available: boolean;
  contract_types: { value: string; label: string; count: number }[];
  cities: { value: string; count: number }[];
  updated: number;
  conversation_id: string;
  message: { content: string };
  status: string;
  intent: string;
  results_count: number | null;
  criteria: { summary: string; location: { radius_km: number } | null } | null;
  suggestions: string[];
  widenings: { id: string; gain: number; message: string }[];
  error: { details: { reason: string } };
}

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = repondreOffres(methode, chemin, corps);
  return { statut: reponse.status, corps: (await reponse.json()) as Corps };
}

beforeEach(reinitialiserOffres);

describe("Le fil sans recherche", () => {
  it("montre toutes les offres, les plus récentes d'abord, avec des UUID", async () => {
    const { statut, corps } = await appeler("GET", "/job-matches/me?limit=5&offset=0");
    expect(statut).toBe(200);
    expect(corps.mode).toBe("all_offers");
    expect(corps.criteria_summary).toBeNull();
    expect(corps.items).toHaveLength(5);
    expect(corps.has_next).toBe(true);
    for (const m of corps.items) {
      expect(m.id).toMatch(UUID);
      expect(m.id).toBe(m.job_offer_id);
      expect(m.score_normalized).toBeNull();
      expect(m.match_quality).toBeNull();
      expect(m.reasons).toEqual([]);
      expect(m.job_offer.summary).toBeNull();
      expect(m.job_offer.description).toBeNull();
      expect(m.job_offer.excerpt.length).toBeGreaterThan(0);
      expect(m.job_offer.location_label).not.toBeNull();
    }
    const dates = corps.items.map((m) => m.job_offer).map((o) => o.id);
    expect(new Set(dates).size).toBe(5);
  });

  it("refuse une page trop grande", async () => {
    const { statut } = await appeler("GET", "/job-matches/me?limit=51");
    expect(statut).toBe(422);
  });

  it("compte les effectifs des filtres", async () => {
    const { corps } = await appeler("GET", "/job-matches/me/filter-options");
    const cdi = corps.contract_types.find((c) => c.value === "cdi");
    expect(cdi?.label).toBe("CDI");
    expect(cdi?.count).toBeGreaterThan(0);
    expect(corps.cities.find((c) => c.value === "Paris")?.count).toBeGreaterThan(1);
  });

  it("filtre par contrat et par fraîcheur", async () => {
    const cdd = await appeler("GET", "/job-matches/me?contract_types=cdd");
    expect(cdd.corps.count).toBeGreaterThan(0);
    const tout = await appeler("GET", "/job-matches/me");
    expect(cdd.corps.count).toBeLessThan(tout.corps.count);
    const recentes = await appeler("GET", "/job-matches/me?published_within=24h");
    expect(recentes.corps.count).toBeLessThan(tout.corps.count);
  });
});

describe("Les offres vues et l'interaction", () => {
  it("fait tomber « Nouvelle » une fois l'offre vue", async () => {
    const avant = await appeler("GET", "/job-matches/me?limit=1");
    const id = avant.corps.items[0]!.id;
    expect(avant.corps.items[0]!.is_new).toBe(true);

    const vues = await appeler("POST", "/job-matches/me/seen", { offer_ids: [id] });
    expect(vues.corps.updated).toBe(1);
    const encore = await appeler("POST", "/job-matches/me/seen", { offer_ids: [id] });
    expect(encore.corps.updated).toBe(0);

    const apres = await appeler("GET", "/job-matches/me?limit=1");
    expect(apres.corps.items[0]!.is_new).toBe(false);
    expect(apres.corps.items[0]!.feed_seen).toBe(true);
  });

  it("garde, écarte, et refuse un corps vide", async () => {
    const fil = await appeler("GET", "/job-matches/me?limit=1");
    const id = fil.corps.items[0]!.id;
    const garde = await appeler("PATCH", `/job-matches/${id}/interaction`, {
      saved: true,
    });
    expect(garde.statut).toBe(200);
    expect(garde.corps.items === undefined).toBe(true);
    const detail = await appeler("GET", `/job-matches/${id}`);
    expect((detail.corps as unknown as Match).saved).toBe(true);
    expect((detail.corps as unknown as Match).job_offer.description).not.toBeNull();

    const vide = await appeler("PATCH", `/job-matches/${id}/interaction`, {});
    expect(vide.statut).toBe(422);
    expect(vide.corps.error.details.reason).toBe("interaction_empty");

    await appeler("PATCH", `/job-matches/${id}/interaction`, { dismissed: true });
    const apres = await appeler("GET", "/job-matches/me");
    expect(apres.corps.items.some((m) => m.id === id)).toBe(false);
  });

  it("répond 404 pour une offre inconnue", async () => {
    const { statut, corps } = await appeler(
      "GET",
      "/job-matches/00000000-0000-4000-8000-000000000000",
    );
    expect(statut).toBe(404);
    expect(corps.error.details.reason).toBe("offer_not_found");
  });
});

describe("La conversation avec Karria", () => {
  it("exige l'accord sur l'IA avant le premier message (ADR-0025)", async () => {
    retirerConsentementIa();
    const { statut, corps } = await appeler("POST", "/assistant/messages", {
      conversation_id: null,
      content: "Je cherche un poste",
    });
    expect(statut).toBe(403);
    expect(corps.error.details.reason).toBe("ai_consent_required");
    accepterConsentementIa(VERSION_SIMULEE);
  });

  it("pose une question quand il manque le lieu, avec des réponses rapides", async () => {
    accepterConsentementIa(VERSION_SIMULEE);
    const { corps } = await appeler("POST", "/assistant/messages", {
      conversation_id: null,
      content: "Je cherche un poste de développeur",
    });
    expect(corps.status).toBe("clarify");
    expect(corps.results_count).toBeNull();
    expect(corps.suggestions.length).toBeGreaterThan(0);
    expect(corps.conversation_id).toMatch(UUID);
  });

  it("lance la recherche, bascule le fil, et propose des élargissements comptés", async () => {
    const tour = await appeler("POST", "/assistant/messages", {
      conversation_id: null,
      content: "Un CDI de data engineer à Paris",
    });
    expect(tour.corps.status).toBe("search");
    expect(tour.corps.intent).toBe("search");
    expect(tour.corps.criteria?.summary).toContain("Paris");
    expect(tour.corps.results_count).toBeGreaterThan(0);

    const fil = await appeler("GET", "/job-matches/me");
    expect(fil.corps.mode).toBe("search");
    expect(fil.corps.count).toBe(tour.corps.results_count);
    expect(fil.corps.criteria_summary).toBe(tour.corps.criteria?.summary);
    expect(fil.corps.items[0]!.score_normalized).not.toBeNull();

    const elargissement = tour.corps.widenings[0];
    expect(elargissement).toBeDefined();
    expect(tour.corps.suggestions).toContain(elargissement!.message);

    const accepte = await appeler("POST", "/assistant/messages", {
      conversation_id: tour.corps.conversation_id,
      content: elargissement!.message,
    });
    expect(accepte.corps.status).toBe("search");
    expect(accepte.corps.intent).toBe("refine");
    expect(accepte.corps.results_count).toBe(
      (tour.corps.results_count ?? 0) + elargissement!.gain,
    );
  });

  it("refuse un message vide et une conversation inconnue", async () => {
    const vide = await appeler("POST", "/assistant/messages", { content: "  " });
    expect(vide.statut).toBe(422);
    expect(vide.corps.error.details.reason).toBe("assistant_message_empty");
    const inconnue = await appeler("POST", "/assistant/messages", {
      conversation_id: "00000000-0000-4000-8000-000000000000",
      content: "Bonjour",
    });
    expect(inconnue.statut).toBe(404);
    expect(inconnue.corps.error.details.reason).toBe("conversation_not_found");
  });
});

describe("La recherche en cours", () => {
  it("se lit, se pose directement et s'oublie", async () => {
    const rien = await appeler("GET", "/search/criteria");
    expect(rien.corps.criteria).toBeNull();

    const incomplets = await appeler("PUT", "/search/criteria", {
      job_titles: ["Serveur"],
    });
    expect(incomplets.statut).toBe(422);
    expect(incomplets.corps.error.details.reason).toBe("criteria_incomplete");

    const poses = await appeler("PUT", "/search/criteria", {
      job_titles: ["Serveur"],
      location: { label: "Marseille" },
    });
    expect(poses.statut).toBe(200);
    expect(poses.corps.criteria?.location?.radius_km).toBe(30);
    expect(poses.corps.results_count).toBeGreaterThan(0);

    const oubli = repondreOffres("DELETE", "/search/criteria", undefined);
    expect(oubli.status).toBe(204);
    const apres = await appeler("GET", "/job-matches/me");
    expect(apres.corps.mode).toBe("all_offers");
  });
});

describe("Le tri et les options, par mode (ADR-0027)", () => {
  const recherche = {
    job_titles: ["Serveur", "Développeur", "Data engineer"],
    location: { label: "Paris" },
  };

  it("sans recherche : « Plus proches » est refusé, la pertinence est servie par date", async () => {
    const fil = await appeler("GET", "/job-matches/me");
    expect(fil.corps.sort).toBe("fresh");
    expect(fil.corps.nearest_available).toBe(false);
    expect(fil.corps.items[0]!.distance_km).toBeNull();

    const proches = await appeler("GET", "/job-matches/me?sort=nearest");
    expect(proches.statut).toBe(422);
    expect(proches.corps.error.details.reason).toBe("nearest_unavailable");
  });

  it("avec une recherche localisée : du plus proche au plus loin, dans les deux modes", async () => {
    await appeler("PUT", "/search/criteria", recherche);
    for (const mode of ["search", "all_offers"]) {
      const fil = await appeler(
        "GET",
        `/job-matches/me?mode=${mode}&sort=nearest&limit=50`,
      );
      expect(fil.statut).toBe(200);
      expect(fil.corps.sort).toBe("nearest");
      expect(fil.corps.nearest_available).toBe(true);
      const distances = fil.corps.items.map((m) => m.distance_km ?? Infinity);
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
    }
  });

  it("les options de filtre sont celles du mode demandé", async () => {
    await appeler("PUT", "/search/criteria", recherche);
    const total = (o: Corps) => o.cities.reduce((n, c) => n + c.count, 0);
    const pourLaRecherche = await appeler(
      "GET",
      "/job-matches/me/filter-options?mode=search",
    );
    const pourTout = await appeler(
      "GET",
      "/job-matches/me/filter-options?mode=all_offers",
    );
    const fil = await appeler("GET", "/job-matches/me?mode=search");

    expect(total(pourLaRecherche.corps)).toBe(fil.corps.count);
    expect(total(pourTout.corps)).toBeGreaterThan(total(pourLaRecherche.corps));
  });
});
