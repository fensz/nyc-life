import Phaser from 'phaser';
import {
  WIDTH, HEIGHT, C, HEX, FACADE_Y, WALK_TOP, STREET_Y, STREET_H, DOOR_ZONE, TIMES,
} from '../constants';
import { drawSky, drawSkyline, drawBuildings, drawStreet } from '../art';
import { ACTIONS_PER_DAY, applyAction, simulateDay } from '../rules';
import { DISTRICTS } from '../districts';
import { session, resetAll, newDay } from '../story/session';
import { directives, storyProgress, npcHasNews, GREETINGS, NPC_TALK, PLACE_TALK } from '../story/quests';
import { generateNPCTextures } from '../textures';
import NPC from '../npc';
import HUD from '../ui/HUD';
import ActionMenu from '../ui/ActionMenu';
import DialogueBox from '../ui/DialogueBox';
import QuestTracker from '../ui/QuestTracker';
import { txt } from '../ui/text';
import { sfx, tone, setMuted, isMuted } from '../sfx';
import { speak, speakNode, speakAmbient, stopVoice, preloadVoices } from '../voice';
import { DEATH_LINE } from '../story/lines';

const SPEED = 190;
const EDGE = 22; // walking past this many px from a screen edge travels to the next district
const TINTS = [
  { color: 0x000000, alpha: 0 },
  { color: 0xff8a3d, alpha: 0.12 },
  { color: 0x1a1048, alpha: 0.38 },
];

export default class CityScene extends Phaser.Scene {
  constructor() {
    super('City');
  }

  // data: { fresh } new run | { newDay } next day, story kept | { district, entry } travelling
  init(data) {
    data = data || {};
    if (data.fresh) resetAll();
    else if (data.newDay) newDay();
    this.districtId = data.district || 'home';
    this.entry = data.entry || null; // side of the screen you arrive on
  }

  create() {
    const d = (this.district = DISTRICTS[this.districtId]);
    this.touch = this.sys.game.device.input.touch;
    this.dayState = session.dayState;
    this.actions = session.actions;
    this.busy = false;
    this.dead = false;
    this.target = null;
    this.pendingEnter = null;
    this.pendingTalk = null;

    // --- world ---
    this.sky = this.add.graphics().setDepth(0);
    this.skyline = this.add.graphics().setDepth(0);
    this.skylineLights = this.add.graphics().setDepth(0).setAlpha(0);
    const buildings = this.add.graphics().setDepth(1);
    drawStreet(this.add.graphics().setDepth(1), { alleys: d.alleys, crosswalkX: d.crosswalkX });
    this.windowLights = this.add.graphics().setDepth(902).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    drawBuildings(this, buildings, this.windowLights, [...d.decor, ...d.buildings]);

    this.tint = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0).setOrigin(0).setDepth(900);

