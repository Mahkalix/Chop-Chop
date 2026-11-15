import type { ServiceLevel, FinishGameInput, FinishGameResponse, PlayerGamesResponse, StartGameResponse } from '@chopchop/shared';

export class GameApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function gameRequest<T>(token: string, path: string, body?: unknown, keepalive = false): Promise<T> {
  const origin = import.meta.env.VITE_API_URL?.trim();
  if (!origin) throw new GameApiError(0, 'Le service de parties n’est pas configuré.');
  let response: Response;
  try {
    response = await fetch(`${origin.replace(/\/+$/, '')}${path}`, {
      method: body === undefined ? 'GET' : 'POST', keepalive, signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new GameApiError(0, 'Connexion interrompue. Le résultat de la demande est incertain.'); }
  if (!response.ok) throw new GameApiError(response.status, response.status === 422
    ? 'Le résultat a été refusé par le serveur. Cette partie est clôturée.'
    : response.status === 401 ? 'Ta session a expiré. Reconnecte-toi.'
      : response.status === 409 ? 'Cette partie est déjà clôturée.' : 'Le service de parties est indisponible. Réessaie.');
  if (response.status === 204) return undefined as T;
  try { return await response.json() as T; }
  catch { throw new GameApiError(0, 'Le service a renvoyé une réponse illisible. Vérifie le résultat avant de réessayer.'); }
}

const invalidResponse = () => new GameApiError(0, 'Le service a renvoyé une réponse invalide.');
const nonNegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export async function startGame(token: string, levelId: ServiceLevel = 1): Promise<StartGameResponse> {
  const data = await gameRequest<StartGameResponse>(token, '/games', { levelId });
  if (!data || typeof data.gameId !== 'string' || !data.gameId || data.levelId !== levelId
    || typeof data.startedAt !== 'string' || !Number.isFinite(Date.parse(data.startedAt))) throw invalidResponse();
  return data;
}
export const abandonGame = (token: string, id: string, keepalive = false) => gameRequest<void>(token, `/games/${id}/abandon`, {}, keepalive);

export async function finishGame(token: string, id: string, result: FinishGameInput): Promise<FinishGameResponse> {
  const data = await gameRequest<FinishGameResponse>(token, `/games/${id}/finish`, result);
  if (!data || !Number.isInteger(data.rank) || data.rank < 1 || !nonNegative(data.score)
    || !nonNegative(data.bestScore) || !nonNegative(data.durationMs) || typeof data.isRecord !== 'boolean') throw invalidResponse();
  return data;
}

export async function gameHistory(token: string): Promise<PlayerGamesResponse> {
  const data = await gameRequest<PlayerGamesResponse>(token, '/me/games?limit=50');
  if (!data || !Array.isArray(data.games) || !data.games.every(game => game && typeof game.gameId === 'string')) throw invalidResponse();
  return data;
}
