# Héberger l'API sur Render

L'API Fastify (`apps/api`) est un serveur Node : Supabase héberge la base et l'authentification,
mais pas ce serveur. Il tourne sur **Render** (offre gratuite), décrit dans le `render.yaml` à la racine.
Le front reste sur Vercel (voir [vercel.md](./vercel.md)).

## Première mise en service

1. Créer un compte sur https://render.com et le connecter à GitHub (accès au dépôt `Mahkalix/CHOP-CHOP`).
2. **New → Blueprint**, choisir le dépôt et la branche `main`. Render lit `render.yaml` et crée le service `chop-chop-api`.
3. Renseigner `DATABASE_URL` quand Render la demande : l'URL du **pooler** Supabase
   (Project Settings → Database → Connection string, mode Transaction ou Session). C'est un secret,
   à ne jamais mettre dans git, une PR ou une issue.
4. Attendre la fin du déploiement, puis vérifier : `https://<service>.onrender.com/health` répond `{"status":"ok"}`
   et `https://<service>.onrender.com/leaderboard/1` répond `{"levelId":1,"entries":[]}`.
5. Dans le projet Vercel `chop-chop-front`, ajouter la variable `VITE_API_URL` avec l'adresse du service
   (sans `/` final), puis **redéployer** le front : les variables `VITE_*` sont figées à la construction.

Variables du service (déjà dans `render.yaml`, sauf `DATABASE_URL`) :

| Variable | Valeur |
|---|---|
| `NODE_VERSION` | `22` |
| `TRUST_PROXY` | `true` (l'API est derrière le proxy de Render : sinon la limite de requêtes voit une seule IP) |
| `CORS_ORIGIN` | `https://chop-chop-front.vercel.app` |
| `SUPABASE_URL` | `https://bkjgwjmqlpfwegtjihgc.supabase.co` |
| `DATABASE_URL` | secret, saisi dans le tableau de bord |

`PORT` est fourni par Render, l'API l'utilise automatiquement.

## Limites à connaître

- **Veille de l'offre gratuite.** Après environ 15 minutes sans requête, le service s'endort. La première requête
  suivante prend de 30 à 60 secondes, ce qui dépasse le délai de 8 secondes du classement du front : il affiche alors
  une erreur et le bouton « Réessayer ». Avant une démo, ouvrir `/health` quelques minutes avant. Un ping régulier
  de `/health` (par exemple toutes les 10 minutes, avec UptimeRobot ou cron-job.org) évite la veille.
- **Previews Vercel.** Chaque PR a une adresse différente : elle est refusée par CORS tant qu'elle n'est pas dans
  `CORS_ORIGIN` (liste séparée par des virgules). Le front de production n'est pas concerné.
- **Migrations.** Elles ne sont pas lancées par Render. Elles s'appliquent à la main, une personne à la fois :
  `pnpm --filter @chopchop/api db:migrate` avec `DATABASE_URL` (ou `DIRECT_URL`) dans `apps/api/.env`.
- **Déploiement automatique.** Chaque push sur `main` redéploie l'API. Pour revenir en arrière : Render →
  service → Events → Rollback.

## Vérification du service déployé (15 novembre 2026)

Service : `https://chop-chop-api.onrender.com`, construit depuis `main`, sur la même base Supabase que l'environnement local.

| Contrôle | Résultat |
|---|---|
| `GET /health` | `200 {"status":"ok"}` |
| `GET /leaderboard/1` (route publique) | `200`, lit bien la base partagée |
| `GET /me` sans jeton ou avec un jeton invalide | `401` |
| `GET /me` avec un jeton anonyme valide du projet Supabase | `404 Profile not created yet` : jeton accepté (un jeton expiré, valable une heure, renvoie `401`) |
| CORS depuis `https://chop-chop-front.vercel.app` | autorisé |
| CORS depuis une autre origine | refusé (aucun en-tête `Access-Control-Allow-Origin`) |
| Limitation des requêtes | active (`x-ratelimit-limit: 60` sur les lectures) |

Base Supabase, contrôlée en lecture seule dans le SQL Editor :

- RLS activée sur `joueur`, `niveau`, `version_regles` et `partie`, sans politique : tables fermées à l'accès direct par la Data API.
- 5 migrations appliquées (`0000` à `0004`), conformes au dépôt.
- Niveaux 1 à 5 présents, aucune partie sur les niveaux 4 et 5 ; une seule version de règles, `v1`.
- Index de `partie` conformes aux migrations (classement, joueur, partie en cours unique).
- Les droits par défaut de Supabase sur `anon` et `authenticated` existent, mais la RLS sans politique les neutralise.

Reste à faire :

- Le front de production (`chop-chop-front.vercel.app`) ne contient pas encore l'appel au classement : renseigner `VITE_API_URL=https://chop-chop-api.onrender.com` dans Vercel et redéployer après fusion du front (#50).
- Les modifications de l'API de la branche `fix/api-decisions-classement` ne seront en ligne qu'après fusion dans `main` (déploiement automatique).
