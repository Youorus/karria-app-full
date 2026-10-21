"use client";
import { ActivityIndicator } from "react-native";
import React from "react";
import { tva } from "@gluestack-ui/utils/nativewind-utils";
import { withUniwind } from "uniwind";

const StyledActivityIndicator = withUniwind(ActivityIndicator);
const spinnerStyle = tva({});

/**
 * MODIFICATION LOCALE du composant généré par gluestack (anomalie A27,
 * recette du 28 septembre 2026) — à reporter après toute mise à jour.
 *
 * Le fichier généré pose `aria-label="loading"` par défaut. React Native
 * donne la priorité à `aria-label` sur `accessibilityLabel` : le libellé
 * que chaque écran passait (« Chargement de vos voyages »…) était écrasé,
 * et VoiceOver lisait « loading », en anglais, partout.
 *
 * Désormais le libellé par défaut est celui reçu en `accessibilityLabel`,
 * et à défaut « Chargement en cours ». Un `aria-label` explicite garde la
 * priorité, comme dans le composant d'origine.
 */
const LIBELLE_PAR_DEFAUT = "Chargement en cours";

const Spinner = React.forwardRef<
  React.ComponentRef<typeof ActivityIndicator>,
  React.ComponentProps<typeof ActivityIndicator>
>(function Spinner(
  { className, color, focusable = false, "aria-label": ariaLabel, ...props },
  ref,
) {
  return (
    <StyledActivityIndicator
      ref={ref}
      focusable={focusable}
      aria-label={ariaLabel ?? props.accessibilityLabel ?? LIBELLE_PAR_DEFAUT}
      {...props}
      color={color}
      className={spinnerStyle({ class: className })}
    />
  );
});

Spinner.displayName = "Spinner";

export { Spinner };
