---
title: Validation du prototype
---

:::info Document de cadrage
Les décisions récentes de l’équipe actualisent le cadrage initial. Le jeu est intégré dans le code ; la recette sur les services déployés reste à réaliser. Voir les [sources](./references.md) et le fichier `CONTEXT.md` à la racine du dépôt.
:::

## Décisions et état actuel

Trois niveaux sont jouables, avec un classement par niveau et version des règles.

La règle `v1` fixe une durée de 180 secondes de jeu actif, hors pauses. L’API refuse une partie terminée moins de 175 secondes après son démarrage : seule une partie jouée jusqu’au bout est classée. Il n’y a pas de durée maximale, car les pauses sont illimitées. Changer la durée prévue exige une nouvelle version des règles.

La connexion par pseudo seul et session anonyme Supabase Auth est intégrée côté front. L’API Fastify vérifie le jeton ; le profil peut être créé puis son pseudo modifié depuis l’accueil. Le code local a été relu le 15 novembre 2026 ; cela ne prouve pas son déploiement.

## Points à valider ou à intégrer

Cinq recettes sont réparties sur trois catalogues cumulatifs : tomate préparée et viande grillée ; puis salade tomate et assiette complète ; puis wrap. Vérifier les compositions exactes, l’assemblage libre et le refus des doublons, ingrédients non préparés ou incompatibles, sans perte de l’objet porté.

Durées implémentées : découpe 3 secondes avec C et les mains libres, cuisson autonome 8 secondes, brûlure 6 secondes plus tard sur le grill. Vérifier la conservation de la progression interrompue et, aux niveaux 2 et 3, le feu et l’extinction en 3 secondes.

Vérifier les commandes (2 au départ, 3 au maximum), les intervalles et délais de chaque niveau, le bonus de rapidité, le combo ×1 à ×3, l’absence de perte de points à l’expiration et la pénalité de brûlure de 10 points. Les plafonds API confirmés sont 5 400, 6 750 et 8 100 points, distincts des étoiles.

La cuisine Phaser est reliée aux recettes, commandes, score et appels API. Vérifier sur les trois niveaux le chargement, le démarrage après réponse API, la pause et Recettes, le changement d’onglet, la reprise après 3, 2, 1 et la confirmation d’abandon. Le mode `pnpm dev:demo` permet un essai local sans compte ni API ; il ne valide pas Supabase ou PostgreSQL.

Vérifier l’intégration front/API : création du pseudo, démarrage, fin de partie, abandon et classement. Vérifier les refus `422` pour les parties trop courtes et les scores hors limites.

Vérifier aussi `PATCH /me` : droits d’accès, longueur, caractères autorisés et doublons insensibles à la casse. Le nouveau pseudo doit apparaître sur les anciens scores. Les tests API en mémoire et les erreurs PostgreSQL simulées ne prouvent pas le comportement sur la base réelle.

## Critères de validation du prototype

Le joueur ne traverse aucun obstacle et ne porte jamais deux objets séparés.

La découpe exige sa présence ; la viande suit les états cru, cuit et brûlé.

Seule une recette exacte associée à une commande active est acceptée.

Le timer arrête la partie et le score suit le barème choisi.

Une partie terminée est enregistrée une seule fois ; l’historique conserve les parties terminées et le classement ne retient qu’un record par joueur, niveau et version. Une réponse de fin perdue déclenche une vérification de l’historique avant un éventuel nouvel essai, sans inventer de rang.
