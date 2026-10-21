# Référence V1 — ce que la nouvelle app reproduit

> Relevé du 2026-10-20 sur la **vraie V1** : GitHub `Youorus/Karria-Frontend`,
> branche `main`, commit `968da01` (clone à jour : `~/Documents/HelloWorkk/karria`).
> **Pas** `~/WebstormProjects/karria` ni `~/WebstormProjects/Karria-Frontend`
> (169 commits de retard).
>
> Règle : la refonte garde **l'anatomie, les libellés et les données** de la V1
> (l'API renvoie les mêmes informations) et y ajoute l'immersion (aura, orbe,
> agent, transitions natives). Avant d'inventer un écran, on vérifie ici — puis
> sur la V1 qui tourne en local (voir la mémoire « V1 réelle en local »).

## 1. Jetons (src/theme/theme.ts)

Mode **sombre par défaut**. Police système (aucune police chargée).

| Jeton                | Clair                             | Sombre                            |
| -------------------- | --------------------------------- | --------------------------------- |
| background           | `#F6F8FC`                         | `#0E0D0C`                         |
| backgroundElevated   | `#FFFFFF`                         | `#1F1D1B`                         |
| label                | `#0F172A`                         | `#F5F3F0`                         |
| labelSecondary       | rgba(15,23,42,.68)                | rgba(238,234,228,.70)             |
| labelTertiary        | rgba(15,23,42,.42)                | rgba(238,234,228,.42)             |
| card                 | `#FFFFFF`                         | `#1A1816`                         |
| cardBorder           | rgba(15,23,42,.07)                | rgba(238,234,228,.09)             |
| primary              | `#1877F2`                         | `#1877F2`                         |
| green / red / orange | `#22C55E` / `#EF4444` / `#F97316` | `#4ADE80` / `#F87171` / `#FB923C` |
| purple / premium     | `#A855F7` / `#D4A63A`             | `#C084FC` / `#F2C46D`             |
| systemFill           | rgba(37,99,235,.08)               | rgba(37,99,235,.12)               |
| matchHighBg / Text   | rgba(34,197,94,.10) / `#15803D`   | rgba(74,222,128,.13) / `#4ADE80`  |

Rayons : carte d'offre 24, tuile logo 18 (détail 20), pastilles 10, étiquettes
du détail 14, boutons 14, sheet 24-28. Espacement écran 20. Typo : largeTitle
30/800/-0.8 ; titre de carte 16/600 ; sous-titres en CAPITALES espacées (0.5–1.2).
Ombres claires `#1A1410` sm {0,2} .07 r4, md {0,4} .09 r10. Ressorts : défaut
{damping 22, stiffness 250}.

## 2. Navigation

Barre d'onglets **flottante en pilule** centrée (largeur au contenu, max
min(W-40, 500)), bas = max(inset,8)+10, hauteur 62, rayon 31, padding 5, flou
(iOS systemChromeMaterial 78) + voile rgba(20,20,22,.40) sombre / rgba(248,248,252,.40) clair, ombre {0,8} r20.
Onglets : **Offres** (le K de la marque), **Dossiers** (document-text), **CV**
(document), **Modèles** (layers), **Profil** (person). **Le libellé n'apparaît
que sur l'onglet actif**, dans une pastille (h 52, r 26, fond rgba(255,255,255,.14)
sombre / .92 clair), libellé 13/600 primary, largeur animée en ressort. Icônes 22,
inactives rgba(255,255,255,.42) / rgba(0,0,0,.38). Badge non-lus rouge `#FF3B30`
sur Offres (« 99+ »). Barre masquée sur le chat, le support, le projet de recherche.

**Bouton ✦** : rond 54, à droite (right 20), 16 pt au-dessus de la barre, fond
carte, bord 1.5 ; Sparkles 20 primary + halo pulsant (0→.35, ×1→1.45) ; ouvre le
chat ; une fois la liste défilée il devient ChevronUp (retour en haut).

## 3. Fil d'offres

En-tête `KarriaHeader` (absolu, fond background à 90 %) : titre 30/800/-1
« **Pour toi** » ; sous-titre 10/600 CAPITALES « N opportunité(s) sélectionnée(s)
par Karria » / « Aucune offre pour le moment » / « Recherche en cours… » ; badge
« Mise à jour » (point pulsant) pendant un re-match, ou « Karria : <requête> »
(fermable) après une recherche du chat. Bouton filtres : rond 40, fond systemFill,
SlidersHorizontal 22, point rouge 10 si filtres actifs.

