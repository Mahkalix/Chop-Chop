import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Phaser from 'phaser';
import { KitchenScene, type InteractionStatus } from './KitchenScene';
import styles from './Kitchen.module.scss';
import { ServiceHud } from './ServiceHud';
import { ServiceOverlay } from './ServiceOverlay';
import { useServiceSession } from './useServiceSession';
import type { Service } from './service';
import { readSelectedLevel } from './levelSelection';

export default function Kitchen() {
  const mount = useRef<HTMLDivElement>(null);
  const [levelId] = useState(readSelectedLevel);
  const session = useServiceSession(levelId);
  const actions = useRef(session);
  actions.current = session;
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const pause = () => { setShowRecipes(false); session.pause(); };
  const recipes = () => { setShowRecipes(true); session.pause(); };
  useEffect(() => { if (session.phase === 'running') setShowRecipes(false); }, [session.phase]);
  const [status, setStatus] = useState<InteractionStatus>({ carried: null, target: null, message: '', preparation: null, fireCount: 0 });
  useEffect(() => {
    let game: Phaser.Game | undefined;
    // The portal owns the full screen; underlying auth controls must not receive focus.
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    // Defer creation so StrictMode can clean up its first effect before Phaser boots.
    const frame = requestAnimationFrame(() => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.RESIZE },
        parent: mount.current!,
        pixelArt: true,
        backgroundColor: '#e4d5bb',
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: new KitchenScene(levelId),
      });
      game.events.on('kitchen-loading', setLoadingProgress);
      game.events.on('kitchen-interaction', setStatus);
      game.events.on('kitchen-ready', (scene: KitchenScene) => { actions.current.scene.current = scene; setReady(true); });
      game.events.on('service-update', (service: Service) => actions.current.setService(service));
      game.events.on('service-ended', (service: Service) => actions.current.finish(service));
    });
    return () => {
      cancelAnimationFrame(frame);
      game?.events.off('kitchen-loading', setLoadingProgress);
      game?.events.off('kitchen-interaction', setStatus);
      game?.destroy(true);
      if (root) root.inert = wasInert;
    };
  }, [levelId]);
  const feedbackMessage = /récupérée\.|posée\.|^Objet jeté\.|^Approche-toi/.test(status.message) ? '' : status.message;
  return createPortal(<main className={styles.kitchen} aria-label={`Cuisine du niveau ${levelId}`}>
    <div className={styles.canvas} ref={mount}  />
    {['running', 'paused', 'countdown'].includes(session.phase) && <ServiceHud service={session.service} onPause={pause} />}
    <ServiceOverlay session={session} ready={ready} loadingProgress={loadingProgress} showRecipes={showRecipes} />
    {document.fullscreenEnabled && session.phase !== 'running' && <button className={styles.fullscreen} onClick={event => {
      const frame = event.currentTarget.closest('main');
      if (document.fullscreenElement) void document.exitFullscreen();
      else if (frame) void frame.requestFullscreen().catch(() => {});
    }}>PLEIN ÉCRAN</button>}
    <section className={styles.feedback} aria-label="Objet porté" hidden={session.phase !== 'running' || (!feedbackMessage && !status.preparation && !status.fireCount)}>
      {status.fireCount > 0 && <p role="alert">FEU AU GRILL ! Prends l’extincteur et maintiens C près du feu pendant 3 s.</p>}
      <p role="status">{feedbackMessage}</p>
      {status.preparation && <div className={styles.preparation}>
        <span>{status.preparation.label} · {status.preparation.percent}%</span>
        <div role="progressbar" aria-label={status.preparation.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.preparation.percent}>
          <span style={{ width: `${status.preparation.percent}%` }} />
        </div>
      </div>}
    </section>
    {['running', 'paused', 'countdown'].includes(session.phase) && <footer className={styles.controls}>
      {status.carried && <strong className={styles.held}>EN MAIN : {status.carried}</strong>}
      <button className={styles.recipesButton} onClick={recipes}>RECETTES</button>
    </footer>}
  </main>, document.body);
}
