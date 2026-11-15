import type { ServiceLevel } from '@chopchop/shared';
import { stationsForLevel } from '../game/stations';
import s from './Selection.module.scss';

export function KitchenPreview({ level, chef }: { level: ServiceLevel; chef: string }) {
  return <svg className={s.map} viewBox="0 180 1440 660" role="img" aria-label={`Aperçu de la cuisine du niveau ${level}`}>
    <defs><pattern id="preview-floor" width="1440" height="900" patternUnits="userSpaceOnUse"><image href="/kitchen/floor.png" width="1440" height="900" /></pattern></defs>
    <rect width="1440" height="900" fill="url(#preview-floor)" />
    {stationsForLevel(level).map(station => <g key={station.id}>
      <image href={`/kitchen/${station.texture}.png`} x={station.x} y={station.y} width="144" height="144" />
      {station.id === 'grill' && <image href="/kitchen/items/pan.svg" x={station.x + 30} y={station.y + 22} width="112" height="80" />}
      {station.id === 'chopping' && <image href="/kitchen/items/knife.svg" x={station.x + 18} y={station.y + 24} width="70" height="32" />}
      {station.id === 'extinguisher' && <image href="/kitchen/items/extinguisher.svg" x={station.x + 48} y={station.y + 24} width="48" height="72" />}
    </g>)}
    <image href={`/menu/${chef}.png`} x="392" y="474" width="128" height="160" />
  </svg>;
}