    // door glows
    this.doorGlows = d.buildings.map((b) => {
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
    d.trees.forEach((x, i) => {
      const t = this.add.image(x, HEIGHT - 6, 'tree').setOrigin(0.5, 1).setScale(2);
      t.setDepth(t.y);
      solid(x, HEIGHT - 12, 16, 12);
      if (i % 2 === 0) this.tweens.add({ targets: t, angle: 1.5, duration: 1800 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    d.benches.forEach((x) => {
      const b = this.add.image(x, HEIGHT - 20, 'bench').setOrigin(0.5, 1).setScale(1.5);
      b.setDepth(b.y);
    });
    d.lamps.forEach((x) => {
      const l = this.add.image(x, STREET_Y - 4, 'lamp').setOrigin(0.5, 1).setScale(1.4);
      l.setDepth(l.y);
      solid(x, STREET_Y - 8, 10, 8);
    });
    if (d.cart) {
      const cart = this.add.image(d.cart, STREET_Y - 4, 'cart').setOrigin(0.5, 1).setScale(1.5);
      cart.setDepth(cart.y);
      solid(d.cart, STREET_Y - 14, 60, 18);
    }

    // pigeons that scatter
    this.pigeons = d.pigeons.map((x) => {
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
    this.vehicles = [taxi, car];
    if (d.extraTaxi) {
      const t2 = this.add.image(WIDTH + 60, lane2, 'taxi').setScale(2).setFlipX(true).setDepth(lane2 + 10);
      this.tweens.add({ targets: t2, x: -60, duration: 5600, repeat: -1, delay: 4800, repeatDelay: 3200 });
      this.vehicles.push(t2);
    }

    // --- people ---
    generateNPCTextures(this, d.npcs);
    this.npcs = d.npcs.map((def) => new NPC(this, def));

    // --- player ---
    const start = this.startPosition();
    this.shadow = this.add.image(start.x, start.y, 'shadow').setScale(2).setAlpha(0.8);
    this.player = this.physics.add.sprite(start.x, start.y, 'player0').setOrigin(0.5, 1).setScale(2);
    this.player.body.setSize(10, 5).setOffset(3, 19);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(8, WALK_TOP, WIDTH - 16, HEIGHT - WALK_TOP - 4);
    this.physics.add.collider(this.player, this.obstacles);
    this.walkTimer = 0;
    this.frame = 0;

    // --- travel signs at the screen edges ---
    this.exitSigns(d);

    // --- UI ---
    this.hud = new HUD(this);
    this.hud.set(this.dayState, this.actions.length, false);
    this.tracker = new QuestTracker(this);
    this.refreshTracker();
    this.menu = new ActionMenu(this, (id) => this.doAction(id), () => {});
    this.storyApi = {
      toast: (msg) => this.toast(msg),
      changed: () => this.refreshTracker(),
      speak: (node) => speakNode(node),
      stopVoice,
    };
    this.dialogue = new DialogueBox(this, () => session.story, this.storyApi);

    this.prompt = txt(this, 0, 0, '', 18, HEX.white, { origin: [0.5, 1], strokeThickness: 4 }).setDepth(1001).setVisible(false);
    this.hint = txt(
      this,
      WIDTH - 16,
      HEIGHT - 12,
      this.touch
        ? 'Tap buildings & people · walk to a screen edge to travel'
        : 'E enter / talk · walk off the edge to travel · M mute',
      16,
      HEX.white,
      { origin: [1, 1], strokeThickness: 4 }
    ).setDepth(1001);

    // --- input ---
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    // Event-based (not JustDown) so very quick taps are never missed.
    const interact = () => {
      if (this.busy || this.menu.isOpen || this.dialogue.isOpen) return;
      if (this.time.now - this.dialogue.closedAt < 250) return;
      const npc = this.nearestNpc(this.player.x, this.player.y, 52);
      if (npc) return this.talk(npc);
      const door = this.doorZoneAt(this.player.x, this.player.y);
      if (door) this.openDoor(door);
    };
    kb.on('keydown-E', interact);
    kb.on('keydown-SPACE', interact);
    this.input.on('pointerdown', (pointer, over) => this.onTap(pointer, over));
    kb.on('keydown-M', () => {
      setMuted(!isMuted());
      stopVoice();
      this.toast(isMuted() ? 'Sound off' : 'Sound on');
    });
    this.newsTimer = 0;
    preloadVoices();

    this.setTimeOfDay(Math.min(this.actions.length, TIMES.length - 1), false);
    this.cameras.main.fadeIn(400, 27, 31, 59);
    this.banner(d.name, HEX.white, 36);
    this.events.once('shutdown', () => {
      stopVoice();
      this.menu.destroy();
      this.dialogue.destroy();
    });
  }

  startPosition() {
    const d = this.district;
    const y = Phaser.Math.Clamp(session.lastY ?? FACADE_Y + 46, WALK_TOP + 6, HEIGHT - 8);
    if (this.entry === 'left') return { x: 46, y };
    if (this.entry === 'right') return { x: WIDTH - 46, y };
    const b = d.buildings[0];
    return { x: b.doorX, y: FACADE_Y + 46 };
  }

  exitSigns(d) {
    const sign = (side, name) => {
      const left = side === 'left';
      const x = left ? 0 : WIDTH - 10;
      const glow = this.add.rectangle(x, FACADE_Y, 10, HEIGHT - FACADE_Y, C.taxi, 0.3).setOrigin(0).setDepth(3);
      this.tweens.add({ targets: glow, alpha: 0.08, duration: 800, yoyo: true, repeat: -1 });
      const label = txt(this, left ? 16 : WIDTH - 16, STREET_Y - 30, left ? `< ${name}` : `${name} >`, 16, HEX.taxi, {
        origin: [left ? 0 : 1, 0.5], strokeThickness: 5,
      }).setDepth(4);
      this.tweens.add({ targets: label, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });
    };
    if (d.exits.left) sign('left', DISTRICTS[d.exits.left].name);
    if (d.exits.right) sign('right', DISTRICTS[d.exits.right].name);
  }

  changeDistrict(id, entry) {
    if (this.busy) return;
    this.busy = true;
    this.target = null;
    this.pendingEnter = null;
    this.pendingTalk = null;
    this.player.setVelocity(0, 0);
    session.lastY = this.player.y;
    sfx.click();
    this.cameras.main.fadeOut(260, 27, 31, 59);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('City', { district: id, entry });
    });
  }

  refreshTracker() {
    this.tracker.set(directives(session.story), storyProgress(session.story));
  }

  // ---------- time of day ----------
  setTimeOfDay(i, animate = true) {
    i = Phaser.Math.Clamp(i, 0, TIMES.length - 1);
    drawSky(this.sky, i);
    drawSkyline(this.skyline, i, FACADE_Y, this.skylineLights, this.district.skySeed);
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

  banner(text, color = HEX.taxi, size = 48) {
    const b = txt(this, WIDTH / 2, HEIGHT / 2 - 40, text.toUpperCase(), size, color, { origin: 0.5, strokeThickness: 8 })
      .setDepth(1050)
      .setAlpha(0);
    this.tweens.add({
      targets: b, alpha: 1, y: b.y - 10, duration: 300, hold: 700, yoyo: true,
      onComplete: () => b.destroy(),
    });
  }

  toast(msg) {
    const t = txt(this, this.player.x, this.player.y - 90, msg, 20, HEX.energy, { origin: 0.5, strokeThickness: 5 })
      .setDepth(1070)
      .setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, y: t.y - 36, duration: 400, hold: 1400, yoyo: true,
      onComplete: () => t.destroy(),
    });
    sfx.chain();
  }

  // ---------- helpers ----------
  buildingAt(x, y) {
    // the facade itself, or the door zone in front of it
    return this.district.buildings.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y - 20 && y <= FACADE_Y)
      || this.doorZoneAt(x, y);
  }

  doorZoneAt(x, y) {
    return this.district.buildings.find(
      (b) => Math.abs(x - b.doorX) <= DOOR_ZONE.halfW && y >= DOOR_ZONE.top && y <= DOOR_ZONE.bottom
    );
  }

  nearestNpc(x, y, max) {
    let best = null;
    let bd = max;
    for (const n of this.npcs) {
      const dd = Math.hypot(n.x - x, (n.y - y) * 1.4);
      if (dd < bd) {
        bd = dd;
        best = n;
      }
    }
    return best;
  }

  npcAt(x, y) {
    return this.npcs.find((n) => Math.abs(n.x - x) < 24 && y > n.y - (n.cat ? 26 : 56) && y < n.y + 10);
  }

  // ---------- input ----------
  onTap(pointer, over) {
    if (this.busy || this.menu.isOpen || this.dialogue.isOpen) return;
    if (over && over.length) return; // tapped a UI object
    if (this.time.now - this.menu.closedAt < 200 || this.time.now - this.dialogue.closedAt < 200) return;
    const { worldX: x, worldY: y } = pointer;
    const npc = this.npcAt(x, y);
    const b = !npc && this.buildingAt(x, y);
    if (npc) {
      this.target = { x: npc.x + (this.player.x < npc.x ? -30 : 30), y: npc.y };
      this.pendingTalk = npc;
      this.pendingEnter = null;
    } else if (b) {
      this.target = { x: b.doorX, y: FACADE_Y + 40 };
      this.pendingEnter = b;
      this.pendingTalk = null;
    } else {
      this.target = {
        x: Phaser.Math.Clamp(x, 16, WIDTH - 16),
        y: Phaser.Math.Clamp(y, WALK_TOP + 6, HEIGHT - 8),
      };
      this.pendingEnter = null;
      this.pendingTalk = null;
    }
    this.lastProgress = { x: this.player.x, y: this.player.y, t: this.time.now };
    this.marker(this.target.x, this.target.y);
  }

  marker(x, y) {
    const m = this.add.circle(x, y, 10).setStrokeStyle(3, C.taxi).setDepth(3);
    this.tweens.add({ targets: m, scale: 0.2, alpha: 0, duration: 450, onComplete: () => m.destroy() });
  }

  // ---------- loop ----------
  // A person's random line: always a speech bubble, and spoken aloud when the player is close enough to hear it.
  onNpcSay(npc, text) {
    if (npc.cat || !this.player || this.dialogue?.isOpen || this.busy) return;
    const dist = Math.hypot(npc.x - this.player.x, npc.y - this.player.y);
    speakAmbient(npc.def.id, text, dist);
  }

  update(time, delta) {
    for (const n of this.npcs) n.update(delta);
    this.newsTimer -= delta;
    if (this.newsTimer <= 0) {
      this.newsTimer = 400;
      for (const n of this.npcs) n.setNews(npcHasNews(n.def.id, session.story));
    }

    const p = this.player;
    if (this.busy || this.menu.isOpen || this.dialogue.isOpen) {
      p.setVelocity(0, 0);
      this.syncPlayer(false, delta);
      return;
    }

    // getting hit by a car is fatal
    const hit = this.vehicles.find(
      (v) => Math.abs(v.x - p.x) < 36 + 8 && p.y > v.y - 10 && p.y - 6 < v.y + 10
    );
    if (hit) {
      this.die();
      return;
    }

    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);

    if (vx || vy) {
      this.target = null;
      this.pendingEnter = null;
      this.pendingTalk = null;
    } else if (this.target) {
      const dx = this.target.x - p.x;
      const dy = this.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (this.pendingTalk) {
        // the person may have wandered: chase them
        this.target = { x: this.pendingTalk.x + (p.x < this.pendingTalk.x ? -30 : 30), y: this.pendingTalk.y };
      }
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

    if (this.menu.isOpen || this.dialogue.isOpen) return; // arrive() may have just opened a menu

    const len = Math.hypot(vx, vy) || 1;
    p.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    if (vx) p.setFlipX(vx < 0);
    this.syncPlayer(vx !== 0 || vy !== 0, delta);

    // walking off the edge of the screen travels to the next district
    const ex = this.district.exits;
    if (ex.left && p.x <= EDGE) return this.changeDistrict(ex.left, 'right');
    if (ex.right && p.x >= WIDTH - EDGE) return this.changeDistrict(ex.right, 'left');

    // people notice you when you walk up to them
    for (const n of this.npcs) {
      if (!n.greeted && !n.cat && !n.talking && Math.hypot(n.x - p.x, (n.y - p.y) * 1.4) < 80) {
        n.greet(p.x, Phaser.Utils.Array.GetRandom(GREETINGS));
        break;
      }
    }

    // prompt: people first, then doors
    const npc = this.nearestNpc(p.x, p.y, 52);
    const door = this.doorZoneAt(p.x, p.y);
    if (npc) {
      const label = this.touch ? `Tap ${npc.def.name} to talk` : `[E] Talk to ${npc.def.name}`;
      this.prompt.setText(label).setPosition(npc.x, npc.y - (npc.cat ? 40 : 66)).setVisible(true);
    } else if (door) {
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

  die() {
    if (this.dead) return;
    this.dead = true;
    this.busy = true;
    this.target = null;
    this.pendingEnter = null;
    this.pendingTalk = null;
    this.prompt.setVisible(false);
    this.player.setVelocity(0, 0);
    sfx.bad();
    tone(120, 0.3, 'sawtooth', 0.08);
    this.cameras.main.shake(300, 0.02);
    this.cameras.main.flash(200, 255, 40, 40);
    this.tweens.add({ targets: this.player, angle: 90, alpha: 0.5, duration: 400, ease: 'Quad.out' });

    const veil = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1a0000, 0).setOrigin(0).setDepth(1100);
    this.tweens.add({ targets: veil, fillAlpha: 0.7, duration: 600, delay: 400 });
    const title = txt(this, WIDTH / 2, HEIGHT / 2 - 30, 'YOU WERE HIT BY A CAR', 40, '#ff5a5a', { origin: 0.5, strokeThickness: 8 })
      .setDepth(1101).setAlpha(0);
    const sub = txt(this, WIDTH / 2, HEIGHT / 2 + 20, 'Always look both ways in New York.', 20, HEX.white, { origin: 0.5, strokeThickness: 5 })
      .setDepth(1101).setAlpha(0);
    const again = txt(this, WIDTH / 2, HEIGHT / 2 + 70, this.touch ? 'Tap to try again' : 'Press R or click to try again', 20, HEX.taxi, { origin: 0.5, strokeThickness: 5 })
      .setDepth(1101).setAlpha(0);
    this.tweens.add({ targets: [title, sub, again], alpha: 1, duration: 400, delay: 700 });
    this.time.delayedCall(700, () => speak('narrator', DEATH_LINE, 1));

    this.time.delayedCall(1200, () => {
      const restart = () => this.scene.restart({ fresh: true });
      this.input.keyboard.once('keydown-R', restart);
      this.input.once('pointerdown', restart);
    });
  }

  arrive() {
    this.target = null;
    this.player.setVelocity(0, 0);
    if (this.pendingTalk) {
      const npc = this.pendingTalk;
      this.pendingTalk = null;
      if (Math.hypot(npc.x - this.player.x, npc.y - this.player.y) < 90) this.talk(npc);
      return;
    }
    if (this.pendingEnter !== null) {
      const b = this.pendingEnter;
      this.pendingEnter = null;
      this.openDoor(b);
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

  // ---------- doors, people, day loop ----------
  openDoor(b) {
    if (this.busy) return;
    this.target = null;
    this.player.setVelocity(0, 0);
    this.prompt.setVisible(false);
    if (b.location !== undefined) {
      // scored building: the 3 daily actions
      const n = this.actions.length;
      this.menu.open(b.location, `${TIMES[n]} · choice ${n + 1} of ${ACTIONS_PER_DAY}`);
    } else {
      // landmark: story dialogue (free, not part of the score)
      this.dialogue.open(PLACE_TALK[b.place](session.story), () => this.refreshTracker());
    }
  }

  talk(npc) {
    if (this.busy) return;
    this.target = null;
    this.pendingTalk = null;
    this.player.setVelocity(0, 0);
    this.prompt.setVisible(false);
    npc.faceTowards(this.player.x);
    this.player.setFlipX(npc.x < this.player.x);
    npc.talking = true;
    this.dialogue.open(NPC_TALK[npc.def.talk](session.story), () => {
      npc.talking = false;
      this.refreshTracker();
    });
  }

  doAction(id) {
    const r = applyAction(this.dayState, id);
    this.dayState = r.state;
    session.dayState = r.state;
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
        this.scene.start('Result', {
          actions: [...this.actions],
          ...result,
          story: storyProgress(session.story),
        });
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
