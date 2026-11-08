import { C, HEX, WIDTH } from '../constants';
import { txt } from './text';

const W = 330;

// Top-right panel: the current main directive, active side quests and story points.
export default class QuestTracker {
  constructor(scene) {
    this.scene = scene;
    const x = WIDTH - W - 12;
    this.x = x;
    const c = (this.container = scene.add.container(0, 0).setDepth(1000));
    this.panel = scene.add.graphics();
    this.title = txt(scene, x + 14, 20, 'DIRECTIVE', 14, HEX.taxi, { strokeThickness: 3 });
    this.main = txt(scene, x + 14, 40, '', 15, HEX.white, { bold: false, wrap: W - 28, strokeThickness: 3 });
    this.sides = txt(scene, x + 14, 0, '', 13, HEX.cream, { bold: false, wrap: W - 28, strokeThickness: 3 });
    this.pts = txt(scene, x + W - 14, 20, '', 14, HEX.energy, { origin: [1, 0], strokeThickness: 3 });
    c.add([this.panel, this.title, this.main, this.sides, this.pts]);
  }

  set(dir, progress) {
    this.main.setText(dir.main);
    this.title.setText(dir.done ? 'STORY COMPLETE' : 'DIRECTIVE');
    const side = dir.side.length ? dir.side.map((s) => `- ${s}`).join('\n') : '';
    this.sides.setText(side ? `SIDE QUESTS\n${side}` : '');
    this.sides.setY(40 + this.main.height + 6);
    this.pts.setText(`${progress.done}/${progress.total} steps  ${progress.points} pts`);
    const h = 40 + this.main.height + (side ? 6 + this.sides.height : 0) + 14;
    this.panel.clear();
    this.panel.fillStyle(C.navy, 0.86);
    this.panel.fillRoundedRect(this.x, 12, W, h, 12);
    this.panel.lineStyle(2, C.white, 0.25);
    this.panel.strokeRoundedRect(this.x, 12, W, h, 12);
    // title stays inside the panel (text origin is at y 20)
  }
}
