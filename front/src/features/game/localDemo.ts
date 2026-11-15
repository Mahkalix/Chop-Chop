import { FinishGameSchema, type FinishGameInput, type FinishGameResponse, type PlayerGame, type ServiceLevel, type StartGameResponse, type LeaderboardResponse } from '@chopchop/shared';

/** Explicit development-only sandbox. It never contacts authentication or the shared API. */
export const isLocalDemo = () => import.meta.env.DEV && import.meta.env.MODE === 'demo';
const key = 'chop-chop.local-runs.v1';
type LocalGame = PlayerGame & { pseudo: string };
const active = new Map<string, StartGameResponse>();
function requireDemo() { if (!isLocalDemo()) throw new Error('Le mode local est désactivé.'); }
export function localHistory(): { games: LocalGame[] } {
  requireDemo();
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    if (!Array.isArray(data)) return { games: [] };
    const games = data.filter((game): game is LocalGame => game && typeof game.gameId === 'string'
      && [1, 2, 3].includes(game.levelId) && Number.isInteger(game.score) && game.score >= 0
      && typeof game.pseudo === 'string' && typeof game.finishedAt === 'string' && Number.isFinite(game.durationMs));
    return { games };
  } catch { return { games: [] }; }
}
export function localLeaderboard(levelId: ServiceLevel): LeaderboardResponse {
  const best = new Map<string, LocalGame>();
  for (const game of localHistory().games.filter(game => game.levelId === levelId).reverse()) {
    if (!best.has(game.pseudo) || game.score > best.get(game.pseudo)!.score) best.set(game.pseudo, game);
  }
  return { levelId, entries: [...best.values()].sort((a, b) => b.score - a.score || a.finishedAt.localeCompare(b.finishedAt))
    .map((game, index) => ({ rank: index + 1, pseudo: game.pseudo, score: game.score, durationMs: game.durationMs, finishedAt: game.finishedAt })) };
}
export function startLocalGame(levelId: ServiceLevel): StartGameResponse {
  requireDemo();
  active.clear();
  const game = { gameId: crypto.randomUUID(), levelId, startedAt: new Date().toISOString() };
  active.set(game.gameId, game);
  return game;
}
export function abandonLocalGame(id: string) { requireDemo(); active.delete(id); }
export function finishLocalGame(id: string, input: FinishGameInput): FinishGameResponse {
  requireDemo();
  const game = active.get(id);
  if (!game) throw new Error('Cette partie locale est déjà clôturée.');
  const { score } = FinishGameSchema.parse(input);
  const pseudo = sessionStorage.getItem('pseudo')?.trim().slice(0, 16) || 'Chef local';
  const previous = localLeaderboard(game.levelId as ServiceLevel).entries.find(entry => entry.pseudo === pseudo);
  const durationMs = Date.now() - Date.parse(game.startedAt);
  const record: LocalGame = { gameId: id, levelId: game.levelId, score, pseudo, durationMs, finishedAt: new Date().toISOString() };
  sessionStorage.setItem(key, JSON.stringify([record, ...localHistory().games].slice(0, 50)));
  active.delete(id);
  const best = localLeaderboard(game.levelId as ServiceLevel).entries.find(entry => entry.pseudo === pseudo)!;
  return { rank: best.rank, score, durationMs, bestScore: best.score, isRecord: !previous || score > previous.score };
}
