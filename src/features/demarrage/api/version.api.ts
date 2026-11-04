/**
 * La route publique qui dit si cette build est encore servie :
 * `GET /app/release?platform=…&build=…` (`docs/contrat-api-version.md`).
 *
 * Sans session : la question se pose avant même que l'on sache qui ouvre
 * l'application, invité compris. Joindre un jeton — peut-être périmé —
 * déclencherait un rafraîchissement sur une route qui n'en a que faire.
 */

import { http } from "@/lib/http";

import { rendreOuvrable, type EtatDeVersion, type Version } from "../services/version";

interface ReleaseBrute {
  status: "ok" | "update_available" | "update_required";
  latest_build: number;
  minimum_build: number;
  store_url: string | null;
}

const VERS_ETAT: Record<ReleaseBrute["status"], EtatDeVersion> = {
  ok: "ok",
  update_available: "disponible",
  update_required: "requise",
};

export async function lireVersion(
  plateforme: "ios" | "android",
  build: number,
): Promise<Version> {
  const brute = await http.get<ReleaseBrute>(
    `/app/release?platform=${plateforme}&build=${build}`,
    { authentifie: false },
  );
  return rendreOuvrable({
    // Un statut inconnu d'un serveur plus récent vaut « ok » : on ne
    // bloque jamais sur un mot qu'on ne sait pas lire.
    etat: VERS_ETAT[brute.status] ?? "ok",
    derniereBuild: brute.latest_build,
    buildMinimale: brute.minimum_build,
    urlStore:
      typeof brute.store_url === "string" && brute.store_url !== ""
        ? brute.store_url
        : null,
  });
}
