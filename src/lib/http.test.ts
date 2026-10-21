/**
 * Le client HTTP et le renouvellement de session.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *
 * 1. **personne n'est déconnecté à tort** : trois requêtes qui expirent
 *    ensemble ne consomment qu'un jeton de rafraîchissement (le serveur
 *    prendrait les deux autres pour un vol et couperait toutes les
 *    sessions), et une panne réseau pendant le renouvellement n'efface
 *    pas la session ;
 * 2. **une session vraiment finie se termine proprement** : jetons
 *    oubliés, accueil prévenu, et pas de boucle de reprises ;
 * 3. **chaque échec dit ce qu'il est** : le message, le code et le champ
 *    du serveur arrivent intacts ; une panne de transport se distingue
 *    d'un refus, et sa cause est journalisée ;
 * 4. la forme des requêtes : adresse, jeton, corps, formulaire refabriqué
 *    à la reprise, délai d'abandon.
 *
 * On ne simule que `fetch`, le stockage de session et l'adresse de l'API.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ecrireJetons, lireJetons, oublierSession } from "@/lib/session";

import { auMomentDeLaDeconnexion, ErreurApi, http, versJetons } from "./http";

jest.mock("@/lib/config", () => ({ API_URL: "https://api.test/api/v1" }));
jest.mock("@/lib/session", () => ({
  lireJetons: jest.fn(),
  ecrireJetons: jest.fn(),
  oublierSession: jest.fn(),
}));

const JETONS = { acces: "acces-1", rafraichissement: "rafraichissement-1" };

type Requete = [string, RequestInit];

const recuperer = jest.fn<(adresse: string, init: RequestInit) => Promise<Response>>();

/** Une réponse du serveur, réduite à ce que le client en lit. */
function reponse(statut: number, corps?: unknown): Response {
  return {
    status: statut,
    ok: statut >= 200 && statut < 300,
    json:
      corps === undefined
        ? () => Promise.reject(new SyntaxError("Unexpected end of input"))
        : () => Promise.resolve(corps),
  } as unknown as Response;
}

function requete(rang: number): Requete {
  const appel = recuperer.mock.calls[rang];
  if (appel === undefined) throw new Error(`aucune requête de rang ${rang}`);
  return appel;
}

function enTetes(rang: number): Record<string, string> {
  return requete(rang)[1].headers as Record<string, string>;
}

/** Les requêtes parties vers `/auth/refresh`. */
function rafraichissements(): Requete[] {
  return recuperer.mock.calls.filter(([adresse]) => adresse.endsWith("/auth/refresh"));
}

async function echecDe(promesse: Promise<unknown>): Promise<ErreurApi> {
  try {
    await promesse;
  } catch (cause) {
    if (cause instanceof ErreurApi) return cause;
    throw cause;
  }
  throw new Error("l'appel aurait dû échouer");
}

