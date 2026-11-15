import { useEffect, useRef } from 'react';
import { LEVEL_ONE_RULES } from '@chopchop/shared';
import type { useServiceSession } from './useServiceSession';
import styles from './Kitchen.module.scss';

type Session = ReturnType<typeof useServiceSession>;
export function ServiceOverlay({ session, ready }: { session: Session; ready: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { phase, service, confirmQuit, saving, saved, result } = session;
  useEffect(() => {
    if (phase !== 'running') dialog.current?.showModal();
    else dialog.current?.close();
  }, [phase]);
  const stars = LEVEL_ONE_RULES.stars.filter(value => service.score >= value).length;
  return <dialog ref={dialog} className={styles.dialog} onCancel={event => event.preventDefault()} aria-labelledby="service-title">
    <p className={styles.brand}>CHOP CHOP · NIVEAU 1</p>
    <h1 id="service-title">{phase === 'ended' ? 'TEMPS ÉCOULÉ !' : phase === 'countdown' ? String(session.countdown)
      : phase === 'paused' ? (confirmQuit ? 'QUITTER LE SERVICE ?' : 'PAUSE') : 'PRÊT POUR LE SERVICE ?'}</h1>
    {(phase === 'ready' || phase === 'starting') && <>
      <p>3 minutes. Deux recettes : tomate préparée et viande grillée.</p>
      <p>Découpe la tomate (C, 3 s) ou cuis la viande (8 s). Pose une assiette sur ASSEMBLER, ajoute l’ingrédient prêt avec E, puis reprends l’assiette et sers-la.</p>
      <p>Étoiles : {LEVEL_ONE_RULES.stars.map(value => value.toLocaleString('fr-FR')).join(' · ')} points.</p>
      <button disabled={!ready || phase === 'starting'} onClick={() => void session.start()}>{phase === 'starting' ? 'OUVERTURE DU SERVICE…' : ready ? 'COMMENCER' : 'CHARGEMENT DE LA CUISINE…'}</button>
      <a href="#accueil">RETOUR À L’ACCUEIL</a>
    </>}
    {phase === 'paused' && (confirmQuit ? <>
      <p>Cette partie sera abandonnée. Aucun score ne sera enregistré dans le classement.</p>
      <button disabled={saving} onClick={() => void session.quit()}>{saving ? 'ABANDON EN COURS…' : 'CONFIRMER L’ABANDON'}</button>
      <button disabled={saving} onClick={() => session.setConfirmQuit(false)}>ANNULER</button>
    </> : <>
      <p>Le chrono, les commandes et les cuissons sont arrêtés.</p>
      <p><kbd>ZQSD / flèches</kbd> Déplacer · <kbd>Espace</kbd> Bondir<br /><kbd>E</kbd> Prendre / poser / servir · <kbd>C maintenue</kbd> Découper</p>
      <button onClick={session.resume}>REPRENDRE</button>
      <button onClick={() => session.setConfirmQuit(true)}>ABANDONNER</button>
    </>)}
    {phase === 'countdown' && <p>Prépare-toi… Le chrono reprendra après le décompte.</p>}
    {phase === 'ended' && <>
      <p className={styles.total}>{service.score} points</p>
      <p aria-label={`${stars} étoiles sur 3`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
      <p>{service.delivered} commandes servies · {service.expired} expirées · meilleur combo ×{service.bestCombo}</p>
      <p role="status">{saving ? 'ENREGISTREMENT…' : saved ? 'RÉSULTAT ENREGISTRÉ' : 'RÉSULTAT NON CONFIRMÉ'}</p>
      {result && <p>{result.isRecord ? 'Nouveau record ! ' : ''}Record : {result.bestScore} pts · Rang du record : {result.rank}</p>}
      {!saving && !saved && session.retryable && <button onClick={() => void session.retry()}>RÉESSAYER L’ENREGISTREMENT</button>}
      {!saving && <><button onClick={() => window.location.reload()}>REJOUER</button><a href="#classement">CLASSEMENT</a><a href="#accueil">ACCUEIL</a></>}
    </>}
    {session.error && <p role="alert">{session.error}</p>}
  </dialog>;
}
