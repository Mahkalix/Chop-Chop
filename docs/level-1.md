# Niveau 1 (#63)

> Compte rendu historique du développement initial. Pour les règles et parcours actuels de la PR #86, lire [le guide des trois niveaux](local-levels.md) et [CONTEXT.md](../CONTEXT.md). Les mentions de branches séparées, de bouton Commencer ou de salade prête ci-dessous décrivent uniquement cet ancien état.

État local du 15 novembre 2026, branche `feat/63-level-1`.

## Parcours disponible

Accueil et choix du chef → session anonyme et pseudo → cuisine chargée → bouton Commencer → `POST /games` niveau 1 → 180 secondes actives → résultat → `POST /games/:id/finish` → classement.

Deux recettes sont disponibles dès le départ : tomate préparée (tomate découpée dans une assiette), viande grillée (viande cuite dans une assiette). Placer une assiette sur un comptoir, poser l'ingrédient prêt avec E, reprendre l'assiette et utiliser E au poste SERVIR. La planche utilise C maintenue, mains libres. Un ingrédient cru, brûlé ou supplémentaire est refusé sans perte d'objet. Une livraison refusée conserve l'assiette.

Les paramètres du niveau sont dans `packages/shared/src/service.ts`. Deux commandes initiales, trois maximum ; ajout toutes les 15 s si place libre ; patience de 50/45/40 s selon la minute active. La séquence alterne les deux recettes de manière reproductible. Une commande garde son délai initial. Les états, échéances, bonus et combos sont calculés dans le jeu, indépendamment du rendu React.

La découpe dure 3 s, la cuisson 8 s et la viande brûle 6 s plus tard. La brûlure retire 10 points une seule fois, avec plancher à zéro et combo à ×1. Aucun incendie au niveau 1. Expiration et refus réinitialisent le combo sans retirer de points. À zéro, le score est figé sans pénalité pour les commandes restantes.

Pause via Échap ou le bouton : cuisine masquée, commandes et préparation figées. Changer d'onglet met également en pause. Reprendre lance un décompte de 3 secondes hors temps actif. Abandonner demande une confirmation et appelle l'API avant le retour à l'accueil. Une fermeture/recharge tente un abandon avec `keepalive` ; le réseau du navigateur ne garantit pas sa livraison. Aucune reprise ni sauvegarde automatique d'un résultat anticipé n'est proposée. Une nouvelle partie clôt l'ancienne côté API.

Les appels utilisent la session Supabase courante. Un échec d'enregistrement vérifie l'historique pour récupérer le cas d'une réponse perdue ; sinon un nouvel essai explicite est possible, sauf après refus définitif. Aucun rang n'est inventé si seul l'historique confirme la sauvegarde. Les réponses réseau sont contrôlées et les appels expirent après 15 s.

## Vérifications effectuées

- `pnpm typecheck`, `pnpm test`, `pnpm build:front`.
- Tests de préparation et livraison des deux recettes, refus, capacités et délais des commandes, score, combo, brûlure et fin à 180 s.
- Tests de session : départ unique, changement d'onglet, reprise 3-2-1, réponse perdue, refus API, abandon et nettoyage à la sortie.
- Parcours clavier dans Chromium : tomate puis viande préparées et servies, pause pendant cuisson, brûlure, attente des 180 secondes actives, résultat de 356 points (2 livraisons et une brûlure), un seul appel de fin, lecture du classement.
- Erreur de démarrage simulée puis relance ; annulation de la confirmation sans appel d'abandon ; confirmation avec un seul appel d'abandon.

Le parcours navigateur utilise des réponses Supabase/API simulées. Les tests de l'API emploient un dépôt en mémoire. Cela ne valide pas une écriture PostgreSQL réelle, le déploiement ou la configuration Supabase de production.

## Périmètre restant

Les niveaux 2 et 3 sont traités sur leurs branches respectives (#64, #65). Le catalogue historique de `GET /recipes` reste inchangé ; le niveau 1 utilise ses deux recettes via la configuration partagée. Aucun schéma de base, migration ou déploiement n'est modifié ici. Les seuils d'étoiles 500/1 000/1 800 restent des estimations à tester en conditions de jeu.
