/**
 * La transcription par le serveur : `POST /voice/transcribe`.
 *
 * C'est le **repli** de la dictée, quand le téléphone ne sait pas
 * reconnaître la voix sur place : l'enregistrement part chez Karria, qui
 * le transcrit avec son fournisseur d'IA. Comme tout appel d'IA, la route
 * exige l'accord de l'utilisateur (`403 ai_consent_required` sinon).
 */

import { http } from "@/lib/http";

export async function transcrire(uri: string): Promise<string> {
  const brut = await http.postFormulaire<{ text: string }>("/voice/transcribe", () => {
    const formulaire = new FormData();
    // React Native lit un fichier local sous cette forme ; ce n'est pas
    // un `Blob`, d'où la conversion.
    formulaire.append("audio_file", {
      uri,
      name: "dictee.m4a",
      type: "audio/m4a",
    } as unknown as Blob);
    return formulaire;
  });
  return brut.text;
}
