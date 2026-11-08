import { C, HEX, WIDTH, HEIGHT } from '../constants';
import { ACTIONS, LOCATIONS } from '../rules';
import { txt } from './text';
import { sfx } from '../sfx';

const PANEL_W = 600;
const PANEL_H = 350;
const BTN_W = 540;
const BTN_H = 96;

// Popup with the 2 actions for a location. Big touch targets, keys 1/2, Esc or X to close.
export default class ActionMenu {
  constructor(scene, onChoose, onClose) {
    this.scene = scene;
    this.onChoose = onChoose;
    this.onClose = onClose;
    this.isOpen = false;
    this.closedAt = 0;

    const c = (this.container = scene.add.container(0, 0).setDepth(1100).setVisible(false));

    const dim = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.45).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.close());
    c.add(dim);

    const px = (WIDTH - PANEL_W) / 2;
    const py = (HEIGHT - PANEL_H) / 2;
    const panel = scene.add.graphics();
    panel.fillStyle(C.navy, 0.96);
    panel.fillRoundedRect(px, py, PANEL_W, PANEL_H, 16);
    panel.lineStyle(3, C.taxi, 1);
    panel.strokeRoundedRect(px, py, PANEL_W, PANEL_H, 16);
    // swallow clicks on the panel so they don't close it
    const hit = scene.add.rectangle(px, py, PANEL_W, PANEL_H, 0, 0).setOrigin(0).setInteractive();
    c.add([panel, hit]);

    this.title = txt(scene, px + 30, py + 22, '', 32, HEX.taxi);
    this.subtitle = txt(scene, px + 30, py + 64, '', 18, HEX.cream, { bold: false, strokeThickness: 3 });
    c.add([this.title, this.subtitle]);

    // close button (48x48 hit area)
    const cx = px + PANEL_W - 34;
    const cy = py + 34;
    const closeBg = scene.add.circle(cx, cy, 22, C.awning).setStrokeStyle(2, C.white).setInteractive({ useHandCursor: true });
    const closeX = txt(scene, cx, cy, 'X', 22, HEX.white, { origin: 0.5 });
    closeBg.on('pointerdown', () => this.close());
    c.add([closeBg, closeX]);

    this.buttons = [0, 1].map((i) => {
      const bx = (WIDTH - BTN_W) / 2;
      const by = py + 108 + i * (BTN_H + 16);
      const bg = scene.add.rectangle(bx, by, BTN_W, BTN_H, C.navyLight).setOrigin(0).setStrokeStyle(2, C.white, 0.6);
      bg.setInteractive({ useHandCursor: true });
      const badge = scene.add.rectangle(bx + 16, by + BTN_H / 2, 44, 44, C.taxi).setOrigin(0, 0.5);
      const key = txt(scene, bx + 38, by + BTN_H / 2, String(i + 1), 24, HEX.navy, { origin: 0.5, stroke: HEX.taxi, strokeThickness: 0 });
      const name = txt(scene, bx + 78, by + 18, '', 26, HEX.white);
      const blurb = txt(scene, bx + 78, by + 56, '', 18, HEX.cream, { bold: false, strokeThickness: 3 });
      bg.on('pointerover', () => bg.setFillStyle(0x3a4175));
      bg.on('pointerout', () => bg.setFillStyle(C.navyLight));
      bg.on('pointerdown', () => this.choose(i));
      c.add([bg, badge, key, name, blurb]);
      return { bg, name, blurb };
    });

    const kb = scene.input.keyboard;
    this.onKey1 = () => this.isOpen && this.choose(0);
    this.onKey2 = () => this.isOpen && this.choose(1);
    this.onEsc = () => this.isOpen && this.close();
    kb.on('keydown-ONE', this.onKey1);
    kb.on('keydown-TWO', this.onKey2);
    kb.on('keydown-NUMPAD_ONE', this.onKey1);
    kb.on('keydown-NUMPAD_TWO', this.onKey2);
    kb.on('keydown-ESC', this.onEsc);
  }

  open(locationId, subtitle) {
    this.location = locationId;
    this.options = ACTIONS.filter((a) => a.location === locationId);
    this.title.setText(LOCATIONS[locationId].name);
    this.subtitle.setText(subtitle);
    this.options.forEach((a, i) => {
      this.buttons[i].name.setText(a.name);
      this.buttons[i].blurb.setText(a.blurb);
    });
    this.isOpen = true;
    this.container.setVisible(true).setAlpha(0).setScale(0.96);
    this.container.x = WIDTH * 0.02;
    this.container.y = HEIGHT * 0.02;
    this.scene.tweens.add({ targets: this.container, alpha: 1, scale: 1, x: 0, y: 0, duration: 160, ease: 'Back.out' });
    sfx.open();
  }

  choose(i) {
    if (!this.isOpen) return;
    const action = this.options[i];
    this.hide();
    sfx.click();
    this.onChoose(action.id);
  }

  close() {
    if (!this.isOpen) return;
    this.hide();
    sfx.close();
    this.onClose?.();
  }

  hide() {
    this.isOpen = false;
    this.closedAt = this.scene.time.now;
    this.container.setVisible(false);
  }

  destroy() {
    const kb = this.scene.input.keyboard;
    kb.off('keydown-ONE', this.onKey1);
    kb.off('keydown-TWO', this.onKey2);
    kb.off('keydown-NUMPAD_ONE', this.onKey1);
    kb.off('keydown-NUMPAD_TWO', this.onKey2);
    kb.off('keydown-ESC', this.onEsc);
  }
}
