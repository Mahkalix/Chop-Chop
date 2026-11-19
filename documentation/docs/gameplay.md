---
title: Cuisine et gameplay
---

:::info Règles implémentées
Cette page décrit le code actuel des trois niveaux. Le cadrage historique reste accessible dans les [sources](./references.md).
:::

Les recettes et durées viennent de `packages/shared/src/recipes.ts` et `service.ts` ; les interactions, préparations et incendies sont gérés dans `front/src/features/game/`.

## Cuisine et postes de travail

Les limites de la cuisine et les meubles bloquent le déplacement. Le joueur interagit avec le poste le plus proche à portée ; il n’est pas nécessaire de lui faire face.


| Élément | Fonction et règle |
| --- | --- |
| Caisses d’ingrédients | Récupérer un ingrédient avec les mains libres : tomate et viande dès le niveau 1, salade au niveau 2, galette et sauce blanche au niveau 3. Réserves illimitées. |
| Plan de travail | Déposer et reprendre un objet. Un emplacement contient un seul objet. |
| Planche à découper | Déposer une tomate ou une salade brute ; maintenir C à proximité, mains libres, pendant 3 secondes actives. Barre de progression. |
| Poste de cuisson | Déposer une viande ; cuisson autonome en 8 secondes, puis brûlure après 6 secondes supplémentaires sur le grill. |
| Zone d’assiettes | Prendre une assiette vide avec les mains libres. Réserve illimitée. |
| Postes ASSEMBLER | Deux emplacements pour poser une assiette et ajouter les ingrédients prêts avec E ; les plans de travail permettent aussi l’assemblage. |
| Extincteur | Disponible aux niveaux 2 et 3 ; le porter et maintenir C près du grill en feu pendant 3 secondes. Réutilisable et impossible à jeter. |
| Zone de livraison | Servir une assiette ; vérifier automatiquement la recette et la commande correspondante. |
| Poubelle | Supprimer l’objet porté. Pour une assiette garnie, supprimer son contenu et l’assiette dans cette version simplifiée. |


## Ingrédients et états


| Ingrédient | États | Transformation et utilisation |
| --- | --- | --- |
| Tomate | Brute → découpée | La découpe est obligatoire avant l’assemblage d’une recette. |
| Viande | Crue → cuite → brûlée | Seule la viande cuite est utilisable dans les recettes. L’état brûlé est irréversible. |
| Salade | Brute → découpée | Introduite au niveau 2 ; découpe obligatoire en 3 secondes. |
| Galette | Prête | Introduite au niveau 3 ; aucune cuisson. |
| Sauce blanche | Prête | Introduite au niveau 3 ; aucune préparation. |


Chaque ingrédient conserve son état lorsqu’il est porté ou posé.

Un ingrédient brûlé doit être jeté ; aucune réparation ni retour à l’état cru.

Une assiette est un contenant : vide, en préparation ou conforme à une recette.

Les objets déjà présents ne sont pas remplacés automatiquement sur un poste occupé.

## Recettes par niveau


| Recette | Composition exacte dans une assiette |
| --- | --- |
| Tomate préparée | 1 tomate découpée |
| Viande grillée | 1 viande cuite |
| Salade tomate (niveau 2) | 1 salade découpée + 1 tomate découpée |
| Assiette complète (niveau 2) | 1 salade découpée + 1 tomate découpée + 1 viande cuite |
| Wrap (niveau 3) | 1 galette + 1 salade découpée + 1 tomate découpée + 1 viande cuite + 1 sauce blanche |


Le niveau 1 propose la tomate préparée et la viande grillée pour apprendre découpe, cuisson et service. Le niveau 2 conserve ces recettes et ajoute salade tomate, assiette complète et feu. Le niveau 3 conserve les précédentes et ajoute le wrap, la galette et la sauce blanche. Toutes les recettes du niveau sont disponibles dès le début du service. L’assiette mixte reste exportée pour compatibilité dans le paquet partagé, mais ne fait partie d’aucun catalogue jouable.

L’ordre d’assemblage est libre et une assiette partielle peut être déplacée. Les doublons, ingrédients supplémentaires ou dans un mauvais état sont refusés sans perdre l’objet porté.

## Actions du personnage

Se déplacer dans la cuisine sans traverser les obstacles.

Prendre un ingrédient, une assiette ou un objet posé, avec les mains libres.

Poser l’objet porté sur un poste compatible et libre.

Découper une tomate ou une salade sur une planche en maintenant C à proximité, mains libres.

Lancer une cuisson en déposant la viande, puis récupérer la viande cuite avant qu’elle brûle.

Ajouter un ingrédient prêt dans une assiette posée sur un plan de travail.

Transporter une assiette garnie jusqu’à la livraison.

Jeter un objet ou une assiette inutilisable à la poubelle.

Découpe : quitter le poste ou relâcher la touche suspend la progression ; la progression acquise est conservée sur l’ingrédient. Le joueur doit revenir à proximité du poste pour terminer.

Cuisson : le joueur peut s’éloigner une fois la viande déposée. La cuisson continue sur le grill et une barre signale la viande prête puis le risque de brûlure ; hors du grill, la progression est suspendue.

Aux niveaux 2 et 3, la brûlure à 14 secondes déclenche un feu limité au grill, qui bloque ses interactions. L’extinction conserve sa progression si C est relâchée ou si le joueur s’éloigne. Après extinction, reposer l’extincteur puis jeter la viande brûlée. Aucun feu au niveau 1, aucune propagation ni pénalité supplémentaire liée au feu.

## Touches


| Touche | Action |
| --- | --- |
| Flèches ou Z Q S D | Déplacer le personnage |
| E | Prendre, poser, assembler ou livrer selon le poste ciblé |
| C maintenue | Découper une tomate ou une salade, mains libres ; éteindre un feu en portant l’extincteur |
| Espace | Bondir dans la direction du déplacement ou du dernier déplacement |
| Échap | Mettre en pause |


L’action dépend du poste à portée et de l’objet porté ; aucun cadre ne surligne le poste ciblé.

Un ajout ou dépôt impossible conserve les objets et affiche un message. Une livraison refusée conserve l’assiette mais remet le multiplicateur à ×1.

Une assiette posée reçoit uniquement des ingrédients prêts compatibles avec les recettes.

Aucune extraction individuelle des ingrédients d’une assiette dans la première version.
