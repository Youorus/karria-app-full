/**
 * Les déclarations que TypeScript ne peut pas deviner.
 *
 * Un `import "…​.css"` n'est pas un module au sens de TypeScript : c'est
 * Metro qui le traite. Sans cette déclaration, `tsc` refuse l'import du
 * thème dans la racine de l'application — et la porte de qualité échoue
 * sur un fichier parfaitement correct.
 */

declare module "*.css";
