import { LEVEL_ONE_RULES, matchRecipe, type RecipeId } from '@chopchop/shared';
import type { Inventory } from './interactions';

export type Order = { id: number; recipe: RecipeId; createdAt: number; expiresAt: number };
export type Service = {
  elapsedMs: number; orders: readonly Order[]; nextOrderId: number; nextOrderAt: number;
  score: number; combo: number; bestCombo: number; delivered: number; expired: number;
  refused: number; burnt: number; ended: boolean;
};

function addOrder(service: Service): Service {
  const { recipes, patienceMs } = LEVEL_ONE_RULES;
  const minute = Math.min(2, Math.floor(service.elapsedMs / 60_000));
  // A repeatable sequence gives every run the same recipe opportunities.
  const order: Order = { id: service.nextOrderId, recipe: recipes[(service.nextOrderId - 1) % recipes.length]!,
    createdAt: service.elapsedMs, expiresAt: service.elapsedMs + patienceMs[minute]! };
  return { ...service, orders: [...service.orders, order], nextOrderId: service.nextOrderId + 1 };
}

export function createService(): Service {
  let service: Service = { elapsedMs: 0, orders: [], nextOrderId: 1, nextOrderAt: LEVEL_ONE_RULES.orderIntervalMs,
    score: 0, combo: 1, bestCombo: 0, delivered: 0, expired: 0, refused: 0, burnt: 0, ended: false };
  for (let i = 0; i < LEVEL_ONE_RULES.initialOrders; i++) service = addOrder(service);
  return service;
}

/** Process deadlines in chronological order, independent of rendering frame sizes. */
export function advanceService(service: Service, deltaMs: number): Service {
  if (service.ended || !Number.isFinite(deltaMs) || deltaMs <= 0) return service;
  const end = Math.min(LEVEL_ONE_RULES.durationMs, service.elapsedMs + deltaMs);
  let next = service;
  while (next.elapsedMs < end) {
    const deadline = Math.min(next.nextOrderAt, ...next.orders.map(order => order.expiresAt), end);
    next = { ...next, elapsedMs: deadline };
    if (deadline >= LEVEL_ONE_RULES.durationMs) return { ...next, ended: true };
    const orders = next.orders.filter(order => order.expiresAt > deadline);
    const expired = next.orders.length - orders.length;
    if (expired) next = { ...next, orders, expired: next.expired + expired, combo: 1 };
    if (deadline === next.nextOrderAt) {
      if (next.orders.length < LEVEL_ONE_RULES.maxOrders) next = addOrder(next);
      next = { ...next, nextOrderAt: next.nextOrderAt + LEVEL_ONE_RULES.orderIntervalMs };
    }
  }
  return next;
}

export function penalizeBurns(service: Service, count: number): Service {
  if (service.ended || count <= 0) return service;
  return { ...service, score: Math.max(0, service.score - count * 10), combo: 1, burnt: service.burnt + count };
}

export function deliver(service: Service, inventory: Inventory) {
  if (service.ended) return { service, inventory, message: 'Le service est terminé.' };
  const plate = inventory.carried;
  const recipe = plate?.kind === 'plate' ? matchRecipe(plate.contents) : null;
  const order = service.orders.filter(value => value.recipe === recipe && value.expiresAt > service.elapsedMs)
    .sort((a, b) => a.expiresAt - b.expiresAt || a.id - b.id)[0];
  if (!order) return { service: { ...service, combo: 1, refused: service.refused + 1 }, inventory,
    message: 'Livraison refusée : apporte une assiette correspondant à une commande active.' };
  const bonus = Math.max(0, Math.min(50, Math.floor(50 * (order.expiresAt - service.elapsedMs) / (order.expiresAt - order.createdAt))));
  const points = (100 + bonus) * service.combo;
  return {
    service: { ...service, orders: service.orders.filter(value => value.id !== order.id),
      score: service.score + points, bestCombo: Math.max(service.bestCombo, service.combo),
      combo: Math.min(3, service.combo + 1), delivered: service.delivered + 1 },
    inventory: { ...inventory, carried: null }, message: `Commande servie ! +${points} points.`,
  };
}
