/**
 * Les règles de la demande d'avis (`regles-avis.ts`) : chaque condition,
 * chaque plafond, et ce qui compte — ou non — comme un succès, une session,
 * une erreur.
 */

import { describe, expect, it } from "@jest/globals";

import {
  adressesPourNoter,
  compterSession,
  compterSucces,
  DELAI_DEMANDE_MS,
  ECART_APRES_PROPOSITION_MS,
  ECART_ENTRE_DEMANDES_MS,
  estUneErreurGenante,
  estUneNouvelleSession,
  estUnEtatAvis,
  ETAT_VIDE,
  jourLocal,
  noterDemande,
  PAUSE_DE_SESSION_MS,
  peutDemander,
  refusDeDemander,
  UN_JOUR_MS,
  type ContexteAvis,
  type EtatAvis,
} from "./regles-avis";

const MAINTENANT = new Date(2026, 10, 20, 15, 0, 0).getTime();

/** Quelqu'un qui remplit toutes les conditions. */
function etat(partiel: Partial<EtatAvis> = {}): EtatAvis {
  return {
    sessions: 3,
    jours: ["2026-11-19", "2026-11-20"],
    succes: 2,
    offresGardees: 0,
    demandes: [],
    versionDemandee: null,
    ...partiel,
  };
}

function contexte(partiel: Partial<ContexteAvis> = {}): ContexteAvis {
  return {
    version: "1.2.0",
    erreurDansLaSession: false,
    miseAJourBloquante: false,
    consentementPubMontre: false,
    derniereProposition: null,
    ...partiel,
  };
}

describe("Les conditions cumulées", () => {
  it("toutes réunies : on peut demander", () => {
    expect(refusDeDemander(etat(), contexte(), MAINTENANT)).toBeNull();
    expect(peutDemander(etat(), contexte(), MAINTENANT)).toBe(true);
  });

  it("jamais à l'installation", () => {
    expect(refusDeDemander(ETAT_VIDE, contexte(), MAINTENANT)).toBe("sessions");
  });

  it("au moins trois sessions", () => {
    expect(refusDeDemander(etat({ sessions: 2 }), contexte(), MAINTENANT)).toBe(
      "sessions",
    );
  });

  it("sur deux jours distincts", () => {
    expect(
      refusDeDemander(
        etat({ sessions: 9, jours: ["2026-11-20"] }),
        contexte(),
        MAINTENANT,
      ),
    ).toBe("jours");
  });

  it("au moins deux succès cumulés", () => {
    expect(refusDeDemander(etat({ succes: 1 }), contexte(), MAINTENANT)).toBe("succes");
  });

  it("aucune erreur d'API ni quota dans la session en cours", () => {
    expect(
      refusDeDemander(etat(), contexte({ erreurDansLaSession: true }), MAINTENANT),
    ).toBe("erreur");
  });

  it("pas d'écran de mise à jour bloquant", () => {
    expect(
      refusDeDemander(etat(), contexte({ miseAJourBloquante: true }), MAINTENANT),
    ).toBe("mise-a-jour");
  });

  it("pas dans la session où le consentement publicitaire a été montré", () => {
    expect(
      refusDeDemander(etat(), contexte({ consentementPubMontre: true }), MAINTENANT),
    ).toBe("consentement");
  });

  it("pas juste après la feuille de filigrane — mais plus tard, oui", () => {
    const juste = contexte({ derniereProposition: MAINTENANT - 60_000 });
    expect(refusDeDemander(etat(), juste, MAINTENANT)).toBe("proposition");
    const limite = contexte({
      derniereProposition: MAINTENANT - ECART_APRES_PROPOSITION_MS + 1,
    });
    expect(refusDeDemander(etat(), limite, MAINTENANT)).toBe("proposition");
    const plusTard = contexte({
      derniereProposition: MAINTENANT - ECART_APRES_PROPOSITION_MS,
    });
    expect(refusDeDemander(etat(), plusTard, MAINTENANT)).toBeNull();
  });
});

describe("Les plafonds", () => {
  it("une demande par version de l'app", () => {
    const deja = etat({
      versionDemandee: "1.2.0",
      demandes: [MAINTENANT - 200 * UN_JOUR_MS],
    });
    expect(refusDeDemander(deja, contexte(), MAINTENANT)).toBe("version");
    expect(refusDeDemander(deja, contexte({ version: "1.3.0" }), MAINTENANT)).toBeNull();
  });

  it("soixante jours au moins entre deux demandes", () => {
    const il_y_a = (jours: number) =>
      etat({ versionDemandee: "1.1.0", demandes: [MAINTENANT - jours * UN_JOUR_MS] });
    expect(refusDeDemander(il_y_a(59), contexte(), MAINTENANT)).toBe("ecart");
    expect(refusDeDemander(il_y_a(60), contexte(), MAINTENANT)).toBeNull();
    expect(ECART_ENTRE_DEMANDES_MS).toBe(60 * UN_JOUR_MS);
  });

  it("trois par 365 jours glissants", () => {
    const trois = etat({
      versionDemandee: "1.1.0",
      demandes: [300, 200, 100].map((j) => MAINTENANT - j * UN_JOUR_MS),
    });
    expect(refusDeDemander(trois, contexte(), MAINTENANT)).toBe("plafond-annuel");
    // La plus ancienne sort de la fenêtre : la place se libère.
    const glisse = etat({
      versionDemandee: "1.1.0",
      demandes: [366, 200, 100].map((j) => MAINTENANT - j * UN_JOUR_MS),
    });
    expect(refusDeDemander(glisse, contexte(), MAINTENANT)).toBeNull();
  });

  it("noter une demande retient la version et oublie celles de plus d'un an", () => {
    const avant = etat({
      versionDemandee: "1.0.0",
      demandes: [MAINTENANT - 400 * UN_JOUR_MS, MAINTENANT - 100 * UN_JOUR_MS],
    });
    const apres = noterDemande(avant, "1.2.0", MAINTENANT);
    expect(apres.versionDemandee).toBe("1.2.0");
    expect(apres.demandes).toEqual([MAINTENANT - 100 * UN_JOUR_MS, MAINTENANT]);
    // Et la demande qu'on vient de faire ferme la porte.
    expect(refusDeDemander(apres, contexte(), MAINTENANT + 1_000)).toBe("version");
    expect(
      refusDeDemander(apres, contexte({ version: "1.3.0" }), MAINTENANT + 1_000),
    ).toBe("ecart");
  });
});

