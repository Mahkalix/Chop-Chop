import { RECIPES, type RecipeId } from '@chopchop/shared';
import { plateLayout } from './plateLayout';
import { ingredientArt } from './recipePresentation';
import styles from './Kitchen.module.scss';

export function DishArt({ recipeId }: { recipeId: RecipeId }) {
  const image = recipeId === 'prepared-tomato' ? 'dish-tomato' : recipeId === 'grilled-meat' ? 'dish-meat' : recipeId === 'wrap' ? 'wrap' : null;
  if (image) return <div className={styles.dish}><img src={`/kitchen/items/${image}.png`} alt="" /></div>;
  const recipe = RECIPES.find(value => value.id === recipeId)!;
  return <div className={styles.dish} aria-hidden="true">
    <img src="/kitchen/items/plate.svg" alt="" />
    <div className={styles.garnish}>{recipe.ingredients.map((ingredient, index) => { const { x, y, width, height } = plateLayout(recipe.ingredients.map(value => value.kind))[index]!; return <img key={ingredient.kind} src={ingredientArt(ingredient.kind)} alt="" style={{ left: `${x / 128 * 100}%`, top: `${y / 96 * 100}%`, width: `${width / 128 * 100}%`, height: `${height / 96 * 100}%` }} />; })}</div>
  </div>;
}
