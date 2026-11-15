/** Convertit une saisie en euros en centimes entiers, sans arrondi. */
export function lireMontantCafe(saisie: string): number | null {
  const parties = /^(\d{1,6})(?:[,.](\d{1,2}))?$/.exec(saisie.trim());
  if (parties === null) return null;
  return Number(parties[1]) * 100 + Number((parties[2] ?? "").padEnd(2, "0"));
}
