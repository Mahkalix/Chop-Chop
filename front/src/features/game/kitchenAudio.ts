import type Phaser from 'phaser';
import { EFFECT_SOUNDS, LOOP_SOUNDS, MUSIC, type EffectSound, type LoopSound, type SoundSettings } from './sound';

type SoundManager = Phaser.Scene['sound'];
type SoundKey = EffectSound | LoopSound | typeof MUSIC;

const MUSIC_VOLUME = 0.35;
const SOUND_KEYS: readonly SoundKey[] = [MUSIC, ...LOOP_SOUNDS, ...EFFECT_SOUNDS];

/** OGG loops without gaps; MP3 is the fallback for browsers without Vorbis. */
export function preloadSounds(load: Phaser.Loader.LoaderPlugin) {
  for (const key of SOUND_KEYS) {
    load.audio(key, [`/audio/${key}.ogg`, `/audio/${key}.mp3`]);
  }
}

/** Plays the kitchen sounds. A sound that failed to load is skipped, never fatal. */
export class KitchenAudio {
  private music: Phaser.Sound.BaseSound | null = null;
  private readonly loops = new Map<LoopSound, Phaser.Sound.BaseSound>();

  constructor(private readonly sound: SoundManager, private readonly cache: Phaser.Cache.BaseCache, private settings: SoundSettings) {}

  /** Also mutes sounds already playing or paused, such as a loop interrupted by the pause. */
  setSettings(settings: SoundSettings) {
    this.settings = settings;
    for (const key of SOUND_KEYS) {
      for (const playing of this.sound.getAll<Phaser.Sound.WebAudioSound>(key)) playing.setMute(this.isMuted(key));
    }
  }

  startMusic() {
    if (this.music || !this.cache.exists(MUSIC)) return;
    this.music = this.sound.add(MUSIC, { loop: true, volume: MUSIC_VOLUME, mute: this.isMuted(MUSIC) });
    this.music.play();
  }

  play(effects: readonly EffectSound[]) {
    for (const key of effects) if (this.cache.exists(key)) this.sound.play(key, { mute: this.isMuted(key) });
  }

  syncLoops(active: ReadonlySet<LoopSound>) {
    for (const key of LOOP_SOUNDS) {
      const current = this.loops.get(key);
      if (!active.has(key)) { if (current?.isPlaying) current.stop(); continue; }
      if (current?.isPlaying || !this.cache.exists(key)) continue;
      const loop = current ?? this.sound.add(key, { loop: true, mute: this.isMuted(key) });
      this.loops.set(key, loop);
      loop.play();
    }
  }

  pause() {
    this.sound.pauseAll();
  }

  /** A service that started while hidden reaches its first resume without music. */
  resume() {
    this.sound.resumeAll();
    this.startMusic();
  }

  stop() {
    this.sound.stopAll();
  }

  private isMuted(key: string) {
    return key === MUSIC ? !this.settings.music : !this.settings.effects;
  }
}
