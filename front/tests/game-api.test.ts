import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { abandonGame, finishGame, gameHistory, startGame } from '../src/features/game/gameApi';

const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => vi.stubEnv('VITE_API_URL', 'https://api.example.test/'));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('uses the existing authenticated start, finish, history and abandon contracts', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ gameId: 'run-1', levelId: 1, startedAt: '2026-11-15T12:00:00Z' }, 201))
    .mockResolvedValueOnce(response({ rank: 1, score: 200, durationMs: 181000, bestScore: 200, isRecord: true }))
    .mockResolvedValueOnce(response({ games: [] }))
    .mockResolvedValueOnce(response(null, 204));
  vi.stubGlobal('fetch', fetchMock);
  await startGame('token');
  await finishGame('token', 'run-1', { score: 200, bestCombo: 2 });
  await gameHistory('token');
  await abandonGame('token', 'run-1', true);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    'https://api.example.test/games', 'https://api.example.test/games/run-1/finish',
    'https://api.example.test/me/games?limit=50', 'https://api.example.test/games/run-1/abandon',
  ]);
  expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer token' }, body: '{"levelId":1}' });
  expect(fetchMock.mock.calls[3]![1].keepalive).toBe(true);
});

it.each([401, 409, 422, 429, 500])('keeps HTTP status %s available to the session', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, status)));
  await expect(startGame('token')).rejects.toMatchObject({ status });
});

it('reports connection uncertainty without pretending the request was not processed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('lost response')));
  await expect(startGame('token')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('incertain') });
});

it('does not send a request when API configuration is absent', async () => {
  vi.stubEnv('VITE_API_URL', '');
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  await expect(startGame('token')).rejects.toMatchObject({ status: 0 });
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([null, {}, { gameId: 'id', levelId: 2, startedAt: 'invalid' }])('refuses malformed start data %j before unlocking gameplay', async data => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(data)));
  await expect(startGame('token')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('invalide') });
});

it('refuses malformed result and history responses', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ rank: -1, games: [null] })));
  await expect(finishGame('token', 'run-1', { score: 0, bestCombo: 0 })).rejects.toMatchObject({ status: 0 });
  await expect(gameHistory('token')).rejects.toMatchObject({ status: 0 });
});

it('starts level two explicitly and refuses a response for another level', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ gameId: 'run-2', levelId: 2, startedAt: '2026-11-15T12:00:00Z' }))
    .mockResolvedValueOnce(response({ gameId: 'wrong', levelId: 1, startedAt: '2026-11-15T12:00:00Z' }));
  vi.stubGlobal('fetch', fetchMock);
  expect((await startGame('token', 2)).levelId).toBe(2);
  expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ levelId: 2 });
  await expect(startGame('token', 2)).rejects.toMatchObject({ status: 0 });
});
