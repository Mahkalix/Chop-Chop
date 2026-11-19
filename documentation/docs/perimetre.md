---
title: Périmètre et écrans
---

:::info Document de cadrage
Le périmètre confirmé et implémenté est de trois niveaux avec un classement par niveau. Le parcours sur les services déployés reste à vérifier. Les documents de cadrage initiaux restent disponibles dans les [sources](./references.md).
:::

## Périmètre de la première version

Jeu web sur ordinateur, jouable au clavier, en mode solo uniquement.

Une cuisine fixe, un personnage et une partie chronométrée.

Ingrédients avec états, découpe, cuisson, assemblage et livraison.

Un seul objet porté à la fois ; une assiette garnie compte comme un objet.

Classement par niveau, avec trois niveaux jouables : Premier coup de feu, Chaud devant et Le grand wrap.

React/Vite pour les écrans et l’interface ; Phaser pour la cuisine et les interactions. Fastify et Supabase pour le back et l’authentification.

## Écrans du jeu


| Écran | Contenu principal |
| --- | --- |
| Identification et accueil | Session anonyme Supabase, création puis modification du pseudo ; sélection du niveau et de l’un des six chefs ; Jouer, Classement et Comment jouer. |
| Comment jouer | Objectif, touches, recettes, états des ingrédients et règles de découpe et cuisson. Un panneau suffit. |
| Partie | Cuisine, personnage, commandes clients, temps restant, score, combo et objet porté ; barres de transformation. Chargement puis Prêt ? et Partez ! avant le chrono. Pause, Recettes et confirmation d’abandon. |
| Fin de partie | Score final, étoiles, commandes servies et expirées, meilleur combo, état d’enregistrement ; record personnel et rang dans la version de la partie si la réponse de fin est disponible. |
| Sélection du niveau | Trois boutons sur l’accueil et le classement ; catalogues cumulatifs tomate/viande, salade/assemblages, puis wrap. |
| Classement par niveau | Top 5 avec rang, pseudo, score et podium ; états de chargement, vide et erreur. Aucune pagination ni position hors top. |


## Scope retenu et éléments exclus


| Retenu pour la première version | Exclu de la première version |
| --- | --- |
| Solo, une cuisine fixe, clavier | Multijoueur, coopération, manette et commandes tactiles |
| Tomate, viande, salade, galette, sauce blanche et cinq recettes réparties sur trois niveaux | Pain, pizza, sandwich et personnalisation des recettes |
| Découpe, cuisson, assemblage, livraison | Casserole, soupe, lavage des assiettes et vaisselle sale |
| Collisions simples, interactions proches, incendies et extincteur aux niveaux 2 et 3 | Cuisine mobile, obstacles dynamiques et propagation du feu |
| Timer de 180 secondes actives, score, combos et trois niveaux jouables | Campagne narrative, améliorations et inventaire |
| Classement par niveau, record personnel et choix parmi six chefs | Classements par amis, boutique, succès et personnalisation libre du personnage |
