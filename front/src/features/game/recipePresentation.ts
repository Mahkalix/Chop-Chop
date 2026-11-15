import type { Ingredient, RecipeId } from '@chopchop/shared';

export const ingredientArt = (kind: Ingredient['kind']) => `/kitchen/items/${kind === 'tomato' ? 'chopped.svg' : kind === 'meat' ? 'cooked.svg' : kind === 'lettuce' ? 'lettuce-chopped.png' : kind + '.png'}`;
export const ingredientNames = { tomato: 'Tomate découpée', meat: 'Viande cuite', lettuce: 'Salade découpée', tortilla: 'Galette', 'white-sauce': 'Sauce blanche' };
export const recipeLabels: Record<RecipeId, string> = {
  'prepared-tomato': 'TOMATE', 'grilled-meat': 'VIANDE', 'tomato-salad': 'SALADE',
  'complete-plate': 'ASSIETTE', 'mixed-plate': 'ASSIETTE', wrap: 'WRAP',
};
