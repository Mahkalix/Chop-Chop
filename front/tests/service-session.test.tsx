import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useServiceSession } from '../src/features/game/useServiceSession';
import { createService } from '../src/features/game/service';
import type { KitchenScene } from '../src/features/game/KitchenScene';

vi.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => ({ client: {
  auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } }, error: null }) },
} }) }));
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
const finalService = { ...createService(), score: 600, bestCombo: 3, elapsedMs: 180_000, ended: true };
const apiResult = { rank: 2, score: 600, durationMs: 184_000, bestScore: 600, isRecord: true };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.test');
  fetchMock = vi.fn().mockResolvedValue(response({ gameId: 'run-1', levelId: 1, startedAt: new Date().toISOString() }, 201));
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function setup() {
  const hook = renderHook(useServiceSession);
  const scene = { startService: vi.fn(), setPaused: vi.fn() };
  hook.result.current.scene.current = scene as unknown as KitchenScene;
  return { ...hook, scene };
}

it('waits for the start response, shows go without consuming play time, then saves once', async () => {
  vi.useFakeTimers();
  const { result, scene } = setup();
  await act(async () => { await Promise.all([result.current.start(), result.current.start()]); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(result.current.phase).toBe('go');
  expect(scene.startService).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(999));
  expect(scene.startService).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(scene.startService).toHaveBeenCalledTimes(1);
  expect(result.current.phase).toBe('running');
  expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ levelId: 1 });
  fetchMock.mockResolvedValue(response(apiResult));
  await act(async () => { result.current.finish(finalService); result.current.finish(finalService); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ score: 600, bestCombo: 3 });
  expect(result.current).toMatchObject({ phase: 'ended', saved: true, result: apiResult });
});

it('pauses when hidden and resumes only after three seconds, interrupted by another pause', async () => {
  const { result, scene } = setup();
  await act(async () => { await result.current.start(); });
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current.phase).toBe('paused');
  expect(scene.setPaused).toHaveBeenLastCalledWith(true);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.useFakeTimers();
  act(() => result.current.resume());
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.countdown).toBe(2);
  act(() => result.current.pause());
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current.phase).toBe('paused');
  act(() => result.current.resume());
  for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(1000));
  expect(result.current.phase).toBe('running');
  expect(scene.setPaused).toHaveBeenLastCalledWith(false);
});

it('pauses on Escape and keeps the browser from closing the pause dialog with the same key', async () => {
  vi.useFakeTimers();
  const { result } = setup();
  await act(async () => { await result.current.start(); });
  act(() => vi.advanceTimersByTime(1000));
  const escape = () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    act(() => { window.dispatchEvent(event); });
    return event;
  };
  // A modal dialog opened during this keydown would otherwise receive it as a close request.
  expect(escape().defaultPrevented).toBe(true);
  expect(result.current.phase).toBe('paused');
  expect(escape().defaultPrevented).toBe(true);
  expect(result.current.phase).toBe('paused');
});

it('does not consume time if the start response arrives while hidden', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  const { result, scene } = setup();
  await act(async () => { await result.current.start(); });
  expect(result.current.phase).toBe('paused');
  expect(scene.startService).not.toHaveBeenCalled();
});

it('reconciles a lost finish response against history without submitting a second score', async () => {
  const { result } = setup();
  await act(async () => { await result.current.start(); });
  fetchMock.mockRejectedValueOnce(new Error('Network lost'))
    .mockResolvedValueOnce(response({ games: [{ gameId: 'run-1' }] }));
  await act(async () => { result.current.finish(finalService); });
  expect(result.current.saved).toBe(true);
  expect(result.current.result).toBeNull();
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/finish'))).toHaveLength(1);
});

it('allows deliberate network retry but does not retry a rejected closed result', async () => {
  const { result } = setup();
  await act(async () => { await result.current.start(); });
  fetchMock.mockRejectedValueOnce(new Error('Network lost')).mockResolvedValueOnce(response({ games: [] }));
  await act(async () => { result.current.finish(finalService); });
  expect(result.current).toMatchObject({ saved: false, retryable: true, saving: false });
  fetchMock.mockResolvedValueOnce(response({}, 422)).mockResolvedValueOnce(response({ games: [] }));
  await act(async () => { await result.current.retry(); });
  expect(result.current).toMatchObject({ saved: false, retryable: false, saving: false });
});

it('abandons on explicit confirmation and on unmount, never after normal completion', async () => {
  const { result, unmount } = setup();
  await act(async () => { await result.current.start(); });
  act(() => result.current.pause());
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/abandon'))).toBe(false);
  fetchMock.mockResolvedValue(response(null, 204));
  await act(async () => { await result.current.quit(); });
  unmount();
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/abandon'))).toHaveLength(1);
  const second = setup();
  fetchMock.mockResolvedValue(response({ gameId: 'run-2', levelId: 1, startedAt: new Date().toISOString() }, 201));
  await act(async () => { await second.result.current.start(); });
  second.unmount();
  expect(fetchMock.mock.calls.at(-1)![0]).toContain('/run-2/abandon');
  expect(fetchMock.mock.calls.at(-1)![1].keepalive).toBe(true);
});

it.each([2, 3] as const)('preserves level %s from session creation through score submission', async levelId => {
  fetchMock.mockResolvedValue(response({ gameId: 'run-2', levelId, startedAt: new Date().toISOString() }, 201));
  const { result } = renderHook(() => useServiceSession(levelId));
  expect(result.current.service.levelId).toBe(levelId);
  result.current.scene.current = { startService: vi.fn(), setPaused: vi.fn() } as unknown as KitchenScene;
  await act(async () => { await result.current.start(); });
  expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ levelId });
  fetchMock.mockResolvedValue(response(apiResult));
  await act(async () => { result.current.finish({ ...finalService, levelId }); });
  expect(result.current.service.levelId).toBe(levelId);
  expect(result.current.saved).toBe(true);
  expect(fetchMock.mock.calls[1]![0]).toContain('/run-2/finish');
});


it('does not show go before a delayed API response and can retry a failed start', async () => {
  const { result, scene } = setup();
  let resolve!: (value: ReturnType<typeof response>) => void;
  fetchMock.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  let pending!: Promise<void>;
  await act(async () => { pending = result.current.start(); });
  expect(result.current.phase).toBe('starting');
  expect(scene.startService).not.toHaveBeenCalled();
  await act(async () => { resolve(response({}, 503)); await pending; });
  expect(result.current.phase).toBe('ready');
  expect(result.current.error).not.toBe('');
  await act(async () => { await result.current.start(); });
  expect(result.current.phase).toBe('go');
  expect(result.current.error).toBe('');
});
