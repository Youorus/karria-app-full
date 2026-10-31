/**
 * La machine de la dictée, rejouée sans micro : les deux modes, les gestes,
 * les fins imprévues, et ce qu'on montre.
 */

import { describe, expect, it } from "@jest/globals";

import {
  AVERTISSEMENT_MS,
  formaterDuree,
  fusionner,
  interpreterErreur,
  joindre,
  LIMITE_MS,
  niveauDepuisDecibels,
  niveauDepuisVolume,
  presqueFini,
  reduire,
  REPOS,
  texteDicte,
  type EtatDictee,
  type EvenementDictee,
} from "./dictee";

/** Enchaîne des événements et rend l'état final avec la dernière sortie. */
function rejouer(evenements: EvenementDictee[], depuis: EtatDictee = REPOS) {
  let etat = depuis;
  let sortie = null;
  for (const e of evenements) {
    const t = reduire(etat, e);
    etat = t.etat;
    if (t.sortie !== null) sortie = t.sortie;
  }
  return { etat, sortie };
}

describe("le mode appareil : le texte s'écrit pendant qu'on parle", () => {
  it("passe par le démarrage, puis écoute", () => {
    const { etat } = rejouer([{ type: "demarrer", mode: "appareil" }, { type: "pret" }]);
    expect(etat).toEqual({ nom: "ecoute", mode: "appareil", confirme: "", partiel: "" });
  });

  it("montre le partiel, puis le confirme", () => {
    const { etat } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "pret" },
      { type: "resultat", texte: "je cherche", final: false },
      { type: "resultat", texte: "je cherche un poste", final: false },
    ]);
    expect(texteDicte(etat)).toBe("je cherche un poste");

    const suite = reduire(etat, {
      type: "resultat",
      texte: "Je cherche un poste de développeur.",
      final: true,
    });
    expect(suite.etat).toMatchObject({
      confirme: "Je cherche un poste de développeur.",
      partiel: "",
    });
  });

  it("un résultat qui arrive avant « prêt » ouvre l'écoute quand même", () => {
    const { etat } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "resultat", texte: "bonjour", final: false },
    ]);
    expect(etat).toEqual({
      nom: "ecoute",
      mode: "appareil",
      confirme: "",
      partiel: "bonjour",
    });
  });

  it("terminer attend le dernier mot du système, puis rend le texte", () => {
    const { etat, sortie } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "pret" },
      { type: "resultat", texte: "un poste à Lyon", final: false },
      { type: "terminer" },
    ]);
    expect(etat.nom).toBe("cloture");
    expect(sortie).toBeNull();

    const fin = rejouer(
      [{ type: "resultat", texte: "Un poste à Lyon.", final: true }, { type: "fin" }],
      etat,
    );
    expect(fin.etat).toEqual(REPOS);
    expect(fin.sortie).toEqual({ type: "texte", texte: "Un poste à Lyon." });
  });

  it("une erreur à la clôture n'en est pas une : on garde ce qu'on a", () => {
    const { sortie } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "pret" },
      { type: "resultat", texte: "alternance data", final: false },
      { type: "terminer" },
      { type: "echec", message: "no-speech" },
    ]);
    expect(sortie).toEqual({ type: "texte", texte: "alternance data" });
  });

  it("le système qui coupe pendant l'écoute rend ce qui a été entendu", () => {
    const { etat, sortie } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "pret" },
      { type: "resultat", texte: "Je veux", final: true },
      { type: "resultat", texte: "changer de ville", final: false },
      { type: "fin" },
    ]);
    expect(etat).toEqual(REPOS);
    expect(sortie).toEqual({ type: "texte", texte: "Je veux changer de ville" });
  });

  it("une fin sans un mot le dit", () => {
    const { sortie } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "pret" },
      { type: "fin" },
    ]);
    expect(sortie).toEqual({ type: "rien" });
  });

  it("une erreur sans texte devient un problème à afficher", () => {
    const { sortie } = rejouer([
      { type: "demarrer", mode: "appareil" },
      { type: "pret" },
      { type: "echec", message: "Le micro ne répond pas." },
    ]);
    expect(sortie).toEqual({ type: "probleme", message: "Le micro ne répond pas." });
  });

  it("annuler ne rend rien, à aucune étape", () => {
    for (const avant of [
      [{ type: "demarrer", mode: "appareil" }],
      [{ type: "demarrer", mode: "appareil" }, { type: "pret" }],
      [
        { type: "demarrer", mode: "appareil" },
        { type: "pret" },
        { type: "resultat", texte: "un texte", final: false },
        { type: "terminer" },
      ],
    ] satisfies EvenementDictee[][]) {
      const { etat, sortie } = rejouer([...avant, { type: "annuler" }]);
      expect(etat).toEqual(REPOS);
      expect(sortie).toBeNull();
    }
  });

  it("au repos, seuls « démarrer » et « transcrire encore » comptent", () => {
    expect(reduire(REPOS, { type: "pret" }).etat).toEqual(REPOS);
    expect(reduire(REPOS, { type: "fin" }).sortie).toBeNull();
    expect(reduire(REPOS, { type: "terminer" }).etat).toEqual(REPOS);
  });
});

