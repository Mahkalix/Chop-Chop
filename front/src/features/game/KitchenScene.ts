import Phaser from 'phaser';

import { stations, closestStation } from './stations';
import { createInventory, interact, describeItem, type Item, type Inventory } from './interactions';

import { advancePreparation, getPreparationProgress, type PreparationProgress } from './preparation';
import { advanceService, createService, deliver, penalizeBurns } from './service';
import { LEVEL_ONE_RULES } from '@chopchop/shared';

const textureOf = (item: Item) => item.kind === 'plate' && item.contents.length
  ? `dish-${item.contents[0]!.kind}`
  : 'item-' + (item.kind === 'tomato' ? (item.state === 'chopped' ? 'chopped' : 'whole') : item.kind === 'meat' && item.state !== 'raw' ? item.state : item.kind);

export type InteractionStatus = { carried: string | null; target: string | null; message: string; preparation: PreparationProgress | null };

const chefs = ['Miso', 'Pipa', 'Basile', 'Alba', 'Nori', 'Gaspard'];

export class KitchenScene extends Phaser.Scene {
  service = createService();
  private running = false;
  private lastServiceAt = 0;

  startService() {
    this.running = true;
    this.input.keyboard?.enableGlobalCapture();
    this.game.events.emit('service-update', this.service);
  }

