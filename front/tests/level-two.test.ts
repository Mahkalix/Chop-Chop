import { expect, it } from 'vitest';
import { RECIPES, getServiceRules, matchRecipe, type Ingredient } from '@chopchop/shared';
import { createInventory, interact, type Inventory } from '../src/features/game/interactions';
import { advancePreparation } from '../src/features/game/preparation';
import { advanceExtinction, igniteFires } from '../src/features/game/fire';
import { stationsForLevel } from '../src/features/game/stations';
import { advanceService, createService, deliver, penalizeBurns } from '../src/features/game/service';

const station = (id: string) => stationsForLevel(2).find(value => value.id === id)!;
const use = (inventory: Inventory, id: string) => interact(inventory, station(id)).inventory;
function addIngredient(inventory: Inventory, kind: Ingredient['kind']) {
  const source = kind === 'tomato' ? 'tomatoes' : kind;
  inventory = use(inventory, source);
  if (kind === 'tomato' || kind === 'lettuce' || kind === 'meat') {
    const target = kind === 'meat' ? 'grill' : 'chopping';
    inventory = use(inventory, target);
    inventory = advancePreparation(inventory, kind === 'meat' ? 8000 : 3000, target).inventory;
    inventory = use(inventory, target);
  }
  return use(inventory, 'assembly');
}
function plate(kinds: Ingredient['kind'][]) {
  let inventory = use(use(createInventory(2), 'plates'), 'assembly');
  for (const kind of kinds) inventory = addIngredient(inventory, kind);
  return use(inventory, 'assembly');
}
const permutations: Ingredient['kind'][][] = [
  ['lettuce', 'tomato', 'meat'], ['lettuce', 'meat', 'tomato'],
  ['tomato', 'lettuce', 'meat'], ['tomato', 'meat', 'lettuce'],
  ['meat', 'lettuce', 'tomato'], ['meat', 'tomato', 'lettuce'],
];
it.each(permutations.map(kinds => [kinds.join(', '), kinds] as const))('assembles the complete plate in order %s through actual stations', (_, kinds) => {
  const inventory = plate(kinds);
  expect(inventory.carried?.kind).toBe('plate');
  if (inventory.carried?.kind === 'plate') expect(matchRecipe(inventory.carried.contents, getServiceRules(2).recipes)).toBe('complete-plate');
});
it.each([['lettuce', 'tomato'], ['tomato', 'lettuce']] as Ingredient['kind'][][])('accepts salad assembly starting with %s', (...kinds) => {
  const inventory = plate(kinds);
  if (inventory.carried?.kind !== 'plate') throw Error('Missing plate');
  expect(matchRecipe(inventory.carried.contents, getServiceRules(2).recipes)).toBe('tomato-salad');
});
it('rejects partial plates, duplicates, raw and burnt ingredients without consuming them', () => {
  let inventory = use(plate(['lettuce']), 'assembly');
  for (const carried of [
    { id: 100, kind: 'lettuce', state: 'chopped', cutMs: 3000 },
    { id: 100, kind: 'tomato', state: 'raw', cutMs: 0 },
    { id: 100, kind: 'meat', state: 'burnt', cookMs: 14000 },
  ] as const) {
    const attempt = { ...inventory, carried };
    expect(use(attempt, 'assembly')).toBe(attempt);
  }
  inventory = use(inventory, 'assembly');
  expect(deliver(createService(2), inventory).inventory).toBe(inventory);
  expect(deliver(createService(2), plate(['tomato', 'meat'])).service.delivered).toBe(0);
});
it('serves all four recipes from real preparation and advances combo and order sequence', () => {
  let service = createService(2);
  for (const [index, id] of getServiceRules(2).recipes.entries()) {
    if (index > 1) service = advanceService(service, 12000);
    const recipe = RECIPES.find(value => value.id === id)!;
    const result = deliver(service, plate(recipe.ingredients.map(value => value.kind)));
    expect(result.inventory.carried).toBeNull();
    service = result.service;
  }
  expect(service).toMatchObject({ delivered: 4, combo: 3, bestCombo: 3, score: 1350, refused: 0 });
});
it('uses level two capacity, interval, patience and a 180-second active service', () => {
  expect(advanceService(createService(2), 11999).orders).toHaveLength(2);
  expect(advanceService(createService(2), 12000).orders).toHaveLength(3);
  for (const [time, patience] of [[0, 45000], [60000, 40000], [120000, 35000]]) {
    const service = advanceService({ ...createService(2), orders: [], elapsedMs: time!, nextOrderAt: time! + 1 }, 1);
    expect(service.orders[0]!.expiresAt - service.orders[0]!.createdAt).toBe(patience);
  }
  let split = createService(2);
  for (let i = 0; i < 1800; i++) split = advanceService(split, 100);
  expect(split).toEqual(advanceService(createService(2), 180000));
  expect(split.ended).toBe(true);
});
it('burns at 14 seconds, blocks only the grill, extinguishes in 3 seconds and allows cooking again', () => {
  const raw = use(use(createInventory(2), 'meat'), 'grill');
  const cooked = advancePreparation(raw, 13999, null).inventory;
  expect(igniteFires(raw, cooked).fires).toEqual({});
  const burnt = advancePreparation(cooked, 1, null).inventory;
  let inventory = igniteFires(cooked, burnt);
  expect(inventory.fires).toEqual({ grill: 0 });
  expect(use(inventory, 'grill')).toBe(inventory);
  expect(use(inventory, 'lettuce').carried?.kind).toBe('lettuce');
  expect(advanceExtinction(inventory, 3000, 'grill').inventory).toBe(inventory);
  inventory = use(inventory, 'extinguisher');
  expect(use(inventory, 'trash')).toBe(inventory);
  expect(advanceExtinction(inventory, 3000, 'chopping').inventory).toBe(inventory);
  inventory = advanceExtinction(inventory, 1500, 'grill').inventory;
  expect(advanceExtinction(inventory, 10000, null).inventory).toBe(inventory);
  inventory = advanceExtinction(inventory, 1499, 'grill').inventory;
  expect(inventory.fires.grill).toBe(2999);
  const out = advanceExtinction(inventory, 1, 'grill');
  expect(out.extinguished).toBe(true);
  inventory = out.inventory;
  expect(inventory.fires).toEqual({});
  expect(igniteFires(inventory, advancePreparation(inventory, 10000, null).inventory).fires).toEqual({});
  inventory = use(use(use(inventory, 'extinguisher'), 'grill'), 'trash');
  expect(inventory.discarded).toBe(1);
  inventory = use(use(inventory, 'meat'), 'grill');
  inventory = advancePreparation(inventory, 8000, null).inventory;
  expect(inventory.surfaces.grill).toMatchObject({ state: 'cooked' });
  expect(inventory.surfaces.extinguisher?.kind).toBe('extinguisher');
  expect(penalizeBurns({ ...createService(2), score: 200, combo: 3 }, 1)).toMatchObject({ score: 190, combo: 1, burnt: 1 });
});
it('keeps level one free of fire and rejects level-two assemblies there', () => {
  const raw = use(use(createInventory(1), 'meat'), 'grill');
  expect(igniteFires(raw, advancePreparation(raw, 14000, null).inventory).fires).toEqual({});
  expect(createInventory(1).surfaces.extinguisher).toBeUndefined();
  expect(deliver(createService(1), plate(['lettuce', 'tomato'])).service.delivered).toBe(0);
});



