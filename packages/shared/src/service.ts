import { RECIPES_BY_LEVEL, type RecipeId } from './recipes.js';

export type ServiceLevel = keyof typeof RECIPES_BY_LEVEL;
export type ServiceRules = {
  durationMs: number; recipes: readonly RecipeId[]; initialOrders: number; maxOrders: number;
  orderIntervalMs: number; patienceMs: readonly number[]; stars: readonly number[];
};

/** Level one parameters confirmed for issue #63. Star targets remain estimates. */
export const LEVEL_ONE_RULES: ServiceRules = {
  durationMs: 180_000,
  recipes: RECIPES_BY_LEVEL[1],
  initialOrders: 2,
  maxOrders: 3,
  orderIntervalMs: 15_000,
  patienceMs: [50_000, 45_000, 40_000] as readonly number[],
  stars: [500, 1_000, 1_800] as readonly number[],
};

export const LEVEL_TWO_RULES: ServiceRules = {
  ...LEVEL_ONE_RULES, recipes: RECIPES_BY_LEVEL[2], orderIntervalMs: 12_000,
  patienceMs: [45_000, 40_000, 35_000] as readonly number[],
  stars: [700, 1_400, 2_200] as readonly number[],
};
export const EXTINGUISH_MS = 3_000;
export const getServiceRules = (level: ServiceLevel) => level === 2 ? LEVEL_TWO_RULES : LEVEL_ONE_RULES;