beforeEach(() => {
  recuperer.mockReset();
  global.fetch = recuperer as unknown as typeof fetch;
  jest.mocked(lireJetons).mockResolvedValue(JETONS);
  jest.mocked(ecrireJetons).mockResolvedValue(undefined);
  jest.mocked(oublierSession).mockResolvedValue(undefined);
  auMomentDeLaDeconnexion(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("La forme d'une requête", () => {
  it("préfixe l'adresse de l'API, joint le jeton et rend le corps JSON", async () => {
    recuperer.mockResolvedValue(reponse(200, { id: "colis-1" }));

    const lu = await http.get<{ id: string }>("/shipments/colis-1");

    expect(lu).toEqual({ id: "colis-1" });
    expect(requete(0)[0]).toBe("https://api.test/api/v1/shipments/colis-1");
    expect(requete(0)[1].method).toBe("GET");
    expect(enTetes(0)).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer acces-1",
    });
  });

  it("n'autorise aucun cache : une liste affichée est celle du serveur à l'instant", async () => {
    recuperer.mockResolvedValue(reponse(200, []));

    await http.get("/search");

    expect(requete(0)[1].cache).toBe("no-store");
  });

  it("sérialise le corps d'un POST, d'un PATCH et d'un PUT", async () => {
    recuperer.mockResolvedValue(reponse(200, {}));

    await http.post("/a", { kilos: 5 });
    await http.patch("/b", { nom: "Diallo" });
    await http.put("/c", { sujets: ["colis"] });

    expect([requete(0)[1].method, requete(0)[1].body]).toEqual(["POST", '{"kilos":5}']);
    expect([requete(1)[1].method, requete(1)[1].body]).toEqual([
      "PATCH",
      '{"nom":"Diallo"}',
    ]);
    expect([requete(2)[1].method, requete(2)[1].body]).toEqual([
      "PUT",
      '{"sujets":["colis"]}',
    ]);
  });

  it("n'envoie aucun corps quand il n'y en a pas", async () => {
    recuperer.mockResolvedValue(reponse(200, {}));

    await http.post("/payments/shipments/e-1/payment");

    expect(requete(0)[1].body).toBeUndefined();
  });

  it("ne lit ni ne joint de jeton sur une route publique", async () => {
    recuperer.mockResolvedValue(reponse(200, []));

    await http.get("/airports", { authentifie: false });

    expect(lireJetons).not.toHaveBeenCalled();
    expect(enTetes(0)).toEqual({ "Content-Type": "application/json" });
  });

  it("part sans jeton quand personne n'est connecté", async () => {
    jest.mocked(lireJetons).mockResolvedValue(null);
    recuperer.mockResolvedValue(reponse(200, []));

    await http.get("/search");

    expect(enTetes(0).Authorization).toBeUndefined();
  });

  it("rend `undefined` sur un 204, sans chercher de corps", async () => {
    recuperer.mockResolvedValue(reponse(204));

    await expect(http.delete("/users/me")).resolves.toBeUndefined();
    expect(requete(0)[1].method).toBe("DELETE");
  });

  it("laisse le moteur poser l'en-tête d'un formulaire : pas de Content-Type écrit à la main", async () => {
    recuperer.mockResolvedValue(reponse(200, {}));
    const formulaire = new FormData();

    await http.postFormulaire("/verifications/documents", () => formulaire);

    expect(enTetes(0)["Content-Type"]).toBeUndefined();
    expect(requete(0)[1].body).toBe(formulaire);
    expect(requete(0)[1].method).toBe("POST");
  });

  it("remplace un fichier par un PUT en formulaire", async () => {
    recuperer.mockResolvedValue(reponse(200, {}));

    await http.putFormulaire("/verifications/documents/d-1", () => new FormData());

    expect(requete(0)[1].method).toBe("PUT");
    expect(enTetes(0)["Content-Type"]).toBeUndefined();
  });
});

describe("Les refus du serveur", () => {
  it("rend le message, le statut, le code et le champ tels que le serveur les donne", async () => {
    recuperer.mockResolvedValue(
      reponse(422, {
        error: {
          code: "validation_error",
          message: "Le poids dépasse la place restante.",
          details: { reason: "capacity_exceeded", field: "kilos", restant: 3 },
        },
      }),
    );

    const erreur = await echecDe(http.post("/shipments", { kilos: 12 }));

    expect(erreur.message).toBe("Le poids dépasse la place restante.");
    expect(erreur.statut).toBe(422);
    expect(erreur.raison).toBe("capacity_exceeded");
    expect(erreur.champ).toBe("kilos");
    expect(erreur.details).toEqual({
      reason: "capacity_exceeded",
      field: "kilos",
      restant: 3,
    });
    expect(erreur.estReseau).toBe(false);
  });

  it("dit que le service est indisponible quand le corps de l'erreur est illisible", async () => {
    recuperer.mockResolvedValue(reponse(502));

    const erreur = await echecDe(http.get("/search"));

    expect(erreur.message).toBe("Le service est momentanément indisponible.");
    expect(erreur.statut).toBe(502);
    expect(erreur.raison).toBeUndefined();
  });
});

describe("Les pannes de transport", () => {
  it("rend une erreur « réseau » qui dit de réessayer, et journalise la cause avec l'adresse", async () => {
    const journal = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    recuperer.mockRejectedValue(new TypeError("Network request failed"));

    const erreur = await echecDe(http.get("/search"));

    expect(erreur.estReseau).toBe(true);
    expect(erreur.statut).toBe(0);
    expect(erreur.raison).toBe("reseau_injoignable");
    expect(erreur.message).toBe(
      "Connexion impossible. Vérifiez votre réseau, puis réessayez.",
    );
    expect(journal).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.test/api/v1/search — TypeError: Network request failed",
      ),
    );
  });

  it("abandonne une requête sans réponse au bout de douze secondes", async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    recuperer.mockImplementation(
      (_adresse, init) =>
        new Promise((_resoudre, rejeter) => {
          init.signal?.addEventListener("abort", () =>
            rejeter(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const attendu = echecDe(http.get("/search"));
    await jest.advanceTimersByTimeAsync(11_999);
    expect(requete(0)[1].signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);

    expect((await attendu).estReseau).toBe(true);
  });
});

describe("La session expirée", () => {
  const SESSION_NEUVE = { access_token: "acces-2", refresh_token: "rafraichissement-2" };

  /** Le serveur refuse l'ancien jeton d'accès et accepte le nouveau. */
  function serveurQuiFaitTourner() {
    recuperer.mockImplementation((adresse, init) => {
      if (adresse.endsWith("/auth/refresh")) {
        return Promise.resolve(reponse(200, SESSION_NEUVE));
      }
      const jeton = (init.headers as Record<string, string>).Authorization;
      return Promise.resolve(
        jeton === "Bearer acces-2" ? reponse(200, { ok: true }) : reponse(401, {}),
      );
    });
  }

  it("renouvelle la session et rejoue la requête, sans que l'appelant en sache rien", async () => {
    serveurQuiFaitTourner();

    const lu = await http.get("/users/me");

    expect(lu).toEqual({ ok: true });
    expect(rafraichissements()).toHaveLength(1);
    expect(rafraichissements()[0]?.[1].body).toBe(
      '{"refresh_token":"rafraichissement-1"}',
    );
    expect(ecrireJetons).toHaveBeenCalledWith({
      acces: "acces-2",
      rafraichissement: "rafraichissement-2",
    });
    expect(enTetes(2).Authorization).toBe("Bearer acces-2");
  });

  it("ne consomme qu'un jeton de rafraîchissement quand trois requêtes expirent ensemble", async () => {
    serveurQuiFaitTourner();

    const lus = await Promise.all([
      http.get("/users/me"),
      http.get("/shipments"),
      http.get("/conversations"),
    ]);

    expect(lus).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(rafraichissements()).toHaveLength(1);
    expect(ecrireJetons).toHaveBeenCalledTimes(1);
    expect(oublierSession).not.toHaveBeenCalled();
  });

  it("peut renouveler de nouveau plus tard : le verrou se relâche après usage", async () => {
    serveurQuiFaitTourner();

    await http.get("/users/me");
    await http.get("/shipments");

    expect(rafraichissements()).toHaveLength(2);
  });

  it("refabrique le formulaire à la reprise : un corps déjà envoyé partirait vide", async () => {
    serveurQuiFaitTourner();
    const fabriquer = jest.fn(() => new FormData());

    await http.postFormulaire("/verifications/documents", fabriquer);

    expect(fabriquer).toHaveBeenCalledTimes(2);
  });

  it("oublie la session et prévient l'accueil quand le serveur refuse le renouvellement", async () => {
    const accueil = jest.fn();
    auMomentDeLaDeconnexion(accueil);
    recuperer.mockImplementation((adresse) =>
      Promise.resolve(
        adresse.endsWith("/auth/refresh")
          ? reponse(401, { error: { message: "Session révoquée." } })
          : reponse(401, {
              error: { message: "Votre session a expiré. Reconnectez-vous." },
            }),
      ),
    );

    const erreur = await echecDe(http.get("/users/me"));

    expect(oublierSession).toHaveBeenCalledTimes(1);
    expect(accueil).toHaveBeenCalledTimes(1);
    expect(erreur.statut).toBe(401);
    expect(erreur.message).toBe("Votre session a expiré. Reconnectez-vous.");
    // La requête d'origine n'est pas rejouée sans jeton neuf.
    expect(recuperer).toHaveBeenCalledTimes(2);
  });

  it("garde la session quand le renouvellement échoue faute de réseau : on est dans le métro, pas déconnecté", async () => {
    const accueil = jest.fn();
    auMomentDeLaDeconnexion(accueil);
    recuperer.mockImplementation((adresse) =>
      adresse.endsWith("/auth/refresh")
        ? Promise.reject(new TypeError("Network request failed"))
        : Promise.resolve(reponse(401, {})),
    );

    const erreur = await echecDe(http.get("/users/me"));

    expect(erreur.statut).toBe(401);
    expect(oublierSession).not.toHaveBeenCalled();
    expect(accueil).not.toHaveBeenCalled();
    expect(ecrireJetons).not.toHaveBeenCalled();
  });

  it("n'essaie qu'une reprise : un second 401 est rendu, sans boucle", async () => {
    recuperer.mockImplementation((adresse) =>
      Promise.resolve(
        adresse.endsWith("/auth/refresh")
          ? reponse(200, SESSION_NEUVE)
          : reponse(401, { error: { message: "Accès refusé." } }),
      ),
    );

    const erreur = await echecDe(http.get("/users/me"));

    expect(erreur.statut).toBe(401);
    expect(rafraichissements()).toHaveLength(1);
    // La requête, le renouvellement, la reprise : trois appels, pas un de plus.
    expect(recuperer).toHaveBeenCalledTimes(3);
  });

  it("ne tente aucun renouvellement sans session, ni sur une route publique", async () => {
    recuperer.mockResolvedValue(reponse(401, { error: { message: "Code invalide." } }));

    jest.mocked(lireJetons).mockResolvedValue(null);
    await echecDe(http.get("/users/me"));
    jest.mocked(lireJetons).mockResolvedValue(JETONS);
    await echecDe(
      http.post("/auth/login/verify", { code: "000000" }, { authentifie: false }),
    );

    expect(rafraichissements()).toHaveLength(0);
  });

  it("n'efface rien quand il n'y a plus de jetons à renouveler", async () => {
    jest.mocked(lireJetons).mockResolvedValueOnce(JETONS).mockResolvedValue(null);
    recuperer.mockResolvedValue(reponse(401, {}));

    const erreur = await echecDe(http.get("/users/me"));

    expect(erreur.statut).toBe(401);
    expect(rafraichissements()).toHaveLength(0);
    expect(oublierSession).not.toHaveBeenCalled();
  });

  it("rend une erreur « réseau » quand la reprise elle-même ne part pas", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    let premiere = true;
    recuperer.mockImplementation((adresse) => {
      if (adresse.endsWith("/auth/refresh")) {
        return Promise.resolve(reponse(200, SESSION_NEUVE));
      }
      if (premiere) {
        premiere = false;
        return Promise.resolve(reponse(401, {}));
      }
      return Promise.reject(new TypeError("Network request failed"));
    });

    const erreur = await echecDe(http.get("/users/me"));

    expect(erreur.estReseau).toBe(true);
  });
});

describe("versJetons", () => {
  it("traduit la session du serveur sans rien y ajouter", () => {
    expect(versJetons({ access_token: "a", refresh_token: "r" })).toEqual({
      acces: "a",
      rafraichissement: "r",
    });
  });
});
