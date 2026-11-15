import styles from './Kitchen.module.scss';
import { ServiceIntro } from './ServiceIntro';
import { readSelectedLevel } from './levelSelection';

const waitForKitchen = async () => {};

export function KitchenLoading() {
  return <div className={styles.kitchen}>
    <ServiceIntro phase="ready" ready={false} progress={0} level={readSelectedLevel()} error="" start={waitForKitchen} />
  </div>;
}
