import { expect, it } from 'vitest';
import { LEVEL_ONE_RULES } from '@chopchop/shared';
import { createInventory, interact, type Inventory } from '../src/features/game/interactions';
import { advancePreparation } from '../src/features/game/preparation';
import { stations } from '../src/features/game/stations';
import { advanceService, createService, deliver, penalizeBurns } from '../src/features/game/service';

const station = (id: string) => stations.find(value => value.id === id)!;
const use = (inventory: Inventory, id: string) => interact(inventory, station(id)).inventory;

function preparePlate(kind: 'tomato' | 'meat'): Inventory {
  let inventory = use(createInventory(), 'plates');
  inventory = use(inventory, 'assembly');
  const source = kind === 'tomato' ? 'tomatoes' : 'meat';
  const preparation = kind === 'tomato' ? 'chopping' : 'grill';
  inventory = use(use(inventory, source), preparation);
  inventory = advancePreparation(inventory, kind === 'tomato' ? 3000 : 8000, preparation).inventory;
  inventory = use(use(inventory, preparation), 'assembly');
  return use(inventory, 'assembly');
}

it('prepares and serves both level-one recipes using actual stations and preparation', () => {
  let service = createService();
  const tomato = preparePlate('tomato');
  expect(tomato.carried).toMatchObject({ kind: 'plate', contents: [{ kind: 'tomato', state: 'chopped' }] });
  const first = deliver(advanceService(service, 10_000), tomato);
  expect(first.inventory.carried).toBeNull();
  expect(first.service).toMatchObject({ score: 140, combo: 2, bestCombo: 1, delivered: 1 });
  service = advanceService(first.service, 10_000);
  const second = deliver(service, preparePlate('meat'));
  expect(second.service).toMatchObject({ score: 400, combo: 3, bestCombo: 2, delivered: 2 });
  expect(second.inventory.carried).toBeNull();
});

it('rejects raw, burnt, extra or incompatible ingredients without losing objects', () => {
  let inventory = use(use(createInventory(), 'plates'), 'assembly');
  inventory = use(inventory, 'tomatoes');
  expect(use(inventory, 'assembly')).toBe(inventory);
  inventory = { ...inventory, carried: { id: 2, kind: 'meat', state: 'burnt', cookMs: 14000 } };
  expect(use(inventory, 'assembly')).toBe(inventory);
  const plated = preparePlate('tomato');
  inventory = use(plated, 'assembly');
  inventory = { ...inventory, carried: { id: 3, kind: 'meat', state: 'cooked', cookMs: 8000 } };
  expect(use(inventory, 'assembly')).toBe(inventory);
});

it('keeps a refused plate and points but resets the combo', () => {
  const inventory = preparePlate('meat');
  const service = { ...createService(), orders: [], score: 250, combo: 3 };
  const result = deliver(service, inventory);
  expect(result.inventory).toBe(inventory);
  expect(result.service).toMatchObject({ score: 250, combo: 1, refused: 1 });
});

it('serves the earliest matching order and never serves an expired one', () => {
  const initial = createService();
  const orders = [{ ...initial.orders[0]!, id: 3, expiresAt: 30_000 }, initial.orders[0]!];
  const served = deliver({ ...initial, orders }, preparePlate('tomato'));
  expect(served.service.orders.map(order => order.id)).toEqual([1]);
  const expired = deliver({ ...initial, elapsedMs: 50_000 }, preparePlate('tomato'));
  expect(expired.service.delivered).toBe(0);
});

it('starts with two orders, respects capacity and uses fixed active-time intervals', () => {
  const initial = createService();
  expect(initial.orders.map(order => order.recipe)).toEqual(LEVEL_ONE_RULES.recipes);
  expect(advanceService(initial, 14_999).orders).toHaveLength(2);
  expect(advanceService(initial, 15_000).orders).toHaveLength(3);
  const full = advanceService(initial, 30_000);
  expect(full.orders).toHaveLength(3);
  expect(full.nextOrderId).toBe(4);
});

it('changes patience only for new orders and expires without subtracting points', () => {
  let service = advanceService({ ...createService(), score: 250, combo: 3 }, 50_000);
  expect(service).toMatchObject({ score: 250, combo: 1, expired: 2 });
  service = advanceService(service, 10_000);
  expect(service.orders.find(order => order.createdAt === 15_000)?.expiresAt).toBe(65_000);
  expect(service.orders.find(order => order.createdAt === 60_000)?.expiresAt).toBe(105_000);
  service = advanceService(service, 60_000);
  const order = service.orders.find(value => value.createdAt === 120_000)!;
  expect(order.expiresAt - order.createdAt).toBe(40_000);
});

it('advances identically in large or small frames and freezes at 180 seconds', () => {
  let split = createService();
  for (let i = 0; i < 1800; i++) split = advanceService(split, 100);
  expect(split).toEqual(advanceService(createService(), 180_000));
  expect(split.ended).toBe(true);
  expect(advanceService(split, 10_000)).toBe(split);
  const inventory = preparePlate('tomato');
  expect(deliver(split, inventory)).toMatchObject({ service: split, inventory });
});

it('applies burn penalties with a floor and no additional penalty on discarding', () => {
  const service = penalizeBurns({ ...createService(), score: 15, combo: 3 }, 2);
  expect(service).toMatchObject({ score: 0, combo: 1, burnt: 2 });
  expect(penalizeBurns(service, 0)).toBe(service);
});
