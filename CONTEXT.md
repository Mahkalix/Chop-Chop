# CHOP-CHOP — contexte produit et technique

Dernière vérification locale : 15 novembre 2026. Ce fichier sert de point d'entrée à l'équipe et aux assistants IA. Il décrit le périmètre confirmé, le code effectivement présent dans cette copie du dépôt et les décisions encore ouvertes. Avant de coder, relire les fichiers concernés et vérifier l'état de la branche courante.

## Résultat attendu

CHOP-CHOP est un jeu web solo de cuisine, jouable au clavier sur ordinateur. Un joueur s'authentifie, lance une partie sur l'un des **trois niveaux**, prépare des plats et les livre pendant que le temps s'écoule. Les livraisons réalisées dans le temps imparti donnent des points. Le résultat doit pouvoir être enregistré et consulté dans un classement par niveau. La première priorité est une boucle jouable complète sur le niveau 1, depuis l'authentification jusqu'au classement. Les niveaux 2 et 3 viennent ensuite.

Ces points ont été confirmés par Sabrina dans la conversation du projet. Le 6 novembre 2026, Sabrina a retenu 3 secondes de découpe et 8 secondes de cuisson. Les règles de gameplay et de classement ont ensuite été confirmées par Valérie le **14 novembre 2026**, après la réunion d'équipe : voir la section « Décisions confirmées du 14 novembre 2026 » ci-dessous. Aucun assistant ne doit déduire d'autres règles des exemples chiffrés des documents de cadrage.

## Équipe et coordination

| Personne | Rôle communiqué | GitHub |
| --- | --- | --- |
| Sabrina | Cheffe de projet et développement | `SabSab93` |
| Maxence | Front et UX | `Mahkalix` |
| Valérie | Base de données et back | `ValerieRas` |
| Mel | Back | `MelissaFrncJrg` |

