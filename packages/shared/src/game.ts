import { z } from "zod";
import { LEVEL_IDS } from "./levels.js";

export const LEADERBOARD_DEFAULT_LIMIT = 10;
export const LEADERBOARD_MAX_LIMIT = 50;

export const LevelIdSchema = z
  .number()
  .int()
  .refine((n): n is (typeof LEVEL_IDS)[number] => (LEVEL_IDS as readonly number[]).includes(n), {
    message: "Unknown level",
  });

/** Level id as it appears in a URL (always a string). */
export const LevelIdParamSchema = z.string().regex(/^\d+$/).transform(Number).pipe(LevelIdSchema);

export const PseudoSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(/^[\p{L}\p{M}\p{N} _-]+$/u, "Only letters, digits, spaces, '_' and '-' are allowed");

/** PUT /me (create) and PATCH /me (change pseudo). */
export const ProfileInputSchema = z.object({ pseudo: PseudoSchema });

/** POST /games */
export const StartGameSchema = z.object({ levelId: LevelIdSchema });

/**
 * POST /games/:id/finish, only when the timer reaches zero: leaving early is an abandon, never ranked.
 * The duration is measured by the server, never sent by the client. It must reach the rules duration
 * (minus a small margin); there is no upper bound because pauses are unlimited and not tracked.
 */
export const FinishGameSchema = z.object({
  score: z.number().int().min(0),
  bestCombo: z.number().int().min(0).max(1_000).default(0),
});
export type FinishGameInput = z.infer<typeof FinishGameSchema>;

/** `?limit=N`, shared by every list route. */
export const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LEADERBOARD_MAX_LIMIT).default(LEADERBOARD_DEFAULT_LIMIT),
});

/** GET /pseudos/:pseudo/available */
export interface PseudoAvailabilityResponse {
  pseudo: string;
  available: boolean;
}

/** One finished game of the logged-in player. */
export interface PlayerGame {
  gameId: string;
  levelId: number;
  score: number;
  durationMs: number;
  finishedAt: string;
}

/** GET /me/games: newest first. */
export interface PlayerGamesResponse {
  games: PlayerGame[];
}

export interface BestScore {
  levelId: number;
  score: number;
}

/**
 * GET /me/best: only the levels the player has finished at least once. Every rules version counts,
 * so a best score may come from an older version and differ from the player's current ranked record.
 */
export interface BestScoresResponse {
  scores: BestScore[];
}

export interface Profile {
  id: string;
  pseudo: string;
}

export interface StartGameResponse {
  gameId: string;
  levelId: number;
  startedAt: string;
}

export interface FinishGameResponse {
  /**
   * Place of the player's best game on this level, in the rules version of the game just played
   * (not necessarily that game). It is the rank at that moment and may change afterwards.
   */
  rank: number;
  /** Score of the game just played. */
  score: number;
  /** Wall-clock duration measured by the server, pauses included. */
  durationMs: number;
  /** Best score of the player on this level and rules version, this game included. */
  bestScore: number;
  /** True if this game is now the player's best one on this level and rules version (new record). */
  isRecord: boolean;
}

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  pseudo: z.string(),
  score: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  finishedAt: z.string(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardResponseSchema = z.object({
  levelId: LevelIdSchema,
  entries: z.array(LeaderboardEntrySchema),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
