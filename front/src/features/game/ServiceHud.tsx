import { isLocalDemo } from './localDemo';
import { getServiceRules, RECIPES } from '@chopchop/shared';
import type { Service } from './service';
import styles from './Kitchen.module.scss';

export function ServiceHud({ service, onPause }: { service: Service; onPause: () => void }) {
  const seconds = Math.ceil((getServiceRules(service.levelId).durationMs - service.elapsedMs) / 1000);
  return <header className={styles.hud}>
    <section className={styles.orders} aria-label="Commandes à servir">
      {service.orders.map(order => {
        const remaining = Math.max(0, Math.ceil((order.expiresAt - service.elapsedMs) / 1000));
        const recipe = RECIPES.find(value => value.id === order.recipe)!;
        return <article key={order.id} className={styles.order} data-urgent={remaining <= 10}>
          <strong>#{order.id} · {recipe.name}</strong>
          <span>{recipe.ingredients.map(ingredient => <img key={ingredient.kind}
            src={`/kitchen/items/${ingredient.kind === 'tomato' ? 'chopped' : ingredient.kind === 'meat' ? 'cooked' : ingredient.kind}.svg`}
            alt={ingredient.kind === 'tomato' ? 'Tomate découpée' : ingredient.kind === 'meat' ? 'Viande cuite' : ({ lettuce: 'Salade', tortilla: 'Galette', 'white-sauce': 'Sauce blanche' })[ingredient.kind]} />)}</span>
          <progress aria-label={`Temps restant commande ${order.id}`} value={Math.max(0, order.expiresAt - service.elapsedMs)} max={order.expiresAt - order.createdAt} />
          <small>{remaining} s restantes</small>
        </article>;
      })}
      {!service.orders.length && <p>Prochaine commande en préparation…</p>}
    </section>
    <section className={styles.score} aria-label="Service">
      <strong>NIVEAU {service.levelId}{isLocalDemo() ? " · LOCAL" : ""}</strong><time aria-label="Temps de service restant">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time>
      <span>{service.score} pts · Prochain combo ×{service.combo}</span>
      <button onClick={onPause}>PAUSE (ÉCHAP)</button>
    </section>
  </header>;
}