describe("le mode serveur : la voix part à la fin", () => {
  it("terminer envoie, et le texte du serveur revient", () => {
    const { etat, sortie } = rejouer([
      { type: "demarrer", mode: "serveur" },
      { type: "pret" },
      { type: "terminer" },
    ]);
    expect(etat).toEqual({ nom: "transcription" });
    expect(sortie).toBeNull();

    const fin = reduire(etat, { type: "texte-serveur", texte: "Bonjour Karria." });
    expect(fin.etat).toEqual(REPOS);
    expect(fin.sortie).toEqual({ type: "texte", texte: "Bonjour Karria." });
  });

  it("un serveur qui n'a rien compris le dit", () => {
    const fin = reduire({ nom: "transcription" }, { type: "texte-serveur", texte: "  " });
    expect(fin.sortie).toEqual({ type: "rien" });
  });

  it("un échec de transcription est un problème", () => {
    const fin = reduire(
      { nom: "transcription" },
      { type: "echec", message: "Je ne t'ai pas bien entendu." },
    );
    expect(fin.etat).toEqual(REPOS);
    expect(fin.sortie).toEqual({
      type: "probleme",
      message: "Je ne t'ai pas bien entendu.",
    });
  });

  it("après l'accord sur l'IA, la transcription repart depuis le repos", () => {
    expect(reduire(REPOS, { type: "transcrire-encore" }).etat).toEqual({
      nom: "transcription",
    });
  });

  it("les résultats partiels n'existent pas dans ce mode, et ne cassent rien", () => {
    const { etat } = rejouer([
      { type: "demarrer", mode: "serveur" },
      { type: "pret" },
      { type: "resultat", texte: "x", final: false },
    ]);
    expect(texteDicte(etat)).toBe("x");
  });
});

describe("joindre et fusionner", () => {
  it("joint sans doubler les espaces", () => {
    expect(joindre("", "b")).toBe("b");
    expect(joindre("a ", "  ")).toBe("a");
    expect(joindre("a", "b")).toBe("a b");
  });

  it("remplace quand le final répète tout (iOS), ajoute sinon (Android)", () => {
    expect(fusionner("", "Bonjour.")).toBe("Bonjour.");
    expect(fusionner("Bonjour", "Bonjour tout le monde.")).toBe("Bonjour tout le monde.");
    expect(fusionner("Bonjour.", "Je cherche.")).toBe("Bonjour. Je cherche.");
  });
});

describe("les erreurs du système, traduites", () => {
  it("ignore ce qu'on a provoqué, finit sur le silence, replie sur la langue", () => {
    expect(interpreterErreur("aborted")).toEqual({ type: "ignorer" });
    expect(interpreterErreur("no-speech")).toEqual({ type: "fin" });
    expect(interpreterErreur("interrupted")).toEqual({ type: "fin" });
    expect(interpreterErreur("language-not-supported")).toEqual({ type: "repli" });
    expect(interpreterErreur("service-not-allowed")).toEqual({ type: "repli" });
  });

  it("dit quoi faire pour un refus, et reste lisible pour l'inconnu", () => {
    expect(interpreterErreur("not-allowed")).toMatchObject({ type: "probleme" });
    expect(interpreterErreur("quelque-chose")).toMatchObject({
      type: "probleme",
      message: expect.stringContaining("Réessaie"),
    });
  });
});

describe("ce qu'on montre", () => {
  it("le niveau suit la voix, pas le bruit de fond", () => {
    expect(niveauDepuisVolume(-2)).toBe(0);
    expect(niveauDepuisVolume(1)).toBe(0);
    expect(niveauDepuisVolume(4.5)).toBeCloseTo(0.5);
    expect(niveauDepuisVolume(10)).toBe(1);
    expect(niveauDepuisVolume(Number.NaN)).toBe(0);
  });

  it("le niveau depuis les décibels du compteur d'enregistrement", () => {
    expect(niveauDepuisDecibels(-60)).toBe(0);
    expect(niveauDepuisDecibels(0)).toBe(1);
    expect(niveauDepuisDecibels(-27.5)).toBeCloseTo(0.5);
  });

  it("la minuterie en m:ss", () => {
    expect(formaterDuree(0)).toBe("0:00");
    expect(formaterDuree(7_400)).toBe("0:07");
    expect(formaterDuree(102_000)).toBe("1:42");
    expect(formaterDuree(-5)).toBe("0:00");
  });

  it("prévient dans les dernières secondes", () => {
    expect(presqueFini(0)).toBe(false);
    expect(presqueFini(LIMITE_MS - AVERTISSEMENT_MS - 1)).toBe(false);
    expect(presqueFini(LIMITE_MS - AVERTISSEMENT_MS)).toBe(true);
  });
});
