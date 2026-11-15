import { afterEach, expect, it, vi } from 'vitest';
import { isLocalDemo, startLocalGame, finishLocalGame, abandonLocalGame, localHistory, localLeaderboard } from '../src/features/game/localDemo';
import { startGame, finishGame } from '../src/features/game/gameApi';
import { getAuthClient } from '../src/features/auth/client';
afterEach(() => { sessionStorage.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function enable() { vi.stubEnv('DEV', true); vi.stubEnv('MODE', 'demo'); }
it('requires both development and explicit demo mode', () => {
  vi.stubEnv('DEV', false); vi.stubEnv('MODE', 'demo');
  expect(isLocalDemo()).toBe(false);
  expect(() => startLocalGame(3)).toThrow('désactivé');
  vi.stubEnv('DEV', true); vi.stubEnv('MODE', 'development');
  expect(isLocalDemo()).toBe(false);
  enable(); expect(isLocalDemo()).toBe(true);
});
it('plays locally without authentication or network and keeps levels separate', async () => {
  enable(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  expect(getAuthClient()).toBeNull();
  sessionStorage.setItem('pseudo', 'TestChef');
  const game = await startGame('', 3);
  const result = await finishGame('', game.gameId, { score: 450, bestCombo: 3 });
  expect(result).toMatchObject({ score: 450, bestScore: 450, rank: 1, isRecord: true });
  expect(localLeaderboard(3).entries[0]).toMatchObject({ pseudo: 'TestChef', score: 450 });
  expect(localLeaderboard(1).entries).toEqual([]);
  expect(localLeaderboard(2).entries).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
  await expect(finishGame('', game.gameId, { score: 999, bestCombo: 3 })).rejects.toThrow('clôturée');
  const replay = startLocalGame(3);
  expect(finishLocalGame(replay.gameId, { score: 100, bestCombo: 1 })).toMatchObject({ bestScore: 450, isRecord: false });
});
it('does not save abandoned games and tolerates malformed local storage', () => {
  enable(); sessionStorage.setItem('chop-chop.local-runs.v1', 'invalid');
  expect(localHistory().games).toEqual([]);
  const game = startLocalGame(2); abandonLocalGame(game.gameId);
  expect(() => finishLocalGame(game.gameId, { score: 200, bestCombo: 1 })).toThrow();
  expect(localHistory().games).toEqual([]);
});
