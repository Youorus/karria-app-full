/**
 * Le CV et son brouillon — les routes de `docs/contrat-api-cv.md`.
 *
 * - `GET /cv/me` : le CV (au format V1, plus l'identité et le contact).
 * - `GET|POST /cv/draft` : le brouillon, pour reprendre où l'on s'était
 *   arrêté, sur n'importe quel appareil.
 * - `POST /cv/draft/interpret` : une réponse libre → un premier jet.
 * - `PUT /cv/draft/chapters/{c}` : valider (ou passer) un chapitre.
 * - `POST /cv/draft/finalize` : le brouillon devient le CV.
 * - `POST /cv/import` : un CV existant (PDF, Word, photo) devient un
 *   brouillon pré-rempli de **propositions**, à valider chapitre par
 *   chapitre — rien n'est validé à la place de l'utilisateur.
 * - `POST /voice/transcribe` : la voix devient du texte.
 *
 * La traduction va dans les deux sens : ce qui part au serveur repasse en
 * `snake_case` ici, et nulle part ailleurs.
 */

import { ErreurApi, http } from "@/lib/http";
import {
  CHAPITRES,
  type Brouillon,
  type BrouillonBrut,
  type ChapitreBrut,
  type CleChapitre,
  type Cv,
  type CvBrut,
  type DonneesBrutes,
  type EtatDeChapitre,
  type ExperienceBrute,
  type FormationBrute,
  type Interpretation,
  type InterpretationBrute,
  type Jet,
} from "../types/cv.types";

function versExperience(b: ExperienceBrute) {
  return {
    poste: b.position,
    entreprise: b.company,
    lieu: b.location,
    debut: b.start_date,
    fin: b.end_date,
    enCours: b.is_current,
    missions: b.missions ?? [],
  };
}

function versFormation(b: FormationBrute) {
  return {
    diplome: b.degree,
    ecole: b.school,
    lieu: b.location,
    debut: b.start_date,
    fin: b.end_date,
    enCours: b.is_in_progress,
  };
}

/** Une donnée brute de chapitre → un jet. Le serveur garantit la forme
 *  (il valide avec le schéma V1) : on ne fait que renommer. */
export function versJet(chapitre: CleChapitre, brut: unknown): Jet {
  switch (chapitre) {
    case "identity": {
      const b = brut as DonneesBrutes["identity"];
      return {
        chapitre,
        donnees: { prenom: b.first_name, nom: b.last_name, titre: b.headline },
      };
    }
    case "contact": {
      const b = brut as DonneesBrutes["contact"];
      return {
        chapitre,
        donnees: {
          email: b.email,
          telephone: b.phone,
          ville: b.city,
          liens: b.links.map((l) => ({ libelle: l.label, url: l.url })),
        },
      };
    }
    case "summary":
      return { chapitre, donnees: { texte: (brut as DonneesBrutes["summary"]).summary } };
    case "experiences":
      return { chapitre, donnees: versExperience(brut as ExperienceBrute) };
    case "educations":
      return { chapitre, donnees: versFormation(brut as FormationBrute) };
    case "skills": {
      const b = brut as DonneesBrutes["skills"];
      return {
        chapitre,
        donnees: {
          competences: b.skills.map((s) => ({ nom: s.name, niveau: s.level })),
          langues: b.languages.map((l) => ({ langue: l.language, niveau: l.level })),
        },
      };
    }
    case "interests": {
      const b = brut as DonneesBrutes["interests"];
      return {
        chapitre,
        donnees: {
          interets: b.interests.map((i) => ({ nom: i.name, categorie: i.category })),
        },
      };
    }
    case "photo": {
      const b = brut as DonneesBrutes["photo"];
      return {
        chapitre,
        donnees: { image: b.image_url ?? null, imageId: b.image_id },
      };
    }
  }
}

