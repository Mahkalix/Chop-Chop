# Documentation CHOP-CHOP

Site Docusaurus en français pour CHOP-CHOP, jeu web de cuisine solo avec trois niveaux prévus et un classement par niveau. Le contexte de travail à jour pour l’équipe et les assistants IA se trouve dans `CONTEXT.md` à la racine du dépôt. Les documents de cadrage et les diagrammes originaux sont conservés dans `static/references` ; leurs règles proposées ne remplacent pas les décisions récentes de l’équipe.

Le menu Équipe présente Sabrina, Melissa (Mel), Maxence et Valérie, ainsi que les conventions de code et les règles de travail. Le monorepo du jeu utilise Node.js 22+ et pnpm 11 ; les commandes npm ci-dessous concernent uniquement ce site de documentation. La CI du dépôt vérifie le monorepo pnpm ; un changement Docusaurus se vérifie séparément avec les commandes ci-dessous.

## Utilisation locale

Node.js 20 ou supérieur est requis.

```sh
npm ci
npm start
```

## Vérification

```sh
npm run typecheck
npm run build
npm run serve
```

Le build produit le site statique dans `build`. Les liens cassés sont bloquants. Les exemples de blog sont désactivés et les tutoriels Docusaurus sont exclus de la documentation publiée.

## Hébergement

Définir `DOCUSAURUS_URL` avec le domaine réel et `DOCUSAURUS_BASE_URL` avec le chemin de publication avant le build. Sans configuration, le site utilise `http://localhost:3000` et `/` pour le développement. Aucune cible de production n’a été choisie et aucun déploiement n’est effectué.

La navigation est définie dans `sidebars.ts`, le contenu dans `docs`, l’accueil dans `src/pages/index.tsx` et les couleurs dans `src/css/custom.css`.

## Design

