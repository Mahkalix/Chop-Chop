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
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<InteractionStatus>({ carried: null, target: null, message: 'Approche-toi d’un poste puis appuie sur E.', preparation: null, fireCount: 0 });
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
      game.events.on('kitchen-interaction', setStatus);
      game.events.on('kitchen-ready', (scene: KitchenScene) => { actions.current.scene.current = scene; setReady(true); });
      game.events.on('service-update', (service: Service) => actions.current.setService(service));
      game.events.on('service-ended', (service: Service) => actions.current.finish(service));
    });
    return () => {
      cancelAnimationFrame(frame);
      game?.events.off('kitchen-interaction', setStatus);
      game?.destroy(true);
      if (root) root.inert = wasInert;
    };
  }, [levelId]);
  return createPortal(<main className={styles.kitchen} aria-label={`Cuisine du niveau ${levelId}`}>
    <div className={styles.canvas} ref={mount} style={{ visibility: session.phase === 'running' ? 'visible' : 'hidden' }} />
    {session.phase === 'running' && <ServiceHud service={session.service} onPause={session.pause} />}
    <ServiceOverlay session={session} ready={ready} />
    {document.fullscreenEnabled && <button className={styles.fullscreen} onClick={event => {
      const frame = event.currentTarget.closest('main');
      if (document.fullscreenElement) void document.exitFullscreen();
      else if (frame) void frame.requestFullscreen().catch(() => {});
    }}>PLEIN ÉCRAN</button>}
    <section className={styles.inventory} aria-label="Objet porté" hidden={session.phase !== 'running'}>
      {status.fireCount > 0 && <p role="alert">FEU AU GRILL ! Prends l’extincteur et maintiens C près du feu pendant 3 s.</p>}
      <strong>EN MAIN : {status.carried ?? 'Rien'}</strong>
      <p>{status.target ? `POSTE : ${status.target}` : 'Approche-toi d’un poste.'}</p>
      <p role="status">{status.message}</p>
      {status.preparation && <div className={styles.preparation}>
        <span>{status.preparation.label} · {status.preparation.percent}%</span>
        <div role="progressbar" aria-label={status.preparation.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.preparation.percent}>
          <span style={{ width: `${status.preparation.percent}%` }} />
        </div>
      </div>}
    </section>
    <p className={styles.hint}>ZQSD ou flèches : BOUGER · ESPACE : BONDIR · E : PRENDRE / POSER · C maintenue : DÉCOUPER{levelId >= 2 ? ' / ÉTEINDRE' : ''}</p>
  </main>, document.body);
}
