import { C, HEX, TIMES } from '../constants';
import { ACTIONS_PER_DAY as ACTIONS_PER_DAY_HUD } from '../rules';
import { txt } from './text';

const BAR_W = 170;

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    const c = (this.container = scene.add.container(0, 0).setDepth(1000));

    const panel = scene.add.graphics();
    panel.fillStyle(C.navy, 0.86);
    panel.fillRoundedRect(12, 12, 360, 118, 12);
    panel.lineStyle(2, C.white, 0.25);
    panel.strokeRoundedRect(12, 12, 360, 118, 12);
    c.add(panel);

    this.money = txt(scene, 28, 20, '$20', 32, HEX.taxi);
    this.time = txt(scene, 356, 22, 'MORNING', 20, HEX.white, { origin: [1, 0] });
    c.add([this.money, this.time]);

    this.pips = [];
    for (let i = 0; i < ACTIONS_PER_DAY_HUD; i++) {
      const p = scene.add.circle(306 + i * 22, 56, 7, C.white, 0.2).setStrokeStyle(2, C.white, 0.7);
      this.pips.push(p);
      c.add(p);
    }

    this.bars = {};
    [
      ['energy', 'ENERGY', 72, C.energy],
      ['happiness', 'HAPPY', 102, C.happy],
    ].forEach(([key, label, y, color]) => {
      const l = txt(scene, 28, y - 10, label, 18, HEX.white, { strokeThickness: 3 });
      const bg = scene.add.rectangle(130, y, BAR_W, 16, 0x000000, 0.45).setOrigin(0, 0.5).setStrokeStyle(2, C.white, 0.5);
      const fill = scene.add.rectangle(132, y, BAR_W - 4, 12, color).setOrigin(0, 0.5);
      const val = txt(scene, 130 + BAR_W + 10, y - 10, '0', 18, HEX.white, { strokeThickness: 3 });
      c.add([l, bg, fill, val]);
      this.bars[key] = { fill, val };
    });
  }

  set(state, actionsDone, animate = true) {
    this.money.setText(`$${state.money}`);
    for (const key of ['energy', 'happiness']) {
      const { fill, val } = this.bars[key];
      const w = Math.max(0.001, ((BAR_W - 4) * state[key]) / 100);
      val.setText(String(state[key]));
      if (animate) {
        this.scene.tweens.add({ targets: fill, displayWidth: w, duration: 450, ease: 'Cubic.out' });
      } else {
        fill.displayWidth = w;
      }
    }
    this.pips.forEach((p, i) => p.setFillStyle(i < actionsDone ? C.taxi : C.white, i < actionsDone ? 1 : 0.2));
    this.time.setText((TIMES[Math.min(actionsDone, TIMES.length - 1)] || '').toUpperCase());
    if (animate) {
      this.scene.tweens.add({ targets: this.money, scale: 1.2, duration: 120, yoyo: true });
    }
  }
}