Les [maquettes Figma CHOP-CHOP](https://www.figma.com/design/5YyQNON3zicZCKuN1CkEH0/Chop-Chop?node-id=0-1) et les captures fournies servent de référence visuelle. Le site reprend les fonds crème, panneaux sable, accents brique, contours droits et titres pixel. Voir `docs/design.md` pour les choix d’adaptation. La police Press Start 2P est hébergée localement dans `static/fonts`, avec sa licence OFL.

## Si npm est indisponible localement

Avec les dépendances déjà installées, les outils peuvent être lancés directement :

```sh
node node_modules/@docusaurus/core/bin/docusaurus.mjs start --no-open
node node_modules/typescript/bin/tsc --noEmit
node node_modules/@docusaurus/core/bin/docusaurus.mjs build
```

La configuration utilise la chaîne de compilation standard (`future.faster: false`) pour éviter les problèmes du cache natif SWC sous Windows.

## Gestion de projet

Dans le menu **Gestion de projet**, **Tableau de bord** ouvre `/gestion-de-projet`. Les entrées **Tickets ouverts** et **Graphe des dépendances** vont directement aux sections correspondantes. Le graphique du backlog filtre la liste par statut. Le graphe montre les liens déclarés sur GitHub et peut afficher seulement les blocages actifs. La route `/bilan-de-projet` propose la synthèse imprimable. Les vues fonctionnent avec `npm start` à partir de l’instantané versionné, même en l’absence d’accès à GitHub.

### Rafraîchir avant la publication de la documentation

Depuis `documentation/`, lancer `npm run sync:project`, relire la modification de `src/project/snapshot.json`, puis inclure cet instantané dans la prochaine livraison de la documentation. Sur GitHub, le workflow **Tableau de bord projet** peut générer le même instantané sur la branche par défaut. Télécharger le fichier de l’artefact `chop-chop-project-snapshot` et remplacer l’instantané versionné après relecture. La compilation locale et les aperçus utilisent le fichier versionné.

La collecte REST publique parcourt les issues, les PR, les reviews, les commits de `main` le catalogue des labels, les exécutions du workflow CI et les dépendances natives des issues ouvertes dans ce dépôt. Elle fonctionne sans jeton tant que le quota le permet. Dans Actions, le jeton automatique lit le contenu public et les métadonnées publiques de ce dépôt. Pour une exécution locale avec un quota supérieur, `CHOP_REPO_TOKEN` peut contenir un jeton avec lecture de **Contents**, **Issues**, **Pull requests** et **Actions**.

Pour obtenir les champs de Projects v2, configurer `CHOP_PROJECT_TOKEN` uniquement dans l’environnement local du collecteur ou les secrets GitHub Actions. Utiliser un jeton GitHub classique avec le scope `read:project` appartenant à un compte ayant accès au Project utilisateur n°3. Le script exige que le Project soit public avant d’en incorporer les valeurs dans la documentation publique. Un Project privé peut continuer à être consulté via le lien GitHub par les membres autorisés. Aucun jeton ne doit être renseigné dans le code, le JSON ou les variables publiques du site.

Si la collecte échoue (permissions, quota, réseau), le script quitte avec un code d’erreur et conserve le fichier précédent. Sans jeton Project, il est possible de rafraîchir les données du dépôt tant que le fichier versionné n’inclut pas encore de données Project. Vérifier la date affichée, l’accès et le quota avant de réessayer.

### Suivre les nouvelles issues et le backlog

La section **Tickets ouverts et backlog** inclut toutes les issues ouvertes de l’instantané, même sans responsable ni label. Elle indique « À faire », « En cours », « En revue », « Bloquée » ou « À préciser ». Une dépendance encore ouverte signale un blocage. Sinon, le statut du Project est prioritaire, puis un label de suivi explicite sert de repli. Le bilan montre aussi combien d’issues restent ouvertes.

Pour activer le rafraîchissement quotidien en production une fois le workflow fusionné dans la branche par défaut :

1. Dans le projet Vercel **de documentation**, ajouter `CHOP_REPO_TOKEN` à l’environnement Production, avec les permissions de lecture ci-dessus. En option, ajouter `CHOP_PROJECT_TOKEN` si le Project est public et accessible. Ces secrets sont lus pendant la compilation.
2. Créer un Deploy Hook Vercel pour la branche de production de la documentation et enregistrer son URL dans le secret GitHub Actions `CHOP_DOCS_DEPLOY_HOOK`.
3. Lancer **Tableau de bord projet** depuis GitHub Actions sur la branche par défaut. Contrôler le déploiement Vercel et la date de synchronisation. Le workflow demande ensuite une reconstruction quotidienne à 06 h 17 UTC.

Chaque reconstruction de production configurée relit toutes les pages d’issues GitHub. Les nouveaux tickets, changements de labels, réouvertures et clôtures se répercutent dans les vues. Si GitHub est indisponible, la compilation s’arrête et Vercel continue à servir la dernière publication réussie. Un déploiement sans jeton utilise l’instantané versionné. Le lien vers les issues ouvertes de GitHub permet le suivi en direct entre deux synchronisations.

### Format et indicateurs

L’instantané v2 contient `syncedAt` (UTC), `project` (champs effectivement découverts et itérations, ou `null`), `issues`, `pulls`, `labels`, `commits` et `ci`. Les éléments sont dédupliqués par identifiant, numéro ou SHA. Un instantané enrichi ponctuellement via les pages GitHub peut porter une date distincte pour le catalogue, les liens de PR et la CI (`supplementalAt`). Pour limiter l’exposition et le poids, seules les données utiles sont recopiées, sans corps des issues, des reviews ou des commits, ni adresses e-mail. Les brouillons du Project et les autres dépôts sont hors périmètre. Les dates d’événement sont affichées en heure de Paris et les jours natifs du Project sont conservés.

- Le graphique principal conserve les noms et couleurs des labels GitHub. Une issue apparaît une fois sous chacun de ses labels. Les compteurs de PR du catalogue reprennent seulement les labels directs. Le filtre de PR et les délais par label incluent aussi les PR dont la description contient un mot-clé de clôture suivi d’un numéro d’issue connu dans ce dépôt. Les références libres ne suffisent pas pour rattacher une PR.
- La répartition par responsable utilise les affectations au moment de l’instantané, avec une catégorie pour les issues sans responsable. Le nombre d’issues par personne ne mesure pas le temps ni l’effort.
- Le total CI compte une exécution par identifiant du workflow existant, toutes branches confondues, selon le statut et la conclusion du dernier essai. Les relances d’une même exécution partagent son identifiant. Une PR peut déclencher plusieurs exécutions distinctes.
- Les phases sont des regroupements de présentation à partir des intitulés des issues et PR, avec les sources sur les fiches. Ce découpage n’ajoute aucune date de sprint au Project.
- Le planning compare les dates Project disponibles aux dates d’ouverture et de dernière clôture GitHub. Une fermeture « non planifiée » ou liée à un regroupement ne prouve pas une livraison. Les dépendances affichées relient les prérequis publics du dépôt aux issues encore ouvertes.
- Les délais de revue, fusion et clôture sont des médianes de durées calendaires. Les PR sans revue sont exclues du calcul du délai de première revue. Les commits accessibles depuis `main` constituent un relevé d’activité, sans mesure du temps de travail individuel.
- Une itération utilise les affectations et estimations actuelles. L’engagement initial, les réaffectations historiques, le chemin critique et le flux cumulé restent indisponibles en l’absence des informations nécessaires.
- Le bilan de soutenance contient des repères éditoriaux sourcés. Relire les informations de recette lorsqu’une fonctionnalité passe du test local à une validation sur les services réels.

Vérifications locales depuis `documentation/` avec `npm run test:project`, `npm run typecheck` et `npm run build`.
