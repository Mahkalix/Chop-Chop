# Niveau 2 (issue #64)

Implémentation locale du 15 novembre 2026, branche `feat/64-level-2`.
Base : niveau 1, commit local `e6e43e8` de `feat/63-level-1`. Aucun push, PR ou déploiement effectué. Avant une PR, récupérer et intégrer le dernier `main`, puis vérifier à nouveau.

## Parcours et règles

- Sélection du niveau 1 ou 2 sur l’accueil. Le choix est conservé pour le lancement, les règles, le résultat et le classement.
- Niveau 2 : tomate préparée, viande grillée, salade tomate (salade et tomate découpée), assiette complète (salade, tomate découpée et viande cuite). Toutes se servent sur une assiette.
- Salade prête à l’emploi, avec son comptoir. Assemblages sur ASSEMBLER ou un plan de travail ordinaire, ingrédients ajoutés un par un dans n’importe quel ordre. Une assiette partielle peut être transportée et reposée. Doublons, aliments crus et brûlés refusés sans perte d’objet.
- Tomate : C maintenue 3 secondes, les mains libres devant la planche. Viande : 8 secondes de cuisson, brûlure après 6 secondes supplémentaires. Une brûlure coûte 10 points, avec plancher à zéro et combo remis à 1.
- Dès la brûlure, le grill prend feu et devient inutilisable. Feu local, aucune propagation. L’extincteur se trouve sur son support ; le porter et maintenir C près du grill pendant 3 secondes pour éteindre. Reposer l’extincteur, récupérer la viande brûlée et la jeter. Le grill est réutilisable, sans malus supplémentaire.
- Relâcher C ou s’éloigner suspend l’extinction ; la progression acquise reste conservée, comme la découpe. Pause et reprise après décompte figent aussi cette progression. L’extincteur est réutilisable et ne peut pas être jeté.
- 180 secondes actives ; 2 commandes initiales, 3 maximum, nouvelle commande toutes les 12 secondes si une place existe. Patience des nouvelles commandes : 45 / 40 / 35 secondes selon la minute. Étoiles indicatives : 700 / 1 400 / 2 200 points.
- Le niveau 1 garde ses deux recettes et ne déclenche aucun incendie. Le niveau 3 n’est pas implémenté sur cette branche.

## Contrats et compatibilité

Les règles communes sont dans `packages/shared`. `GET /recipes` expose maintenant `levels` pour les catalogues par niveau. Les anciennes propriétés `phases`, la fonction `availableRecipes` et `mixed-plate` restent présentes pour compatibilité avec le prototype ; elles ne pilotent pas les niveaux jouables. Le jeu utilise `getServiceRules(level).recipes`.

Le lancement envoie `levelId: 2` à `POST /games`. Les routes existantes de fin, abandon et classement restent inchangées. Aucune migration ni modification de la base partagée.

La documentation Docusaurus de référence contient encore l’ancien prototype dans cette base de branche. Sa réconciliation appartient au travail distinct de l’issue #81 ; ce document décrit précisément l’implémentation #64.

## Vérifications

- `pnpm typecheck` : réussi.
- `pnpm test` : 205 tests réussis (26 partagés, 81 API, 97 front, 1 script).
- `pnpm build:front` : réussi. Avertissements existants sur des annotations Zod et la taille du module Phaser.
- `git diff --check` : réussi.
- Tests de préparation et service des quatre recettes, six permutations de l’assiette complète, deux ordres de salade tomate, refus des ingrédients invalides, cadence et patience, limite de 180 secondes, absence de feu au niveau 1.
- Tests de brûlure à 14 secondes, poste bloqué, extincteur requis, cible correcte, extinction à exactement 3 secondes, progression suspendue, nettoyage et nouvelle cuisson. Tests des contrats de session pour le niveau 2 et rejet d’une réponse associée au mauvais niveau.

### Parcours navigateur

Chrome local, fenêtre 1440 × 1000, vrai moteur Phaser et commandes clavier, sans modification de l’état du jeu ni accélération du chrono. Authentification et API interceptées avec des réponses simulées (aucune écriture Supabase/PostgreSQL).

1. Choix du niveau 2 et du pseudo, lecture des règles, lancement authentifié simulé.
2. Découpe, mise en assiette et livraison de tomate préparée puis salade tomate.
3. Assemblage de l’assiette complète. Viande récupérée trop tôt refusée, remise au grill et recuite. Livraison refusée sans commande correspondante, puis acceptée lors de la commande suivante.
4. Préparation de viande grillée ; conservation de l’assiette jusqu’à une commande correspondante, puis livraison.
5. Brûlure volontaire : feu visible, prise au grill bloquée, pénalité unique de 10 points. Extinction interrompue par une pause à 47 %, progression inchangée pendant la pause, reprise et extinction réussies.
6. Extincteur remis sur son support, viande brûlée jetée, nouvelle viande cuite et récupérée sur le même grill.
7. Fin à 180 secondes actives : 4 recettes servies, 455 points, 7 commandes expirées, un seul appel `/finish`, aucune erreur JavaScript.
8. Résultat puis classement du niveau 2 affichant le score simulé. Nouvelle partie, abandon annulé puis confirmé : un appel `/abandon`, aucun score supplémentaire envoyé.

L’enregistrement et le classement réels en base restent à valider avec l’API et un compte de test autorisés. L’équilibrage des seuils d’étoiles nécessite plusieurs parties humaines ; cette vérification fonctionnelle ne le remplace pas.
