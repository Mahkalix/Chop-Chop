import type { ServiceLevel } from '@chopchop/shared';
import s from './LevelPicker.module.scss';

export function LevelPicker({ value, onChange }: { value: number; onChange: (level: ServiceLevel) => void }) {
  return <div className={s.picker} role="group" aria-label="Choisis ton niveau">
    {([1, 2, 3] as const).map(level => <button key={level} type="button" aria-pressed={value === level} onClick={() => onChange(level)}>
      <span>0{level}</span><strong>{level === 1 ? 'LES BASES' : level === 2 ? 'CHAUD DEVANT' : 'LE GRAND WRAP'}</strong>
    </button>)}
  </div>;
}
