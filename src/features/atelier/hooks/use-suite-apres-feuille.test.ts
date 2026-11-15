import { expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { useSuiteApresFeuille } from "./use-suite-apres-feuille";

it("attend la fermeture native avant d'ouvrir la suite, une seule fois", () => {
  const ouvrirEnvoi = jest.fn();
  const supprimer = jest.fn();
  const { result } = renderHook(useSuiteApresFeuille);

  act(() => result.current.ouvrir());
  act(() => {
    result.current.terminer(ouvrirEnvoi);
    result.current.terminer(supprimer);
  });
  expect(result.current.visible).toBe(false);
  expect(ouvrirEnvoi).not.toHaveBeenCalled();
  act(() => {
    result.current.apresFermeture();
    result.current.apresFermeture();
  });
  expect(ouvrirEnvoi).toHaveBeenCalledTimes(1);
  expect(supprimer).not.toHaveBeenCalled();
});
