# Complexe Lafleur Obala — site web et réservation

Site bilingue (français / anglais) pour un hôtel avec restaurant, bar, piscine, jacuzzi, hammam et sauna, conçu d'après la maquette fournie (logo, palette vert et or).
Réservation en ligne, paiement de l'acompte par Orange Money ou MTN MoMo via CamerPay, et espace de gestion pour la réception.

**Technos** : Next.js 15 (App Router, TypeScript), Supabase (Postgres + Auth), CamerPay.

## Ce que fait le site

- **Public** : accueil, chambres, restaurant et bar, **Spa & Bien-être** (jacuzzi, hammam, sauna, piscine, avec demande de séance), événements (avec demande de devis), à propos, contact, mentions légales et confidentialité.
- **Réservation** : le client choisit ses dates, puis sa chambre. Le total est calculé, l'acompte est payé via CamerPay, puis la **réception valide** la réservation depuis l'espace de gestion.
- **Espace de gestion** (`/admin`) : réservations (confirmer, refuser, annuler, marquer un remboursement), chambres et tarifs, paramètres (acompte, horaires, contacts, conditions d'annulation), demandes de contact et de devis.
- **Sécurité des réservations** : la création passe par une fonction SQL atomique qui empêche la double réservation. Une réservation non payée bloque la chambre pendant une durée réglable (2 h par défaut), puis expire.

## Mise en route

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécutez `supabase/migrations/0001_init.sql`, puis `supabase/seed.sql` (chambres d'exemple, à modifier ensuite depuis l'admin).
3. Dans **Authentication > Users**, créez le compte de la réception (e-mail + mot de passe).
4. Donnez-lui l'accès admin, dans le SQL Editor :
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'reception@exemple.com';
   ```
5. Récupérez l'URL du projet, la clé `anon` et la clé `service_role` (Project Settings > API).

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

Remplissez `.env.local`. La clé `SUPABASE_SERVICE_ROLE_KEY` reste côté serveur : ne la publiez jamais.

### 3. Lancer

```bash
npm install
npm run dev        # http://localhost:3000
```

## CamerPay

1. Créez un compte sur [camerpay.biz](https://camerpay.biz) et générez un jeton API : `https://camerpay.biz/client/api`.
2. Mettez-le dans `CAMERPAY_API_TOKEN`. Le compte démarre en **mode sandbox** : aucun vrai argent ne circule tant que la validation (KYC) n'est pas faite.
3. Dans le sandbox, la page de paiement propose de simuler un succès, un échec ou un retour sans paiement.
4. Le site reçoit le résultat sur `POST /api/payments/camerpay/webhook` (signé HMAC-SHA256). Cette URL doit être **publique**. En local, utilisez un tunnel (ngrok, Cloudflare Tunnel) et mettez son adresse dans `NEXT_PUBLIC_SITE_URL`.
5. Renseignez `CAMERPAY_WEBHOOK_SECRET` avec le secret de signature des webhooks.

### Points à confirmer avec la documentation CamerPay

Les pages de documentation consultées ne donnaient pas tout. Vérifiez ces trois points avant la mise en production :

- **Nom de l'en-tête de signature** du webhook. Par défaut : `x-camerpay-signature` (réglable avec `CAMERPAY_SIGNATURE_HEADER`). Le code accepte une signature en hexadécimal ou en base64, avec ou sans préfixe `sha256=`.
- **Format du webhook**. Le code lit `transaction_uuid`, `status` (`completed` ou `failed`) et `merchant_invoice_id`, à la racine ou dans un objet `data`.
- **Format du numéro** attendu par `customer_phone`. Le site envoie `+2376XXXXXXXX`.

Il n'y a pas d'appel de vérification de statut : le site s'appuie sur le webhook. Si un webhook se perd, la réception voit la réservation expirer et peut la traiter à la main.

## Parcours d'une réservation

| Étape | Statut | Paiement |
| --- | --- | --- |
| Le client valide le formulaire | En attente de paiement (chambre bloquée) | Acompte en cours |
| CamerPay confirme le paiement | À valider par la réception | Acompte payé |
| La réception confirme | Confirmée (e-mail au client) | |
| La réception refuse ou annule une réservation payée | Refusée ou annulée | Remboursement à faire, puis « remboursé » |
| Le délai de blocage passe sans paiement | Expirée (chambre libérée) | |

Si l'acompte est réglé à **0 %** dans les paramètres, il n'y a pas de paiement en ligne : la demande va directement à la réception.
Les remboursements se font à la main, depuis votre compte CamerPay.

## E-mails (facultatif)

Avec `RESEND_API_KEY` et une adresse « reçoit les alertes » dans les paramètres, le gérant reçoit un e-mail à chaque réservation prête à valider, et le client reçoit la confirmation ou le refus. Sans clé, les e-mails sont simplement ignorés.

## Photos à ajouter

La maquette utilise de vraies photos. Elles ne sont pas dans le projet : déposez-les dans `public/images` avec **exactement** ces noms. Tant qu'un fichier manque, un fond de couleur avec une icône s'affiche à sa place (aucune modification de code nécessaire).

| Fichier | Où il apparaît |
| --- | --- |
| `hero.jpg` | Grande image d'accueil (le complexe de nuit) |
| `rooms/standard.jpg`, `rooms/deluxe.jpg`, `rooms/suite-prestige.jpg` | Cartes et pages des chambres |
| `restaurant.jpg` | Bloc Restaurant & Bar |
| `events.jpg` | Bloc Événements |
| `about.jpg` | Page À propos |
| `wellness/piscine.jpg`, `wellness/jacuzzi.jpg`, `wellness/hammam.jpg`, `wellness/sauna.jpg` | Tuiles de l'accueil et page Spa & Bien-être |
| `wellness/hero.jpg` | En-tête de la page Spa & Bien-être |

Format conseillé : JPG, 1600 px de large pour `hero.jpg` et `wellness/hero.jpg`, 1000 px pour les autres. Le logo est dans `public/images/logo*.png`.

## À remplacer avant la mise en ligne

- Tarifs, nombre de chambres, descriptions : exemples dans `supabase/seed.sql` (tarifs de la maquette : 35 000, 55 000 et 85 000 FCFA), modifiables dans **Admin > Chambres et tarifs**.
- Coordonnées, adresse, liens Facebook / Instagram / YouTube, WhatsApp, conditions d'annulation : **Admin > Paramètres**. Les icônes de réseaux du pied de page n'apparaissent que si le lien est renseigné.
- Spa & Bien-être : horaires et tarifs des séances à communiquer. Le site affiche « nous contacter » en attendant.
- Textes du restaurant, du bar, de la piscine, de l'accueil et de la page À propos : `src/lib/i18n/dictionaries.ts`.
- Mentions légales : raison sociale, NIU / RCCM, gérant.

## Déploiement

Le plus simple est Vercel : importez le dépôt, ajoutez les variables de `.env.example`, et mettez l'adresse publique du site dans `NEXT_PUBLIC_SITE_URL`.
Ajoutez ensuite votre nom de domaine.

## Structure

```
src/app/(site)/[locale]/   pages publiques (fr / en)
src/app/(admin)/admin/     espace de gestion
src/app/api/               réservations, disponibilités, devis, webhook CamerPay
src/lib/                   Supabase, CamerPay, e-mails, textes FR / EN
supabase/                  schéma SQL et données d'exemple
```
