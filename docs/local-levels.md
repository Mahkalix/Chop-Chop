# Essai local des trois niveaux (issue #85)

Branche commune : `feat/85-niveaux-1-2-3`. Les travaux #63, #64 et #65 sont regroupés ici pour validation par Maxence avant toute PR. Aucun push ni déploiement.

## Démarrage sans compte

Depuis le dossier de cette branche :

```powershell
pnpm install --frozen-lockfile
pnpm dev:demo
```

Ouvrir l’adresse affichée par Vite (habituellement `http://127.0.0.1:5173`). Choisir le niveau et le chef, saisir un pseudo, puis JOUER et COMMENCER. Arrêter avec Ctrl+C.

Le mode **ESSAI LOCAL** utilise le vrai jeu et ses chronos. Il ne contacte ni Supabase ni l’API. Les 50 dernières parties terminées sont conservées dans cet onglet (`sessionStorage`), avec un classement local par niveau et pseudo. Un rechargement conserve les résultats ; fermer l’onglet les efface. Aucun score n’est envoyé au classement partagé. Ce mode exige à la fois le serveur de développement et `--mode demo` ; il est désactivé dans la compilation de production.

Pour utiliser les vrais services : configurer `front/.env` à partir de `front/.env.example`, puis `pnpm dev:front`. Le mode normal conserve l’authentification et les contrats API existants. Aucune migration de base n’a été ajoutée.

## Progression

| Niveau | Recettes | Ajouts |
| --- | --- | --- |
| 1 | Tomate préparée, viande grillée | Découpe, cuisson, assiette, service |
| 2 | Les précédentes + salade tomate, assiette complète | Salade prête, assemblages, feu, extincteur |
| 3 | Les précédentes + wrap | Galette prête et sauce blanche, comptoirs dédiés |

Wrap : une assiette, une galette, de la salade, une tomate découpée, une viande cuite et de la sauce blanche. Aucun chauffage supplémentaire. Poser l’assiette sur ASSEMBLER ou un plan de travail, puis ajouter les ingrédients un par un avec E, dans n’importe quel ordre. Ingrédients supplémentaires, crus ou brûlés refusés.

Commandes : ZQSD ou flèches pour bouger, E pour prendre/poser/servir, C maintenue 3 s pour découper (mains libres), Espace pour bondir, Échap pour pause. Aux niveaux 2/3, porter l’extincteur et maintenir C près du grill en feu pendant 3 s. Reposer l’extincteur, puis jeter la viande brûlée pour réutiliser le grill.

| Paramètre | Niveau 1 | Niveau 2 | Niveau 3 |
| --- | --- | --- | --- |
| Durée active | 180 s | 180 s | 180 s |
| Intervalle de commande si place libre | 15 s | 12 s | 10 s |
| Patience par minute | 50 / 45 / 40 s | 45 / 40 / 35 s | 40 / 35 / 30 s |
| Étoiles indicatives | 500 / 1 000 / 1 800 | 700 / 1 400 / 2 200 | 900 / 1 800 / 2 600 |

Deux commandes initiales, trois maximum. Cuisson 8 s, brûlure après 6 s supplémentaires, malus unique −10 (plancher zéro) et combo à ×1. Feu immédiat à la brûlure aux niveaux 2/3, limité au grill, aucun malus d’extinction. Pause complète, reprise après 3-2-1 hors chrono. Abandon jamais classé.

## Vérifications du 15 novembre 2026

- `pnpm typecheck`, `pnpm test`, `pnpm build:front` et `git diff --check` réussis.
- 216 tests : 26 partagés, 81 API, 108 front, 1 script. Dont 120 permutations d’assemblage du wrap dans un test, refus des compositions incorrectes, cinq livraisons, stations accessibles/non superposées, cadence/patience, extinction, contrats API pour les trois niveaux, isolation du mode local et absence de réseau.
- Les parcours de 180 secondes des niveaux 1 et 2 sont détaillés dans `level-1.md` et `level-2.md` (API et authentification simulées).
- Niveau 3 : Chrome 1440 × 1000, commandes clavier réelles, aucun changement forcé d’état ni accélération du chrono. Galette et sauce prises à leurs comptoirs, cinq recettes préparées et servies, refus du wrap sans commande puis acceptation sur commande active.
- Brûlure à 14 s, grill bloqué, extincteur récupéré, extinction suspendue par une pause à 43 % puis terminée, viande brûlée jetée, nouvelle viande cuite et récupérée. Une seule pénalité de 10 points.
- Fin normale après 180 secondes actives : **1 096 points, cinq commandes servies, huit expirées, meilleur combo ×3, une étoile**. Classement local du niveau 3 correct et conservé après rechargement. Aucun appel externe et aucune erreur JavaScript.
- Démarrage puis abandon annulé/confirmé vérifiés pour chacun des trois niveaux. Aucun nouveau score après abandon et aucune contamination du classement entre niveaux.
- Retour depuis Comment jouer accessible en 1440 × 1000 et 1280 × 720 après correction du défilement des longues règles.

Limites : sauvegarde réelle Supabase/PostgreSQL à vérifier avec les services autorisés ; les parcours de développement ne prouvent pas le déploiement. Les seuils d’étoiles restent à équilibrer avec des parties humaines. Avertissements de compilation préexistants sur les annotations Zod et la taille du module Phaser. La réconciliation globale Docusaurus de l’issue #81 reste sur sa branche indépendante.

## Points à regarder pendant ton essai

- Reconnaissance des ingrédients et du wrap, lisibilité des cinq icônes de commande.
- Placement et distance des comptoirs, temps d’assemblage face aux délais de commande.
- Clarté du feu, de l’extinction, du nettoyage et du contenu porté.
- Rythme des trois niveaux, score et seuils d’étoiles avant la PR.
