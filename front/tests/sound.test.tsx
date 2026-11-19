import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getServiceRules } from '@chopchop/shared';
import { createInventory, type Inventory, type Item } from '../src/features/game/interactions';
import { createService } from '../src/features/game/service';
import { stationsForLevel } from '../src/features/game/stations';
import { activeLoops, readSoundSettings, soundEffects, writeSoundSettings } from '../src/features/game/sound';
import { SoundSettingsControls } from '../src/features/game/SoundSettingsControls';

const stations = stationsForLevel(2);
const service = createService(2);
const empty = createInventory(2);
const meat = (state: 'raw' | 'cooked' | 'burnt'): Item => ({ id: 9, kind: 'meat', state, cookMs: 0 });
const onGrill = (item: Item | null): Inventory => ({ ...empty, surfaces: { ...empty.surfaces, grill: item } });
const state = (inventory: Inventory = empty, changes: Partial<typeof service> = {}) => ({ service: { ...service, ...changes }, inventory });

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('plays a one-shot when an order is served or expires and when a fire starts', () => {
  expect(soundEffects(state(), state())).toEqual([]);
  expect(soundEffects(state(), state(empty, { delivered: 1 }))).toEqual(['order_served']);
  expect(soundEffects(state(), state(empty, { expired: 2 }))).toEqual(['order_canceled']);
  const burning = { ...onGrill(meat('burnt')), fires: { grill: 0 } };
  expect(soundEffects(state(onGrill(meat('cooked'))), state(burning))).toEqual(['flame']);
  // A fire that keeps burning or is being extinguished does not ignite again.
  expect(soundEffects(state(burning), state({ ...burning, fires: { grill: 500 } }))).toEqual([]);
});

it('keeps the grill loop while meat cooks or waits cooked, not once burnt or removed', () => {
  const loops = (inventory: Inventory) => activeLoops(state(inventory), state(inventory), stations);
  expect(loops(onGrill(meat('raw'))).has('grilling')).toBe(true);
  expect(loops(onGrill(meat('cooked'))).has('grilling')).toBe(true);
  expect(loops(onGrill(meat('burnt'))).has('grilling')).toBe(false);
  expect(loops(onGrill(null)).has('grilling')).toBe(false);
});

it('plays the extinguisher only while extinction progresses', () => {
  const fire = { ...onGrill(meat('burnt')), fires: { grill: 1000 } };
  expect(activeLoops(state(fire), state({ ...fire, fires: { grill: 1016 } }), stations).has('fire_extinguisher')).toBe(true);
  expect(activeLoops(state(fire), state(fire), stations).has('fire_extinguisher')).toBe(false);
  expect(activeLoops(state(fire), state({ ...fire, fires: {} }), stations).has('fire_extinguisher')).toBe(false);
});

it('plays the chopping loop only while cutting progresses', () => {
  const tomato = (cutMs: number): Item => ({ id: 4, kind: 'tomato', state: 'raw', cutMs });
  const board = (item: Item | null): Inventory => ({ ...empty, surfaces: { ...empty.surfaces, chopping: item } });
  const chopping = (before: Inventory, after: Inventory) => activeLoops(state(before), state(after), stations).has('chopping');
  expect(chopping(board(tomato(1000)), board(tomato(1016)))).toBe(true);
  expect(chopping(board(tomato(1000)), board(tomato(1000)))).toBe(false);
  expect(chopping(board(tomato(2990)), board({ ...tomato(3000), state: 'chopped' } as Item))).toBe(true);
  expect(chopping(board(tomato(1000)), board(null))).toBe(false);
  expect(chopping(board(tomato(1000)), board({ ...tomato(0), id: 5 }))).toBe(false);
});

it('ticks only during the last five seconds of the service', () => {
  const { durationMs } = getServiceRules(2);
  const ticking = (elapsedMs: number, ended = false) =>
    activeLoops(state(), state(empty, { elapsedMs, ended }), stations).has('time_ticking');
  expect(ticking(0)).toBe(false);
  expect(ticking(durationMs - 5001)).toBe(false);
  expect(ticking(durationMs - 5000)).toBe(true);
  expect(ticking(durationMs - 1)).toBe(true);
  expect(ticking(durationMs, true)).toBe(false);
});

it('remembers music and effects separately and falls back to both on when storage fails', () => {
  expect(readSoundSettings()).toEqual({ music: true, effects: true });
  writeSoundSettings({ music: false, effects: true });
  expect(readSoundSettings()).toEqual({ music: false, effects: true });
  writeSoundSettings({ music: true, effects: false });
  expect(readSoundSettings()).toEqual({ music: true, effects: false });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(readSoundSettings()).toEqual({ music: true, effects: true });
  expect(() => writeSoundSettings({ music: false, effects: false })).not.toThrow();
});

it('switches music and effects independently from the pause menu and keeps the choice', () => {
  const onChange = vi.fn();
  render(<SoundSettingsControls onChange={onChange} />);
  const music = () => screen.getByRole('switch', { name: 'Musique' });
  const effects = () => screen.getByRole('switch', { name: 'Bruitages' });
  expect(music().getAttribute('aria-checked')).toBe('true');
  expect(effects().getAttribute('aria-checked')).toBe('true');
  fireEvent.click(music());
  expect(onChange).toHaveBeenLastCalledWith({ music: false, effects: true });
  expect(music().getAttribute('aria-checked')).toBe('false');
  expect(effects().getAttribute('aria-checked')).toBe('true');
  fireEvent.click(effects());
  expect(onChange).toHaveBeenLastCalledWith({ music: false, effects: false });
  fireEvent.click(music());
  expect(onChange).toHaveBeenLastCalledWith({ music: true, effects: false });
  cleanup();
  render(<SoundSettingsControls onChange={onChange} />);
  expect(music().getAttribute('aria-checked')).toBe('true');
  expect(effects().getAttribute('aria-checked')).toBe('false');
});
