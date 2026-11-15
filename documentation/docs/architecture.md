---
title: Architecture et décisions techniques
---

## État de référence

Cette page décrit le code local vérifié le 15 novembre 2026 et les décisions de l’équipe. Le contexte de travail est `CONTEXT.md` à la racine du dépôt ; vérifier aussi le code de la branche utilisée.

Le front intègre les écrans d’accueil, de règles et de classement ainsi que la cuisine Phaser : trois niveaux avec recettes, commandes, préparations, assemblage, score et feu aux niveaux 2 et 3. La session React appelle l’API pour démarrer, terminer et abandonner les parties. Cette intégration dans le code ne prouve pas le déploiement ni le parcours sur les services distants.

## Stack et responsabilités

![Schéma illustré de la stack CHOP-CHOP avec les logos de Vercel, React, Vite, TypeScript, Phaser, Fastify, Drizzle, Supabase, PostgreSQL, Docusaurus et GitHub](/img/stack-chop-chop.svg)

[Ouvrir le schéma en grand (SVG)](/img/stack-chop-chop.svg). Logos des technologies : [Simple Icons](https://simpleicons.org/) et [logo pixel art officiel de Phaser](https://phaser.io/download/logo).

Le schéma distingue les services configurés des intégrations et hébergements encore à réaliser. Le projet Vercel `chop-chop-front` sert uniquement le front statique. Une configuration Vercel dédiée existe pour Docusaurus (`documentation/vercel.json`), dont le déploiement reste à confirmer, et le lieu d’hébergement de l’API reste à confirmer.

Le jeu utilise un monorepo pnpm avec Node.js 22 ou supérieur, pnpm 11 et les workspaces `apps/*`, `front` et `packages/*`.

| Zone | Technologies | Responsabilité |
| --- | --- | --- |
| `front/` — `@chopchop/front` | React 19, TypeScript, Vite 7, modules SCSS | Menus, règles, connexion, classement et appels API du cycle de partie |
| Jeu intégré au front | Phaser 3, dans `front/src/features/game/` | Cuisine, personnages, collisions, animations et interactions |
| `apps/api/` — `@chopchop/api` | Node, Fastify 5, Drizzle ORM, `pg`, Zod, `jose`, `tsx`, `@fastify/cors` et `@fastify/rate-limit` | Profil, cycle de partie, contrôle des résultats et classement |
| Supabase | PostgreSQL et Supabase Auth | Stockage et authentification |
| `packages/shared/` — `@chopchop/shared` | Types, schémas Zod, limites, recettes et paramètres de service | Contrats et configurations communs au front et au back |
| GitHub Actions | `pnpm typecheck`, `pnpm test` | Vérification du monorepo sur chaque PR et sur `main` |

Le site Docusaurus dans `documentation/` est un projet npm séparé, avec son propre `package-lock.json` et ses commandes `npm run typecheck` et `npm run build`. Le workflow CI actuel vérifie le monorepo pnpm, pas la compilation Docusaurus. Le front utilise actuellement TypeScript 5, l’API et le paquet partagé TypeScript 7, et Docusaurus TypeScript 6 ; harmoniser ces versions seulement si une incompatibilité concrète le demande.

Les tests de l’API utilisent Vitest. Les tables sont `joueur`, `niveau`, `version_regles` et `partie`. Les migrations vont de `0000` à `0004` ; `0003` initialise cinq niveaux et la règle `v1` de 180 secondes. Le contrat et le jeu n’acceptent que les niveaux 1 à 3 ; les niveaux 4 et 5 restent dans les données, sans être jouables. Les recettes, ingrédients et commandes sont des configurations du jeu, pas des tables PostgreSQL.

## Authentification et parcours d’une partie

Le parcours retenu est une connexion par pseudo seul, sans email ni mot de passe : le front ouvre une session anonyme avec Supabase Auth (`signInAnonymously()`), puis le joueur choisit son pseudo. Le front utilise `@supabase/supabase-js` pour ouvrir et restaurer cette session, lire le profil et créer le pseudo avant d’afficher la cuisine Phaser. Le parcours doit encore être validé sur les services déployés. L’API, déjà présente, ne reçoit aucun identifiant : elle vérifie le jeton `Authorization: Bearer <token>` à partir de `SUPABASE_URL`.

Le parcours implémenté est : connexion anonyme → `GET /me` (un `404` signale un nouveau joueur) → création du pseudo avec `PUT /me` → chargement de la cuisine → `POST /games` → Partez ! → chrono actif une seconde après la réponse → `POST /games/:id/finish` à zéro. Un échec de démarrage permet un nouvel essai explicite. Le pseudo peut ensuite être modifié depuis l’accueil par `PATCH /me`.

| Méthode | Route | Authentification | Fonction |
| --- | --- | --- | --- |
| GET | `/health` | Non | Santé du serveur |
| GET | `/me` | Oui | Profil ; `404` si le pseudo n’a pas encore été créé |
| PUT | `/me` | Oui | Créer le profil avec son premier pseudo (2 à 16 caractères, unique sans tenir compte de la casse) ; même pseudo accepté en cas de nouvel essai, `409` si pris ou si le joueur en a déjà un autre |
| PATCH | `/me` | Oui | Modifier son propre pseudo ; profil existant requis (`404` sinon), mêmes validations que la création ; `409` si pris par un autre joueur |
| GET | `/pseudos/:pseudo/available` | Oui | Vérifier qu’un pseudo est libre |
| GET | `/me/games` | Oui | Historique des parties terminées du joueur |
| GET | `/me/best` | Oui | Meilleur score du joueur sur chaque niveau terminé |
| POST | `/games` | Oui | Démarrer une partie avec `{ levelId }` |
| POST | `/games/:id/finish` | Oui | Terminer avec `{ score, bestCombo }`, recevoir `{ rank, score, durationMs, bestScore, isRecord }` |
| POST | `/games/:id/abandon` | Oui | Abandonner une partie, jamais classée ; réponse `204` |
| GET | `/leaderboard/:levelId?limit=10` | Non | Classement du niveau, limite maximale de 50 résultats |
| GET | `/recipes` | Non | `{ ingredients, preparations, recipes, phases, levels }` ; `levels` porte les catalogues jouables, `phases` reste pour compatibilité |

Les contrats sont définis dans `packages/shared/src/game.ts`, `levels.ts` et `recipes.ts`. `LEVEL_IDS` contient les identifiants 1 à 3 ; les niveaux 4 et 5 restent dans la table `niveau`. Les réponses complètes et les détails des schémas doivent être consultés dans le dépôt du jeu.

`ProfileInputSchema` est commun à `PUT /me` et `PATCH /me` : espaces autour retirés, 2 à 16 caractères, lettres (accents compris), chiffres, espaces, `_` et `-`. L’index unique sur `lower(pseudo)` protège les créations et modifications concurrentes. Modifier le pseudo met aussi à jour le nom affiché pour les anciens scores ; les résultats restent liés au même identifiant.

Installation du jeu à la racine : `pnpm install`, puis `pnpm dev:api` et `pnpm dev:front`, avec les variables des `.env.example` de chaque service. `pnpm dev:demo` lance un essai sans compte ni API : résultats limités aux 50 dernières parties dans l’onglet, sans publication au classement partagé. Ce mode est réservé au développement. Docusaurus s’installe séparément avec `npm ci` dans `documentation/`.

## Contrôle des résultats

Le serveur borne le score par `LEVEL_LIMITS` : 5 400, 6 750 et 8 100 points pour les niveaux 1, 2 et 3. Un score hors limites entraîne une réponse `422` et clôt la partie. Le serveur mesure la durée entre le démarrage et la fin : seule une partie jouée jusqu'au bout du chrono est classée (principe d'équité confirmé par l'équipe). Avec la règle `v1`, une partie terminée moins de 175 secondes après son démarrage reçoit `422` et est clôturée ; quitter avant la fin équivaut à un abandon. Il n'y a pas de durée maximale, car les pauses sont illimitées et non suivies par le serveur. Une seule partie en cours par joueur est autorisée.

Ces contrôles ne constituent pas une simulation serveur du gameplay. Une partie ne peut être terminée qu’une seule fois : un deuxième appel de fin de partie reçoit `409 Game already ended`. Le front doit seulement éviter d’envoyer deux fois la fin de partie. Le classement retient un record par joueur, par niveau et par version des règles ; voir le [classement](./classement.md).

## Décisions et intégration à terminer

La cuisine, les recettes, les commandes, le score et l’API sont reliés dans le code. Il reste à vérifier le parcours complet sur les services déployés et à coordonner les évolutions de version des règles en base. Tout changement de durée doit s’accompagner d’une nouvelle version des règles.

Voir le [design](./design.md), le [classement](./classement.md), les [critères de validation](./validation.md) et les [conventions de travail](./conventions.md).
