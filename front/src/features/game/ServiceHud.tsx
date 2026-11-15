import { LEVEL_ONE_RULES, RECIPES } from '@chopchop/shared';
import type { Service } from './service';
import styles from './Kitchen.module.scss';

export function ServiceHud({ service, onPause }: { service: Service; onPause: () => void }) {
  const seconds = Math.ceil((LEVEL_ONE_RULES.durationMs - service.elapsedMs) / 1000);
  return <header className={styles.hud}>
    <section className={styles.orders} aria-label="Commandes à servir">
      {service.orders.map(order => {
        const remaining = Math.max(0, Math.ceil((order.expiresAt - service.elapsedMs) / 1000));
        const tomato = order.recipe === 'prepared-tomato';
        return <article key={order.id} className={styles.order} data-urgent={remaining <= 10}>
          <strong>#{order.id} · {RECIPES.find(recipe => recipe.id === order.recipe)?.name}</strong>
          <span><img src={`/kitchen/items/${tomato ? 'chopped' : 'cooked'}.svg`} alt="" />
            {tomato ? 'Découper · Mettre en assiette' : 'Cuire · Mettre en assiette'}</span>
          <progress aria-label={`Temps restant commande ${order.id}`} value={Math.max(0, order.expiresAt - service.elapsedMs)} max={order.expiresAt - order.createdAt} />
          <small>{remaining} s restantes</small>
        </article>;
      })}
      {!service.orders.length && <p>Prochaine commande en préparation…</p>}
    </section>
    <section className={styles.score} aria-label="Service">
      <strong>NIVEAU 1</strong><time aria-label="Temps de service restant">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time>
      <span>{service.score} pts · Prochain combo ×{service.combo}</span>
      <button onClick={onPause}>PAUSE (ÉCHAP)</button>
    </section>
  </header>;
}
