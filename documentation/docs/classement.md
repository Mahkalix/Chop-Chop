---
title: Classement par niveau
---

:::info Document de cadrage
L’équipe a retenu trois niveaux avec un classement par niveau. L’API est présente dans le `main` local vérifié le 6 novembre 2026. Vérifier la branche utilisée et les [sources](./references.md) avant de modifier le contrat.
:::

## Un classement pour chaque niveau

Les joueurs comparent leurs résultats pour un même niveau parmi les trois jouables (1, 2 et 3). Les niveaux 4 et 5 restent dans les données mais ne sont ni démarrables, ni classés, ni affichés dans l’historique. Le classement garde le meilleur score validé de chaque joueur pour chaque niveau et chaque version des règles : un joueur n’apparaît qu’une fois. Le classement public affiche la version courante. Le rang renvoyé en fin de partie est celui du record du joueur dans la version de cette partie, y compris une ancienne version ; c’est le rang au moment du calcul.

Associer les scores à l’identifiant du compte anonyme Supabase du joueur, distinct du pseudo affiché. Ce compte est lié à la session du navigateur : si le joueur efface ses données, il devient un nouveau joueur et ses anciens scores ne lui sont plus rattachés.

Afficher rang, pseudo et score ; la mise en évidence du joueur connecté reste à valider.

La route publique décrite est `GET /leaderboard/:levelId?limit=10`, avec une limite maximale de 50 résultats. La pagination n’est pas prévue. Le rang personnel actualisé hors du top est reporté : aucune route ne le fournit.

Départage confirmé le 14 novembre 2026 : score décroissant, puis date de fin la plus ancienne (le premier arrivé passe devant), puis identifiant de partie. La durée n’est pas un critère.

Un résultat inférieur au record ne le remplace pas ; il reste enregistré et apparaît dans l’historique (`GET /me/games`, 10 parties par défaut, 50 au maximum). `GET /me/best` donne le meilleur score par niveau toutes versions confondues, distinct du record classé dans la version courante.

Les classements sont séparés par version des règles : une modification du barème crée une nouvelle version.

Le stockage utilise PostgreSQL sur Supabase et les tables `joueur`, `niveau`, `version_regles` et `partie`. L’authentification passe par Supabase Auth. Le serveur mesure la durée, refuse une partie terminée avant la fin du chrono et borne le score par niveau (5 400, 6 750 et 8 100 points). Une partie abandonnée n’est jamais classée. Les contrôles détaillés sont présentés dans l’[architecture](./architecture.md).