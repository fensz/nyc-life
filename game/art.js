// Scenery drawn with Graphics. Returns handles so scenes can recolor for time of day.
import { C, WIDTH, HEIGHT, FACADE_Y, STREET_Y, STREET_H, BUILDINGS } from './constants';
import { txt } from './ui/text';

export const SKY = [
  { sky: 0x8fd3ff, skyTop: 0x5fb4f0, skyline: 0x7d9cc0 }, // morning
  { sky: 0xffc27a, skyTop: 0xff9466, skyline: 0xb27a68 }, // afternoon
  { sky: 0x4a3480, skyTop: 0x1f1747, skyline: 0x2a2155 }, // evening
];

// Deterministic pseudo-random so the city looks the same every time.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SKYLINE = (() => {
  const r = rng(42);
  const out = [];
  let x = -10;
  while (x < WIDTH + 20) {
    const w = 30 + Math.floor(r() * 50);
    const h = 70 + Math.floor(r() * 150);
    out.push({ x, w, h, spire: r() > 0.85 });
    x += w + 2;
  }
  return out;
})();

export function drawSky(g, tod, bottom = FACADE_Y) {
  const s = SKY[tod];
  g.clear();
  g.fillGradientStyle(s.skyTop, s.skyTop, s.sky, s.sky, 1);
  g.fillRect(0, 0, WIDTH, bottom);
}

export function drawSkyline(g, tod, baseY = FACADE_Y, lights = null) {
  const s = SKY[tod];
  g.clear();
  g.fillStyle(s.skyline, 1);
  for (const b of SKYLINE) {
    g.fillRect(b.x, baseY - b.h, b.w, b.h);
    if (b.spire) g.fillRect(b.x + b.w / 2 - 2, baseY - b.h - 26, 4, 26);
  }
  if (lights) {
    lights.clear();
    const r = rng(7);
    lights.fillStyle(C.windowLit, 1);
    for (const b of SKYLINE) {
      for (let wy = baseY - b.h + 8; wy < baseY - 8; wy += 12) {
        for (let wx = b.x + 5; wx < b.x + b.w - 6; wx += 9) {
          if (r() > 0.72) lights.fillRect(wx, wy, 3, 4);
        }
      }
    }
  }
}

