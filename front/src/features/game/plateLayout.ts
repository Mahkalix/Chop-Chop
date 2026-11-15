import type { Ingredient } from '@chopchop/shared';

/** Compose the garnish within the plate rim, with lettuce underneath the other ingredients. */
export function plateLayout(kinds: readonly Ingredient['kind'][]) {
  const count = kinds.length;
  return kinds.map(kind => {
    if (kind === 'lettuce') return { x: count === 1 ? 64 : count >= 3 ? 48 : 56, y: count >= 3 ? 39 : 46, width: 100, height: 76 };
    if (count === 1) return { x: 64, y: 45, width: 64, height: 48 };
    if (kind === 'tomato') return { x: kinds.includes('meat') ? 50 : 73, y: kinds.includes('lettuce') && kinds.includes('meat') ? 57 : 47, width: 47, height: 35 };
    if (kind === 'meat') return { x: 85, y: 48, width: 51, height: 38 };
    return { x: 64, y: 45, width: 56, height: 42 };
  });
}
