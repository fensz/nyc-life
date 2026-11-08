import Phaser from 'phaser';
import {
  WIDTH, HEIGHT, C, HEX, FACADE_Y, WALK_TOP, STREET_Y, STREET_H, BUILDINGS, DOOR_ZONE, TIMES,
} from '../constants';
import { drawSky, drawSkyline, drawBuildings, drawStreet } from '../art';
import { START_STATE, ACTIONS, ACTIONS_PER_DAY, applyAction, simulateDay } from '../rules';
import HUD from '../ui/HUD';
import ActionMenu from '../ui/ActionMenu';
import { txt } from '../ui/text';
import { sfx } from '../sfx';

const SPEED = 190;
const TINTS = [
  { color: 0x000000, alpha: 0 },
  { color: 0xff8a3d, alpha: 0.12 },
  { color: 0x1a1048, alpha: 0.38 },
];

export default class CityScene extends Phaser.Scene {
  constructor() {
    super('City');
  }

  create() {
    this.touch = this.sys.game.device.input.touch;
    this.dayState = { ...START_STATE };
    this.actions = [];
    this.busy = false;
    this.target = null;
    this.pendingEnter = null;

    // --- world ---
    this.sky = this.add.graphics().setDepth(0);
    this.skyline = this.add.graphics().setDepth(0);
    this.skylineLights = this.add.graphics().setDepth(0).setAlpha(0);
    const buildings = this.add.graphics().setDepth(1);
    drawStreet(this.add.graphics().setDepth(1));
    this.windowLights = this.add.graphics().setDepth(902).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    drawBuildings(this, buildings, this.windowLights);

    this.tint = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0).setOrigin(0).setDepth(900);

