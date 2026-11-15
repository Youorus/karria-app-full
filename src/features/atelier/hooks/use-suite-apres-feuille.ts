import { useCallback, useRef, useState } from "react";

/** Une feuille doit libérer la présentation native avant d'ouvrir la suivante. */
export function useSuiteApresFeuille() {
  const [visible, setVisible] = useState(false);
  const suite = useRef<(() => void) | null>(null);
  const apresFermeture = useCallback(() => {
    const action = suite.current;
    suite.current = null;
    action?.();
  }, []);

  return {
    visible,
    ouvrir: () => setVisible(true),
    fermer: () => setVisible(false),
    terminer: (action: () => void) => {
      if (suite.current !== null) return;
      suite.current = action;
      setVisible(false);
    },
    apresFermeture,
  };
}
