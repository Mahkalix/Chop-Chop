# Essai local des trois niveaux (issue #85)

Implémentation : `feat/85-niveaux-1-2-3`, [PR #86](https://github.com/Mahkalix/Chop-Chop/pull/86). Le dernier `main` incluant la PR #83 est intégré. Règles d’API et de classement conservées, sans migration de base.

## Démarrage sans compte

Depuis le dossier de cette branche :

```powershell
pnpm install --frozen-lockfile
pnpm dev:demo
```

Ouvrir l’adresse affichée par Vite (habituellement `http://127.0.0.1:5173`). Choisir le niveau et le chef, saisir un pseudo, puis JOUER. Le lancement enchaîne automatiquement Mise en place, Prêt ?, Partez !. Arrêter avec Ctrl+C.

Le mode **ESSAI LOCAL** utilise le vrai jeu et ses chronos. Il ne contacte ni Supabase ni l’API. Les 50 dernières parties terminées sont conservées dans cet onglet (`sessionStorage`), avec un classement local par niveau et pseudo. Un rechargement conserve les résultats ; fermer l’onglet les efface. Aucun score n’est envoyé au classement partagé. Ce mode exige à la fois le serveur de développement et `--mode demo` ; il est désactivé dans la compilation de production.

Pour utiliser les vrais services : configurer `front/.env` à partir de `front/.env.example`, puis `pnpm dev:front`. Le mode normal conserve l’authentification et les contrats API existants. Aucune migration de base n’a été ajoutée.

## Progression

| Niveau | Recettes | Ajouts |
| --- | --- | --- |
| 1 | Tomate préparée, viande grillée | Découpe, cuisson, assiette, service |
| 2 | Les précédentes + salade tomate, assiette complète | Salade à découper (3 s), assemblages, feu, extincteur |
| 3 | Les précédentes + wrap | Galette prête et sauce blanche, comptoirs dédiés |

Wrap : une assiette, une galette, de la salade découpée, une tomate découpée, une viande cuite et de la sauce blanche. Aucun chauffage supplémentaire. Poser l’assiette sur ASSEMBLER ou un plan de travail, puis ajouter les ingrédients un par un avec E, dans n’importe quel ordre. Ingrédients supplémentaires, crus ou brûlés refusés.

Commandes : ZQSD ou flèches pour bouger, E pour prendre/poser/servir, C maintenue 3 s pour découper (mains libres), Espace pour bondir, Échap pour pause. Aux niveaux 2/3, porter l’extincteur et maintenir C près du grill en feu pendant 3 s. Reposer l’extincteur, puis jeter la viande brûlée pour réutiliser le grill.

| Paramètre | Niveau 1 | Niveau 2 | Niveau 3 |
| --- | --- | --- | --- |
| Durée active | 180 s | 180 s | 180 s |
| Intervalle de commande si place libre | 15 s | 12 s | 10 s |
| Patience par minute | 50 / 45 / 40 s | 45 / 40 / 35 s | 40 / 35 / 30 s |
| Étoiles indicatives | 500 / 1 000 / 1 800 | 700 / 1 400 / 2 200 | 900 / 1 800 / 2 600 |

Deux commandes initiales, trois maximum. Cuisson 8 s, brûlure après 6 s supplémentaires, malus unique −10 (plancher zéro) et combo à ×1. Feu immédiat à la brûlure aux niveaux 2/3, limité au grill, aucun malus d’extinction. Pause complète, reprise après 3-2-1 hors chrono. Abandon jamais classé.

## Vérifications initiales du 15 novembre 2026 (historique)

- `pnpm typecheck`, `pnpm test`, `pnpm build:front` et `git diff --check` réussis.
- 216 tests : 26 partagés, 81 API, 108 front, 1 script. Dont 120 permutations d’assemblage du wrap dans un test, refus des compositions incorrectes, cinq livraisons, stations accessibles/non superposées, cadence/patience, extinction, contrats API pour les trois niveaux, isolation du mode local et absence de réseau.
- Les parcours de 180 secondes des niveaux 1 et 2 sont détaillés dans `level-1.md` et `level-2.md` (API et authentification simulées).
- Niveau 3 : Chrome 1440 × 1000, commandes clavier réelles, aucun changement forcé d’état ni accélération du chrono. Galette et sauce prises à leurs comptoirs, cinq recettes préparées et servies, refus du wrap sans commande puis acceptation sur commande active.
- Brûlure à 14 s, grill bloqué, extincteur récupéré, extinction suspendue par une pause à 43 % puis terminée, viande brûlée jetée, nouvelle viande cuite et récupérée. Une seule pénalité de 10 points.
- Fin normale après 180 secondes actives : **1 096 points, cinq commandes servies, huit expirées, meilleur combo ×3, une étoile**. Classement local du niveau 3 correct et conservé après rechargement. Aucun appel externe et aucune erreur JavaScript.
- Démarrage puis abandon annulé/confirmé vérifiés pour chacun des trois niveaux. Aucun nouveau score après abandon et aucune contamination du classement entre niveaux.
- Retour depuis Comment jouer accessible en 1440 × 1000 et 1280 × 720 (état initial ; les règles actuelles tiennent sans défilement dans le cadre de référence).

Limites : sauvegarde réelle Supabase/PostgreSQL à vérifier avec les services autorisés ; les parcours de développement ne prouvent pas le déploiement. Les seuils d’étoiles restent à équilibrer avec des parties humaines. Avertissements de compilation préexistants sur les annotations Zod et la taille du module Phaser. La réconciliation globale Docusaurus de l’issue #81 reste sur sa branche indépendante.

## Éléments vérifiés pendant les essais

- Reconnaissance des ingrédients et du wrap, lisibilité des cinq icônes de commande.
- Placement et distance des comptoirs, temps d’assemblage face aux délais de commande.
- Clarté du feu, de l’extinction, du nettoyage et du contenu porté.
- Rythme des trois niveaux, score et seuils d’étoiles affichés.

## Ajustement visuel après essai (15 novembre 2026)

Référence vérifiée : Figma CHOP-CHOP, écran « 06 — Service en cours », nœud `15:1346`, cuisine `15:1350`.

- Sol étendu à toute la fenêtre sans bandes unies sur les côtés et sans déformer les personnages/comptoirs ; caméra redimensionnée avec la fenêtre.
- HUD repris de la maquette : commandes verticales illustrées, niveau centré, temps en Pixelify Sans dans un bandeau noir, score/combo séparés, pause et pied de page avec objet porté et Recettes.
- Recettes ouvre un panneau qui suspend le service ; reprise avec le décompte existant. Vérifié pour les catalogues de 2, 4 et 5 recettes, puis retour à la pause normale avec Échap.
- Salade/galette/sauce dans la rangée basse, service orienté et ancré au bord droit, sans cadre rouge d’interaction, avec progression au-dessus des postes. Comptoir libre conservé pour les préparations intermédiaires.
- PNG exportés directement des composants Figma : comptoirs `356:1743`, `356:1763`, `356:1802` ; ingrédients `344:3999`, `344:4029`, `353:1377` ; plats `350:9502`, `350:9547`, `344:4045`. Sources dans `front/public/kitchen/` et `items/`.
- Vérifications : 216 tests réussis, typecheck et compilation réussis. Canvas exactement à la taille de la fenêtre en 1440 × 900 (niveau 1), 1366 × 768 (niveau 2), 1913 × 907 (niveau 3), aucun débordement horizontal ni erreur JavaScript. Chrono inchangé lors de la consultation des recettes. Wrap préparé et livré au clavier dans la nouvelle disposition (+149 points).

- Deux postes ASSEMBLER indépendants sur chaque niveau. Assiettes vides et garnies à taille uniforme ; composition commune entre les recettes et la cuisine, avec salade visible en fond. Commandes accessibles dans Pause.

## Vérification avant PR (15 novembre 2026)

- `pnpm typecheck`, `pnpm test` (220 tests) et `pnpm build:front` réussis.
- Poubelle au centre de la rangée basse, deux postes d’assemblage, passage central élargi.
- Accueil avec trois boutons de niveau ; règles illustrées tenant dans le cadre 1440 × 900 sans défilement.
- Lancement automatique : mise en place avec progression réelle, prêt, partez ; chrono démarré ensuite. Pause et abandon sur la cuisine assombrie.
- Parcours navigateur récents : lancement, salade découpée puis assemblages à deux et trois ingrédients, consultation des recettes, reprise et abandon.
- Équilibrage encore à valider : délais de commandes et seuils d’étoiles provisoires. La proposition de découpe à 2 s n’est pas appliquée (3 s actuellement).

## État courant de l’interface

Accueil avec sélection du niveau par boutons et six chefs originaux. Loader crème, barre noire et remplissage rouge suivant le chargement ; Prêt puis Partez sur fond rouge, sans consommation de temps actif. Pause et abandon en fenêtres sur cuisine assombrie, décompte de reprise centré, commandes dépliables. Règles illustrées sans défilement dans le cadre 1440 × 900. Assiettes et ingrédients harmonisés entre commandes, recettes et comptoirs. Les messages ordinaires de prise/dépôt et le libellé de mains vides sont masqués.

La PR #86 ajoute côté API le champ `levels` de `GET /recipes` et met à jour ses données partagées. Les contrôles d’équité, plafonds, classement par version et départage de la #83 restent inchangés.

## Cohérence front (15 novembre 2026)

- Aperçu de cuisine construit depuis les postes du niveau sélectionné, avec le chef choisi ; ancienne image statique retirée.
- Même composant de sélection de niveau sur accueil et classement.
- En mode connecté, l’accueil lit `GET /me` : pseudo enregistré affiché en lecture seule ; chargement/erreur ne permettent pas une modification trompeuse. Le brouillon reste disponible pour un nouveau profil et le mode local reste éditable.
- Le lancement attend la réponse de `POST /games` avant Partez ; le chrono actif commence une seconde après cette confirmation. Échec et nouvel essai explicite, pause si changement d’onglet.
- Corrections uniquement front : aucun contrat, code API, schéma ou migration modifié. Un changement de pseudo après création resterait une évolution back à décider séparément.