function windowAt(g, lights, x, y, w, h) {
  g.fillStyle(C.cream, 1);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(0x8ecae6, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(x + 2, y + 2, 4, h - 4);
  g.fillStyle(C.cream, 1);
  g.fillRect(x, y + h / 2 - 1, w, 2);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(x, y, w, h);
}

function drawApartment(scene, g, lights, b) {
  const { x, y, w, h } = b;
  g.fillStyle(C.brick, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(C.brickDark, 0.55);
  for (let ly = y + 6; ly < y + h; ly += 7) g.fillRect(x, ly, w, 1);
  g.fillStyle(0x6b2e22, 1);
  g.fillRect(x - 6, y - 10, w + 12, 12);
  g.fillRect(x - 2, y + 2, w + 4, 3);

  const cols = 4, ww = 30, wh = 34;
  const gap = (w - 44 - cols * ww) / (cols - 1);
  const rows = [y + 26, y + 80, y + 134];
  rows.forEach((wy, ri) => {
    for (let c = 0; c < cols; c++) {
      if (ri === 2 && (c === 1 || c === 2)) continue; // keep door area clear
      windowAt(g, lights, x + 22 + c * (ww + gap), wy, ww, wh);
    }
  });

  // fire escape on the right two columns
  const fx = x + 22 + 2 * (ww + gap) - 8;
  const fw = 2 * ww + gap + 16;
  g.fillStyle(0x1c1c22, 1);
  [rows[0] + wh + 4, rows[1] + wh + 4].forEach((py) => {
    g.fillRect(fx, py, fw, 4);
    for (let i = 0; i <= fw; i += 8) g.fillRect(fx + i, py - 14, 2, 14);
    g.fillRect(fx, py - 14, fw, 2);
  });
  g.lineStyle(2, 0x1c1c22, 1);
  g.lineBetween(fx + 10, rows[0] + wh + 8, fx + fw - 12, rows[1] + wh + 4);

  // stoop + door
  const dx = b.doorX - 20;
  g.fillStyle(0x6b2e22, 1);
  g.fillRect(dx - 8, y + h - 66, 56, 8);
  g.fillStyle(0x264d3a, 1);
  g.fillRect(dx, y + h - 58, 40, 58);
  g.fillStyle(0x1b3a2b, 1);
  g.fillRect(dx + 4, y + h - 54, 14, 50);
  g.fillRect(dx + 22, y + h - 54, 14, 50);
  g.fillStyle(C.taxi, 1);
  g.fillRect(dx + 30, y + h - 30, 3, 3);
  g.fillStyle(0x9a9ea8, 1);
  g.fillRect(dx - 6, y + h - 4, 52, 4);
  txt(scene, b.doorX, y + h - 80, 'HOME', 16, '#f1e3c6', { origin: 0.5 }).setDepth(2);
}

function drawOffice(scene, g, lights, b) {
  const { x, y, w, h } = b;
  g.fillStyle(C.glassDark, 1);
  g.fillRect(x, y, w, h);
  const r = rng(99);
  for (let py = y + 10; py < y + h - 70; py += 22) {
    for (let px = x + 8; px < x + w - 20; px += 26) {
      g.fillStyle(C.glass, 1);
      g.fillRect(px, py, 22, 18);
      g.fillStyle(0xffffff, 0.18);
      g.fillRect(px + 2, py + 2, 3, 14);
      if (r() > 0.45) {
        lights.fillStyle(C.windowLit, 1);
        lights.fillRect(px, py, 22, 18);
      }
    }
  }
  // reflection streaks
  g.fillStyle(0xffffff, 0.08);
  g.fillTriangle(x + 20, y, x + 70, y, x + 20, y + 120);
  g.fillTriangle(x + 120, y, x + 150, y, x + 60, y + 200);
  // crown + antenna
  g.fillStyle(0x24506f, 1);
  g.fillRect(x - 4, y - 8, w + 8, 10);
  g.fillRect(x + w / 2 - 2, y - 34, 4, 26);
  g.fillStyle(C.awning, 1);
  g.fillRect(x + w / 2 - 3, y - 38, 6, 5);
  // lobby
  const lx = b.doorX - 46;
  g.fillStyle(0x24506f, 1);
  g.fillRect(x, y + h - 66, w, 66);
  g.fillStyle(0xd9dde6, 1);
  g.fillRect(lx - 10, y + h - 74, 112, 10);
  g.fillStyle(0x10283a, 1);
  g.fillRect(lx, y + h - 60, 92, 60);
  g.fillStyle(0x8ecae6, 0.7);
  g.fillRect(lx + 6, y + h - 54, 36, 54);
  g.fillRect(lx + 50, y + h - 54, 36, 54);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(lx + 6, y + h - 54, 80, 54);
  txt(scene, b.doorX, y + h - 82, 'OFFICE', 16, '#f8f8f2', { origin: 0.5 }).setDepth(2);
}

function drawPizza(scene, g, lights, b) {
  const { x, y, w, h } = b;
  g.fillStyle(C.cream, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(0xcdbb98, 1);
  g.fillRect(x - 4, y - 8, w + 8, 10);
  for (let i = 0; i < 3; i++) windowAt(g, lights, x + 30 + i * 74, y + 14, 42, 26);
  // sign
  g.fillStyle(C.navy, 1);
  g.fillRect(x + 20, y + 50, w - 40, 22);
  txt(scene, x + w / 2, y + 61, "JOE'S PIZZA", 18, '#e63946', { origin: 0.5, stroke: '#f8f8f2', strokeThickness: 3 }).setDepth(2);
  // awning stripes
  const ay = y + 76;
  for (let i = 0; i < w; i += 20) {
    g.fillStyle(i % 40 === 0 ? C.awning : C.white, 1);
    g.fillRect(x + i, ay, 20, 18);
    g.fillTriangle(x + i, ay + 18, x + i + 20, ay + 18, x + i + 10, ay + 26);
  }
  // shop windows (warm interior) + door
  const sy = ay + 28;
  const sh = h - (sy - y);
  g.fillStyle(0x7a3b22, 1);
  g.fillRect(x, sy, w, sh);
  g.fillStyle(0xffcf8a, 1);
  g.fillRect(x + 12, sy + 6, 82, sh - 12);
  g.fillRect(x + w - 94, sy + 6, 82, sh - 12);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(x + 12, sy + 6, 82, sh - 12);
  lights.fillRect(x + w - 94, sy + 6, 82, sh - 12);
  // pizza slice icon in window
  g.fillStyle(0xf7c948, 1);
  g.fillTriangle(x + 40, sy + 12, x + 70, sy + 12, x + 55, sy + sh - 12);
  g.fillStyle(0xc8553d, 1);
  g.fillCircle(x + 52, sy + 18, 3);
  g.fillCircle(x + 60, sy + 24, 3);
  g.fillStyle(0x3d1f12, 1);
  g.fillRect(b.doorX - 18, sy + 2, 36, sh - 2);
  g.fillStyle(0xffcf8a, 0.6);
  g.fillRect(b.doorX - 12, sy + 8, 24, 18);
}

export function drawBuildings(scene, g, lights) {
  for (const b of BUILDINGS) {
    if (b.key === 'apartment') drawApartment(scene, g, lights, b);
    if (b.key === 'office') drawOffice(scene, g, lights, b);
    if (b.key === 'pizza') drawPizza(scene, g, lights, b);
  }
}

export function drawStreet(g) {
  // alleys between buildings
  g.fillStyle(0x2b2e3a, 1);
  g.fillRect(280, 150, 110, FACADE_Y - 150);
  g.fillRect(620, 170, 60, FACADE_Y - 170);
  g.fillStyle(C.asphalt, 1);
  g.fillTriangle(305, FACADE_Y, 365, FACADE_Y, 335, 150);

  // sidewalk
  g.fillStyle(C.sidewalk, 1);
  g.fillRect(0, FACADE_Y, WIDTH, STREET_Y - FACADE_Y);
  g.fillStyle(C.sidewalkDark, 1);
  for (let sx = 0; sx < WIDTH; sx += 48) g.fillRect(sx, FACADE_Y, 1, STREET_Y - FACADE_Y);
  g.fillRect(0, FACADE_Y + 34, WIDTH, 1);
  g.fillStyle(0x6f737e, 1);
  g.fillRect(0, STREET_Y - 6, WIDTH, 6); // curb

  // street
  g.fillStyle(C.asphalt, 1);
  g.fillRect(0, STREET_Y, WIDTH, STREET_H);
  g.fillStyle(C.asphaltDark, 1);
  g.fillRect(0, STREET_Y, WIDTH, 4);
  g.fillStyle(C.taxi, 1);
  for (let dx = 0; dx < WIDTH; dx += 48) g.fillRect(dx, STREET_Y + STREET_H / 2 - 2, 26, 4);
  // crosswalk
  g.fillStyle(C.white, 0.92);
  for (let cy = STREET_Y + 6; cy < STREET_Y + STREET_H - 6; cy += 14) g.fillRect(304, cy, 62, 8);

  // far sidewalk + park
  const py = STREET_Y + STREET_H;
  g.fillStyle(0x6f737e, 1);
  g.fillRect(0, py, WIDTH, 5);
  g.fillStyle(C.sidewalk, 1);
  g.fillRect(0, py + 5, WIDTH, 20);
  g.fillStyle(C.park, 1);
  g.fillRect(0, py + 25, WIDTH, HEIGHT - py - 25);
  const r = rng(5);
  g.fillStyle(C.parkDark, 1);
  for (let i = 0; i < 160; i++) g.fillRect(Math.floor(r() * WIDTH), py + 28 + Math.floor(r() * (HEIGHT - py - 30)), 2, 2);
  g.fillStyle(0x2e3140, 1);
  g.fillRect(0, py + 25, WIDTH, 3); // park fence
  for (let fx = 0; fx < WIDTH; fx += 16) g.fillRect(fx, py + 19, 2, 8);
}
