import { canAssemble, getServiceRules, matchRecipe, RECIPES, type ServiceLevel, type Ingredient as SharedIngredient, type ItemKind as SharedItemKind } from '@chopchop/shared';

/** Local inventory types used by kitchen interactions and preparation. */
export type ItemKind = SharedItemKind | 'extinguisher';
export type Item =
  | (Extract<SharedIngredient, { kind: 'tomato' }> & { readonly id: number; readonly cutMs: number })
  | (Extract<SharedIngredient, { kind: 'meat' }> & { readonly id: number; readonly cookMs: number })
  | (Extract<SharedIngredient, { kind: 'lettuce' | 'tortilla' | 'white-sauce' }> & { readonly id: number })
  | { readonly id: number; readonly kind: 'extinguisher' }
  | { readonly id: number; readonly kind: 'plate'; readonly contents: readonly SharedIngredient[] };
export type Station =
  | { readonly id: string; readonly kind: 'source'; readonly item: SharedItemKind }
  | { readonly id: string; readonly kind: 'surface'; readonly accepts: readonly ItemKind[]; readonly preparation?: 'chop' | 'cook' }
  | { readonly id: string; readonly kind: 'trash' }
  | { readonly id: string; readonly kind: 'delivery' };
export type Inventory = {
  readonly levelId: ServiceLevel;
  readonly fires: Readonly<Record<string, number>>;
  readonly carried: Item | null;
  readonly surfaces: Readonly<Record<string, Item | null>>;
  readonly nextItemId: number;
  readonly discarded: number;
};
export type InteractionResult = { readonly inventory: Inventory; readonly message: string };

export function describeItem(item: Item): string {
  if (item.kind === 'tomato') return item.state === 'chopped' ? 'Tomate découpée' : 'Tomate';
  if (item.kind === 'meat') return { raw: 'Viande crue', cooked: 'Viande cuite', burnt: 'Viande brûlée' }[item.state];
  if (item.kind === 'lettuce') return 'Salade';
  if (item.kind === 'tortilla') return 'Galette';
  if (item.kind === 'white-sauce') return 'Sauce blanche';
  if (item.kind === 'extinguisher') return 'Extincteur · maintenir C près du feu';
  if (!item.contents.length) return 'Assiette vide';
  const recipe = matchRecipe(item.contents, getServiceRules(3).recipes);
  return RECIPES.find(value => value.id === recipe)?.name ?? `Assiette en préparation : ${item.contents.map(value => ({ tomato: 'tomate', meat: 'viande', lettuce: 'salade', tortilla: 'galette', 'white-sauce': 'sauce blanche' })[value.kind]).join(' + ')}`;
}

function createItem(id: number, kind: SharedItemKind): Item {
  if (kind === 'tomato') return { id, kind, state: 'raw', cutMs: 0 };
  if (kind === 'meat') return { id, kind, state: 'raw', cookMs: 0 };
  if (kind === 'lettuce' || kind === 'tortilla' || kind === 'white-sauce') return { id, kind, state: 'ready' };
  return { id, kind, contents: [] };
}

export function createInventory(levelId: ServiceLevel = 1): Inventory {
  return { levelId, fires: {}, carried: null,
    surfaces: levelId >= 2 ? { extinguisher: { id: 1, kind: 'extinguisher' } } : {},
    nextItemId: levelId >= 2 ? 2 : 1, discarded: 0 };
}

/** An interaction either transfers one existing item or leaves the inventory unchanged. */
export function interact(inventory: Inventory, station: Station): InteractionResult {
  const unchanged = (message: string) => ({ inventory, message });
  const carried = inventory.carried;
  if (station.id in inventory.fires) return unchanged('Poste en feu ! Prends l’extincteur et maintiens C à proximité.');
  if (station.kind === 'source') {
    if (carried) return unchanged('Pose ton objet avant d’en prendre un autre.');
    const item = createItem(inventory.nextItemId, station.item);
    return {
      inventory: { ...inventory, carried: item, nextItemId: inventory.nextItemId + 1 },
      message: `${describeItem(item)} récupérée.`,
    };
  }
  if (station.kind === 'trash') {
    if (!carried) return unchanged('Tu n’as rien à jeter.');
    if (carried.kind === 'extinguisher') return unchanged('L’extincteur est réutilisable : repose-le sur son support ou un comptoir.');
    return { inventory: { ...inventory, carried: null, discarded: inventory.discarded + 1 }, message: 'Objet jeté.' };
  }
  if (station.kind === 'delivery') return unchanged('Apporte une assiette correspondant à une commande.');
  const placed = inventory.surfaces[station.id] ?? null;
  if (carried) {
    if (placed?.kind === 'plate' && carried.kind !== 'plate' && carried.kind !== 'extinguisher' && !station.preparation) {
      const contents = [...placed.contents, { kind: carried.kind, state: carried.state } as SharedIngredient];
      const allowed = getServiceRules(inventory.levelId).recipes;
      if (!canAssemble(contents, allowed)) return unchanged('Cet ingrédient ne complète pas une recette de ce niveau.');
      const recipe = matchRecipe(contents, allowed);
      return { inventory: { ...inventory, carried: null, surfaces: { ...inventory.surfaces, [station.id]: { ...placed, contents } } },
        message: recipe ? 'Assiette prête ! Reprends-la avec E puis apporte-la au poste SERVIR.' : 'Ingrédient ajouté. Complète la recette avant de servir.' };
    }
    if (placed) return unchanged('Ce poste est occupé. Choisis un emplacement libre.');
    if (!station.accepts.includes(carried.kind)) return unchanged('Cet objet ne peut pas être posé sur ce poste.');
    return {
      inventory: { ...inventory, carried: null, surfaces: { ...inventory.surfaces, [station.id]: carried } },
      message: `${describeItem(carried)} posée.`,
    };
  }
  if (!placed) return unchanged('Ce poste est vide.');
  return {
    inventory: { ...inventory, carried: placed, surfaces: { ...inventory.surfaces, [station.id]: null } },
    message: `${describeItem(placed)} récupérée.`,
  };
}