Le [Project](https://github.com/users/Mahkalix/projects/3) indique les statuts et les attributions. Les [issues](https://github.com/Mahkalix/CHOP-CHOP/issues) et [PR](https://github.com/Mahkalix/CHOP-CHOP/pulls) servent à suivre le travail courant. Ce contexte reste volontairement indépendant de leur ordre et de leurs numéros.

## Sources et ordre de lecture

1. Ce contexte et les décisions explicites prises ensuite par l’équipe. Les décisions sont conservées directement ici ; ne pas renvoyer à des fichiers de décisions absents du dépôt.
2. Le code de la branche réellement utilisée, ses tests, migrations et contrats partagés, pour savoir ce qui fonctionne déjà.
3. L'issue de la tâche et les PR qui modifient la même zone, pour le travail en cours.
4. Le [Figma CHOP-CHOP](https://www.figma.com/design/5YyQNON3zicZCKuN1CkEH0/Chop-Chop?node-id=0-1&p=f&t=NicH7XWej9pK7hHY-0) pour les parcours et l'interface. La page MAQUETTE montre notamment Accueil, Chargement, début du service, Service en cours, Temps écoulé, Résultats, Comment jouer, Pause et abandon, et Classement. Vérifier les mesures et interactions dans Figma avant de les implémenter.
5. Le site `documentation/`, notamment `documentation/docs/conventions.md`, `architecture.md`, `gameplay.md` et `references.md`. Il contient des copies du cahier des charges et des cas d'utilisation dans `documentation/static/references/`. Le MCD/MLD transmis pour cette rédaction reste hors du dépôt. Ces documents contiennent des propositions et des variantes ; ils ne remplacent pas les décisions récentes ni le schéma implémenté.

Si deux sources se contredisent, consigner l'écart dans la PR ou l'issue et demander une décision produit avant de modifier une règle métier. Ne pas transformer une proposition ancienne en comportement obligatoire.

## État de cette copie du dépôt

**Regroupement local #85, branche `feat/85-niveaux-1-2-3`, 15 novembre 2026 :** les niveaux #63, #64 et #65 sont réunis pour essai avant PR. Le niveau 3 conserve les quatre recettes du niveau 2 et ajoute le wrap : galette prête, salade, tomate découpée, viande cuite et sauce blanche sur assiette, sans cuisson du wrap. Comptoirs galette/sauce, feu et extincteur présents. Cadence 10 s, patience 40/35/30 s, étoiles indicatives 900/1800/2600. `pnpm dev:demo` lance les trois niveaux sans compte ni API, avec scores locaux à l’onglet ; le mode normal reste disponible. Voir `docs/local-levels.md` pour le lancement et les 216 tests, dont le parcours navigateur complet du niveau 3. Les notes de prototype ci-dessous sont historiques et ne remplacent pas ces règles confirmées.

**Travail local #64, branche `feat/64-level-2`, 15 novembre 2026 :** sur la base du niveau 1 (`e6e43e8`), le niveau 2 ajoute salade prête à l’emploi, salade tomate, assiette complète et assemblages libres. La viande brûle à 14 secondes, déclenche un feu local et bloque le grill ; extinction avec l’extincteur et C maintenue pendant 3 secondes, puis évacuation de la viande brûlée. Malus unique de 10 points. Le choix du niveau accompagne lancement, règles et classement. Voir `docs/level-2.md` pour les paramètres, les 205 tests et le parcours navigateur de 180 secondes avec services simulés. Les règles héritées ci-dessous décrivent encore en partie l’ancien prototype ; la réconciliation Docusaurus #81 reste séparée.

**Travail local #63, branche `feat/63-level-1`, 15 novembre 2026 :** le niveau 1 raccorde désormais tomate préparée et viande grillée, mise en assiette, commandes, chrono actif, score, pause, abandon confirmé et résultat aux routes API existantes. Cette progression, validée par Maxence, limite le niveau 1 à ces deux recettes ; les anciens catalogues ci-dessous décrivent la référence de `main`, pas ce nouveau périmètre. Voir `docs/level-1.md` pour les vérifications et limites (parcours navigateur avec services simulés, pas de validation PostgreSQL réelle). Les niveaux 2 et 3 restent sur leurs branches dédiées.

Cette description reflète les fonctionnalités fusionnées dans `main` lors de la dernière vérification. Vérifier l'état actuel de la branche avant toute intervention : la cuisine Phaser est intégrée dans l'écran « jouer », mais le cycle complet des recettes, commandes et scores n'est pas encore raccordé. Le front ouvre une session anonyme Supabase et charge le profil avant la cuisine ; la recette sur les services déployés et le cycle complet de partie restent à intégrer.

Le back présent fournit authentification des appels API, profil, ouverture, fin et abandon de partie, et lecture du classement. Il applique les décisions de classement du 14 novembre 2026 (niveaux 1 à 3, plafonds, départage par date, classement par version, absence de borne de durée). Il ne fournit pas le gameplay. Les règles de gameplay du 14 novembre (ingrédients, recettes par niveau, commandes, barème, pause, étoiles) ne sont pas encore implémentées dans `packages/shared` ni dans le jeu. Les tests de l'API utilisent un dépôt en mémoire (`api.test.ts`) ; `auth.test.ts` vérifie les jetons avec un faux serveur de clés. Un essai manuel avec Supabase a été rapporté dans la PR d'intégration ; il ne remplace pas un test automatisé avec PostgreSQL réel.

## Structure et commandes

Monorepo pnpm 11, Node 22 ou plus.

| Chemin | Responsabilité actuelle |
| --- | --- |
| `front/` | React 19 pour les menus, les règles, le classement et les interfaces. TypeScript, Vite et modules SCSS constituent le socle actuel. |
| Gameplay Phaser | Cuisine, personnages, collisions, animations et interactions. Le code est dans `front/src/features/game/` (scène, postes de cuisine, prise et dépôt d'objets) et s'affiche sur l'écran « jouer » ; les recettes, les commandes, le score et le raccordement à l'API restent à implémenter. |
| `apps/api/` | Fastify 5, Drizzle, PostgreSQL Supabase, validation et routes HTTP. |
| `packages/shared/` | Schémas Zod, types du contrat HTTP, identifiants et limites des niveaux, règles de la cuisine (ingrédients, états, recettes). |
| `documentation/` | Site Docusaurus et documentation destinée à l'équipe ; installation et build npm séparés du monorepo pnpm. |
| `.github/workflows/ci.yml` | Sur PR et `main`, installation, typecheck puis tests. |

Commandes existantes à la racine : `pnpm install`, `pnpm dev:front`, `pnpm dev:api`, `pnpm typecheck`, `pnpm test`, `pnpm build:front`. L'API attend les variables documentées dans `apps/api/.env.example`. Ne jamais ajouter `.env` ni une valeur secrète au dépôt. Après une modification du schéma, une seule personne coordonnée avec l'équipe génère et applique les migrations Drizzle. Exécuter les vérifications pertinentes avant de proposer une PR.

Le site `documentation/` utilise son propre `package-lock.json` et les commandes `npm ci`, `npm run typecheck` et `npm run build` depuis ce dossier. Une modification de ses pages se vérifie avec ces commandes ; elle ne se déduit pas du seul `pnpm test` de la racine.

## Répartition React et Phaser

**Décision de l'équipe du 6 novembre 2026.** React porte les menus, les règles, le classement et les interfaces. Phaser porte la cuisine, les personnages, les collisions, les animations et les interactions. Le projet conserve TypeScript et Vite. Phaser est installé et son point d'intégration existe : `front/src/app/App.tsx` charge `Kitchen` (`front/src/features/game/`) sur l'écran « jouer ». Conserver une séparation lisible entre les écrans React et la logique du jeu Phaser.

## Parcours front et API

L'authentification décidée est un pseudo seul, sans email ni mot de passe : le front ouvre une session anonyme avec Supabase Auth (`signInAnonymously()`), puis le joueur choisit son pseudo une seule fois. L'API ne reçoit aucun identifiant, seulement un jeton `Authorization: Bearer <token>` qu'elle vérifie. Le pseudo est associé à ce compte anonyme. Les routes présentes sont :

| Route | Rôle |
| --- | --- |
| `GET /health` | Vérifier que l'API répond. |
| `GET /me` | Lire le profil du joueur connecté ; `404` s'il n'a pas encore de pseudo. |
| `PUT /me` | Choisir son pseudo une seule fois : il n'est plus modifiable ensuite (renvoyer le même pseudo reste accepté). |
| `GET /pseudos/:pseudo/available` | Vérifier qu'un pseudo est libre. |
| `GET /me/games` | Lire l'historique des parties terminées du joueur sur les niveaux 1 à 3 (10 par défaut, 50 au maximum). |
| `GET /me/best` | Lire le meilleur score du joueur sur chaque niveau terminé, toutes versions de règles confondues. |
| `POST /games` | Ouvrir une partie pour un niveau, après création du profil. |
| `POST /games/:id/finish` | Terminer la partie à la fin du chrono avec `score` et `bestCombo`, puis recevoir le rang du record personnel dans la version de la partie, le score et la durée serveur. |
| `POST /games/:id/abandon` | Abandonner sans résultat classé. |
| `GET /leaderboard/:levelId` | Lire le top d'un niveau dans la version courante des règles, un record par joueur (10 par défaut, 50 au maximum). |
| `GET /recipes` | Lire les ingrédients et leurs états, les recettes et les phases de disponibilité (route publique). |

Le contrat de requête et de réponse est dans `packages/shared/src/game.ts`. Réutiliser ces schémas au lieu de dupliquer les limites dans le front. Une seule partie peut rester ouverte par joueur ; en démarrer une nouvelle abandonne la précédente. La version de règles `v1` dure **180 secondes de jeu actif**, hors pauses. Le serveur mesure la durée entre le démarrage et la fin. **Seule une partie jouée jusqu'au bout est classée** (principe d'équité confirmé par l'équipe le 15 novembre 2026, qui remplace la sortie volontaire classée des documents du 14 novembre) : une fin reçue moins de 175 secondes après le démarrage (180 s − 5 s de marge) est refusée en `422` et la partie est clôturée. Il n'y a **pas de durée maximale**, car les pauses sont illimitées et non suivies par le serveur. Les autres contrôles sont conservés : jeton, propriété de la partie, statut, plafond de score par niveau, limitation des requêtes et fin unique. Le jeu démarre son chrono après la réponse de `POST /games`, une fois la cuisine chargée, et compte lui-même le temps actif. Prévoir les erreurs de réseau et une fin de partie soumise une seule fois.

## Données et classement

Le schéma Drizzle actuel contient `joueur`, `niveau`, `version_regles` et `partie`. `joueur.id_joueur` référence `auth.users`. La table `niveau` contient cinq lignes ; **les niveaux 4 et 5 restent dans le modèle mais ne sont plus jouables**. `LEVEL_IDS` dans `packages/shared/src/levels.ts` n'accepte que 1, 2 et 3 : l'API refuse de démarrer ou de classer les niveaux 4 et 5, et l'historique les masque. Selon Valérie, aucune partie n'existe sur ces niveaux ; revérifier avant toute action destructive.

Les recettes et les ingrédients sont définis dans `packages/shared/src/recipes.ts` et exposés par `GET /recipes` ; les commandes sont prévues dans la configuration du jeu d'après le schéma et la documentation du dépôt. Le MCD/MLD transmis présente un modèle plus complet avec `RECETTE`, `INGREDIENT`, `ETAT_INGREDIENT`, `COMPOSITION` et `COMMANDE`, mais décrit aussi une variante minimale pour un prototype rapide. Ces tables supplémentaires ne sont pas présentes dans le schéma actuel. Le même document propose une identité par pseudo local sans compte. Le projet retient un pseudo seul, sans email ni mot de passe, porté par une session anonyme Supabase Auth, ce qui donne à chaque joueur un identifiant vérifié par l'API. Utiliser le document pour comprendre les concepts, sans coder ses tables sans décision explicite.

Le classement retient **un record par joueur, par niveau et par version de règles**. Le top public affiche la version courante (la plus récente de `version_regles`). Une partie garde la version de son démarrage ; terminée après un changement de version, elle est classée dans son ancienne version. Le départage est : score décroissant, puis date de fin la plus ancienne (le premier arrivé passe devant), puis identifiant de partie ; **la durée n'est pas un critère**. Le rang renvoyé en fin de partie est celui du record personnel dans la version de la partie, au moment du calcul. Le rang hors top est reporté : aucune route ne le fournit, et il ne faut pas le déduire de la taille d'une liste limitée. `GET /me/best` reste toutes versions et ne doit pas être présenté comme le record classé. Les plafonds `LEVEL_LIMITS` confirmés sont **5 400, 6 750 et 8 100 points** pour les niveaux 1, 2 et 3 ; ce sont des bornes de plausibilité, pas des objectifs.

## Parcours à protéger

La démonstration de référence est un joueur authentifié qui lance le niveau 1, se déplace, prépare et livre un plat au clavier, voit le temps et le score, termine la partie et retrouve son résultat dans le classement. Tester ensuite la même boucle sur les niveaux 2 et 3. Le suivi détaillé et l'ordre des tâches vivent dans le Project, car ils changent plus vite que ce document.

## Organisation du code et maintenabilité

- Garder les responsabilités au bon endroit. Le front gère l'affichage et les entrées du joueur, le jeu gère les états et transitions d'une partie, l'API valide les appels et persiste les résultats, et `packages/shared` porte les contrats communs. Ne pas recopier les schémas ou limites partagés dans plusieurs espaces de travail.
- Faire évoluer une fonctionnalité par tranche observable, idéalement utilisable dans le parcours normal. Éviter un grand module qui mélange déplacements, objets, commandes, score, réseau et affichage. Séparer ces responsabilités quand elles ont des raisons différentes de changer, sans multiplier les couches abstraites.
- La page `documentation/docs/conventions.md` demande des fonctions de moins de 50 lignes et des fichiers de moins de 800 lignes. Utiliser ces bornes comme signal de relecture : si un bloc les dépasse, vérifier s'il mélange plusieurs responsabilités, puis extraire seulement une partie cohérente. Elles ne remplacent pas la lisibilité ni ne justifient de découper artificiellement une logique.
- Employer des noms explicites pour les états, événements et fonctions. Préférer une fonction courte qui exprime une règle à une suite de conditions dispersées. Garder une source de vérité pour le score, le chrono, l'objet porté et l'état d'une partie.
- **Convention confirmée par Sabrina le 6 novembre 2026** : écrire le code en anglais, notamment les noms de fichiers de code, variables, fonctions, types et commentaires techniques. Les textes visibles dans l'interface du jeu sont en français. Garder les contrats et noms de données déjà en place lorsqu'un renommage casserait des appelants ou des données ; traiter un éventuel renommage dans un changement coordonné.
- Préserver les comportements existants, y compris les données créées avant un changement. Pour une modification du contrat HTTP ou de la base, examiner tous les appelants, les migrations et les anciens enregistrements. Une opération qui peut échouer ou être rejouée doit laisser un état cohérent.
- Ne pas ajouter de dépendance, de framework, de configuration ou de nouvel utilitaire pour éviter quelques lignes de code. Réutiliser les structures déjà présentes si elles restent lisibles. Supprimer le code mort seulement après avoir vérifié ses appelants.
- Suivre le style des fichiers voisins. Le dépôt n'a actuellement ni commande de lint ni configuration de formatage commune repérée. Éviter les reformatages massifs dans une PR fonctionnelle ; la convention de formatage pourra être décidée séparément par l'équipe.
- Retirer les `console.log` de débogage avant la revue, conformément aux conventions publiées dans Docusaurus. Garder les messages d'erreur et journaux nécessaires au fonctionnement.
- Documenter la raison d'une règle ou d'une contrainte peu évidente. Ne pas paraphraser le code dans des commentaires. Mettre à jour ce contexte lorsque l'architecture, un contrat partagé ou une décision métier confirmée change.

## Fiabilité des parcours

- Le serveur vérifie l'identité, l'appartenance d'une partie au joueur, les données reçues et les limites applicables. La validation côté interface améliore l'expérience, mais ne remplace pas ces contrôles.
- Une fin de partie, un abandon ou un nouvel essai peuvent arriver plusieurs fois ou échouer en cours de route. Vérifier le comportement au deuxième appel et les erreurs réseau. Éviter deux résultats pour la même partie et conserver un message compréhensible pour le joueur.
- Le chrono du jeu et la durée contrôlée par l'API doivent représenter la même partie. Tester le départ, la fin, l'abandon et la pause selon la règle finalement validée.
- Tester le comportement observable qui risque de régresser : règles de jeu confirmées, limites du contrat, erreurs, classement et cas concurrents pertinents. Utiliser les tests existants lorsque c'est suffisant. Les tests en mémoire ne prouvent pas les contraintes PostgreSQL ni le fonctionnement du navigateur.

## Branches, commits et PR

La page `documentation/docs/conventions.md` indique **une branche et une PR par fonctionnalité, avec revue avant fusion dans `main`**. **Convention confirmée par Sabrina le 6 novembre 2026** : écrire les noms de branches entièrement en minuscules et séparer les mots par des tirets, par exemple `feat/8-api-and-bdd` ou `docs/30-contexte-projet`. Le numéro d'issue peut précéder le sujet lorsqu'il existe. Sans issue, ne pas inventer un numéro. L'ancien nom `feat/8-API-and-BDD` reste cité dans l'historique, mais ne suit pas cette convention. Éviter plusieurs branches qui modifient en parallèle la même zone sans coordination.

La même page documente des commits au format `type: description`, avec `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf` et `ci`. Employer un message qui explique le changement. Les commits, pushs et PR restent effectués selon les instructions de la personne responsable de la tâche.

Pour chaque changement, garder un diff centré sur l'objectif. Un commit doit décrire un état compréhensible et ne contenir ni secret, ni fichiers générés inutiles. Avant un push ou une PR, vérifier les fichiers modifiés, les écarts avec `main`, le typecheck et les tests concernés. Ne pas fusionner une PR dont le parcours utile n'a pas été vérifié. La politique exacte de commits, de reviewers et de fusion reste à décider par l'équipe.

Dans la description de PR, indiquer le besoin, les parties du code touchées, ce qui fonctionne depuis l'interface, les vérifications réellement exécutées et les limites restantes. Lier l'issue lorsqu'elle existe. Une PR fusionnée, une issue fermée et un parcours accepté sont des faits distincts. Le critère de fin d'une tâche est le comportement vérifié, pas seulement le passage de la CI.

## Travail avec un assistant IA

1. Lire cette page, la tâche demandée, les fichiers touchés et les modifications locales avant de proposer du code. Demander la règle métier manquante au lieu d'en déduire une à partir d'une maquette ou d'un document marqué « proposition ».
2. Expliquer brièvement l'approche et les fichiers concernés. Produire le plus petit changement qui rend le parcours utile. Préserver les modifications non commitées des autres membres.
3. Vérifier le comportement par les entrées normales du produit et les commandes du dépôt. Dire précisément ce qui a été exécuté et ce qui reste à vérifier avec Supabase, PostgreSQL ou le navigateur.
4. Laisser la décision humaine visible : l'équipe relit les règles, le diff et la recette. Suivre les instructions de Sabrina pour les commits et les pushs de la tâche en cours.

## Décisions confirmées du 14 novembre 2026

Confirmées par Valérie après la réunion, propositions complémentaires 1 à 4 incluses. Les fichiers `docs/CONTEXTE_*_DECISIONS_2026-11-14.md` en donnent le détail. Sauf mention contraire, le gameplay ci-dessous **n'est pas encore implémenté**.

**Partie.** Trois niveaux jouables. 180 secondes de jeu actif. À zéro, le score est figé et transmis, sans pénalité pour les commandes restantes. **Quitter avant la fin est un abandon, jamais classé** : la sortie volontaire anticipée classée prévue dans les documents du 14 novembre a été écartée par l'équipe le 15 novembre au nom de l'équité. Fermer ou recharger la page abandonne aussi la partie, sans reprise ni classement. L'abandon volontaire se fait depuis l'écran de pause (écran « Pause et abandon » de Figma), après une **modale de confirmation**, et appelle immédiatement `POST /games/:id/abandon` (confirmé le 15 novembre 2026). Non implémenté : la cuisine affiche pour l'instant un lien « Retour à l'accueil » permanent, sans confirmation ni appel à l'API.

**Pause.** La pause arrête le chrono, les délais des commandes et les cuissons ; la cuisine est masquée et les instructions affichées. Changer d'onglet met en pause. Reprise après un décompte 3, 2, 1 qui ne consomme pas de temps de jeu. Pause sans durée maximale, non suivie par le serveur.

**Ingrédients et préparations.** Tomate (découpe 3 s), salade (prête à l'emploi), viande (cuisson 8 s), pâte (cuisson 8 s). Viande, pizza et pâte brûlent 6 s après la fin de cuisson si elles restent sur le grill. Tous les plats sont servis sur la même assiette. Pas de fromage ni de four.

| Plat | Composition |
| --- | --- |
| Salade tomate | Salade + tomate découpée |
| Viande grillée | Viande cuite |
| Assiette complète | Salade + tomate découpée + viande cuite |
| Pizza | Pâte + tomate découpée, cuites 8 s sur le grill |
| Sandwich | Pâte cuite + viande cuite + salade + tomate découpée (pas de recuisson) |

Niveau 1 : salade tomate, viande grillée, assiette complète. Niveau 2 : niveau 1 + pizza. Niveau 3 : niveau 2 + sandwich. Le catalogue est disponible dès le début du niveau.

**Commandes.** 2 commandes au départ, 3 au maximum. Une commande est ajoutée si une place est libre toutes les 15 s (niveau 1), 12 s (niveau 2) ou 10 s (niveau 3), en temps actif. Délai d'une commande selon la minute de jeu : 50/45/40 s (niveau 1), 45/40/35 s (niveau 2), 40/35/30 s (niveau 3) ; une commande garde son délai initial.

**Barème.** Livraison correcte : `(100 + bonus) × multiplicateur`, avec `bonus = plancher(50 × temps restant / délai initial)` borné entre 0 et 50, et un multiplicateur ×1, ×2, puis ×3 au maximum pour les livraisons consécutives. Commande expirée : elle disparaît, sans retrait de points, multiplicateur à ×1. Livraison refusée : assiette conservée, sans retrait de points, multiplicateur à ×1. Brûlure : −10 points une seule fois par aliment, au moment où il brûle, multiplicateur à ×1. Score plancher à 0.

**Étoiles** (estimation proposée, distincte des plafonds serveur ; seuil atteint si score ≥ valeur) : niveau 1 : 500 / 1 000 / 1 800 ; niveau 2 : 700 / 1 400 / 2 200 ; niveau 3 : 900 / 1 800 / 2 600.

**Classement et API.** Voir « Données et classement » : déjà appliqué dans l'API.

## Décisions ouvertes à consigner

1. Assemblage de la pizza avant cuisson (sur le grill, sur l'assiette ou ailleurs) et distinction au grill entre pâte seule (sandwich) et pâte avec tomate (pizza).
2. Création d'une version de règles `v2` pour le nouveau barème, ou maintien de `v1` après nettoyage des scores de test déjà enregistrés.
3. Structure de `packages/shared/src/recipes.ts` (catalogue par niveau, configuration des commandes), à définir avec la personne qui code les recettes et les commandes dans le jeu.
4. Contrat concret entre le jeu Phaser, déjà intégré dans `front/src/features/game/`, et les interfaces React ; la répartition des responsabilités est déjà décidée.
5. Mise en évidence du joueur connecté dans le classement, et taille du top affiché (le front affiche 5 entrées, le contrat en prévoit 10 par défaut).
6. Détails de revue et de fusion qui ne sont pas fixés dans Docusaurus.

Chaque décision prise doit indiquer la date, la personne qui l'a validée, la règle retenue et les fichiers ou tickets à mettre en cohérence. L'ancien cahier des charges propose d'autres recettes, touches et formules de score ; ces valeurs ne remplacent pas les décisions ci-dessus.
