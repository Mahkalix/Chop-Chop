import { ServiceIntro } from './ServiceIntro';
import { SoundSettingsControls } from './SoundSettingsControls';
import { isLocalDemo } from './localDemo';
import { useEffect, useRef } from 'react';
import { getServiceRules, RECIPES } from '@chopchop/shared';
import type { useServiceSession } from './useServiceSession';
import { DishArt } from './DishArt';
import { ingredientNames } from './recipePresentation';
import styles from './Kitchen.module.scss';

type Session = ReturnType<typeof useServiceSession>;
export function ServiceOverlay({ session, ready, loadingProgress = 0, showRecipes = false }: { session: Session; ready: boolean; loadingProgress?: number; showRecipes?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { phase, service, confirmQuit, saving, saved, result } = session;
  useEffect(() => {
    if (phase !== 'running') dialog.current?.showModal();
    else dialog.current?.close();
  }, [phase]);
  const rules = getServiceRules(service.levelId);
  const stars = rules.stars.filter(value => service.score >= value).length;
  if (phase === 'ready' || phase === 'starting' || phase === 'go') return <ServiceIntro phase={phase} ready={ready} progress={loadingProgress} level={service.levelId} error={session.error} start={session.start} />;
  return <dialog ref={dialog} className={`${styles.dialog} ${phase === 'paused' ? styles.pauseDialog : phase === 'countdown' ? styles.countdownDialog : ''}`} tabIndex={-1} onCancel={event => event.preventDefault()} aria-labelledby="service-title">
    {phase !== 'countdown' && <p className={phase === 'paused' ? styles.eyebrow : styles.brand}>{phase === 'paused' ? 'PARTIE EN PAUSE' : <>CHOP CHOP · NIVEAU {service.levelId}{isLocalDemo() ? " · ESSAI LOCAL" : ""}</>}</p>}
    <h1 id="service-title">{phase === 'ended' ? 'TEMPS ÉCOULÉ !' : phase === 'countdown' ? String(session.countdown)
      : phase === 'paused' ? (confirmQuit ? <>QUITTER LA<br />CUISINE ?</> : showRecipes ? 'RECETTES' : 'PAUSE') : 'PRÊT POUR LE SERVICE ?'}</h1>
    {phase === 'paused' && (confirmQuit ? <>
      <p>Cette partie sera perdue.<br />Ton score ne sera pas enregistré au classement.</p>
      <div className={styles.dialogActions}><button disabled={saving} onClick={session.resume}>REPRENDRE</button>
      <button className={styles.secondaryButton} disabled={saving} onClick={() => void session.quit()}>{saving ? 'ABANDON EN COURS…' : 'QUITTER SANS ENREGISTRER'}</button></div>
    </> : <>
      {showRecipes && <ul className={styles.recipeList}>{rules.recipes.map(id => {
        const recipe = RECIPES.find(value => value.id === id)!;
        return <li key={id}><DishArt recipeId={id} /><div><strong>{recipe.name}</strong><p>Assiette + {recipe.ingredients.map(ingredient => ingredientNames[ingredient.kind].toLowerCase()).join(' + ')}</p></div></li>;
      })}</ul>}
      <p>Le service est en pause. Prends ton temps.</p>
      <SoundSettingsControls onChange={settings => session.scene.current?.setSoundSettings(settings)} />
      <details className={styles.pauseHelp}><summary>COMMANDES ET RÈGLES</summary>
      {service.levelId >= 2 && <p>Le feu et l’extinction sont également arrêtés. Pour éteindre : porter l’extincteur et maintenir C près du poste en feu (3 s).</p>}
      <p><kbd>ZQSD / flèches</kbd> Déplacer · <kbd>Espace</kbd> Bondir<br /><kbd>E</kbd> Prendre / poser / servir · <kbd>C maintenue</kbd> Découper (3 s, mains libres)</p>
      <p>Pose une assiette sur l’un des deux postes ASSEMBLER, puis ajoute les ingrédients préparés avec E. Reprends l’assiette et apporte-la à SERVIR.</p>
      </details>
      <div className={styles.dialogActions}><button onClick={session.resume}>REPRENDRE</button>
      <button className={styles.secondaryButton} onClick={() => session.setConfirmQuit(true)}>ABANDONNER</button></div>
    </>)}
    {phase === 'countdown' && <p>Prépare-toi… Le chrono reprendra après le décompte.</p>}
    {phase === 'ended' && <>
      <p className={styles.total}>{service.score} points</p>
      <p aria-label={`${stars} étoiles sur 3`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
      <p>{service.delivered} commandes servies · {service.expired} expirées · meilleur combo ×{service.bestCombo}</p>
      <p role="status">{saving ? 'ENREGISTREMENT…' : saved ? (isLocalDemo() ? 'RÉSULTAT ENREGISTRÉ DANS CET ONGLET' : 'RÉSULTAT ENREGISTRÉ') : 'RÉSULTAT NON CONFIRMÉ'}</p>
      {result && <p>{result.isRecord ? 'Nouveau record ! ' : ''}Record : {result.bestScore} pts · Rang du record : {result.rank}</p>}
      {!saving && !saved && session.retryable && <button onClick={() => void session.retry()}>RÉESSAYER L’ENREGISTREMENT</button>}
      {!saving && <><button onClick={() => window.location.reload()}>REJOUER</button><a href="#classement">CLASSEMENT</a><a href="#accueil">ACCUEIL</a></>}
    </>}
    {session.error && <p role="alert">{session.error}</p>}
  </dialog>;
}
