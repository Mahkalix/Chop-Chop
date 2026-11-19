---
title: Règles du jeu
---

## Le but du jeu

Préparer et livrer un maximum de commandes avant la fin du chronomètre. CHOP-CHOP se joue en solo, sur ordinateur, au clavier. Les livraisons réussies augmentent le score ; les livraisons consécutives augmentent le combo.

:::info Règles du prototype
Cette page décrit les règles implémentées pour les trois niveaux : 180 secondes de jeu actif, hors pauses. Voir les [critères de validation](./validation.md) pour les vérifications sur les services déployés.
:::

## Comment jouer

1. Lire une commande : identifier la recette demandée et le temps restant.
2. Prendre les ingrédients aux postes de réserve avec les mains libres.
3. Découper les tomates et la salade sur la planche et cuire la viande sur le poste de cuisson.
4. Assembler les ingrédients prêts dans une assiette posée sur un plan de travail.
5. Porter l’assiette à la zone de livraison avant l’expiration de la commande.
6. Enchaîner les livraisons pour augmenter le combo et améliorer son score.

## Commandes au clavier

| Touche | Action |
| --- | --- |
| Flèches ou Z Q S D | Se déplacer |
| E | Prendre, poser, assembler ou livrer selon le poste ciblé |
| C maintenue | Découper tomate ou salade en 3 secondes, mains libres ; éteindre un feu en 3 secondes avec l’extincteur |
| Espace | Bondir |
| Échap | Mettre en pause |

Se placer près d’un poste pour interagir ; le poste le plus proche à portée est ciblé. Un poste occupé ne remplace pas automatiquement son contenu.

## Les recettes par niveau

| Plat | Contenu exact de l’assiette |
| --- | --- |
| Tomate préparée | Une tomate découpée |
| Viande grillée | Une viande cuite |
| Salade tomate (niveau 2) | Une salade découpée et une tomate découpée |
| Assiette complète (niveau 2) | Une salade découpée, une tomate découpée et une viande cuite |
| Wrap (niveau 3) | Une galette, une salade découpée, une tomate découpée, une viande cuite et une sauce blanche |

Le niveau 1 contient tomate préparée et viande grillée ; chaque niveau conserve les recettes précédentes. Les recettes du niveau sont disponibles dès le début. Une tomate ou salade brute et une viande crue ou brûlée ne conviennent pas ; un ingrédient supplémentaire ou un doublon est refusé à l’assemblage. La viande cuit en 8 secondes puis brûle après 6 secondes supplémentaires sur le grill et doit être jetée. Aux niveaux 2 et 3, elle déclenche aussi un feu : éteindre le grill avec l’extincteur avant de récupérer la viande brûlée. Galette et sauce blanche sont prêtes à l’emploi.

## Temps, score et combos

Chaque niveau dure **3 minutes actives**, avec un classement par niveau et version des règles. Chaque commande possède son propre délai : servir un plat exige une recette exacte et une commande encore active.

- Une livraison valide rapporte 100 points de base et jusqu’à 50 points de rapidité, avant application du multiplicateur.
- Les livraisons consécutives font progresser le combo : ×1, ×2, puis ×3 au maximum.
- Une commande expirée ne retire aucun point et remet le multiplicateur à ×1.
- Une livraison refusée ne rapporte aucun point et remet la série à zéro.
- Une viande brûlée retire 10 points une seule fois et remet le multiplicateur à ×1.
- Le score ne descend jamais sous zéro.

Les détails et exemples de calcul figurent dans [Commandes et score](./score.md).

## Fin du service

Quand le chronomètre atteint zéro, la partie s’arrête et le score est figé, sans pénalité pour les commandes restantes. Le bilan présente le score et les statistiques du service. Le joueur peut rejouer, consulter le classement ou retourner à l’accueil. Une partie abandonnée ne produit pas de score classé.

Pause et Recettes suspendent le chrono, les commandes, les préparations, le feu et l’extinction. Changer d’onglet met aussi en pause ; la reprise passe par un décompte 3, 2, 1. Les pauses sont illimitées. Abandonner depuis Pause demande une confirmation ; fermer ou recharger tente un abandon réseau sans garantie de réception et ne permet pas de reprendre la partie.

Pour approfondir : [Cuisine et gameplay](./gameplay.md), [Classement par niveau](./classement.md) et [Design et maquettes](./design.md).
