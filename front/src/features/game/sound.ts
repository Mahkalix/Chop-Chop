import { getServiceRules } from '@chopchop/shared';
import type { Inventory, Station } from './interactions';
import type { Service } from './service';

export const MUSIC = 'pixel_kitchen_rush';
export const LOOP_SOUNDS = ['grilling', 'chopping', 'fire_extinguisher', 'time_ticking'] as const;
export const EFFECT_SOUNDS = ['order_served', 'order_canceled', 'flame'] as const;
export type LoopSound = typeof LOOP_SOUNDS[number];
export type EffectSound = typeof EFFECT_SOUNDS[number];
export type SoundState = { readonly service: Service; readonly inventory: Inventory };
export type SoundSettings = { readonly music: boolean; readonly effects: boolean };

const TICKING_FROM_MS = 5_000;
const PREFERENCE_KEYS = { music: 'chopchop-music', effects: 'chopchop-effects' } as const;

/** One-shot sounds caused by what changed between two frames. */
export function soundEffects(before: SoundState, after: SoundState): EffectSound[] {
  const effects: EffectSound[] = [];
  if (after.service.delivered > before.service.delivered) effects.push('order_served');
  if (after.service.expired > before.service.expired) effects.push('order_canceled');
  if (Object.keys(after.inventory.fires).some(id => !(id in before.inventory.fires))) effects.push('flame');
  return effects;
}

/** Loops that must be audible in the current frame. */
export function activeLoops(before: SoundState, after: SoundState, stations: readonly Station[]): Set<LoopSound> {
  const loops = new Set<LoopSound>();
  const grilling = stations.some(station => {
    const item = after.inventory.surfaces[station.id];
    return station.kind === 'surface' && station.preparation === 'cook' && item?.kind === 'meat' && item.state !== 'burnt';
  });
  if (grilling) loops.add('grilling');
  // The same item gaining cut time means C is held on it this frame.
  const chopping = Object.entries(after.inventory.surfaces).some(([id, item]) => {
    const previous = before.inventory.surfaces[id];
    return item && 'cutMs' in item && previous?.id === item.id && 'cutMs' in previous && item.cutMs > previous.cutMs;
  });
  if (chopping) loops.add('chopping');
  const extinguishing = Object.entries(after.inventory.fires)
    .some(([id, progress]) => progress > (before.inventory.fires[id] ?? Infinity));
  if (extinguishing) loops.add('fire_extinguisher');
  const remainingMs = getServiceRules(after.service.levelId).durationMs - after.service.elapsedMs;
  if (!after.service.ended && remainingMs <= TICKING_FROM_MS) loops.add('time_ticking');
  return loops;
}

/** Storage can be blocked (private mode, policies): both channels then stay on. */
export function readSoundSettings(): SoundSettings {
  try {
    return { music: localStorage.getItem(PREFERENCE_KEYS.music) !== 'off', effects: localStorage.getItem(PREFERENCE_KEYS.effects) !== 'off' };
  } catch { return { music: true, effects: true }; }
}

export function writeSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(PREFERENCE_KEYS.music, settings.music ? 'on' : 'off');
    localStorage.setItem(PREFERENCE_KEYS.effects, settings.effects ? 'on' : 'off');
  } catch { /* The choice applies to this game only. */ }
}
