import Phaser from 'phaser';
import { HEX } from './constants';
import { txt } from './ui/text';

// A background person who does random things: strolls, jogs, stands around, feeds pigeons, says things.
// Talk to them with E / a tap. They only ever walk on sidewalks and in the park, never on the road.
export default class NPC {
  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.cat = def.kind === 'cat';
    this.key = this.cat ? 'cat' : `npc_${def.id}`;
    this.sprite = scene.add.image(def.x, def.y, `${this.key}0`).setOrigin(0.5, 1).setScale(2);
    this.shadow = scene.add.image(def.x, def.y, 'shadow').setScale(this.cat ? 1.1 : 2).setAlpha(0.7);
    this.speed = def.speed ?? 45;
    this.state = 'idle';
    this.timer = Phaser.Math.Between(400, 2500);
    this.target = null;
    this.frame = 0;
    this.walkT = 0;
    this.talking = false;
    this.bubble = null;
    this.bubbleTimer = 0;
    this.pigeons = [];
    this.greeted = false;
    this.mark = null;

    if (def.mode === 'feed') {
      for (let i = 0; i < 3; i++) {
        const p = scene.add.image(def.x - 30 + i * 30, def.y + 10 + (i % 2) * 6, 'pigeon').setScale(2);
        p.setDepth(p.y + 1);
        scene.tweens.add({ targets: p, y: p.y - 3, duration: 280 + i * 60, yoyo: true, repeat: -1, delay: i * 120 });
        this.pigeons.push(p);
      }
    }
    this.sync();
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  sync() {
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y).setDepth(this.sprite.y - 1);
    if (this.bubble) this.bubble.setPosition(this.sprite.x, this.sprite.y - (this.cat ? 34 : 60));
    if (this.mark) this.mark.setPosition(this.sprite.x, this.sprite.y - (this.cat ? 36 : 62) + Math.sin(this.scene.time.now / 220) * 3);
  }

  faceTowards(x) {
    this.sprite.setFlipX(x < this.sprite.x);
  }

  // Notice the player: turn, hop, say hello.
  greet(playerX, line) {
    this.greeted = true;
    this.faceTowards(playerX);
    this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y - 8, duration: 120, yoyo: true });
    this.say(line);
  }

  // Floating "!" while this person has news for the player.
  setNews(on) {
    if (on && !this.mark) {
      this.mark = txt(this.scene, this.sprite.x, 0, '!', 26, HEX.taxi, { origin: [0.5, 1], strokeThickness: 6 }).setDepth(1004);
    } else if (!on && this.mark) {
      this.mark.destroy();
      this.mark = null;
    }
  }

  say(text) {
    if (this.bubble) this.bubble.destroy();
    this.bubble = txt(this.scene, this.sprite.x, this.sprite.y - 60, text, 14, HEX.white, { origin: [0.5, 1], strokeThickness: 4 }).setDepth(1005);
    this.bubbleTimer = 2400;
    this.scene.onNpcSay?.(this, text);
  }

  randomTarget() {
    const [x1, y1, x2, y2] = this.def.zone;
    return { x: Phaser.Math.Between(x1, x2), y: Phaser.Math.Between(y1, y2) };
  }

  decide() {
    const { mode, quips } = this.def;
    const roll = Math.random();
    if (mode === 'stroll' || mode === 'jog') {
      if (roll < 0.6) {
        this.target = this.randomTarget();
        this.state = 'walk';
        return;
      }
      if (roll < 0.8 && quips?.length) this.say(Phaser.Utils.Array.GetRandom(quips));
    } else if (mode === 'feed') {
      if (roll < 0.5) this.crumbs();
      else if (quips?.length) this.say(Phaser.Utils.Array.GetRandom(quips));
    } else {
      // stand
      if (roll < 0.45 && quips?.length) this.say(Phaser.Utils.Array.GetRandom(quips));
      else if (roll < 0.75) this.sprite.setFlipX(!this.sprite.flipX);
      else this.scene.tweens.add({ targets: this.sprite, scaleY: 2.15, duration: 160, yoyo: true });
    }
    this.state = 'idle';
    this.timer = Phaser.Math.Between(1500, 4000);
  }

  crumbs() {
    const s = this.scene;
    for (let i = 0; i < 4; i++) {
      const c = s.add.image(this.sprite.x + 8, this.sprite.y - 24, 'spark').setTint(0xf1e3c6).setScale(0.8).setDepth(this.sprite.y + 2);
      s.tweens.add({
        targets: c, x: c.x + Phaser.Math.Between(10, 40), y: this.sprite.y + 6, duration: 420, delay: i * 90, ease: 'Quad.in',
        onComplete: () => s.tweens.add({ targets: c, alpha: 0, duration: 600, onComplete: () => c.destroy() }),
      });
    }
  }

  setFrame(moving, delta) {
    if (moving) {
      this.walkT += delta;
      if (this.walkT > (this.def.mode === 'jog' ? 90 : 160)) {
        this.walkT = 0;
        this.frame = 1 - this.frame;
        this.sprite.setTexture(`${this.key}${this.frame}`);
      }
    } else if (this.frame !== 0) {
      this.frame = 0;
      this.sprite.setTexture(`${this.key}0`);
    }
  }

  update(delta) {
    if (this.bubble) {
      this.bubbleTimer -= delta;
      if (this.bubbleTimer <= 0) {
        this.bubble.destroy();
        this.bubble = null;
      } else if (this.bubbleTimer < 400) this.bubble.setAlpha(this.bubbleTimer / 400);
    }

    if (this.talking) {
      this.setFrame(false, delta);
      this.sync();
      return;
    }

    if (this.state === 'walk' && this.target) {
      const dx = this.target.x - this.sprite.x;
      const dy = this.target.y - this.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) {
        this.state = 'idle';
        this.target = null;
        this.timer = Phaser.Math.Between(1500, 4500);
      } else {
        const step = Math.min(d, (this.speed * delta) / 1000);
        this.sprite.x += (dx / d) * step;
        this.sprite.y += (dy / d) * step;
        if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
      }
      this.setFrame(true, delta);
    } else {
      this.setFrame(false, delta);
      this.timer -= delta;
      if (this.timer <= 0) this.decide();
    }
    this.sync();
  }
}
