// Every sprite is drawn in code and baked into a texture. No image downloads.
import { C } from './constants';

function bake(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function px(g, color, x, y, w = 1, h = 1) {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

function drawPlayer(g, frame) {
  const hair = 0x2b1d14, skin = 0xf1c27d, eye = C.navy;
  const hoodie = 0x2a9d8f, hoodieDark = 0x21867a, jeans = 0x3d5a80, shoe = C.white;
  px(g, hair, 4, 0, 8, 3);
  px(g, hair, 3, 1, 1, 4);
  px(g, hair, 12, 1, 1, 4);
  px(g, skin, 4, 3, 8, 6);
  px(g, eye, 6, 5, 1, 2);
  px(g, eye, 9, 5, 1, 2);
  px(g, 0xd99a5b, 7, 7, 2, 1); // mouth
  px(g, hoodie, 3, 9, 10, 8);
  px(g, hoodieDark, 7, 10, 2, 7);
  px(g, hoodie, 1, 10, 2, 6);
  px(g, hoodie, 13, 10, 2, 6);
  px(g, skin, 1, 16, 2, 1);
  px(g, skin, 13, 16, 2, 1);
  if (frame === 0) {
    px(g, jeans, 4, 17, 3, 5);
    px(g, jeans, 9, 17, 3, 5);
    px(g, shoe, 4, 22, 3, 2);
    px(g, shoe, 9, 22, 3, 2);
  } else {
    px(g, jeans, 3, 17, 3, 5);
    px(g, jeans, 10, 17, 3, 4);
    px(g, shoe, 3, 22, 3, 2);
    px(g, shoe, 10, 21, 3, 2);
  }
}

export function generateTextures(scene) {
  bake(scene, 'player0', 16, 24, (g) => drawPlayer(g, 0));
  bake(scene, 'player1', 16, 24, (g) => drawPlayer(g, 1));

  bake(scene, 'shadow', 16, 6, (g) => {
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(8, 3, 16, 6);
  });

  // Yellow cab, side view, 40x20
  bake(scene, 'taxi', 40, 20, (g) => {
    px(g, C.taxi, 2, 7, 36, 8);
    px(g, C.taxi, 9, 2, 20, 6);
    px(g, 0x9fd3f0, 11, 3, 7, 4);
    px(g, 0x9fd3f0, 20, 3, 7, 4);
    px(g, 0x111111, 4, 11, 32, 1); // checker strip
    for (let i = 0; i < 8; i++) px(g, i % 2 ? 0x111111 : C.white, 6 + i * 4, 10, 2, 1);
    px(g, 0xffffff, 16, 0, 6, 2); // roof light
    px(g, 0x111111, 6, 14, 7, 6);
    px(g, 0x111111, 27, 14, 7, 6);
    px(g, 0x666666, 8, 16, 3, 2);
    px(g, 0x666666, 29, 16, 3, 2);
    px(g, 0xff4d4d, 2, 8, 1, 2);
    px(g, 0xfff3b0, 37, 8, 1, 2);
  });

  // Delivery van / sedan, 40x20 (blue)
  bake(scene, 'car', 40, 20, (g) => {
    px(g, 0x5b6cff, 2, 6, 36, 9);
    px(g, 0x5b6cff, 8, 1, 18, 6);
    px(g, 0x9fd3f0, 10, 2, 6, 4);
    px(g, 0x9fd3f0, 18, 2, 6, 4);
    px(g, 0x111111, 6, 14, 7, 6);
    px(g, 0x111111, 27, 14, 7, 6);
    px(g, 0xfff3b0, 37, 8, 1, 2);
  });

  bake(scene, 'tree', 32, 40, (g) => {
    px(g, 0x6b4423, 14, 26, 4, 14);
    g.fillStyle(C.parkDark, 1);
    g.fillCircle(16, 16, 15);
    g.fillStyle(C.park, 1);
    g.fillCircle(13, 13, 10);
    g.fillStyle(0x7cc46a, 1);
    g.fillCircle(11, 10, 4);
  });

  bake(scene, 'lamp', 12, 64, (g) => {
    px(g, 0x2e3140, 5, 8, 2, 56);
    px(g, 0x2e3140, 2, 4, 8, 4);
    px(g, C.windowLit, 3, 8, 6, 3);
  });

  // Hot dog cart, 44x40
  bake(scene, 'cart', 44, 40, (g) => {
    px(g, 0x2e3140, 21, 0, 2, 12); // umbrella pole
    for (let i = 0; i < 6; i++) px(g, i % 2 ? C.white : C.awning, 4 + i * 6, 0, 6, 6);
    px(g, 0xd9dde6, 4, 16, 36, 16);
    px(g, 0x2a9d8f, 4, 16, 36, 4);
    px(g, 0x111111, 8, 32, 6, 6);
    px(g, 0x111111, 30, 32, 6, 6);
    px(g, 0xc8553d, 14, 23, 16, 4);
  });

  bake(scene, 'bench', 48, 20, (g) => {
    px(g, 0x8a5a33, 0, 4, 48, 4);
    px(g, 0x8a5a33, 0, 10, 48, 4);
    px(g, 0x2e3140, 4, 14, 3, 6);
    px(g, 0x2e3140, 41, 14, 3, 6);
  });

  bake(scene, 'pigeon', 10, 8, (g) => {
    px(g, 0x8d93a5, 1, 2, 7, 4);
    px(g, 0x6f7486, 6, 0, 3, 3);
    px(g, 0xf7a440, 9, 1, 1, 1);
    px(g, 0xf7a440, 3, 6, 1, 2);
  });

  bake(scene, 'spark', 4, 4, (g) => {
    px(g, C.white, 0, 0, 4, 4);
  });
}
