import Phaser from 'phaser';
import { WIDTH, HEIGHT, HEX, C } from '../constants';
import { drawSky, drawSkyline } from '../art';
import { txt } from '../ui/text';
import { bus, busState } from '../bus';
import { sfx } from '../sfx';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const touch = this.sys.game.device.input.touch;
    const base = HEIGHT - 70;

    drawSky(this.add.graphics(), 2, HEIGHT);
    drawSkyline(this.add.graphics(), 2, base, this.add.graphics());
    this.add.rectangle(0, base, WIDTH, HEIGHT - base, C.asphalt).setOrigin(0);
    const dash = this.add.graphics();
    dash.fillStyle(C.taxi, 1);
    for (let x = 0; x < WIDTH; x += 48) dash.fillRect(x, base + 33, 26, 4);

    const taxi = this.add.image(-60, base + 22, 'taxi').setScale(2);
    this.tweens.add({ targets: taxi, x: WIDTH + 60, duration: 6000, repeat: -1, delay: 400 });

    // twinkling stars
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, 160), 'spark').setScale(0.5);
      s.setAlpha(Math.random());
      this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(800, 2000), yoyo: true, repeat: -1 });
    }

    const title = txt(this, WIDTH / 2, 120, 'NYC LIFE', 88, HEX.taxi, { origin: 0.5, strokeThickness: 10 });
    title.setShadow(6, 6, '#000000', 0, true, true);
    this.tweens.add({ targets: title, y: 128, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, WIDTH / 2, 196, 'ONE DAY IN NEW YORK', 28, HEX.white, { origin: 0.5 });
    txt(
      this,
      WIDTH / 2,
      258,
      'You just moved here with $20.\nThree choices. One day. Your day is saved on Solana.',
      20,
      HEX.cream,
      { origin: 0.5, align: 'center', bold: false, strokeThickness: 3 }
    );

    const btn = this.add.rectangle(WIDTH / 2, 338, 260, 64, C.awning).setStrokeStyle(4, C.white);
    const btnLabel = txt(this, WIDTH / 2, 338, touch ? 'TAP TO START' : 'START  [ENTER]', 24, HEX.white, { origin: 0.5 });
    this.tweens.add({ targets: [btn, btnLabel], scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    txt(
      this,
      WIDTH / 2,
      396,
      touch
        ? 'Tap the street to walk · Tap a building to go inside'
        : 'WASD / Arrows to walk · E to enter · or click anywhere',
      18,
      HEX.white,
      { origin: 0.5, bold: false, strokeThickness: 3 }
    );

    this.record = txt(this, WIDTH / 2, 426, '', 18, HEX.taxi, { origin: 0.5, strokeThickness: 3 });
    const showStats = (s) => {
      this.record.setText(s ? `Your on-chain record · Best ${s.best} · ${s.days} day${s.days === 1 ? '' : 's'} lived` : '');
    };
    showStats(busState.chainStats);
    bus.on('chain-stats', showStats);
    this.events.once('shutdown', () => bus.off('chain-stats', showStats));

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      sfx.click();
      this.cameras.main.fadeOut(350, 27, 31, 59);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('City', { fresh: true }));
    };
    this.input.keyboard.on('keydown-ENTER', start);
    this.input.keyboard.on('keydown-SPACE', start);
    this.input.on('pointerdown', start);
    this.cameras.main.fadeIn(400, 27, 31, 59);
  }
}
