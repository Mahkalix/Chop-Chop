import { useEffect, useRef, useState } from 'react';
import { getServiceRules, type ServiceLevel } from '@chopchop/shared';
import styles from './Kitchen.module.scss';

type Props = { ready: boolean; progress: number; level: ServiceLevel; error: string; start: () => Promise<void> };
export function ServiceIntro({ ready, progress, level, error, start }: Props) {
  const [step, setStep] = useState<'loading' | 'ready' | 'go'>('loading');
  const startRef = useRef(start);
  startRef.current = start;
  const [chef] = useState(() => {
    const selected = sessionStorage.getItem('chef') ?? 'Miso';
    return ['Miso', 'Pipa', 'Basile', 'Alba', 'Nori', 'Gaspard'].includes(selected) ? selected : 'Miso';
  });
  useEffect(() => {
    if (!ready || error) return;
    const timer = window.setTimeout(() => {
      if (step === 'loading') setStep('ready');
      else if (step === 'ready') setStep('go');
      else void startRef.current();
    }, step === 'loading' ? 800 : step === 'ready' ? 1600 : 1000);
    return () => window.clearTimeout(timer);
  }, [ready, step, error]);
  const rules = getServiceRules(level);
  return <section className={`${styles.intro} ${step === 'go' && !error ? styles.introGo : ''}`} data-step={step} aria-label="Lancement du niveau" aria-live="polite">
    <div className={styles.introContent}>
      <h1>{error ? 'SERVICE INDISPONIBLE' : step === 'loading' ? 'MISE EN PLACE…' : step === 'ready' ? 'PRÊT ?' : 'PARTEZ !'}</h1>
      {step !== 'go' && <img className={styles.introChef} src={`/menu/${chef}.png`} alt={chef} />}
      {error ? <><p role="alert">{error}</p><button onClick={() => void start()}>RÉESSAYER</button><a href="#accueil">RETOUR À L’ACCUEIL</a></> : step === 'loading' ? <>
        <p>La cuisine se prépare.</p><div className={styles.loadingTrack} role="progressbar" aria-label="Chargement de la cuisine" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
        <p className={styles.introCaption}>Les commandes arrivent, à toi de jouer !</p><a href="#accueil">RETOUR À L’ACCUEIL</a>
      </> : step === 'ready' ? <><p>{rules.durationMs / 60000} minutes pour servir un maximum de plats.</p><p>Objectif 3 étoiles : {rules.stars[2]!.toLocaleString('fr-FR')} points</p></> : <><p>Le service commence.</p><strong className={styles.introClock}>03:00</strong></>}
    </div>
  </section>;
}
