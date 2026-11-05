/**
 * Les liens que le système remet à l'app, avant qu'expo-router ne les
 * route. La règle est dans `lib/liens-systeme.ts` (pure, testée) : une
 * liste blanche d'écrans atteignables de l'extérieur, tout le reste mène
 * au fil des offres.
 */

import { cheminSystemeRedirige } from "@/lib/liens-systeme";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return cheminSystemeRedirige(path);
}
