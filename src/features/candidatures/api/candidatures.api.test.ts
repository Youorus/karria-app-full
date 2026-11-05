/**
 * La traduction des dossiers (`candidatures.api.ts`) : brut → app dans les
 * deux sens, sur la forme exacte du contrat `docs/contrat-api-candidatures.md`.
 */

import { describe, expect, it } from "@jest/globals";

import {
  versCarteDossier,
  versCvBrut,
  versDossier,
  versExport,
  versLettreBrute,
  versProposition,
} from "./candidatures.api";
import type {
  CarteDossierBrute,
  DossierBrut,
  PropositionBrute,
} from "../types/candidatures.types";

const dossierBrut: DossierBrut = {
  id: "9a4b",
  offer: {
    offer_id: "fc64",
    title: "Conseillère de vente prêt-à-porter",
    company: "Maison Lemaire",
    logo_url: "https://storage.karria.fr/abc/128.webp",
    website: "https://lemaire.example",
    city: "Lyon 3e",
    contract: "cdi",
    contract_label: "CDI",
    source_url: "https://jobs.example/123",
    excerpt: "Nous recherchons une conseillère…",
    description: "Nous recherchons…",
    keywords: ["conseillere de vente", "caisse"],
    published_at: "2026-11-01T00:00:00Z",
  },
  template_id: null,
  cv: {
    summary: "Conseillère depuis trois ans.",
    identity: {
      first_name: "Awa",
      last_name: "Diallo",
      headline: "Conseillère de vente",
    },
    contact: { email: "awa@exemple.fr", phone: null, city: "Montreuil", links: [] },
    experiences: [
      {
        position: "Vendeuse",
        company: "Zara",
        location: "Paris",
        start_date: "2022-09",
        end_date: null,
        is_current: true,
        missions: ["Accueillir et conseiller les clients"],
      },
    ],
    educations: [],
    skills: [{ name: "Caisse", level: "Avancé" }],
    languages: [{ language: "Anglais", level: "B2" }],
    interests: [],
  },
  cv_base_hash: "3f9a",
  base_changed: false,
  propositions: [
    {
      id: "7c1d",
      path: "identity.headline",
      before: "Vendeuse",
      after: "Conseillère de vente",
      reason: "L'offre nomme le poste ainsi.",
      state: "acceptee",
    },
  ],
  letter: {
    recipient: "Madame, Monsieur,",
    subject: "Candidature au poste de Conseillère de vente",
    paragraphs: [{ kind: "interet_entreprise", text: "Votre maison…" }],
    closing: "Je vous prie d'agréer…",
  },
  coverage: { present: ["caisse"], missing: ["merchandising"], ratio: 0.5 },
  status: "pret",
  adaptation: "faite",
  adaptation_error: null,
  applied_at: null,
  created_at: "2026-11-05T10:00:00Z",
  updated_at: "2026-11-05T10:00:04Z",
};

