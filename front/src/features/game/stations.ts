import type { ServiceLevel } from '@chopchop/shared';
import type { Station } from './interactions';

export type KitchenStation = Station & { readonly texture: string; readonly label: string; readonly x: number; readonly y: number };
const allItems = ['tomato', 'meat', 'plate'] as const;

/** Unique ids keep individual worktops and their contents distinct. */
export const stations: readonly KitchenStation[] = [
  { id: 'tomatoes', kind: 'source', item: 'tomato', texture: 'tomato', label: 'TOMATES', x: 240, y: 240 },
  { id: 'chopping', kind: 'surface', accepts: ['tomato', 'lettuce'], preparation: 'chop', texture: 'worktop', label: 'DÉCOUPER', x: 384, y: 240 },
  { id: 'meat', kind: 'source', item: 'meat', texture: 'meat', label: 'VIANDE CRUE', x: 528, y: 240 },
  { id: 'grill', kind: 'surface', accepts: ['meat'], preparation: 'cook', texture: 'worktop', label: 'CUIRE', x: 672, y: 240 },
  { id: 'plates', kind: 'source', item: 'plate', texture: 'plates', label: 'ASSIETTES', x: 960, y: 240 },
  { id: 'assembly', kind: 'surface', accepts: ['plate'], texture: 'worktop', label: 'ASSEMBLER', x: 960, y: 660 },
  { id: 'assembly-second', kind: 'surface', accepts: ['plate'], texture: 'worktop', label: 'ASSEMBLER', x: 1104, y: 660 },
  { id: 'delivery', kind: 'delivery', texture: 'delivery', label: 'SERVIR', x: 1294, y: 478 },
  { id: 'trash', kind: 'trash', texture: 'trash', label: 'POUBELLE', x: 744, y: 660 },
  { id: 'counter-left', kind: 'surface', accepts: allItems, texture: 'worktop', label: '', x: 384, y: 660 },
];

export function stationsForLevel(level: ServiceLevel): readonly KitchenStation[] {
  if (level === 1) return stations;
  return [
    ...stations.filter(station => level !== 3 || station.id !== 'counter-left').map(station => station.kind === 'surface' && !station.preparation && !station.id.startsWith('assembly')
      ? { ...station, y: station.id.startsWith('counter-') ? 660 : station.y, accepts: [...allItems, 'lettuce', 'extinguisher', ...(level === 3 ? ['tortilla', 'white-sauce'] as const : [])] as const } : station),
    { id: 'lettuce', kind: 'source', item: 'lettuce', texture: 'lettuce-counter', label: 'SALADE', x: 240, y: 660 },
    { id: 'extinguisher', kind: 'surface', accepts: ['extinguisher'], texture: 'worktop', label: 'EXTINCTEUR', x: 1104, y: 240 },
    ...(level === 3 ? [
      { id: 'tortilla', kind: 'source', item: 'tortilla', texture: 'tortilla-counter', label: 'GALETTES', x: 384, y: 660 },
      { id: 'white-sauce', kind: 'source', item: 'white-sauce', texture: 'sauce-counter', label: 'SAUCE BLANCHE', x: 528, y: 660 },
    ] as const : []),
  ];
}

/** Distance from the player's feet to a counter edge; never interact through another counter. */
export function closestStation(x: number, y: number, reach = 72, available = stations): KitchenStation | null {
  let closest: KitchenStation | null = null;
  let distance = reach;
  for (const station of available) {
    const dx = Math.max(station.x - x, 0, x - (station.x + 144));
    const dy = Math.max(station.y - y, 0, y - (station.y + 144));
    const current = Math.hypot(dx, dy);
    if (current < distance) { closest = station; distance = current; }
  }
  return closest;
}
