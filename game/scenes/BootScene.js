import Phaser from 'phaser';
import { generateTextures } from '../textures';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    this.scene.start('Title');
  }
}
