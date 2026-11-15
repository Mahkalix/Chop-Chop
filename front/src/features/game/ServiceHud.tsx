import { getServiceRules, RECIPES } from '@chopchop/shared';
import type { Service } from './service';
import { DishArt } from './DishArt';
import { ingredientArt, ingredientNames, recipeLabels } from './recipePresentation';
import styles from './Kitchen.module.scss';

export function ServiceHud({ service, onPause }: { service: Service; onPause: () => void }) {
  const seconds = Math.ceil((getServiceRules(service.levelId).durationMs - service.elapsedMs) / 1000);
  return <header className={styles.hud}>
    <section className={styles.orders} aria-label="Commandes à servir">
      {service.orders.map(order => {
        const remaining = Math.max(0, Math.ceil((order.expiresAt - service.elapsedMs) / 1000));
        const recipe = RECIPES.find(value => value.id === order.recipe)!;
        return <article key={order.id} className={styles.order} data-urgent={remaining <= 10} aria-label={`Commande ${order.id} : ${recipe.name}`}>
          <div className={styles.orderTitle}><span>{String(order.id).padStart(2, '0')}</span><strong>{recipeLabels[order.recipe]}</strong></div>
          <DishArt recipeId={order.recipe} />
          <div className={styles.ingredients}>{recipe.ingredients.map(ingredient => <img key={ingredient.kind} src={ingredientArt(ingredient.kind)} alt={ingredientNames[ingredient.kind]} />)}{recipe.ingredients.length === 1 && <span>1×</span>}</div>
          <div className={styles.remaining}><span>{remaining <= 10 ? '! URGENT' : 'RESTANT'}</span><strong>{remaining} s</strong></div>
          <progress aria-label={`Temps restant commande ${order.id}`} value={Math.max(0, order.expiresAt - service.elapsedMs)} max={order.expiresAt - order.createdAt} />
        </article>;
      })}
      {!service.orders.length && <p className={styles.waiting}>Prochaine commande en préparation…</p>}
    </section>
    <p className={styles.level}>NIVEAU {service.levelId}/3</p>
    <section className={styles.score} aria-label="Service">
      <div className={styles.clock}><span>TEMPS</span><time aria-label="Temps de service restant">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</time></div>
      <div className={styles.points}><strong>{service.score} pts</strong><span aria-label={`Prochain combo fois ${service.combo}`}>×{service.combo} COMBO</span></div>
      <button className={styles.pause} onClick={onPause}>Ⅱ PAUSE</button>
    </section>
  </header>;
}