describe("Les sessions", () => {
  it("le lancement en est une ; un retour rapide, non ; après une vraie pause, oui", () => {
    expect(estUneNouvelleSession(null, MAINTENANT)).toBe(true);
    expect(estUneNouvelleSession(MAINTENANT - 60_000, MAINTENANT)).toBe(false);
    expect(estUneNouvelleSession(MAINTENANT - PAUSE_DE_SESSION_MS, MAINTENANT)).toBe(
      true,
    );
  });

  it("compte les sessions et les jours distincts, deux au plus retenus", () => {
    let e = compterSession(ETAT_VIDE, MAINTENANT);
    e = compterSession(e, MAINTENANT + 3_600_000);
    expect(e.sessions).toBe(2);
    expect(e.jours).toEqual([jourLocal(MAINTENANT)]);
    e = compterSession(e, MAINTENANT + UN_JOUR_MS);
    e = compterSession(e, MAINTENANT + 2 * UN_JOUR_MS);
    expect(e.sessions).toBe(4);
    expect(e.jours).toEqual([
      jourLocal(MAINTENANT + UN_JOUR_MS),
      jourLocal(MAINTENANT + 2 * UN_JOUR_MS),
    ]);
  });

  it("écrit le jour à l'heure du téléphone", () => {
    expect(jourLocal(new Date(2026, 0, 5, 23, 59).getTime())).toBe("2026-01-05");
  });
});

describe("Les succès", () => {
  it("un export, un envoi, une candidature, un import comptent tout de suite", () => {
    for (const succes of ["export", "envoi", "candidature", "import"] as const) {
      const r = compterSucces(ETAT_VIDE, succes);
      expect(r.compte).toBe(true);
      expect(r.etat.succes).toBe(1);
    }
  });

  it("une offre gardée ne compte qu'à partir de la deuxième", () => {
    const premiere = compterSucces(ETAT_VIDE, "offre");
    expect(premiere.compte).toBe(false);
    expect(premiere.etat).toMatchObject({ offresGardees: 1, succes: 0 });
    const deuxieme = compterSucces(premiere.etat, "offre");
    expect(deuxieme.compte).toBe(true);
    expect(deuxieme.etat).toMatchObject({ offresGardees: 2, succes: 1 });
    const troisieme = compterSucces(deuxieme.etat, "offre");
    expect(troisieme.compte).toBe(true);
    expect(troisieme.etat).toMatchObject({ offresGardees: 3, succes: 2 });
  });
});

describe("Les erreurs qui gâchent une session", () => {
  it("panne de réseau, panne du serveur, plafond, refus", () => {
    expect(estUneErreurGenante(0, "reseau_injoignable")).toBe(true);
    expect(estUneErreurGenante(500)).toBe(true);
    expect(estUneErreurGenante(503, "ai_unavailable")).toBe(true);
    expect(estUneErreurGenante(429, "portrait_quota_exceeded")).toBe(true);
    expect(estUneErreurGenante(429, "render_rate_limited")).toBe(true);
    expect(estUneErreurGenante(422, "chapter_invalid")).toBe(true);
    expect(estUneErreurGenante(409, "cv_missing")).toBe(true);
    expect(estUneErreurGenante(403, "template_locked")).toBe(true);
  });

  it("pas le fonctionnement normal : session renouvelée, accord IA, « il n'y en a pas »", () => {
    expect(estUneErreurGenante(401, "session_expired")).toBe(false);
    expect(estUneErreurGenante(403, "ai_consent_required")).toBe(false);
    expect(estUneErreurGenante(404)).toBe(false);
  });
});

describe("L'état retenu", () => {
  it("accepte un état sain, refuse un état abîmé", () => {
    expect(estUnEtatAvis(ETAT_VIDE)).toBe(true);
    expect(estUnEtatAvis(etat({ demandes: [MAINTENANT] }))).toBe(true);
    expect(estUnEtatAvis(null)).toBe(false);
    expect(estUnEtatAvis({ ...ETAT_VIDE, sessions: -1 })).toBe(false);
    expect(estUnEtatAvis({ ...ETAT_VIDE, demandes: ["hier"] })).toBe(false);
    expect(estUnEtatAvis({ sessions: 3 })).toBe(false);
  });
});

describe("Ce qui ne dépend pas des règles", () => {
  it("la demande part entre 1,5 et 2 secondes après le succès", () => {
    expect(DELAI_DEMANDE_MS).toBeGreaterThanOrEqual(1_500);
    expect(DELAI_DEMANDE_MS).toBeLessThanOrEqual(2_000);
  });

  it("« Noter Karria » : la fiche iOS, ou Google Play puis son repli", () => {
    expect(adressesPourNoter("ios")).toEqual([
      "https://apps.apple.com/app/id6776608930?action=write-review",
    ]);
    expect(adressesPourNoter("android")).toEqual([
      "market://details?id=com.karria.app",
      "https://play.google.com/store/apps/details?id=com.karria.app",
    ]);
  });
});
