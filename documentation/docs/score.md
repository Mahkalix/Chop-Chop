---
title: Commandes et score
---

:::info Règles implémentées
Les paramètres viennent de `packages/shared/src/service.ts` et `recipes.ts` ; le calcul est implémenté dans `front/src/features/game/service.ts`. Le cadrage historique reste dans les [sources](./references.md).
:::

Les seuils d’étoiles restent des estimations de difficulté, distinctes des plafonds de plausibilité contrôlés par l’API.

## Commandes clients et validation

Chaque commande indique une recette, les ingrédients attendus et son temps restant.

Deux commandes sont présentes au départ, trois au maximum simultanément.

Une livraison valide correspond exactement à une commande active et non expirée.

Si plusieurs commandes identiques sont actives, satisfaire celle qui expire en premier.

Une commande livrée disparaît ; une commande expirée est comptée comme ratée.

Une livraison invalide est refusée, l’assiette reste portée et le multiplicateur revient à ×1.

Une assiette conforme sans commande correspondante est également refusée.

## Progression et difficulté

La règle `v1` dure **180 secondes actives**, hors pauses. La modifier exige de synchroniser le jeu et l’API, et de versionner les règles pour garder des scores comparables. Le catalogue du niveau entier est disponible dès le départ ; seule la patience des nouvelles commandes diminue à chaque minute. Les règles doivent être identiques pour les joueurs d’un même niveau et d’une même version.


| Niveau | Recettes disponibles dès le départ | Délai par commande aux minutes 1 / 2 / 3 | Intervalle d’apparition |
| --- | --- | --- | --- |
| 1 | Tomate préparée, viande grillée | 50 / 45 / 40 secondes | 15 secondes |
| 2 | Niveau 1 + salade tomate et assiette complète | 45 / 40 / 35 secondes | 12 secondes |
| 3 | Niveau 2 + wrap | 40 / 35 / 30 secondes | 10 secondes |


À chaque intervalle, une commande est ajoutée si un emplacement est libre. La séquence des recettes est déterministe et parcourt le catalogue du niveau en boucle.

Une commande créée conserve son délai initial même si la minute de jeu change.

Paramètres appliqués : découpe 3 s ; cuisson 8 s ; viande brûlée 6 s après la fin de cuisson ; extinction 3 s aux niveaux 2 et 3.

Seuils d’étoiles affichés (score supérieur ou égal au seuil) : niveau 1, 500 / 1 000 / 1 800 ; niveau 2, 700 / 1 400 / 2 200 ; niveau 3, 900 / 1 800 / 2 600 points. Les plafonds serveur sont respectivement 5 400 / 6 750 / 8 100 points et ne sont pas des objectifs d’étoiles.

La séquence répétable offre les mêmes recettes dans le même ordre ; les apparitions effectives dépendent des emplacements libres.

## Score et combos


| Événement | Effet |
| --- | --- |
| Livraison valide | 100 points de base + bonus de rapidité de 0 à 50 points, puis application du multiplicateur. |
| Bonus de rapidité | 50 × temps restant ÷ délai initial de la commande ; résultat arrondi à l’entier inférieur. |
| Combo | Livraisons valides consécutives : 1re ×1 ; 2e ×2 ; 3e et suivantes ×3. |
| Commande expirée | Aucun retrait de points ; multiplicateur à ×1. |
| Livraison refusée | 0 point et remise à zéro de la série. |
| Objet jeté | Aucune pénalité directe. |
| Viande brûlée | −10 points une seule fois au passage à l’état brûlé ; multiplicateur à ×1. Aucun malus supplémentaire pour le feu. |


Le score ne descend pas sous zéro. Exemple : une deuxième livraison consécutive avec 20 s restantes sur 40 s rapporte (100 + 25) × 2 = 250 points. Le meilleur combo affiché est le multiplicateur maximal atteint.

## Fin de partie

À zéro seconde, arrêter les déplacements, interactions, transformations et nouvelles commandes.

Figer le score ; les commandes encore actives ne produisent aucune pénalité supplémentaire.

Le bilan affiche les commandes servies, expirées, le meilleur combo et les étoiles. Les refus et brûlures sont comptés dans l’état du service mais ne sont pas affichés séparément dans le bilan actuel.

Enregistrer une seule fois le résultat, puis afficher le meilleur score personnel et le rang disponible.

Afficher un état d’enregistrement ; après une réponse perdue, consulter l’historique avant de permettre un nouvel essai. Un résultat retrouvé est confirmé sans inventer de rang. Les refus `409` et `422` ne sont pas réessayables.

Proposer Rejouer, Classement et Accueil. Une partie abandonnée ne produit pas de score classé.