  setPaused(paused: boolean) {
    this.running = !paused && !this.service.ended;
    this.player?.setVelocity(0);
    this.dashUntil = 0;
    this.input.keyboard?.resetKeys();
    if (this.running) this.input.keyboard?.enableGlobalCapture();
    else this.input.keyboard?.disableGlobalCapture();
  }
  private inventory: Inventory = createInventory();
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private targetId: string | null = null;
  private placedItems = new Map<string, Phaser.GameObjects.Image>();
  private feedback = '';
  private lastStatus = '';
  private lastProgressAt = 0;
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
    this.load.image('floor', '/kitchen/floor.png');
    for (const key of new Set(stations.map(station => station.texture))) {
      this.load.image(key, `/kitchen/${key}.png`);
    }
    for (const name of ['whole', 'chopped', 'meat', 'cooked', 'burnt', 'plate']) {
      this.load.svg('item-' + name, '/kitchen/items/' + name + '.svg');
    }
    this.load.svg('pan', '/kitchen/items/pan.svg');
    this.load.svg('knife', '/kitchen/items/knife.svg');
    const selected = sessionStorage.getItem('chef') ?? 'Miso';
    this.load.image('chef', `/menu/${chefs.includes(selected) ? selected : 'Miso'}.png`);
  }

  create() {
    for (const [kind, ingredient] of [['tomato', 'chopped'], ['meat', 'cooked']]) {
      const texture = this.add.renderTexture(0, 0, 128, 96).setVisible(false);
      texture.draw(this.add.image(0, 0, 'item-plate').setDisplaySize(112, 80).setVisible(false), 64, 48);
      texture.draw(this.add.image(0, 0, `item-${ingredient}`).setDisplaySize(60, 44).setVisible(false), 64, 42);
      texture.saveTexture(`dish-${kind}`);
    }
    this.inventory = createInventory();
    this.lastStatus = '';
    this.lastProgressAt = 0;
    this.dashUntil = 0;
    this.facing.set(0, 1);
    this.targetId = null;
    this.stationSprites.clear();
    this.add.image(0, 0, 'floor').setOrigin(0);
    const obstacles = this.physics.add.staticGroup();
    for (const { id, texture, label, x, y } of stations) {
      const sprite = obstacles.create(x + 72, y + 72, texture).setDisplaySize(144, 144).refreshBody();
      this.stationSprites.set(id, sprite);
      if (id === 'grill') this.add.image(x + 72, y + 68, 'pan').setOrigin(42 / 112, 46 / 80);
      if (label) {
        this.add.text(x + 72, y + 148, label, {
          fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#000000',
          backgroundColor: '#f7f1e6', fixedWidth: 144, align: 'center', padding: { y: 3 },
        }).setOrigin(0.5, 0);
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
      camera.setZoom(Math.min(this.scale.width / 1440, this.scale.height / 900));
      camera.centerOn(720, 450);
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
    this.publishStatus(null, 'Approche-toi d’un poste puis appuie sur E.');
    this.game.events.emit('kitchen-ready', this);
  }

  update(time: number, delta: number) {
    if (!this.running) { this.player.setVelocity(0); return; }
    const activeDelta = Math.min(delta, LEVEL_ONE_RULES.durationMs - this.service.elapsedMs);
    if (activeDelta >= LEVEL_ONE_RULES.durationMs - this.service.elapsedMs) {
      this.service = advanceService(this.service, activeDelta);
      this.running = false;
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
    const target = closestStation(feet.x, feet.y);
    if ((target?.id ?? null) !== this.targetId) {
      this.stationSprites.get(this.targetId ?? '')?.clearTint();
      this.targetId = target?.id ?? null;
      this.stationSprites.get(this.targetId ?? '')?.setTint(0xffe293);
      this.publishStatus(target, target ? 'E : prendre, poser ou utiliser ce poste.' : 'Approche-toi d’un poste pour interagir.');
    }
    this.updatePreparation(target, time, activeDelta);
    if (time - this.lastServiceAt >= 100) {
      this.lastServiceAt = time;
      this.game.events.emit('service-update', this.service);
    }
  }

  private updatePreparation(target: (typeof stations)[number] | null, time: number, delta: number) {
    const cuttingStation = this.cutKey.isDown ? target?.id ?? null : null;
    const result = advancePreparation(this.inventory, delta, cuttingStation);
    const burns = Object.entries(result.inventory.surfaces).filter(([id, item]) => item?.kind === 'meat'
      && item.state === 'burnt' && (this.inventory.surfaces[id]?.kind !== 'meat'
      || (this.inventory.surfaces[id] as Extract<Item, { kind: 'meat' }>).state !== 'burnt')).length;
    this.service = penalizeBurns(this.service, burns);
    this.inventory = result.inventory;
    this.choppingCloud.clear();
    this.restKnife();
    const tomato = target && this.inventory.surfaces[target.id];
    if (target?.id === 'chopping' && tomato?.kind === 'tomato' && tomato.state === 'raw'
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

  private drawProgress() {
    this.progressBars.clear();
    for (const station of stations) {
      const progress = getPreparationProgress(this.inventory.surfaces[station.id], station);
      if (!progress) continue;
      const x = station.x + 36, y = station.y + 100;
      this.progressBars.fillStyle(0x39312b).fillRoundedRect(x, y, 72, 10, 3)
        .fillStyle(0xffcf68).fillRect(x + 2, y + 2, 68 * progress.percent / 100, 6);
    }
  }

  private drawBurningFlames(time: number) {
    this.burningFlames.clear();
    for (const station of stations) {
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
    const target = closestStation(feet.x, feet.y);
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

  private publishStatus(target: (typeof stations)[number] | null, message = this.feedback) {
    this.feedback = message;
    const progress = target ? getPreparationProgress(this.inventory.surfaces[target.id], target) : null;
    const status = {
      carried: this.inventory.carried ? describeItem(this.inventory.carried) : null,
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
    for (const station of stations) {
      const item = this.inventory.surfaces[station.id];
      const sprite = this.placedItems.get(station.id);
      if (item && sprite) sprite.setTexture(textureOf(item)).setVisible(true);
      else if (item) this.placedItems.set(station.id, this.add.image(station.x + 72, station.y + 68, textureOf(item)).setScale(.85).setDepth(10));
      else sprite?.setVisible(false);
    }
    const held = this.inventory.carried;
    this.carriedItem.setVisible(Boolean(held));
    if (held) this.carriedItem.setTexture(textureOf(held));
  }
}
