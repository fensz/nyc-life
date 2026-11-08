import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import CityScene from './scenes/CityScene';
import ResultScene from './scenes/ResultScene';
import { WIDTH, HEIGHT, HEX } from './constants';

export function makeConfig(parent) {
  return {
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: HEX.navy,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: { activePointers: 2 },
    scene: [BootScene, TitleScene, CityScene, ResultScene],
  };
}