describe("La traduction d'un dossier", () => {
  it("traduit l'offre figée, le CV, les propositions, la lettre et la couverture", () => {
    const d = versDossier(dossierBrut);
    expect(d.offre).toMatchObject({
      id: "fc64",
      titre: "Conseillère de vente prêt-à-porter",
      entreprise: "Maison Lemaire",
      ville: "Lyon 3e",
      contrat: "CDI",
      lienCandidature: "https://jobs.example/123",
      motsCles: ["conseillere de vente", "caisse"],
    });
    expect(d.cv.identite?.titre).toBe("Conseillère de vente");
    expect(d.cv.photo).toBeNull();
    expect(d.cv.experiences[0]?.missions).toEqual([
      "Accueillir et conseiller les clients",
    ]);
    expect(d.cv.vide).toBe(false);
    expect(d.propositions[0]).toEqual({
      id: "7c1d",
      chemin: "identity.headline",
      avant: "Vendeuse",
      apres: "Conseillère de vente",
      raison: "L'offre nomme le poste ainsi.",
      etat: "acceptee",
    });
    expect(d.lettre?.objet).toBe("Candidature au poste de Conseillère de vente");
    expect(d.lettre?.paragraphes[0]).toEqual({
      sorte: "interet_entreprise",
      texte: "Votre maison…",
    });
    expect(d.couverture).toEqual({
      presents: ["caisse"],
      manquants: ["merchandising"],
      ratio: 0.5,
    });
    expect(d.statut).toBe("pret");
    expect(d.erreurAdaptation).toBeNull();
    expect(d.candidateLe).toBeNull();
  });

  it("traduit l'erreur d'adaptation et l'absence de lettre", () => {
    const d = versDossier({
      ...dossierBrut,
      letter: null,
      adaptation: "echouee",
      adaptation_error: "ai_unavailable",
    });
    expect(d.lettre).toBeNull();
    expect(d.erreurAdaptation).toBe("ia_indisponible");
  });

  it("reconnaît une proposition qui réordonne des compétences ou des expériences", () => {
    const competences: PropositionBrute = {
      id: "9f30",
      path: "skills",
      before: [{ name: "Caisse", level: "Avancé" }],
      after: [{ name: "Relation client", level: "Expert" }],
      reason: "La relation client d'abord.",
      state: "proposee",
    };
    expect(versProposition(competences).apres).toEqual([
      { nom: "Relation client", niveau: "Expert" },
    ]);
    const experiences: PropositionBrute = {
      ...competences,
      path: "experiences",
      before: [],
      after: [
        {
          position: "Vendeuse",
          company: "Zara",
          location: null,
          start_date: null,
          end_date: null,
          is_current: false,
          missions: null,
        },
      ],
    };
    const apres = versProposition(experiences).apres;
    expect(apres).toEqual([
      {
        poste: "Vendeuse",
        entreprise: "Zara",
        lieu: null,
        debut: null,
        fin: null,
        enCours: false,
        missions: [],
      },
    ]);
    expect(versProposition(experiences).avant).toEqual([]);
  });

  it("traduit une carte de la liste", () => {
    const carte: CarteDossierBrute = {
      id: "9a4b",
      offer: {
        offer_id: "fc64",
        title: "Conseillère",
        company: "Maison Lemaire",
        logo_url: null,
        city: "Lyon",
        contract_label: "CDI",
        source_url: null,
      },
      template_id: "mod1",
      status: "candidate",
      adaptation: "faite",
      coverage_ratio: 0.75,
      pending_propositions: 0,
      has_letter: true,
      applied_at: "2026-11-06T09:12:00Z",
      created_at: "2026-11-05T10:00:00Z",
      updated_at: "2026-11-06T09:12:00Z",
    };
    expect(versCarteDossier(carte)).toMatchObject({
      id: "9a4b",
      modeleId: "mod1",
      statut: "candidate",
      couverture: 0.75,
      propositionsEnAttente: 0,
      aUneLettre: true,
      candidateLe: "2026-11-06T09:12:00Z",
    });
    expect(versCarteDossier(carte).offre.logo).toBeNull();
    expect(versCarteDossier(carte).offre.motsCles).toEqual([]);
  });

  it("repasse le CV et la lettre en forme réseau, sans rien perdre", () => {
    const d = versDossier(dossierBrut);
    expect(versCvBrut(d.cv)).toEqual(dossierBrut.cv);
    expect(versLettreBrute(d.lettre!)).toEqual(dossierBrut.letter);
  });

  it("traduit un export : une lettre, ou un CV par défaut", () => {
    expect(
      versExport({
        id: "e1",
        kind: "letter",
        created_at: "2026-11-06T10:00:00Z",
        pdf_url: "https://s/lettre.pdf",
        template: { id: "t", label: "Meridian", version: 1 },
      }),
    ).toEqual({
      id: "e1",
      genre: "lettre",
      modele: "Meridian",
      creeLe: "2026-11-06T10:00:00Z",
      pdf: "https://s/lettre.pdf",
      docx: null,
    });
    expect(versExport({ id: "e2", created_at: "2026-11-06T10:00:00Z" }).genre).toBe("cv");
  });
});
