import Phaser from 'phaser';
import { plateLayout } from './plateLayout';

import { stationsForLevel, closestStation, type KitchenStation } from './stations';
import { advanceExtinction, igniteFires } from './fire';
import { createInventory, interact, describeItem, type Item, type Inventory } from './interactions';

import { advancePreparation, getPreparationProgress, type PreparationProgress } from './preparation';
import { advanceService, createService, deliver, penalizeBurns, type Service } from './service';
import { getServiceRules, EXTINGUISH_MS, type ServiceLevel } from '@chopchop/shared';
import { KitchenAudio, preloadSounds } from './kitchenAudio';
import { activeLoops, readSoundSettings, soundEffects, type SoundSettings, type SoundState } from './sound';

const textureOf = (item: Item) => item.kind === 'plate'
  ? (item.contents.length === 5 ? 'item-wrap' : item.contents.length ? `dish-${item.contents.map(value => value.kind).sort().join('-')}` : 'dish-empty')
  : 'item-' + (item.kind === 'tomato' ? (item.state === 'chopped' ? 'chopped' : 'whole') : item.kind === 'lettuce' && item.state === 'chopped' ? 'lettuce-chopped' : item.kind === 'meat' && item.state !== 'raw' ? item.state : item.kind);

export type InteractionStatus = { carried: string | null; target: string | null; message: string; preparation: PreparationProgress | null; fireCount: number };

const chefs = ['Miso', 'Pipa', 'Basile', 'Alba', 'Nori', 'Gaspard'];

export class KitchenScene extends Phaser.Scene {
  readonly levelId: ServiceLevel;
  private stations: readonly KitchenStation[];
  service: Service;

  constructor(levelId: ServiceLevel = 1) {
    super('KitchenScene');
    this.levelId = levelId;
    this.stations = stationsForLevel(levelId);
    this.service = createService(levelId);
    this.inventory = createInventory(levelId);
  }
  private running = false;
  private lastServiceAt = 0;

  private audio!: KitchenAudio;
  private soundState!: SoundState;

  startService() {
    this.running = true;
    this.input.keyboard?.enableGlobalCapture();
    this.audio.startMusic();
    this.game.events.emit('service-update', this.service);
  }

  setPaused(paused: boolean) {
    this.running = !paused && !this.service.ended;
    this.player?.setVelocity(0);
    this.dashUntil = 0;
    this.input.keyboard?.resetKeys();
    if (this.running) this.input.keyboard?.enableGlobalCapture();
    else this.input.keyboard?.disableGlobalCapture();
    if (this.running) this.audio.resume();
    else this.audio.pause();
  }

  setSoundSettings(settings: SoundSettings) {
    this.audio.setSettings(settings);
  }
  private inventory: Inventory;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private targetId: string | null = null;
  private placedItems = new Map<string, Phaser.GameObjects.Image>();
  private feedback = '';
  private lastStatus = '';
  private lastProgressAt = 0;
  private progressLabels = new Map<string, Phaser.GameObjects.Text>();
  private progressBars!: Phaser.GameObjects.Graphics;
  private burningFlames!: Phaser.GameObjects.Graphics;
  private choppingCloud!: Phaser.GameObjects.Graphics;
  private knife!: Phaser.GameObjects.Image;
  private cutKey!: Phaser.Input.Keyboard.Key;
  private carriedItem!: Phaser.GameObjects.Image;
  private stationSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private portrait!: Phaser.GameObjects.Image;
  private readonly facing = new Phaser.Math.Vector2(0, 1);
  private readonly stride = new Phaser.Math.Vector2();
  private dashUntil = 0;
  private static readonly dashDuration = 140;
  private player!: Phaser.Physics.Arcade.Sprite;
  private arrows!: Phaser.Types.Input.Keyboard.CursorKeys;
  private letters!: Record<'Z' | 'Q' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  preload() {
    this.load.on('progress', (value: number) => this.game.events.emit('kitchen-loading', value));
    this.load.image('floor', '/kitchen/floor.png');
    for (const key of new Set(this.stations.map(station => station.texture))) {
      this.load.image(key, `/kitchen/${key}.png`);
    }
    for (const name of ['whole', 'chopped', 'meat', 'cooked', 'burnt', 'plate', 'extinguisher']) {
      this.load.svg('item-' + name, '/kitchen/items/' + name + '.svg');
    }
    for (const name of ['lettuce', 'lettuce-chopped', 'tortilla', 'white-sauce', 'wrap']) this.load.image('item-' + name, '/kitchen/items/' + name + '.png');
    this.load.svg('pan', '/kitchen/items/pan.svg');
    this.load.svg('knife', '/kitchen/items/knife.svg');
    const selected = sessionStorage.getItem('chef') ?? 'Miso';
    this.load.image('chef', `/menu/${chefs.includes(selected) ? selected : 'Miso'}.png`);
    preloadSounds(this.load);
  }

