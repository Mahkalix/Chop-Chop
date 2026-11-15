import { getServiceRules, RECIPES } from '@chopchop/shared';
import { DishArt } from '../features/game/DishArt';
import { ingredientArt, ingredientNames } from '../features/game/recipePresentation';
import { isLocalDemo } from '../features/game/localDemo';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
import { PlayerGate } from '../features/auth/PlayerGate';
import { Ranking } from '../features/leaderboard/Ranking';
import { readSelectedLevel } from '../features/game/levelSelection';
import { HomePage } from '../features/home/HomePage';
import styles from '../features/home/HomePage.module.scss';

const Kitchen = lazy(() => import('../features/game/Kitchen'));

type Route = 'accueil' | 'jouer' | 'regles' | 'classement';
const routes: Route[] = ['accueil', 'jouer', 'regles', 'classement'];
function readRoute(): Route {
  const value = window.location.hash.slice(1) as Route;
  return routes.includes(value) ? value : 'accueil';
}
const titles: Record<Route, string> = { accueil: 'Accueil', jouer: 'Espace joueur', regles: 'Comment jouer', classement: 'Classement' };

export function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

function AppContent() {
  const [route, setRoute] = useState<Route>(readRoute);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    document.title = route === 'accueil' ? 'CHOP-CHOP — Jeu de cuisine solo' : `${titles[route]} · CHOP-CHOP`;
    heading.current?.focus({ preventScroll: true });
  }, [route]);
  if (route === 'accueil') return <HomePage />;
  if (route === 'jouer' && isLocalDemo()) return <Suspense fallback={<p>MISE EN PLACE…</p>}><Kitchen /></Suspense>;
  if (route === 'jouer') return <>
    <PlayerGate><Suspense fallback={<p>MISE EN PLACE…</p>}><Kitchen /></Suspense></PlayerGate>
  </>;
  const backLabel = route === 'regles' ? 'COMPRIS, RETOUR' : 'RETOUR';
  return (
    <main className={styles.page} data-screen={route}>
      <header className={styles.header}>
        <img src="/menu/logo.png" alt="CHOP CHOP" />
        <h1 ref={heading} tabIndex={-1}>{titles[route].toUpperCase()}</h1>
      </header>
      {route === 'regles' && <Rules />}
      {route === 'classement' && <Ranking />}

      <a className={styles.back} href="#accueil">{backLabel}</a>
    </main>
  );
}

const steps = [
  ['1 / PRENDS UNE TOMATE', 'Approche-toi du bac TOMATES.\nAppuie sur E pour prendre une tomate.'],
  ['2 / DÉCOUPE-LA', 'À la planche : E pour poser la tomate. Puis maintiens C pendant 3 s, les mains libres.'],
  ['3 / PRÉPARE L’ASSIETTE', 'Pose une assiette au poste ASSEMBLER. Reprends la tomate découpée à la planche, puis pose-la sur l’assiette avec E.'],
  ['4 / SERS LA COMMANDE', 'Prends l’assiette terminée. Va au poste SERVIR et appuie sur E. La bonne recette rapporte des points !'],
];

function Rules() {
  const level = readSelectedLevel();
  return <>
    <p>TON BUT : servir les bonnes assiettes avant la fin des 3 minutes.</p>
    <div className={styles.row}>
      {[['Z Q S D ou ↑ ← ↓ →', 'Se déplacer'], ['E', 'Prendre / poser', 'Appui simple'], ['C', level >= 2 ? 'Découper / éteindre' : 'Découper', 'Maintenir 3 secondes'], ['Esc', 'Pause']].map(([key, label, hint]) =>
        <section key={key}>{key === 'Z Q S D ou ↑ ← ↓ →' ? <div className={styles.movement}>{['ZQSD', '↑←↓→'].map((layout, i) => <span key={layout}>{i === 1 && <b>ou</b>}<span className={styles.keys}>{Array.from(layout, letter => <kbd key={letter}>{letter}</kbd>)}</span></span>)}</div> : <kbd>{key}</kbd>}<h3>{label}</h3>{hint}</section>
      )}
    </div>
    <h2>TA PREMIÈRE COMMANDE : UNE ASSIETTE DE TOMATE</h2>
    <div className={styles.row}>{steps.map(([title, body]) =>
      <section key={title}><h3>{title}</h3><p>{body}</p></section>
    )}</div>
    <div className={styles.row}>
      <section><h3>LES RECETTES DU NIVEAU {level}</h3>
        <div className={styles.visualRecipes}>{getServiceRules(level).recipes.map(id => {
          const recipe = RECIPES.find(value => value.id === id)!;
          return <div className={styles.visualRecipe} key={id}>
            <DishArt recipeId={id} /><strong>{recipe.name}</strong>
            <div className={styles.recipeIngredients} aria-label={recipe.ingredients.map(value => ingredientNames[value.kind]).join(', ')}>
              {recipe.ingredients.map(value => <img key={value.kind} src={ingredientArt(value.kind)} alt={ingredientNames[value.kind]} title={ingredientNames[value.kind]} />)}
            </div>
          </div>;
        })}</div>
      </section>
      <section className={styles.reminders}><h3>À RETENIR</h3>
        <p>Un objet à la fois · Assemble sur une assiette.</p>
        <p>Découpe : <b>3 s</b>, mains libres.<br />Viande : <b>8 s</b> de cuisson, puis <b>6 s</b> avant brûlure (−10 pts, combo perdu).</p>
        {level >= 2 ? <p>Feu : prends l’extincteur, maintiens <b>C 3 s</b>, puis jette la viande brûlée.</p> : <p>Viande brûlée ? Direction poubelle.</p>}
      </section>
    </div>
  </>;
}
