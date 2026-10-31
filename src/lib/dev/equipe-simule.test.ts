/**
 * Le faux serveur de « Parler à l'équipe » : il fige ce que l'écran attend
 * de `docs/contrat-api-equipe.md` — le fil, le non-lu, les refus, et le
 * flux en direct qui livre la réponse de l'équipe.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  estUneRouteEquipe,
  ouvrirFluxSimule,
  reinitialiserEquipe,
  repondreEquipe,
  type MessageSimule,
} from "./equipe-simule";

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = repondreEquipe(methode, chemin, corps);
  const texte = await reponse.text();
  return { statut: reponse.status, corps: texte === "" ? undefined : JSON.parse(texte) };
}

function formulaire(parties: Record<string, unknown>[]) {
  return { getParts: () => parties };
}

describe("le faux serveur de l'équipe", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    reinitialiserEquipe();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("reconnaît ses routes", () => {
    expect(estUneRouteEquipe("/support/me")).toBe(true);
    expect(estUneRouteEquipe("/support/me/stream?since=x")).toBe(true);
    expect(estUneRouteEquipe("/payments/me")).toBe(false);
  });

  it("ouvre un fil vide, sans non-lu", async () => {
    const { statut, corps } = await appeler("GET", "/support/me");
    expect(statut).toBe(200);
    expect(corps).toMatchObject({ has_unread: false, messages: [] });
  });

  it("refuse un texte vide", async () => {
    const { statut, corps } = await appeler("POST", "/support/me/messages", {
      body: "  ",
    });
    expect(statut).toBe(422);
    expect(corps.error.details.reason).toBe("support_message_empty");
  });

  it("répond au nom de l'équipe, et allume le non-lu jusqu'à la lecture", async () => {
    const { statut, corps } = await appeler("POST", "/support/me/messages", {
      body: "Salut",
    });
    expect(statut).toBe(201);
    expect(corps).toMatchObject({ author: "user", kind: "text", body: "Salut" });

    jest.advanceTimersByTime(4_000);
    expect((await appeler("GET", "/support/me/unread")).corps.has_unread).toBe(true);
    const fil = (await appeler("GET", "/support/me")).corps;
    expect(fil.messages.map((m: MessageSimule) => m.author)).toEqual(["user", "team"]);

    expect((await appeler("POST", "/support/me/read")).statut).toBe(204);
    expect((await appeler("GET", "/support/me/unread")).corps.has_unread).toBe(false);
  });

  it("dépose un vocal avec sa durée, refuse un type inconnu et un vocal trop long", async () => {
    const vocal = await appeler(
      "POST",
      "/support/me/messages/media",
      formulaire([
        { fieldName: "file", uri: "file:///v.m4a", type: "audio/mp4" },
        { fieldName: "duration_ms", string: "7400" },
      ]),
    );
    expect(vocal.statut).toBe(201);
    expect(vocal.corps).toMatchObject({
      kind: "voice",
      attachment: { duration_ms: 7400 },
    });

    const pdf = await appeler(
      "POST",
      "/support/me/messages/media",
      formulaire([{ fieldName: "file", uri: "file:///x.pdf", type: "application/pdf" }]),
    );
    expect(pdf.corps.error.details.reason).toBe("support_media_unsupported");

    const long = await appeler(
      "POST",
      "/support/me/messages/media",
      formulaire([
        { fieldName: "file", uri: "file:///v.m4a", type: "audio/mp4" },
        { fieldName: "duration_ms", string: String(6 * 60 * 1000) },
      ]),
    );
    expect(long.corps.error.details.reason).toBe("support_voice_too_long");
  });

  it("livre en direct la réponse de l'équipe, et rattrape depuis `depuis`", async () => {
    const recus: MessageSimule[] = [];
    const ouvert = jest.fn();
    const flux = await ouvrirFluxSimule({
      depuis: null,
      surMessage: (m) => recus.push(m),
      surOuvert: ouvert,
    });
    await Promise.resolve();
    expect(ouvert).toHaveBeenCalled();

    await appeler("POST", "/support/me/messages", { body: "Bonjour" });
    jest.advanceTimersByTime(4_000);
    // Le message de la personne revient aussi (autres appareils), puis la réponse.
    expect(recus.map((m) => m.author)).toEqual(["user", "team"]);

    flux.signalerLu();
    expect((await appeler("GET", "/support/me/unread")).corps.has_unread).toBe(false);
    flux.fermer();

    const rattrapes: MessageSimule[] = [];
    await ouvrirFluxSimule({
      depuis: recus[0].created_at,
      surMessage: (m) => rattrapes.push(m),
      surOuvert: () => undefined,
    });
    await Promise.resolve();
    expect(rattrapes.map((m) => m.author)).toEqual(["team"]);
  });
});