  create() {
    const ingredients = this.levelId === 3 ? ['lettuce', 'tortilla', 'white-sauce', 'tomato', 'meat'] as const : ['lettuce', 'tomato', 'meat'] as const;
    for (let mask = 0; mask < (1 << ingredients.length); mask++) {
      const kinds = ingredients.filter((_, index) => mask & (1 << index));
      const texture = this.add.renderTexture(0, 0, 128, 96).setVisible(false);
      texture.draw(this.add.image(0, 0, 'item-plate').setDisplaySize(112, 80).setVisible(false), 64, 48);
      kinds.forEach((kind, index) => {
        const key = kind === 'tomato' ? 'chopped' : kind === 'meat' ? 'cooked' : kind === 'lettuce' ? 'lettuce-chopped' : kind;
        const { x, y, width, height } = plateLayout(kinds)[index]!;
        const image = this.add.image(0, 0, 'item-' + key).setDisplaySize(width, height).setVisible(false);
        texture.draw(image, x, y);
      });
      texture.saveTexture(kinds.length ? 'dish-' + [...kinds].sort().join('-') : 'dish-empty');
    }
    this.inventory = createInventory(this.levelId);
    this.audio = new KitchenAudio(this.sound, this.cache.audio, readSoundSettings());
    this.soundState = { service: this.service, inventory: this.inventory };
    this.lastStatus = '';
    this.lastProgressAt = 0;
    this.dashUntil = 0;
    this.facing.set(0, 1);
    this.targetId = null;
    this.stationSprites.clear();
    const floor = this.add.tileSprite(720, 450, 1440, 900, 'floor').setDepth(-10);
    const obstacles = this.physics.add.staticGroup();
    let deliveryLabel: Phaser.GameObjects.Text | undefined;
    for (const { id, texture, label, x, y } of this.stations) {
      const sprite = obstacles.create(x + 72, y + 72, texture).setDisplaySize(144, 144).refreshBody();
      this.stationSprites.set(id, sprite);
      if (id === 'grill') this.add.image(x + 72, y + 68, 'pan').setOrigin(42 / 112, 46 / 80);
      if (label) {
        const stationLabel = this.add.text(x + 72, y + 148, label, {
          fontFamily: 'Inter, Arial', fontSize: label.length > 12 ? '15px' : '18px', fontStyle: 'bold', color: '#000000',
          backgroundColor: '#f7f1e6', fixedWidth: 144, align: 'center', padding: { y: 3 },
        }).setOrigin(0.5, 0);
        if (id === 'delivery') deliveryLabel = stationLabel;
      }
    }
    this.player = this.physics.add.sprite(456, 554, 'chef').setDisplaySize(128, 160);
    // The feet occupy the floor tile. The hat can overlap the back of a counter.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.player.width * .38, this.player.height * .18);
    body.setOffset(this.player.width * .31, this.player.height * .78);
    this.physics.world.setBounds(40, 110, 1360, 720);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, obstacles);
    this.player.setVisible(false);
    this.portrait = this.add.image(this.player.x, this.player.y, 'chef').setDisplaySize(128, 160).setDepth(20);
    const camera = this.cameras.main;
    const fitCamera = () => {
      const zoom = Math.min(this.scale.width / 1440, this.scale.height / 900);
      const worldWidth = this.scale.width / zoom, worldHeight = this.scale.height / zoom;
      camera.setZoom(zoom).centerOn(720, 450);
      floor.setSize(worldWidth + 4, worldHeight + 4);
      const deliveryX = 720 + worldWidth / 2 - 144;
      this.stations = this.stations.map(station => station.id === 'delivery' ? { ...station, x: deliveryX } : station);
      const deliverySprite = this.stationSprites.get('delivery');
      deliverySprite?.setX(deliveryX + 72);
      (deliverySprite?.body as Phaser.Physics.Arcade.StaticBody | undefined)?.updateFromGameObject();
      deliveryLabel?.setX(deliveryX + 72);
      this.physics.world.setBounds(720 - worldWidth / 2 + 40, 110, worldWidth - 80, 720);
    };
    fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, fitCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, fitCamera));
    const keyboard = this.input.keyboard!;
    this.arrows = keyboard.createCursorKeys();
    this.letters = keyboard.addKeys('Z,Q,S,D') as typeof this.letters;
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.interactionKey.on('down', this.useClosestStation, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.interactionKey.off('down', this.useClosestStation, this));
    this.placedItems.clear();
    this.cutKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    keyboard.disableGlobalCapture();
    this.knife = this.add.image(0, 0, 'knife').setOrigin(.13, .45);
    this.restKnife();
    this.choppingCloud = this.add.graphics().setDepth(15);
    this.progressBars = this.add.graphics().setDepth(16);
    this.burningFlames = this.add.graphics().setDepth(14);
    this.carriedItem = this.add.image(0, 0, 'item-whole').setScale(.72).setVisible(false).setDepth(22);
    this.drawItems();
    this.publishStatus(null, 'Approche-toi d’un poste puis appuie sur E.');
    this.game.events.emit('kitchen-ready', this);
  }

  update(time: number, delta: number) {
    if (!this.running) { this.player.setVelocity(0); return; }
    const activeDelta = Math.min(delta, getServiceRules(this.levelId).durationMs - this.service.elapsedMs);
    if (activeDelta >= getServiceRules(this.levelId).durationMs - this.service.elapsedMs) {
      this.service = advanceService(this.service, activeDelta);
      this.running = false;
      this.audio.stop();
      this.input.keyboard?.disableGlobalCapture();
      this.player.setVelocity(0);
      this.game.events.emit('service-update', this.service);
      this.game.events.emit('service-ended', this.service);
      return;
    }
    this.service = advanceService(this.service, activeDelta);
    const horizontal = Number(this.arrows.right.isDown || this.letters.D.isDown)
      - Number(this.arrows.left.isDown || this.letters.Q.isDown);
    const vertical = Number(this.arrows.down.isDown || this.letters.S.isDown)
      - Number(this.arrows.up.isDown || this.letters.Z.isDown);
    const direction = this.stride.set(horizontal, vertical).normalize();
    const pressed = Phaser.Input.Keyboard.JustDown(this.arrows.space);
    if (time >= this.dashUntil) {
      if (direction.lengthSq()) this.facing.copy(direction);
      if (pressed) this.dashUntil = time + KitchenScene.dashDuration;
    }
    const remaining = Math.max(0, this.dashUntil - time);
    const velocity = remaining ? this.facing : direction;
    this.player.setVelocity(velocity.x * (remaining ? 700 : 260), velocity.y * (remaining ? 700 : 260));
    const lift = 16 * Math.sin(Math.PI * remaining / KitchenScene.dashDuration);
    this.portrait.setPosition(this.player.x, this.player.y - lift);
    if (velocity.x) this.portrait.setFlipX(velocity.x < 0);
    this.carriedItem.setPosition(this.player.x + (this.portrait.flipX ? -26 : 26), this.player.y - lift + 26);
    const feet = (this.player.body as Phaser.Physics.Arcade.Body).center;
    const target = closestStation(feet.x, feet.y, 72, this.stations);
    if ((target?.id ?? null) !== this.targetId) {
      this.stationSprites.get(this.targetId ?? '')?.clearTint();
      this.targetId = target?.id ?? null;
      this.publishStatus(target, '');
    }
    this.updatePreparation(target, time, activeDelta);
    this.updateSounds();
    if (time - this.lastServiceAt >= 100) {
      this.lastServiceAt = time;
      this.game.events.emit('service-update', this.service);
    }
  }

  private updatePreparation(target: KitchenStation | null, time: number, delta: number) {
    const cuttingStation = this.cutKey.isDown ? target?.id ?? null : null;
    const extinction = advanceExtinction(this.inventory, delta, cuttingStation);
    this.inventory = extinction.inventory;
    if (extinction.extinguished) this.publishStatus(target, 'Feu éteint. Repose l’extincteur et jette la viande brûlée pour reprendre le service.');
    const result = advancePreparation(this.inventory, delta, cuttingStation);
    const burns = Object.entries(result.inventory.surfaces).filter(([id, item]) => item?.kind === 'meat'
      && item.state === 'burnt' && (this.inventory.surfaces[id]?.kind !== 'meat'
      || (this.inventory.surfaces[id] as Extract<Item, { kind: 'meat' }>).state !== 'burnt')).length;
    this.service = penalizeBurns(this.service, burns);
    this.inventory = igniteFires(this.inventory, result.inventory);
    this.choppingCloud.clear();
    this.restKnife();
    const tomato = target && this.inventory.surfaces[target.id];
    if (target?.id === 'chopping' && (tomato?.kind === 'tomato' || tomato?.kind === 'lettuce') && tomato.state === 'raw'
      && this.cutKey.isDown && !this.inventory.carried) {
      this.animateChop(target.x + 72, target.y + 68, tomato.cutMs / 270);
    }
    this.drawProgress();
    this.drawBurningFlames(time);
    if (result.messages.length) {
      this.drawItems();
      this.publishStatus(target, result.messages.join(' '));
    } else if (time - this.lastProgressAt >= 200) {
      this.lastProgressAt = time;
      this.publishStatus(target);
    }
  }

  /** Deliveries happen in the key handler, so changes are compared frame to frame. */
  private updateSounds() {
    const current = { service: this.service, inventory: this.inventory };
    this.audio.play(soundEffects(this.soundState, current));
    this.audio.syncLoops(activeLoops(this.soundState, current, this.stations));
    this.soundState = current;
  }

  private drawProgress() {
    this.progressBars.clear();
    for (const label of this.progressLabels.values()) label.setVisible(false);
    for (const station of this.stations) {
      const progress = station.id in this.inventory.fires
        ? { percent: this.inventory.fires[station.id]! / EXTINGUISH_MS * 100 }
        : getPreparationProgress(this.inventory.surfaces[station.id], station);
      if (!progress) continue;
      const x = station.x - 48, y = station.y - 60;
      this.progressBars.fillStyle(0xf7f1e6).fillRect(x, y, 240, 56).lineStyle(2, 0x000000).strokeRect(x, y, 240, 56)
        .fillStyle(0xe8dbc4).fillRect(x + 18, y + 34, 204, 8).fillStyle(0x922f1f).fillRect(x + 18, y + 34, 204 * progress.percent / 100, 8);
      let label = this.progressLabels.get(station.id);
      if (!label) {
        label = this.add.text(x + 16, y + 10, '', { fontFamily: 'Inter, Arial', fontSize: '14px', fontStyle: 'bold', color: '#000000' }).setDepth(17);
        this.progressLabels.set(station.id, label);
      }
      const name = station.id in this.inventory.fires ? 'EXTINCTION' : station.kind === 'surface' && station.preparation === 'chop' ? 'C MAINTENUE' : 'CUISSON';
      label.setText(name + ' · ' + Math.round(progress.percent) + '%').setVisible(true);
    }
  }

  private drawBurningFlames(time: number) {
    this.burningFlames.clear();
    this.drawStationFires(time);
    for (const station of this.stations) {
      const item = this.inventory.surfaces[station.id];
      if (station.kind !== 'surface' || station.preparation !== 'cook'
        || item?.kind !== 'meat' || item.state !== 'cooked') continue;
      const danger = 1 - getPreparationProgress(item, station)!.percent / 100;
      for (let index = 0; index < 3; index++) {
        const beat = time / 170 + index * 1.8;
        const x = station.x + 54 + index * 18;
        const y = station.y + 80;
        const sway = Math.sin(beat) * 3;
        const height = 13 + danger * 8 + Math.sin(beat + 1) * 3;
        const width = 5 + danger * 2;
        this.burningFlames.fillStyle(0xff7025, .9).beginPath()
          .moveTo(x - width, y).lineTo(x - width, y - 6)
          .lineTo(x - 3, y - height * .6).lineTo(x + sway, y - height)
          .lineTo(x + width, y - 6).lineTo(x + width, y).closePath().fillPath()
          .fillStyle(0xffe28a).fillTriangle(x - width * .55, y, x + sway * .5, y - height * .65, x + width * .55, y);
      }
    }
  }

  private drawStationFires(time: number) {
    for (const station of this.stations) {
      if (!(station.id in this.inventory.fires)) continue;
      const height = 55 + Math.sin(time / 130) * 6;
      const x = station.x + 72, y = station.y + 90;
      this.burningFlames.fillStyle(0x9d2d15).fillRect(x - 48, y - 36, 96, 40)
        .fillStyle(0xf57921).fillTriangle(x - 42, y, x - 20, y - height, x + 5, y)
        .fillTriangle(x - 10, y, x + 18, y - height - 18, x + 45, y)
        .fillStyle(0xffde79).fillTriangle(x - 25, y, x, y - 40, x + 24, y);
      if (this.inventory.fires[station.id]! > 0) this.burningFlames.fillStyle(0xe9f1ee, .9)
        .fillCircle(x, y - 20, 18).fillCircle(x + 18, y - 35, 13);
    }
  }

  private animateChop(x: number, y: number, beat: number) {
      for (let i = 0; i < 6; i++) {
        const age = (beat + i / 6) % 1;
        const side = i % 2 ? 1 : -1;
        this.choppingCloud.fillStyle(0xfff2d8, (1 - age) * .86)
          .fillCircle(x + side * (6 + age * (19 + i)), y - age * 22, 4 + age * 6);
      }
      // Pose the portrait at the counter so the handle stays in the chef's hand
      // and the tip reaches the tomato. The collision body stays on the floor.
      const side = this.player.x < x ? -1 : 1;
      const swing = Math.abs(Math.sin(Math.PI * beat));
      const gripX = x + side * 37;
      const gripY = y + 3 - swing * 8;
      this.portrait.setFlipX(side > 0).setPosition(gripX + side * 26, gripY - 26);
      this.knife.setDepth(21).setPosition(gripX, gripY).setRotation(
        (side > 0 ? Math.PI : 0) + side * swing * .55
      );
  }

  private restKnife() {
    const counter = this.stationSprites.get('chopping')!;
    this.knife.setDepth(10).setPosition(counter.x - 44, counter.y - 27).setAngle(-12);
  }

  private useClosestStation() {
    if (!this.running || this.service.ended) return;
    const feet = (this.player.body as Phaser.Physics.Arcade.Body).center;
    const target = closestStation(feet.x, feet.y, 72, this.stations);
    if (!target) { this.publishStatus(null, 'Tu es trop loin d’un poste.'); return; }
    const delivery = target.kind === 'delivery' ? deliver(this.service, this.inventory) : null;
    const result = delivery ?? interact(this.inventory, target);
    if (delivery) {
      this.service = delivery.service;
      this.game.events.emit('service-update', this.service);
    }
    this.inventory = result.inventory;
    this.drawItems();
    this.publishStatus(target, result.message);
  }

  private publishStatus(target: KitchenStation | null, message = this.feedback) {
    if (target && target.id in this.inventory.fires) message = 'FEU ! Prends l’extincteur, puis maintiens C près du grill pendant 3 s.';
    this.feedback = message;
    const fireProgress = target ? this.inventory.fires[target.id] : undefined;
    const progress = fireProgress !== undefined ? { label: 'EXTINCTION · porter l’extincteur et maintenir C', percent: fireProgress / EXTINGUISH_MS * 100 }
      : target ? getPreparationProgress(this.inventory.surfaces[target.id], target) : null;
    const status = {
      carried: this.inventory.carried ? describeItem(this.inventory.carried) : null,
      fireCount: Object.keys(this.inventory.fires).length,
      target: target ? target.label || 'PLAN DE TRAVAIL' : null,
      message,
      preparation: progress ? { ...progress, percent: Math.round(progress.percent) } : null,
    } satisfies InteractionStatus;
    const serialized = JSON.stringify(status);
    if (serialized === this.lastStatus) return;
    this.lastStatus = serialized;
    this.game.events.emit('kitchen-interaction', status);
  }

  private drawItems() {
    for (const station of this.stations) {
      const item = this.inventory.surfaces[station.id];
      const sprite = this.placedItems.get(station.id);
      if (item && sprite) sprite.setTexture(textureOf(item)).setVisible(true);
      else if (item) this.placedItems.set(station.id, this.add.image(station.x + 72, station.y + 68, textureOf(item)).setDepth(10));
      if (item?.kind === 'plate' && item.contents.length !== 5) this.placedItems.get(station.id)?.setDisplaySize(112, 84);
      else if (item) this.placedItems.get(station.id)?.setScale(['lettuce', 'tortilla', 'white-sauce'].includes(item.kind) || (item.kind === 'plate' && item.contents.length === 5) ? .6 : .85);
      else sprite?.setVisible(false);
    }
    const held = this.inventory.carried;
    this.carriedItem.setVisible(Boolean(held));
    if (held) this.carriedItem.setTexture(textureOf(held)).setScale(['lettuce', 'tortilla', 'white-sauce'].includes(held.kind) || (held.kind === 'plate' && held.contents.length === 5) ? .5 : .72);
  }
}
