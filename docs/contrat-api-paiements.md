# Contrat API — les paiements : « Karria sans pub », cafés, modèles Premium

Ce que `karria_api_v2` expose (module `payments`, ADR-0023 et ADR-0024) pour la
carte de soutien du Profil, le retrait des publicités et l'achat d'un modèle de
CV Premium. Préfixe `/api/v1`, session exigée (`Authorization: Bearer`) sauf la
page de retour et le webhook, erreurs au format `{ error: { code, message, details } }`.
La forme exécutable est `src/lib/dev/paiements-simule.ts`.

État : **servi en production** depuis le 2026-10-29, **éteint** tant que Marc n'a
pas posé les clés Stripe (`enabled` à `false`, routes d'ouverture en `503`).

## Le principe

**Stripe seul, dans le navigateur** (décision de Marc, comme Zoumani validée par
Apple) : aucun achat intégré, aucun SDK Stripe dans l'application (il lierait
PassKit). L'app demande une session au serveur, l'ouvre avec
`WebBrowser.openAuthSessionAsync(url, "karria://paiement/retour")`, et **relit
le serveur** au retour — jamais l'adresse d'arrivée. Stripe dépose la personne
sur une page de l'API (`GET /payments/return`) qui renvoie vers
`karria://paiement/retour?status=…&session_id=…`, ce qui referme la session du
navigateur.

Les prix sont ceux du serveur, en **centimes TTC** : l'app n'en écrit aucun.

## `GET /payments/catalog` → `200`

```json
{
  "currency": "eur",
  "ad_free": {
    "lookup_key": "karria_ad_free_monthly",
    "label": "Karria sans pub",
    "amount_cents": 499,
    "currency": "eur",
    "interval": "month"
  },
  "coffees": [
    { "count": 1, "lookup_key": "karria_coffee_1", "label": "1 café pour l'équipe Karria", "amount_cents": 299, "currency": "eur", "interval": null },
    { "count": 2, "amount_cents": 499, "...": "…" },
    { "count": 3, "amount_cents": 799, "...": "…" },
    { "count": 5, "amount_cents": 1299, "...": "…" }
  ],
  "templates": [{ "template_id": "6f1c…", "label": "Meridian", "amount_cents": 499 }],
  "enabled": { "ios": true, "android": true }
}
```

- `enabled` est **l'interrupteur par plateforme** (`PAYMENTS__IOS_ENABLED`,
  `PAYMENTS__ANDROID_ENABLED` côté serveur ; `false` d'office sans clé Stripe).
  L'app lit celui de `Platform.OS` : faux → aucun bouton de paiement nulle part
  (carte de soutien réduite au mot de l'équipe, « Débloquer » désactivé).
- `templates` : les modèles Premium en vente ; le détail d'un modèle lit son
  prix dans `GET /templates/{id}` (`price`), la même source.

## `GET /payments/me` → `200`

Toujours une réponse. **C'est ce que l'app applique** : `ad_free.active` vrai →
AdMob ne s'initialise pas, aucune annonce ne se charge, ce qui était chargé est
libéré (`lib/sans-pub.ts`). Lu à l'ouverture de la session, à chaque retour au
premier plan, et au focus du profil.

```json
{
  "ad_free": {
    "active": true,
    "status": "active",
    "until": "2026-11-28T12:00:00Z",
    "cancel_at_period_end": false,
    "manageable": true
  },
  "thanks": { "coffees": 3, "total_cents": 799, "last_at": "2026-10-29T12:00:00Z" },
  "enabled": { "ios": true, "android": true }
}
```

- `status` : `none` | `active` | `past_due` | `canceled`. Un `past_due` reste
  `active: true` pendant la **grâce de 7 jours** après le premier prélèvement en
  échec ; `until` en est alors la fin. L'app l'annonce (« mets ta carte à jour »).
- `cancel_at_period_end` : résilié depuis le portail, l'accès court jusqu'à `until`.
- `manageable` : un client Stripe existe, le portail peut s'ouvrir.

## `POST /payments/checkout-session` → `201`

```jsonc
{
  "payment_type": "ad_free", // | "coffee" | "template"
  "coffee_count": 2, // coffee : 1, 2, 3 ou 5
  "template_id": "6f1c…", // template
  "return_url": "karria://paiement/retour", // ou https://karria.fr/…
}
```

```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_…",
  "session_id": "cs_…",
  "payment_type": "coffee",
  "mode": "payment",
  "amount_cents": 499,
  "currency": "eur"
}
```

Refus : `422` `return_url_not_allowed` | `coffee_count_out_of_bounds` |
`template_id_required` ; `404` `template_not_found` (inconnu, non publié ou
gratuit) ; `409` `subscription_already_active` (avec `details.payment_failed`) |
`template_already_owned` ; `503` `dependency_failure` (pas de prestataire).

## `GET /payments/status/{session_id}` → `200`

```json
{ "session_id": "cs_…", "status": "paid", "payment_type": "coffee", "fulfilled": true }
```

`status` vient de Stripe ; **`fulfilled`** dit que le serveur a reçu la
notification signée et livré (café compté, modèle remis, sans pub actif). L'app
attend `fulfilled` (`services/attente.ts` : une lecture immédiate puis six
relectures sur ~13 s), pas `status`. `404` si la session n'est pas à la personne.

## `POST /payments/portal-session` → `201 { "url": "https://billing.stripe.com/…" }`

Le portail Stripe : carte, reçus, résiliation (immédiate ou en fin de période).
Corps facultatif `{ "return_url": "karria://paiement/retour" }`. `404`
`billing_account_not_found` si aucun paiement n'a jamais été ouvert.

## `GET /payments/return` (page HTML publique)

`?to=<destination>&status=success|cancelled|portal&session_id=cs_…`. La
destination est revalidée par le serveur (karria.fr ou `karria://`) avant le
renvoi ; sinon la page s'affiche sans renvoyer. Rien à lire côté app : la route
`app/(app)/paiement/retour.tsx` existe seulement pour un lien arrivé hors de la
session du navigateur, et renvoie au profil.

## Ce que le serveur garantit

- Un paiement n'est livré **qu'une fois**, même si Stripe réémet la notification.
- La suppression du compte (`DELETE /auth/me`) supprime le client Stripe — donc
  résilie l'abonnement — et efface les droits ; les reçus restent chez Stripe.
- Aucun courriel de Karria : les reçus sont ceux de Stripe.
