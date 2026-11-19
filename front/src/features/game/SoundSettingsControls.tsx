import { useState } from 'react';
import { readSoundSettings, writeSoundSettings, type SoundSettings } from './sound';
import styles from './Kitchen.module.scss';

type SoundSettingsControlsProps = { onChange: (settings: SoundSettings) => void };

const channels = [
  { key: 'music', label: 'Musique', on: 'MUSIQUE : ACTIVÉE', off: 'MUSIQUE : COUPÉE' },
  { key: 'effects', label: 'Bruitages', on: 'BRUITAGES : ACTIVÉS', off: 'BRUITAGES : COUPÉS' },
] as const;

export function SoundSettingsControls({ onChange }: SoundSettingsControlsProps) {
  const [settings, setSettings] = useState(readSoundSettings);
  const toggle = (key: keyof SoundSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    writeSoundSettings(next);
    onChange(next);
  };
  return <div className={styles.soundSettings}>
    {channels.map(({ key, label, on, off }) => <button key={key} type="button" role="switch" aria-checked={settings[key]} aria-label={label}
      className={styles.soundToggle} onClick={() => toggle(key)}>
      {settings[key] ? on : off}
    </button>)}
  </div>;
}
