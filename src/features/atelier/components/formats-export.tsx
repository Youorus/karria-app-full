/**
 * Le même choix de formats partout : le PDF conserve la mise en page et
 * Word reste modifiable. Un format absent n'est jamais proposé.
 */

import { BoutonAction } from "@/components/bouton-action";

import type { Format } from "../services/telechargement";

interface Props {
  pdf: boolean;
  word: boolean;
  onTelecharger: (format: Format) => void;
}

export function FormatsExport({ pdf, word, onTelecharger }: Props) {
  return (
    <>
      {pdf ? (
        <BoutonAction
          libelle="PDF · Garde la mise en page"
          ton="secondaire"
          multiligne
          onPress={() => onTelecharger("pdf")}
        />
      ) : null}
      {word ? (
        <BoutonAction
          libelle="Word · Modifiable, la mise en page peut changer"
          ton="secondaire"
          multiligne
          onPress={() => onTelecharger("docx")}
        />
      ) : null}
    </>
  );
}