    // door glows
    this.doorGlows = BUILDINGS.map((b) => {
      const glow = this.add
        .rectangle(b.doorX, FACADE_Y + 4, DOOR_ZONE.halfW * 2, 10, C.taxi, 0.5)
        .setDepth(2);
      this.tweens.add({ targets: glow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return glow;
    });

    // --- props (some are solid) ---
    this.obstacles = this.physics.add.staticGroup();
    const solid = (x, y, w, h) => {
      const z = this.add.zone(x, y, w, h);
      this.physics.add.existing(z, true);
      this.obstacles.add(z);
    };
    [70, 250, 470, 700, 880].forEach((x, i) => {
      const t = this.add.image(x, HEIGHT - 6, 'tree').setOrigin(0.5, 1).setScale(2);
      t.setDepth(t.y);
      solid(x, HEIGHT - 12, 16, 12);
      if (i % 2 === 0) this.tweens.add({ targets: t, angle: 1.5, duration: 1800 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    [160, 590].forEach((x) => {
      const b = this.add.image(x, HEIGHT - 20, 'bench').setOrigin(0.5, 1).setScale(1.5);
      b.setDepth(b.y);
    });
    [340, 650].forEach((x) => {
      const l = this.add.image(x, STREET_Y - 4, 'lamp').setOrigin(0.5, 1).setScale(1.4);
      l.setDepth(l.y);
      solid(x, STREET_Y - 8, 10, 8);
    });
    const cart = this.add.image(912, STREET_Y - 4, 'cart').setOrigin(0.5, 1).setScale(1.5);
    cart.setDepth(cart.y);
    solid(912, STREET_Y - 14, 60, 18);

    // pigeons that scatter
    this.pigeons = [120, 420, 560].map((x) => {
      const p = this.add.image(x, STREET_Y + STREET_H + 14, 'pigeon').setScale(2);
      p.setDepth(p.y);
      this.tweens.add({ targets: p, y: p.y - 2, duration: 300, yoyo: true, repeat: -1, delay: Math.random() * 300 });
      return p;
    });

    // traffic
    const lane1 = STREET_Y + 26;
    const lane2 = STREET_Y + STREET_H - 18;
    const taxi = this.add.image(-60, lane1, 'taxi').setScale(2).setDepth(lane1 + 10);
    this.tweens.add({ targets: taxi, x: WIDTH + 60, duration: 5200, repeat: -1, delay: 600, repeatDelay: 1800 });
    const car = this.add.image(WIDTH + 60, lane2, 'car').setScale(2).setFlipX(true).setDepth(lane2 + 10);
    this.tweens.add({ targets: car, x: -60, duration: 6400, repeat: -1, delay: 2500, repeatDelay: 2600 });

    // --- player ---
    const start = BUILDINGS[0];
    this.shadow = this.add.image(start.doorX, FACADE_Y + 46, 'shadow').setScale(2).setAlpha(0.8);
    this.player = this.physics.add.sprite(start.doorX, FACADE_Y + 46, 'player0').setOrigin(0.5, 1).setScale(2);
    this.player.body.setSize(10, 5).setOffset(3, 19);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(8, WALK_TOP, WIDTH - 16, HEIGHT - WALK_TOP - 4);
    this.physics.add.collider(this.player, this.obstacles);
    this.walkTimer = 0;
    this.frame = 0;

    // --- UI ---
    this.hud = new HUD(this);
    this.hud.set(this.dayState, 0, false);
    this.menu = new ActionMenu(this, (id) => this.doAction(id), () => {});

    this.prompt = txt(this, 0, 0, '', 18, HEX.white, { origin: [0.5, 1], strokeThickness: 4 }).setDepth(1001).setVisible(false);
    this.hint = txt(
      this,
      WIDTH - 16,
      HEIGHT - 12,
      this.touch ? 'Tap a building to go inside' : 'Walk to a glowing door · E to enter · or click a building',
      16,
      HEX.white,
      { origin: [1, 1], strokeThickness: 4 }
    ).setDepth(1001);

    // --- input ---
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    // Event-based (not JustDown) so very quick taps are never missed.
    const enter = () => {
      if (this.busy || this.menu.isOpen) return;
      const door = this.doorZoneAt(this.player.x, this.player.y);
      if (door) this.openMenu(door.location);
    };
    kb.on('keydown-E', enter);
    kb.on('keydown-SPACE', enter);
    this.input.on('pointerdown', (pointer, over) => this.onTap(pointer, over));

    this.setTimeOfDay(0, false);
    this.cameras.main.fadeIn(400, 27, 31, 59);
    this.events.once('shutdown', () => this.menu.destroy());
  }

  // ---------- time of day ----------
  setTimeOfDay(i, animate = true) {
    i = Phaser.Math.Clamp(i, 0, TIMES.length - 1);
    drawSky(this.sky, i);
    drawSkyline(this.skyline, i, FACADE_Y, this.skylineLights);
    const t = TINTS[i];
    this.tint.setFillStyle(t.color, 1);
    const lightsAlpha = i === 2 ? 0.9 : 0;
    if (animate) {
      this.tweens.add({ targets: this.tint, alpha: t.alpha, duration: 900 });
      this.tweens.add({ targets: [this.windowLights, this.skylineLights], alpha: lightsAlpha, duration: 900 });
      this.banner(TIMES[i]);
    } else {
      this.tint.setAlpha(t.alpha);
      this.windowLights.setAlpha(lightsAlpha);
      this.skylineLights.setAlpha(lightsAlpha);
    }
  }

  banner(text) {
    const b = txt(this, WIDTH / 2, HEIGHT / 2 - 40, text.toUpperCase(), 48, HEX.taxi, { origin: 0.5, strokeThickness: 8 })
      .setDepth(1050)
      .setAlpha(0);
    this.tweens.add({
      targets: b, alpha: 1, y: b.y - 10, duration: 300, hold: 700, yoyo: true,
      onComplete: () => b.destroy(),
    });
  }

  // ---------- input ----------
  buildingAt(x, y) {
    // the facade itself, or the door zone in front of it
    return BUILDINGS.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y - 20 && y <= FACADE_Y)
      || this.doorZoneAt(x, y);
  }

  doorZoneAt(x, y) {
    return BUILDINGS.find(
      (b) => Math.abs(x - b.doorX) <= DOOR_ZONE.halfW && y >= DOOR_ZONE.top && y <= DOOR_ZONE.bottom
    );
  }

  onTap(pointer, over) {
    if (this.busy || this.menu.isOpen) return;
    if (over && over.length) return; // tapped a UI object
    if (this.time.now - this.menu.closedAt < 200) return;
    const { worldX: x, worldY: y } = pointer;
    const b = this.buildingAt(x, y);
    if (b) {
      this.target = { x: b.doorX, y: FACADE_Y + 40 };
      this.pendingEnter = b.location;
    } else {
      this.target = {
        x: Phaser.Math.Clamp(x, 16, WIDTH - 16),
        y: Phaser.Math.Clamp(y, WALK_TOP + 6, HEIGHT - 8),
      };
      this.pendingEnter = null;
    }
    this.lastProgress = { x: this.player.x, y: this.player.y, t: this.time.now };
    this.marker(this.target.x, this.target.y);
  }

  marker(x, y) {
    const m = this.add.circle(x, y, 10).setStrokeStyle(3, C.taxi).setDepth(3);
    this.tweens.add({ targets: m, scale: 0.2, alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  // ---------- loop ----------
  update(time, delta) {
    const p = this.player;
    if (this.busy || this.menu.isOpen) {
      p.setVelocity(0, 0);
      this.syncPlayer(false, delta);
      return;
    }

    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);

    if (vx || vy) {
      this.target = null;
      this.pendingEnter = null;
    } else if (this.target) {
      const dx = this.target.x - p.x;
      const dy = this.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.arrive();
      } else {
        vx = dx / d;
        vy = dy / d;
        // stuck detection (blocked by a prop)
        if (Math.hypot(p.x - this.lastProgress.x, p.y - this.lastProgress.y) > 2) {
          this.lastProgress = { x: p.x, y: p.y, t: time };
        } else if (time - this.lastProgress.t > 450) {
          this.arrive();
        }
      }
    }

    if (this.menu.isOpen) return; // arrive() may have just opened the menu

    const len = Math.hypot(vx, vy) || 1;
    p.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    if (vx) p.setFlipX(vx < 0);
    this.syncPlayer(vx !== 0 || vy !== 0, delta);

    // doors
    const door = this.doorZoneAt(p.x, p.y);
    if (door) {
      const label = this.touch ? `Tap to enter ${door.name}` : `[E] Enter ${door.name}`;
      this.prompt.setText(label).setPosition(door.doorX, FACADE_Y - 6).setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }

    // pigeons scatter when the player gets close
    for (const pg of this.pigeons) {
      if (!pg.flying && Math.hypot(pg.x - p.x, pg.y - p.y) < 50) {
        pg.flying = true;
        this.tweens.killTweensOf(pg);
        this.tweens.add({
          targets: pg, x: pg.x + Phaser.Math.Between(-120, 120), y: -20, duration: 1400, ease: 'Quad.in',
          onComplete: () => pg.destroy(),
        });
      }
    }
  }

  arrive() {
    this.target = null;
    this.player.setVelocity(0, 0);
    if (this.pendingEnter !== null) {
      const loc = this.pendingEnter;
      this.pendingEnter = null;
      this.openMenu(loc);
    }
  }

  syncPlayer(moving, delta) {
    const p = this.player;
    p.setDepth(p.y);
    this.shadow.setPosition(p.x, p.y).setDepth(p.y - 1);
    if (moving) {
      this.walkTimer += delta;
      if (this.walkTimer > 130) {
        this.walkTimer = 0;
        this.frame = 1 - this.frame;
        p.setTexture(`player${this.frame}`);
      }
    } else if (this.frame !== 0) {
      this.frame = 0;
      p.setTexture('player0');
    }
  }

  // ---------- day loop ----------
  openMenu(location) {
    if (this.busy) return;
    this.target = null;
    this.player.setVelocity(0, 0);
    this.prompt.setVisible(false);
    const n = this.actions.length;
    this.menu.open(location, `${TIMES[n]} · choice ${n + 1} of ${ACTIONS_PER_DAY}`);
  }

  doAction(id) {
    const r = applyAction(this.dayState, id);
    this.dayState = r.state;
    this.actions.push(id);
    if (this.hint) {
      this.hint.destroy();
      this.hint = null;
    }

    this.hud.set(this.dayState, this.actions.length);
    this.floatDeltas(r.delta, r.note);
    r.note ? sfx.bad() : sfx.good();
    this.tweens.add({ targets: this.player, scaleY: 1.6, scaleX: 2.4, duration: 90, yoyo: true });

    if (this.actions.length < ACTIONS_PER_DAY) {
      const tod = this.actions.length; // capture now; a later action must not change it
      this.time.delayedCall(500, () => {
        if (!this.busy) this.setTimeOfDay(tod);
      });
      return;
    }

    // day over
    this.busy = true;
    const result = simulateDay(this.actions);
    this.time.delayedCall(1300, () => {
      this.cameras.main.fadeOut(600, 27, 31, 59);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Result', { actions: [...this.actions], ...result });
      });
    });
  }

  floatDeltas(delta, note) {
    const items = [];
    if (delta.money) items.push([`${delta.money > 0 ? '+' : '-'}$${Math.abs(delta.money)}`, HEX.taxi]);
    if (delta.energy) items.push([`${delta.energy > 0 ? '+' : ''}${delta.energy} energy`, HEX.energy]);
    if (delta.happiness) items.push([`${delta.happiness > 0 ? '+' : ''}${delta.happiness} happy`, HEX.happy]);
    if (note) items.push([note, HEX.white]);
    if (!items.length) items.push(['No change', HEX.white]);
    items.forEach(([s, color], i) => {
      const t = txt(this, this.player.x, this.player.y - 70 - i * 26, s, 22, color, { origin: 0.5, strokeThickness: 5 })
        .setDepth(1060)
        .setAlpha(0);
      this.tweens.add({
        targets: t, alpha: 1, y: t.y - 30, duration: 350, delay: i * 120, hold: 900, yoyo: true,
        onComplete: () => t.destroy(),
      });
    });
  }
}
