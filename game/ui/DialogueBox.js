import { C, HEX, WIDTH, HEIGHT } from '../constants';
import { txt } from './text';
import { sfx } from '../sfx';

const PANEL_X = 40;
const PANEL_W = WIDTH - 80;
const BTN_H = 40;
const MAX_CHOICES = 3;

// Bottom-of-screen dialogue. Node = { name, text, choices: [{ label, next, run }] }.
// Keys 1-3 pick a choice, E/Space skips the typing (or continues when there is one choice), Esc closes.
export default class DialogueBox {
  constructor(scene, getStory, api) {
    this.scene = scene;
    this.getStory = getStory;
    this.api = api;
    this.isOpen = false;
    this.closedAt = 0;
    this.openedAt = 0;
    this.node = null;
    this.typing = false;

    const c = (this.container = scene.add.container(0, 0).setDepth(1120).setVisible(false));
    this.panel = scene.add.graphics();
    this.hit = scene.add.rectangle(PANEL_X, HEIGHT, PANEL_W, 10, 0, 0).setOrigin(0).setInteractive();
    this.name = txt(scene, PANEL_X + 24, 0, '', 22, HEX.taxi);
    this.body = txt(scene, PANEL_X + 24, 0, '', 19, HEX.white, { bold: false, wrap: PANEL_W - 48, strokeThickness: 3 });
    c.add([this.panel, this.hit, this.name, this.body]);

    this.hit.on('pointerdown', () => this.onPanelTap());

    this.buttons = [];
    for (let i = 0; i < MAX_CHOICES; i++) {
      const bg = scene.add.rectangle(PANEL_X + 24, 0, PANEL_W - 48, BTN_H - 6, C.navyLight).setOrigin(0).setStrokeStyle(2, C.white, 0.6);
      bg.setInteractive({ useHandCursor: true });
      const label = txt(scene, PANEL_X + 40, 0, '', 18, HEX.white, { strokeThickness: 3 });
      bg.on('pointerover', () => bg.setFillStyle(0x3a4175));
      bg.on('pointerout', () => bg.setFillStyle(C.navyLight));
      bg.on('pointerdown', () => this.choose(i));
      c.add([bg, label]);
      this.buttons.push({ bg, label });
    }

    const kb = scene.input.keyboard;
    this.keyHandlers = {
      'keydown-ONE': () => this.key(0),
      'keydown-TWO': () => this.key(1),
      'keydown-THREE': () => this.key(2),
      'keydown-E': () => this.advance(),
      'keydown-SPACE': () => this.advance(),
      'keydown-ESC': () => this.isOpen && this.close(),
    };
    Object.entries(this.keyHandlers).forEach(([ev, fn]) => kb.on(ev, fn));
  }

  ready() {
    return this.isOpen && this.scene.time.now - this.openedAt > 250;
  }

  open(node, onClose) {
    this.onClose = onClose;
    this.isOpen = true;
    this.openedAt = this.scene.time.now;
    this.container.setVisible(true);
    sfx.open();
    this.show(node);
  }

  show(node) {
    this.node = node;
    this.api.speak?.(node);
    this.choices = node.choices?.length ? node.choices.slice(0, MAX_CHOICES) : [{ label: 'Continue', next: null }];
    this.name.setText(node.name);
    this.body.setText('');
    this.layout(node.text);
    this.fullText = node.text;
    this.shown = 0;
    this.typing = true;
    this.buttons.forEach((b) => { b.bg.setVisible(false); b.label.setVisible(false); });
    this.typer?.remove();
    this.typer = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        this.shown += 2;
        this.body.setText(this.fullText.slice(0, this.shown));
        if (this.shown >= this.fullText.length) this.finishTyping();
      },
    });
  }

  // Size the panel for the final text up front so it does not jump while typing.
  layout(text) {
    this.body.setText(text);
    const bodyH = this.body.height;
    const height = 20 + 30 + bodyH + 14 + this.choices.length * BTN_H + 14;
    const top = HEIGHT - 12 - height;
    this.panel.clear();
    this.panel.fillStyle(C.navy, 0.96);
    this.panel.fillRoundedRect(PANEL_X, top, PANEL_W, height, 14);
    this.panel.lineStyle(3, C.taxi, 1);
    this.panel.strokeRoundedRect(PANEL_X, top, PANEL_W, height, 14);
    this.hit.setPosition(PANEL_X, top).setSize(PANEL_W, height);
    this.hit.input?.hitArea?.setSize?.(PANEL_W, height);
    this.name.setY(top + 14);
    this.body.setY(top + 14 + 32);
    this.choiceTop = top + 14 + 32 + bodyH + 14;
    this.body.setText('');
  }

  finishTyping() {
    this.typer?.remove();
    this.typing = false;
    this.body.setText(this.fullText);
    this.choices.forEach((ch, i) => {
      const b = this.buttons[i];
      const y = this.choiceTop + i * BTN_H;
      b.bg.setPosition(PANEL_X + 24, y).setVisible(true);
      b.label.setPosition(PANEL_X + 40, y + 8).setText(`${i + 1}  ${ch.label}`).setVisible(true);
    });
  }

  onPanelTap() {
    if (this.ready() && this.typing) this.finishTyping();
  }

  advance() {
    if (!this.ready()) return;
    if (this.typing) return this.finishTyping();
    if (this.choices.length === 1) this.choose(0);
  }

  key(i) {
    if (!this.ready()) return;
    if (this.typing) return this.finishTyping();
    this.choose(i);
  }

  choose(i) {
    if (!this.isOpen || this.typing) return;
    const ch = this.choices[i];
    if (!ch) return;
    sfx.click();
    this.api.stopVoice?.();
    ch.run?.(this.getStory(), this.api);
    this.api.changed?.();
    if (ch.next) this.show(ch.next);
    else this.close();
  }

  close() {
    if (!this.isOpen) return;
    this.typer?.remove();
    this.api.stopVoice?.();
    this.isOpen = false;
    this.closedAt = this.scene.time.now;
    this.container.setVisible(false);
    sfx.close();
    this.onClose?.();
  }

  destroy() {
    this.typer?.remove();
    const kb = this.scene.input.keyboard;
    Object.entries(this.keyHandlers).forEach(([ev, fn]) => kb.off(ev, fn));
  }
}
