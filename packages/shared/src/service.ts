import type { RecipeId } from './recipes.js';

/** Level one parameters confirmed for issue #63. Star targets remain estimates. */
export const LEVEL_ONE_RULES = {
  durationMs: 180_000,
  recipes: ['prepared-tomato', 'grilled-meat'] as readonly RecipeId[],
  initialOrders: 2,
  maxOrders: 3,
  orderIntervalMs: 15_000,
  patienceMs: [50_000, 45_000, 40_000] as readonly number[],
  stars: [500, 1_000, 1_800] as readonly number[],
};
