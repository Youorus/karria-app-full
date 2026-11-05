/**
 * Les liens que le système remet à l'app, avant qu'expo-router ne les
 * route. La règle est dans `lib/liens-systeme.ts` (pure, testée) : le
 * lecteur de documents ne s'ouvre pas depuis l'extérieur, le reste passe.
 */

import { cheminSystemeRedirige } from "@/lib/liens-systeme";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return cheminSystemeRedirige(path);
}
