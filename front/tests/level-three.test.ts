import { expect, it } from 'vitest';
import { RECIPES, getServiceRules, matchRecipe, type Ingredient, type ServiceLevel } from '@chopchop/shared';
import { createInventory, interact, describeItem, type Inventory } from '../src/features/game/interactions';
import { stationsForLevel, closestStation } from '../src/features/game/stations';
import { advancePreparation } from '../src/features/game/preparation';
import { advanceExtinction, igniteFires } from '../src/features/game/fire';
import { createService, advanceService, deliver } from '../src/features/game/service';

const station = (id: string) => stationsForLevel(3).find(value => value.id === id)!;
const use = (inventory: Inventory, id: string) => interact(inventory, station(id)).inventory;
function prepare(kinds: Ingredient['kind'][]) {
  let inventory = use(use(createInventory(3), 'plates'), 'assembly');
  for (const kind of kinds) {
    inventory = use(inventory, kind === 'tomato' ? 'tomatoes' : kind);
    if (kind === 'tomato' || kind === 'meat') {
      const target = kind === 'tomato' ? 'chopping' : 'grill';
      inventory = use(inventory, target);
      inventory = advancePreparation(inventory, kind === 'tomato' ? 3000 : 8000, target).inventory;
      inventory = use(inventory, target);
    }
    inventory = use(inventory, 'assembly');
  }
  return use(inventory, 'assembly');
}
const wrap = RECIPES.find(recipe => recipe.id === 'wrap')!;
function permutations<T>(values: T[]): T[][] {
  return values.length ? values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest])) : [[]];
}
it('assembles a wrap through real stations in all 120 ingredient orders', () => {
  const orders = permutations(wrap.ingredients.map(value => value.kind));
  expect(orders).toHaveLength(120);
  for (const order of orders) {
    const inventory = prepare(order);
    expect(inventory.carried).toMatchObject({ kind: 'plate', contents: expect.arrayContaining(wrap.ingredients) });
    expect(describeItem(inventory.carried!)).toBe('Wrap');
    expect(inventory.fires).toEqual({});
  }
});
it('requires all five ingredients and refuses duplicates, burnt meat and raw tomatoes', () => {
  for (const missing of wrap.ingredients) {
    const ingredients = wrap.ingredients.filter(value => value.kind !== missing.kind);
    expect(matchRecipe(ingredients, ['wrap'])).toBeNull();
  }
  const full = prepare(wrap.ingredients.map(value => value.kind));
  const plated = use(full, 'assembly');
  for (const carried of [
    { id: 100, kind: 'white-sauce', state: 'ready' },
    { id: 100, kind: 'tomato', state: 'raw', cutMs: 0 },
    { id: 100, kind: 'meat', state: 'burnt', cookMs: 14000 },
  ] as const) {
    const inventory = { ...plated, carried };
    expect(use(inventory, 'assembly')).toBe(inventory);
  }
  const incomplete = prepare(['tortilla', 'lettuce', 'tomato', 'meat']);
  const service = { ...createService(3), orders: [{ id: 1, recipe: 'wrap' as const, createdAt: 0, expiresAt: 40000 }] };
  expect(deliver(service, incomplete).inventory).toBe(incomplete);
  expect(deliver(service, incomplete).service.delivered).toBe(0);
});
it('serves each of the five recipes without cooking the tortilla or sauce', () => {
  let service = createService(3);
  for (const [index, id] of getServiceRules(3).recipes.entries()) {
    if (index > 1) service = advanceService(service, 10000);
    const recipe = RECIPES.find(value => value.id === id)!;
    const result = deliver(service, prepare(recipe.ingredients.map(value => value.kind)));
    expect(result.inventory.carried).toBeNull();
    service = result.service;
  }
  expect(service).toMatchObject({ delivered: 5, bestCombo: 3, score: 1800 });
  for (const id of ['tortilla', 'white-sauce']) {
    const inventory = use(createInventory(3), id);
    expect(use(inventory, 'grill')).toBe(inventory);
    expect(use(inventory, 'chopping')).toBe(inventory);
  }
});
it('exposes reachable, non-overlapping ingredient stations only on level three', () => {
  const stations = stationsForLevel(3);
  for (const id of ['tortilla', 'white-sauce']) {
    const target = station(id);
    expect(closestStation(target.x + 72, target.y - 30, 72, stations)?.id).toBe(id);
    for (const level of [1, 2] as ServiceLevel[]) expect(stationsForLevel(level).some(value => value.id === id)).toBe(false);
  }
  for (const a of stations) for (const b of stations) if (a.id !== b.id) {
    expect(a.x + 144 <= b.x || b.x + 144 <= a.x || a.y + 144 <= b.y || b.y + 144 <= a.y).toBe(true);
  }
});
it('keeps fire, 3-second extinction and reusable extinguisher on level three', () => {
  const raw = use(use(createInventory(3), 'meat'), 'grill');
  let inventory = igniteFires(raw, advancePreparation(raw, 14000, null).inventory);
  expect(inventory.fires).toEqual({ grill: 0 });
  expect(use(inventory, 'grill')).toBe(inventory);
  inventory = use(inventory, 'extinguisher');
  inventory = advanceExtinction(inventory, 2999, 'grill').inventory;
  expect(inventory.fires.grill).toBe(2999);
  inventory = advanceExtinction(inventory, 1, 'grill').inventory;
  expect(inventory.fires).toEqual({});
  inventory = use(use(use(inventory, 'extinguisher'), 'grill'), 'trash');
  expect(inventory.discarded).toBe(1);
  expect(inventory.surfaces.extinguisher?.kind).toBe('extinguisher');
});
it('uses level three timings and freezes the service at 180 active seconds', () => {
  expect(advanceService(createService(3), 9999).orders).toHaveLength(2);
  expect(advanceService(createService(3), 10000).orders).toHaveLength(3);
  for (const [time, patience] of [[0, 40000], [60000, 35000], [120000, 30000]]) {
    const service = advanceService({ ...createService(3), orders: [], elapsedMs: time!, nextOrderAt: time! + 1 }, 1);
    expect(service.orders[0]!.expiresAt - service.orders[0]!.createdAt).toBe(patience);
  }
  let split = createService(3);
  for (let i = 0; i < 1800; i++) split = advanceService(split, 100);
  expect(split).toEqual(advanceService(createService(3), 180000));
  expect(split.ended).toBe(true);
  expect(advanceService(split, 1000)).toBe(split);
});