/** Un jet → sa forme réseau, pour le valider auprès du serveur. */
export function versBrut(jet: Jet): unknown {
  switch (jet.chapitre) {
    case "identity":
      return {
        first_name: jet.donnees.prenom,
        last_name: jet.donnees.nom,
        headline: jet.donnees.titre,
      };
    case "contact":
      return {
        email: jet.donnees.email,
        phone: jet.donnees.telephone,
        city: jet.donnees.ville,
        links: jet.donnees.liens.map((l) => ({ label: l.libelle, url: l.url })),
      };
    case "summary":
      return { summary: jet.donnees.texte };
    case "experiences":
      return {
        position: jet.donnees.poste,
        company: jet.donnees.entreprise,
        location: jet.donnees.lieu,
        start_date: jet.donnees.debut,
        end_date: jet.donnees.fin,
        is_current: jet.donnees.enCours,
        missions: jet.donnees.missions,
      };
    case "educations":
      return {
        degree: jet.donnees.diplome,
        school: jet.donnees.ecole,
        location: jet.donnees.lieu,
        start_date: jet.donnees.debut,
        end_date: jet.donnees.fin,
        is_in_progress: jet.donnees.enCours,
      };
    case "skills":
      return {
        skills: jet.donnees.competences.map((c) => ({ name: c.nom, level: c.niveau })),
        languages: jet.donnees.langues.map((l) => ({
          language: l.langue,
          level: l.niveau,
        })),
      };
    case "interests":
      return {
        interests: jet.donnees.interets.map((i) => ({
          name: i.nom,
          category: i.categorie,
        })),
      };
    case "photo":
      return { image_id: jet.donnees.imageId };
  }
}

const STATUTS = {
  pending: "a-faire",
  in_progress: "en-cours",
  validated: "valide",
  skipped: "passe",
} as const;

function versChapitre(cle: CleChapitre, brut: ChapitreBrut | undefined): EtatDeChapitre {
  return {
    statut: brut === undefined ? "a-faire" : STATUTS[brut.status],
    donnees:
      brut?.data === undefined || brut.data === null ? null : versJet(cle, brut.data),
    elements: (brut?.items ?? []).map((i) => versJet(cle, i)),
  };
}

function versBrouillon(brut: BrouillonBrut): Brouillon {
  const chapitres = Object.fromEntries(
    CHAPITRES.map((c) => [c, versChapitre(c, brut.chapters[c])]),
  ) as Record<CleChapitre, EtatDeChapitre>;
  return { id: brut.id, chapitreCourant: brut.current_chapter, chapitres };
}

function versCv(b: CvBrut): Cv {
  const cv: Omit<Cv, "vide"> = {
    identite:
      b.identity === undefined || b.identity === null
        ? null
        : {
            prenom: b.identity.first_name,
            nom: b.identity.last_name,
            titre: b.identity.headline,
          },
    contact:
      b.contact === undefined || b.contact === null
        ? null
        : {
            email: b.contact.email,
            telephone: b.contact.phone,
            ville: b.contact.city,
            liens: b.contact.links.map((l) => ({ libelle: l.label, url: l.url })),
          },
    presentation: b.summary,
    photo: b.image_url,
    experiences: b.experiences.map(versExperience),
    formations: b.educations.map(versFormation),
    competences: b.skills.map((s) => ({ nom: s.name, niveau: s.level })),
    langues: b.languages.map((l) => ({ langue: l.language, niveau: l.level })),
    interets: b.interests.map((i) => ({ nom: i.name, categorie: i.category })),
  };
  const vide =
    cv.identite === null &&
    (cv.presentation ?? "").trim() === "" &&
    cv.experiences.length === 0 &&
    cv.formations.length === 0 &&
    cv.competences.length === 0;
  return { ...cv, vide };
}

export async function lireMonCv(): Promise<Cv> {
  return versCv(await http.get<CvBrut>("/cv/me"));
}

