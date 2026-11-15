import { isLocalDemo } from './localDemo';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceLevel, FinishGameResponse } from '@chopchop/shared';
import { useAuth } from '../auth/AuthProvider';
import type { KitchenScene } from './KitchenScene';
import { abandonGame, finishGame, gameHistory, GameApiError, startGame } from './gameApi';
import { createService, type Service } from './service';

export type ServicePhase = 'ready' | 'starting' | 'running' | 'paused' | 'countdown' | 'ended';

export function useServiceSession(levelId: ServiceLevel = 1) {
  const { client } = useAuth();
  const scene = useRef<KitchenScene | null>(null);
  const current = useRef({ id: '', token: '', ended: false });
  const busy = useRef(false);
  const mounted = useRef(true);
  const phaseRef = useRef<ServicePhase>('ready');
  const [phase, setPhaseState] = useState<ServicePhase>('ready');
  const [service, setService] = useState(() => createService(levelId));
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<FinishGameResponse | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [retryable, setRetryable] = useState(true);

  const setPhase = useCallback((next: ServicePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);
  const token = async () => {
    if (isLocalDemo()) return 'local-demo';
    const response = await client?.auth.getSession();
    if (!response?.data.session || response.error) throw new Error('Reconnecte-toi pour lancer le service.');
    current.current.token = response.data.session.access_token;
    return current.current.token;
  };

  const start = async () => {
    if (!scene.current || busy.current || current.current.id) return;
    busy.current = true; setError(''); setPhase('starting');
    try {
      const accessToken = await token();
      const game = await startGame(accessToken, levelId);
      if (!mounted.current) { void abandonGame(accessToken, game.gameId, true).catch(() => {}); return; }
      current.current.id = game.gameId;
      // The cuisine is loaded before POST /games. Active time starts only after its response.
      if (document.hidden) { setPhase('paused'); scene.current.setPaused(true); }
      else { setPhase('running'); scene.current.startService(); }
    } catch (cause) {
      if (mounted.current) { setError((cause as Error).message); setPhase('ready'); }
    } finally { busy.current = false; }
  };

  const save = async (finalService: Service) => {
    if (busy.current || !current.current.id) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const accessToken = await token();
      const response = await finishGame(accessToken, current.current.id, { score: finalService.score, bestCombo: finalService.bestCombo });
      if (mounted.current) { setResult(response); setSaved(true); }
    } catch (cause) {
      // A lost successful response must not become a second score or a false failure.
      try {
        const history = await gameHistory(await token());
        if (history.games.some(game => game.gameId === current.current.id)) {
          if (mounted.current) setSaved(true);
          return;
        }
      } catch { /* Keep the original error and allow a deliberate retry. */ }
      if (mounted.current) {
        setError((cause as Error).message);
        setRetryable(!(cause instanceof GameApiError && [409, 422].includes(cause.status)));
      }
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  };

  const finish = (finalService: Service) => {
    if (current.current.ended) return;
    current.current.ended = true;
    setService(finalService); setPhase('ended');
    void save(finalService);
  };
  const pause = useCallback(() => {
    if (!['running', 'countdown'].includes(phaseRef.current)) return;
    scene.current?.setPaused(true); setPhase('paused');
  }, [setPhase]);
  const resume = () => { setConfirmQuit(false); setCountdown(3); setPhase('countdown'); };
  const quit = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      await abandonGame(await token(), current.current.id);
      current.current.id = '';
      window.location.hash = 'accueil';
    } catch (cause) {
      if (cause instanceof GameApiError && cause.status === 409) {
        current.current.id = ''; window.location.hash = 'accueil';
      } else setError((cause as Error).message);
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    const timer = window.setTimeout(() => {
      if (countdown > 1) setCountdown(countdown - 1);
      else { scene.current?.setPaused(false); setPhase('running'); }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, countdown, setPhase]);

  useEffect(() => {
    mounted.current = true;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') pause(); };
    const onVisibility = () => { if (document.hidden) pause(); };
    const abandon = () => {
      const game = current.current;
      if (game.id && !game.ended) { void abandonGame(game.token, game.id, true).catch(() => {}); game.id = ''; }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', abandon);
    return () => {
      mounted.current = false; abandon();
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', abandon);
    };
  }, [pause]);

  return { scene, service, setService, phase, countdown, error, saving, saved, result, retryable,
    confirmQuit, setConfirmQuit, start, finish, pause, resume, quit, retry: () => save(service) };
}
