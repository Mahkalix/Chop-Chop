import { EXTINGUISH_MS } from '@chopchop/shared';
import type { Inventory } from './interactions';

/** Fire is a property of a blocked station, not of a movable item. */
export function igniteFires(before: Inventory, after: Inventory): Inventory {
  if (after.levelId === 1) return after;
  const fires = { ...after.fires };
  for (const [id, item] of Object.entries(after.surfaces)) {
    const previous = before.surfaces[id];
    if (item?.kind === 'meat' && item.state === 'burnt' && previous?.kind === 'meat' && previous.state !== 'burnt') {
      fires[id] = 0;
    }
  }
  return { ...after, fires };
}

/** Releasing C or moving away suspends progress; pausing the service calls no advance. */
export function advanceExtinction(inventory: Inventory, deltaMs: number, stationId: string | null) {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0 || !stationId || !(stationId in inventory.fires)
    || inventory.carried?.kind !== 'extinguisher') return { inventory, extinguished: false };
  const progress = inventory.fires[stationId]! + deltaMs;
  const fires = { ...inventory.fires, [stationId]: progress };
  if (progress >= EXTINGUISH_MS) delete fires[stationId];
  return { inventory: { ...inventory, fires }, extinguished: progress >= EXTINGUISH_MS };
}