/** Le brouillon en cours, ou `null` s'il n'y en a pas. */
export async function lireBrouillon(): Promise<Brouillon | null> {
  try {
    return versBrouillon(await http.get<BrouillonBrut>("/cv/draft"));
  } catch (cause: unknown) {
    if (cause instanceof ErreurApi && cause.statut === 404) return null;
    throw cause;
  }
}

/** Le brouillon en cours, ou un nouveau : la route est idempotente. */
export async function ouvrirBrouillon(): Promise<Brouillon> {
  return versBrouillon(await http.post<BrouillonBrut>("/cv/draft", {}));
}

export async function interpreter(
  chapitre: CleChapitre,
  reponse: string,
  correctionDe: Jet | null,
): Promise<Interpretation> {
  const brut = await http.post<InterpretationBrute>("/cv/draft/interpret", {
    chapter: chapitre,
    answer: reponse,
    correction_of: correctionDe === null ? null : versBrut(correctionDe),
  });
  return {
    jet:
      brut.proposal === null || brut.proposal === undefined
        ? null
        : versJet(chapitre, brut.proposal),
    manquants: brut.missing,
    relance: brut.follow_up,
    horsSujet: brut.off_topic,
  };
}

/** Valide un chapitre simple (un jet), un chapitre en boucle (ses
 *  éléments), ou le passe (`null`). */
export async function validerChapitre(
  chapitre: CleChapitre,
  contenu: Jet | Jet[] | null,
): Promise<Brouillon> {
  const corps =
    contenu === null
      ? { skipped: true }
      : Array.isArray(contenu)
        ? { items: contenu.map(versBrut) }
        : { data: versBrut(contenu) };
  return versBrouillon(
    await http.put<BrouillonBrut>(`/cv/draft/chapters/${chapitre}`, corps),
  );
}

export async function finaliser(): Promise<Cv> {
  return versCv(await http.post<CvBrut>("/cv/draft/finalize", {}));
}

/** Un fichier choisi sur le téléphone, tel que le sélecteur le rend. */
export interface FichierCv {
  uri: string;
  nom: string;
  /** Le type MIME, s'il est connu ; sinon le serveur le déduira. */
  type: string | null;
}

/**
 * Importe un CV existant dans le brouillon. Les chapitres extraits
 * reviennent `in_progress` avec leurs données : des propositions, que le
 * parcours de création fait valider une à une.
 */
export async function importerCv(fichier: FichierCv): Promise<Brouillon> {
  const brut = await http.postFormulaire<BrouillonBrut>("/cv/import", () => {
    const formulaire = new FormData();
    formulaire.append("file", {
      uri: fichier.uri,
      name: fichier.nom,
      type: fichier.type ?? "application/octet-stream",
    } as unknown as Blob);
    return formulaire;
  });
  return versBrouillon(brut);
}

export async function transcrire(uri: string): Promise<string> {
  const brut = await http.postFormulaire<{ text: string }>("/voice/transcribe", () => {
    const formulaire = new FormData();
    // React Native lit un fichier local sous cette forme ; ce n'est pas
    // un `Blob`, d'où la conversion.
    formulaire.append("audio_file", {
      uri,
      name: "reponse.m4a",
      type: "audio/m4a",
    } as unknown as Blob);
    return formulaire;
  });
  return brut.text;
}

/** Envoie la photo choisie ; `ameliorer` seulement si l'utilisateur l'a
 *  demandé — la décision est la sienne, jamais celle de l'application. */
export async function televerserPhoto(
  uri: string,
  ameliorer: boolean,
): Promise<{ image: string; imageId: string; amelioree: boolean }> {
  const brut = await http.postFormulaire<{
    image_id: string;
    image_url: string;
    enhanced: boolean;
  }>("/cv/photo", () => {
    const formulaire = new FormData();
    formulaire.append("image", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    formulaire.append("enhance", ameliorer ? "true" : "false");
    return formulaire;
  });
  return { image: brut.image_url, imageId: brut.image_id, amelioree: brut.enhanced };
}