**Carte** (rayon 24, padding 16, mb 12, bord 1 — `primary+30` tant que le détail
n'a jamais été ouvert, sinon cardBorder ; ombre sm) :

1. Tuile 54×54 r18 : logo (fond `#F7F8F9`, image 75 % contain) ou initiales 18/800
   blanches sur `hsl(rang×137.508 mod 360, 65%, 55%)` ; entreprise 11 CAPITALES
   espacement 1 ; badge « Nouvelle » orange si score_recency > 0.90 ; point 6 primary
   si non ouverte ; titre 16/600 2 lignes ; signet (Bookmark 20, optimiste, PATCH).
2. MapPin 12 + lieu (« Lieu non précisé ») · temps relatif date-fns
   (« il y a environ 2 heures ») à droite.
3. Pastilles (r10, px8 py4, icône 12, texte 11/700) : qualité « Très alignée »
   (vert, high) / « À explorer » (gris, low) ; contrat (systemFill) ; salaire
   (`#E8F5E9` / `#1B5E20`, formatSmartSalary « X - Y€ / mois »). Pas de score chiffré.
   Entrée : fondu + translateY 20→0 en 450 ms, décalé min(rang×40, 400). Pression 0.97.
   Liste : padding 20, pull-to-refresh, pagination offset 20 ; les matchs `low` sont
   repliés derrière « Voir N offres supplémentaires » puis un séparateur
   « AUTRES OPPORTUNITÉS ». Chargement : squelettes (cartes r28, pulsation .4↔.7).

## 4. Filtres

BottomSheet 84 %, sans bouton Appliquer (chaque geste s'applique). « Filtres » +
compteur, « Effacer ». Sections : **Affichage** (Sauvegardées, Non vues, Non
postulées), **Publication** (24 h, 3, 7, 30 derniers jours), **Catégories**
(Type de contrat, Localisation → sous-vues ; recherche de ville « Nom de ville,
code postal… »). Pastilles h40 r20 ; active = primary+12 + bord primary + coche.

## 5. Détail d'offre

En-tête natif « ‹ Offres » + pilule (Partager, Signet). Tuile 68 r20 ; entreprise
14/600 CAPITALES ; titre 24/800 ; étiquettes r14 (lieu, contrat, salaire vert).
« Est-ce un bon match ? » (pouces → étiquettes de feedback). **Description —
ANALYSE PAR KARRIA** : bulle r24 (coin haut-gauche 4), titres de section 13/900
primary CAPITALES, puces ; chargement = trois points en orbite + barres ; génère
puis sonde `summary-status` toutes les 2,5 s. « Voir l'annonce d'origine ».
Pied fixe : « Créer mon CV / Adapté à l'offre » (primary) et « Créer ma lettre /
Motivation ciblée » (contour primary) → Studio.

## 6. Autres onglets (résumé)

- **Dossiers** : « Candidatures », cartes r22 (logo 48, chips « n CV » / « n LM »,
  « Postulé », « Ouvrir le dossier » + date) ; détail « Suivi de dossier » avec la
  grille des documents (A4), modale « Avez-vous postulé ? ». `GET /job-applications`,
  `/cv/me/generated-cvs`.
- **CV** : « Mon CV », carte profil r32 (avatar 100, « Générer mon CV », tuiles Coach /
  Importer / Studio), sections Expériences, Formations, Projets, Compétences,
  Langues, Centres d'intérêt (CRUD `/cv/{section}`), Studio `/drafts`.
- **Modèles** : grille 2 colonnes, cartes r18 (miniature w/0.72, barre de couleur 3 px,
  pastille PRO, coche « à vous »), puces « Tous / Pro / catégories » ; détail avec
  carrousel, stats, avis, « Obtenir ce modèle ». `GET /templates/?active_only=true`,
  `/user-templates/me`.
- **Profil** : « Votre espace personnel », carte abonnement r32, lignes d'action
  (Modifier mon profil, Consommation & quotas, Photos Pro, Parler à l'équipe),
  Réglages (Apparence Sombre/Clair/Système, réseaux, Se déconnecter, Supprimer mon compte).
- **Chat ✦** : en-tête « Karria », bulles (utilisateur r20 coin 6), effet machine à
  écrire, suggestions, micro, « Afficher dans le feed ». `POST /karria/chat/converse`
  (sans état, historique complet), `GET /karria/chat/search/{id}/status|matches`.
- **Invité** : mêmes onglets ; Offres = fil public `/public/job-offers` ; les autres
  onglets = « Se connecter / S'inscrire ».

## 7. Endpoints du fil (protégé)

`GET /job-matches/me` (limit, offset, saved_only, unseen_only, unapplied_only,
contract_types, cities CSV, published_after, sort=fresh) → {items, count, has_next} ;
flux SSE `/job-matches/me/stream` ; `GET /job-matches/me/filter-options` ;
`GET /job-matches/{id}` ; `GET …/summary-status` / `POST …/summary` ;
`PATCH …/interaction` ; `PATCH /job-matches/bulk-feed-seen` ; `POST …/dismiss` ;
`GET /job-matches/feedback-tags`.
