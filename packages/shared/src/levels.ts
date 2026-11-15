/**
 * Playable levels. Levels 4 and 5 still exist in the database (`niveau`) but can no longer be
 * started, ranked or listed in the history (decision of 14 November 2026).
 */
export const LEVEL_IDS = [1, 2, 3] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

/**
 * Plausibility bound used by the API to reject obviously forged scores. It is not a gameplay
 * target (stars are separate). Confirmed values, 14 November 2026.
 */
export interface LevelLimits {
  maxScore: number;
}

export const LEVEL_LIMITS: Record<LevelId, LevelLimits> = {
  1: { maxScore: 5_400 },
  2: { maxScore: 6_750 },
  3: { maxScore: 8_100 },
};

/**
 * Only a game played to the end of its timer is ranked: leaving early is an abandon (team decision,
 * fairness principle). The server-measured duration must reach `duree_partie_secondes` minus this
 * margin for clock and network lag. There is no upper bound: pauses are unlimited and not tracked.
 */
export const GAME_DURATION_EARLY_TOLERANCE_MS = 5_000;