it('cuts lettuce only with free hands for three accumulated seconds, then allows assembly', () => {
  let inventory = use(use(createInventory(2), 'plates'), 'assembly');
  inventory = use(inventory, 'lettuce');
  expect(inventory.carried).toMatchObject({ kind: 'lettuce', state: 'raw', cutMs: 0 });
  expect(use(inventory, 'assembly')).toBe(inventory);
  inventory = use(inventory, 'chopping');
  expect(advancePreparation(inventory, 5000, null).inventory).toBe(inventory);
  const occupied = use(inventory, 'plates');
  expect(advancePreparation(occupied, 5000, 'chopping').inventory).toBe(occupied);
  inventory = advancePreparation(inventory, 1500, 'chopping').inventory;
  inventory = use(inventory, 'chopping');
  expect(advancePreparation(inventory, 5000, 'chopping').inventory).toBe(inventory);
  inventory = use(inventory, 'chopping');
  inventory = advancePreparation(inventory, 1499, 'chopping').inventory;
  expect(inventory.surfaces.chopping).toMatchObject({ state: 'raw', cutMs: 2999 });
  const finished = advancePreparation(inventory, 1, 'chopping');
  expect(finished.messages).toEqual(['Salade découpée.']);
  inventory = use(use(finished.inventory, 'chopping'), 'assembly');
  expect(inventory.surfaces.assembly).toMatchObject({ contents: [{ kind: 'lettuce', state: 'chopped' }] });
});

it.each([1, 2, 3] as const)('provides two independent assembly boards at level %s', level => {
  const available = stationsForLevel(level);
  const boards = available.filter(value => value.id.startsWith('assembly'));
  expect(boards).toHaveLength(2);
  let inventory = createInventory(level);
  const source = available.find(value => value.id === 'plates')!;
  for (const board of boards) inventory = interact(interact(inventory, source).inventory, board).inventory;
  expect(inventory.surfaces[boards[0]!.id]?.id).not.toBe(inventory.surfaces[boards[1]!.id]?.id);
  const other = inventory.surfaces[boards[1]!.id];
  inventory = interact(inventory, boards[0]!).inventory;
  expect(inventory.carried?.kind).toBe('plate');
  expect(inventory.surfaces[boards[1]!.id]).toBe(other);
});
