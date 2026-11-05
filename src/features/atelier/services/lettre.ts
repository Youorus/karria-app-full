/**
 * La lettre d'un dossier → le document que `documents` met en page.
 *
 * Le dossier porte la lettre **nue** (destinataire, objet, paragraphes,
 * formule — `contrat-api-candidatures.md`) ; le rendu et l'export
 * attendent en plus l'entreprise (avec son logo, s'il est à nous) et
 * l'expéditeur (`contrat-api-documents.md`, § 2). Les deux viennent de
 * l'offre figée et du CV adapté : rien n'est saisi deux fois.
 *
 * Le logo n'est transmis que s'il est servi par notre stockage : ailleurs,
 * l'API l'ignorerait et avertirait (`logo_unavailable`). Autant ne pas lui
 * demander.
 */

import type { Dossier, Lettre } from "@/features/candidatures/types/candidatures.types";
import type { Cv } from "@/features/cv/types/cv.types";

import type { LettreDocumentBrute } from "../types/atelier.types";

const STOCKAGE = "https://storage.karria.fr/";

export function logoTransmissible(url: string | null): string | null {
  return url !== null && url.startsWith(STOCKAGE) ? url : null;
}

export function documentDeLettre(
  dossier: Dossier,
  lettre: Lettre,
  cv: Cv,
): LettreDocumentBrute {
  return {
    recipient: {
      company: dossier.offre.entreprise,
      logo_url: logoTransmissible(dossier.offre.logo),
      city: dossier.offre.ville,
    },
    subject: lettre.objet,
    greeting: lettre.destinataire === "" ? null : lettre.destinataire,
    paragraphs: lettre.paragraphes
      .filter((p) => p.texte.trim() !== "")
      .map((p) => ({ kind: p.sorte, text: p.texte })),
    closing: lettre.formule === "" ? null : lettre.formule,
    sender: {
      first_name: cv.identite?.prenom ?? "",
      last_name: cv.identite?.nom ?? "",
      headline: cv.identite?.titre ?? null,
      email: cv.contact?.email ?? null,
      phone: cv.contact?.telephone ?? null,
      city: cv.contact?.ville ?? null,
    },
  };
}

/** Les textes de la lettre par chemin ancré, pour le patch local. */
export function textesDeLettre(lettre: Lettre): Map<string, string> {
  const m = new Map<string, string>();
  m.set("subject", lettre.objet);
  m.set("greeting", lettre.destinataire);
  m.set("closing", lettre.formule);
  lettre.paragraphes.forEach((p, i) => m.set(`paragraphs.${i}.text`, p.texte));
  return m;
}

export function differencesDeLettre(
  avant: Lettre,
  apres: Lettre,
): { chemin: string; texte: string }[] {
  const a = textesDeLettre(avant);
  const b = textesDeLettre(apres);
  const patches: { chemin: string; texte: string }[] = [];
  for (const [chemin, texte] of b)
    if (a.get(chemin) !== texte) patches.push({ chemin, texte });
  for (const chemin of a.keys()) if (!b.has(chemin)) patches.push({ chemin, texte: "" });
  return patches;
}
