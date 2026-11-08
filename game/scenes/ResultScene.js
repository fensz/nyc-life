import Phaser from 'phaser';
import { WIDTH, HEIGHT, HEX, C, TIMES } from '../constants';
import { ACTIONS, BALANCED_BONUS } from '../rules';
import { drawSky, drawSkyline } from '../art';
import { txt } from '../ui/text';
import { bus, busState } from '../bus';
import { sfx } from '../sfx';

function fmt(n, unit = '') {
  if (!n) return null;
  return `${n > 0 ? '+' : '-'}${unit}${Math.abs(n)}`;
}

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { actions, steps, state, bonus, score, story } = this.result;

    drawSky(this.add.graphics(), 2, HEIGHT);
    const lights = this.add.graphics().setAlpha(0.8);
    drawSkyline(this.add.graphics(), 2, HEIGHT, lights);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, C.navy, 0.55).setOrigin(0);

    txt(this, WIDTH / 2, 44, 'DAY COMPLETE', 44, HEX.taxi, { origin: 0.5, strokeThickness: 8 });

    // --- left: the day, step by step ---
    const panel = (x, y, w, h) => {
      const g = this.add.graphics();
      g.fillStyle(C.navy, 0.9);
      g.fillRoundedRect(x, y, w, h, 14);
      g.lineStyle(2, C.white, 0.25);
      g.strokeRoundedRect(x, y, w, h, 14);
    };
    panel(30, 88, 450, 320);
    panel(500, 88, 430, 320);

    steps.forEach((s, i) => {
      const y = 104 + i * 100;
      const a = ACTIONS[s.id];
      txt(this, 50, y, TIMES[i].toUpperCase(), 16, HEX.cream, { strokeThickness: 3 });
      txt(this, 50, y + 22, a.name, 26, HEX.white);
      const parts = [
        [fmt(s.delta.money, '$'), HEX.taxi],
        [s.delta.energy ? `${fmt(s.delta.energy)} energy` : null, HEX.energy],
        [s.delta.happiness ? `${fmt(s.delta.happiness)} happy` : null, HEX.happy],
      ].filter(([t]) => t);
      let x = 50;
      parts.forEach(([t, color]) => {
        const tt = txt(this, x, y + 58, t, 18, color, { strokeThickness: 3 });
        x += tt.width + 16;
      });
      if (s.note) txt(this, x, y + 58, `(${s.note})`, 16, HEX.white, { bold: false, strokeThickness: 3 });
    });

    // --- right: score breakdown ---
    const rows = [
      ['Money', `$${state.money}`, HEX.taxi],
      ['Energy', `${state.energy}`, HEX.energy],
      ['Happiness x2', `${state.happiness * 2}`, HEX.happy],
      [
        bonus ? 'Balanced day' : 'Balanced day (visit all 3)',
        bonus ? `+${BALANCED_BONUS}` : '+0',
        bonus ? HEX.white : '#9aa0b8',
      ],
    ];
    rows.forEach(([label, val, color], i) => {
      const y = 108 + i * 40;
      txt(this, 522, y, label, 20, HEX.white, { strokeThickness: 3 });
      txt(this, 908, y, val, 22, color, { origin: [1, 0] });
    });
    this.add.rectangle(522, 272, 386, 2, C.white, 0.4).setOrigin(0);
    txt(this, 522, 300, 'SCORE', 28, HEX.white);
    const scoreText = txt(this, 908, 290, '0', 56, HEX.taxi, { origin: [1, 0], strokeThickness: 8 });
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: score, duration: 1200, ease: 'Cubic.out', delay: 300,
      onUpdate: () => scoreText.setText(String(Math.round(counter.v))),
      onComplete: () => {
        sfx.fanfare();
        this.tweens.add({ targets: scoreText, scale: 1.15, duration: 140, yoyo: true });
      },
    });
    txt(this, 522, 364, busState.chainMode === 'program' ? 'Score is re-computed on-chain' : 'Recording needs free Devnet SOL (faucet.solana.com)', 16, HEX.cream, { bold: false, strokeThickness: 3 });
    if (story) {
      txt(this, 522, 386, `Story: ${story.points} pts, ${story.done}/${story.total} steps (not on-chain)`, 16, HEX.energy, { bold: false, strokeThickness: 3 });
    }

    // --- buttons ---
    const button = (x, label, color, onClick) => {
      const bg = this.add.rectangle(x, 450, 300, 64, color).setStrokeStyle(3, C.white).setInteractive({ useHandCursor: true });
      const t = txt(this, x, 450, label, 22, HEX.white, { origin: 0.5 });
      bg.on('pointerover', () => bg.setScale(1.04));
      bg.on('pointerout', () => bg.setScale(1));
      bg.on('pointerdown', onClick);
      return { bg, t };
    };

    const playAgain = () => {
      sfx.click();
      bus.emit('day-reset');
      this.cameras.main.fadeOut(350, 27, 31, 59);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('City', { newDay: true }));
    };

    if (busState.chainEnabled) {
      button(WIDTH / 2 - 165, 'PLAY AGAIN  [R]', C.navyLight, playAgain);
      this.recordBtn = button(WIDTH / 2 + 165, 'RECORD ON SOLANA', 0x7b3fe4, () => {
        if (this.explorerUrl) {
          window.open(this.explorerUrl, '_blank', 'noopener');
          return;
        }
        if (this.recording) return;
        sfx.click();
        bus.emit('record-request');
      });
    } else {
      button(WIDTH / 2, 'PLAY AGAIN  [R]', C.navyLight, playAgain);
    }

    this.status = txt(this, WIDTH / 2, 508, busState.chainEnabled ? 'Fund your wallet with free Devnet SOL first: faucet.solana.com' : '', 18, HEX.cream, {
      origin: 0.5, strokeThickness: 3, align: 'center',
    });

    const onStatus = (s) => this.showStatus(s);
    bus.on('chain-status', onStatus);
    this.events.once('shutdown', () => bus.off('chain-status', onStatus));

    this.input.keyboard.on('keydown-R', playAgain);

    // Let the React side know a day is ready to record.
    bus.emit('day-complete', { actions, score, state });
    this.cameras.main.fadeIn(400, 27, 31, 59);
  }

  showStatus(s) {
    if (!s || !this.status) return;
    const colors = { verified: HEX.energy, error: '#ff8080' };
    this.status.setText(s.message || '').setColor(colors[s.state] || HEX.cream);
    this.recording = s.state === 'signing' || s.state === 'confirming';
    if (this.recordBtn) {
      if (s.state === 'verified') {
        this.explorerUrl = s.explorerUrl;
        this.recordBtn.t.setText('VIEW ON EXPLORER');
        this.recordBtn.bg.setFillStyle(0x1f9d63);
        sfx.chain();
      } else if (this.recording) {
        this.recordBtn.t.setText('RECORDING…');
      } else {
        this.recordBtn.t.setText('RECORD ON SOLANA');
      }
    }
  }
}
