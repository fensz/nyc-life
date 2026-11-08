// Scenery drawn with Graphics. Returns handles so scenes can recolor for time of day.
import { C, WIDTH, HEIGHT, FACADE_Y, STREET_Y, STREET_H } from './constants';
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

const SKYLINES = {};
function skylineFor(seed) {
  if (SKYLINES[seed]) return SKYLINES[seed];
  const r = rng(seed);
  const out = [];
  let x = -10;
  while (x < WIDTH + 20) {
    const w = 30 + Math.floor(r() * 50);
    const h = 70 + Math.floor(r() * 150);
    out.push({ x, w, h, spire: r() > 0.85 });
    x += w + 2;
  }
  SKYLINES[seed] = out;
  return out;
}

export function drawSky(g, tod, bottom = FACADE_Y) {
  const s = SKY[tod];
  g.clear();
  g.fillGradientStyle(s.skyTop, s.skyTop, s.sky, s.sky, 1);
  g.fillRect(0, 0, WIDTH, bottom);
}

export function drawSkyline(g, tod, baseY = FACADE_Y, lights = null, seed = 42) {
  const s = SKY[tod];
  const SKYLINE = skylineFor(seed);
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

const DRAWERS = {};

export function drawBuildings(scene, g, lights, list) {
  for (const b of list) DRAWERS[b.key]?.(scene, g, lights, b);
}

export function drawStreet(g, { alleys = false, crosswalkX = 304 } = {}) {
  if (alleys) {
    // alleys between buildings
    g.fillStyle(0x2b2e3a, 1);
    g.fillRect(280, 150, 110, FACADE_Y - 150);
    g.fillRect(620, 170, 60, FACADE_Y - 170);
    g.fillStyle(C.asphalt, 1);
    g.fillTriangle(305, FACADE_Y, 365, FACADE_Y, 335, 150);
  }

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
  for (let cy = STREET_Y + 6; cy < STREET_Y + STREET_H - 6; cy += 14) g.fillRect(crosswalkX, cy, 62, 8);

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

// ---------- new landmarks ----------
const STONE = 0xcfc7b3;
const STONE_SHADE = 0xa59d89;

function stoneWindows(g, lights, r, x, y, w, h) {
  for (let py = y + 6; py < y + h - 8; py += 12) {
    for (let px = x + 5; px < x + w - 8; px += 11) {
      g.fillStyle(0x6d7a8c, 1);
      g.fillRect(px, py, 6, 8);
      if (r() > 0.4) {
        lights.fillStyle(C.windowLit, 1);
        lights.fillRect(px, py, 6, 8);
      }
    }
  }
}

function drawEmpireState(scene, g, lights, b) {
  const { x, y, w, h } = b;
  const cx = x + w / 2;
  const r = rng(11);
  // tiers: [width factor, top offset, bottom offset]
  const tiers = [
    [1.0, 178, h], [0.78, 112, 178], [0.58, 68, 112], [0.4, 36, 68], [0.24, 16, 36],
  ];
  tiers.forEach(([f, t0, t1], i) => {
    const tw = w * f;
    const tx = cx - tw / 2;
    g.fillStyle(STONE, 1);
    g.fillRect(tx, y + t0, tw, t1 - t0);
    g.fillStyle(STONE_SHADE, 1);
    g.fillRect(tx - 3, y + t0 - 3, tw + 6, 4); // setback ledge
    g.fillRect(tx, y + t0, 3, t1 - t0);
    g.fillRect(tx + tw - 3, y + t0, 3, t1 - t0);
    if (i < 4) stoneWindows(g, lights, r, tx + 2, y + t0 + 2, tw - 4, t1 - t0 - 2);
  });
  // vertical piers on the base
  g.fillStyle(STONE_SHADE, 1);
  for (let px = x + 12; px < x + w - 6; px += 22) g.fillRect(px, y + 182, 2, h - 182 - 68);
  // crown fins + mast + beacon
  g.fillStyle(0xe8e1cf, 1);
  g.fillRect(cx - 12, y + 6, 24, 12);
  g.fillStyle(0x6b6552, 1);
  g.fillRect(cx - 2, y - 2, 4, 14);
  g.fillStyle(C.awning, 1);
  g.fillRect(cx - 3, y - 6, 6, 5);
  lights.fillStyle(0xfff0a8, 1);
  lights.fillRect(cx - 12, y + 6, 24, 12);
  lights.fillRect(cx - 14, y + 36, 28, 8);
  // lobby
  const lx = b.doorX - 30;
  g.fillStyle(0x3a3426, 1);
  g.fillRect(lx - 8, y + h - 66, 76, 66);
  g.fillStyle(0xc9a54a, 1);
  g.fillRect(lx - 10, y + h - 72, 80, 8);
  g.fillStyle(0x15120c, 1);
  g.fillRect(lx, y + h - 54, 60, 54);
  g.fillStyle(0xe8c46a, 0.5);
  g.fillRect(lx + 4, y + h - 50, 52, 46);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(lx + 4, y + h - 50, 52, 46);
  txt(scene, b.doorX, y + h - 86, 'EMPIRE STATE', 14, '#c9a54a', { origin: 0.5 }).setDepth(2);
}

function drawGrandCentral(scene, g, lights, b) {
  const { x, y, w, h } = b;
  const cx = x + w / 2;
  g.fillStyle(0xd8cdb4, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(STONE_SHADE, 1);
  g.fillRect(x - 6, y - 8, w + 12, 10); // cornice
  g.fillRect(x, y + h - 10, w, 10);
  // central sculpture + clock
  g.fillStyle(0xcdc0a0, 1);
  g.fillRect(cx - 34, y - 34, 68, 28);
  g.fillStyle(C.white, 1);
  g.fillCircle(cx, y - 18, 13);
  g.lineStyle(2, 0x2b2e3a, 1);
  g.lineBetween(cx, y - 18, cx, y - 26);
  g.lineBetween(cx, y - 18, cx + 7, y - 15);
  g.fillStyle(0x6b6552, 1);
  g.fillRect(cx - 34, y - 38, 68, 5);
  // frieze + sign
  g.fillStyle(0x2b2e3a, 1);
  g.fillRect(x + 20, y + 10, w - 40, 22);
  txt(scene, cx, y + 21, 'GRAND CENTRAL', 16, '#f7c948', { origin: 0.5 }).setDepth(2);
  // three tall arched windows
  for (let i = 0; i < 3; i++) {
    const ax = x + 28 + i * 80;
    g.fillStyle(0x8ecae6, 1);
    g.fillRect(ax, y + 56, 60, 62);
    g.fillCircle(ax + 30, y + 56, 30);
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(ax + 6, y + 40, 6, 76);
    g.fillStyle(STONE_SHADE, 1);
    g.fillRect(ax + 28, y + 28, 3, 90);
    g.fillRect(ax, y + 84, 60, 3);
    lights.fillStyle(C.windowLit, 1);
    lights.fillRect(ax, y + 56, 60, 62);
    lights.fillCircle(ax + 30, y + 56, 30);
  }
  // doorway under the middle arch
  const dx = b.doorX - 28;
  g.fillStyle(0x2b2230, 1);
  g.fillRect(dx, y + h - 54, 56, 54);
  g.fillStyle(0xe8c46a, 0.5);
  g.fillRect(dx + 5, y + h - 48, 46, 44);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(dx + 5, y + h - 48, 46, 44);
}

function drawMSG(scene, g, lights, b) {
  const { x, y, w, h } = b;
  const cx = x + w / 2;
  // roof cap + drum
  g.fillStyle(0x23304f, 1);
  g.fillEllipse(cx, y + 22, w - 20, 44);
  g.fillStyle(0x2b3a67, 1);
  g.fillRect(x, y + 22, w, h - 22);
  g.fillStyle(0xf77f00, 1);
  for (let by = y + 34; by < y + h - 30; by += 16) g.fillRect(x, by, w, 5);
  // glowing ring
  g.fillStyle(0xffd9a0, 0.9);
  g.fillRect(x, y + 28, w, 3);
  lights.fillStyle(0xffd9a0, 1);
  lights.fillRect(x, y + 28, w, 3);
  lights.fillRect(x, y + 50, w, 4);
  // marquee
  g.fillStyle(0x0d0d14, 1);
  g.fillRect(x + 28, y + 60, w - 56, 24);
  txt(scene, cx, y + 72, 'MADISON SQUARE GARDEN', 15, '#ff9f1c', { origin: 0.5 }).setDepth(2);
  lights.fillStyle(0xff9f1c, 0.7);
  lights.fillRect(x + 28, y + 60, w - 56, 24);
  // entrance canopy + doors
  const dx = b.doorX - 40;
  g.fillStyle(C.awning, 1);
  g.fillRect(dx - 6, y + h - 52, 92, 10);
  g.fillStyle(0x10131f, 1);
  g.fillRect(dx, y + h - 42, 80, 42);
  g.fillStyle(0x8ecae6, 0.6);
  g.fillRect(dx + 6, y + h - 38, 30, 38);
  g.fillRect(dx + 44, y + h - 38, 30, 38);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(dx + 6, y + h - 38, 68, 38);
}

function drawTwinTowers(scene, g, lights, b) {
  const { x, y, w, h } = b;
  const tw = 130;
  const towers = [x, x + w - tw];
  const r = rng(73);
  const baseTop = y + h - 64;
  towers.forEach((tx, ti) => {
    const top = y + (ti === 0 ? 14 : 4);
    g.fillStyle(0xb7bdc9, 1);
    g.fillRect(tx, top, tw, baseTop - top);
    // fine vertical window strips
    g.fillStyle(0x4a5568, 1);
    for (let px = tx + 4; px < tx + tw - 3; px += 6) g.fillRect(px, top + 6, 3, baseTop - top - 12);
    // floor bands
    g.fillStyle(0x8d94a3, 0.35);
    for (let by = y + 40; by < baseTop; by += 28) g.fillRect(tx, by, tw, 2);
    // shaded side
    g.fillStyle(0x000000, 0.12);
    g.fillRect(tx + tw - 18, top, 18, baseTop - top);
    // night lights
    lights.fillStyle(C.windowLit, 1);
    for (let wy = y + 24; wy < baseTop - 8; wy += 14) {
      for (let wx = tx + 6; wx < tx + tw - 8; wx += 12) if (r() > 0.55) lights.fillRect(wx, wy, 4, 5);
    }
    // roof
    g.fillStyle(0x8d94a3, 1);
    g.fillRect(tx - 2, top - 4, tw + 4, 6);
  });
  // antenna on the left tower
  g.fillStyle(0x6e7686, 1);
  g.fillRect(towers[0] + tw / 2 - 2, y - 2, 4, 14);
  // plaza building joining the towers at street level
  g.fillStyle(0x7d8493, 1);
  g.fillRect(x - 12, baseTop, w + 24, 64);
  g.fillStyle(0x636a78, 1);
  g.fillRect(x - 12, baseTop, w + 24, 5);
  g.fillStyle(0x20242f, 1);
  g.fillRect(x + 40, baseTop + 10, w - 80, 20);
  txt(scene, x + w / 2, baseTop + 20, 'WORLD TRADE CENTER', 16, '#f7c948', { origin: 0.5 }).setDepth(2);
  const dx = b.doorX - 40;
  g.fillStyle(0x10131f, 1);
  g.fillRect(dx, baseTop + 34, 80, 30);
  g.fillStyle(0x8ecae6, 0.6);
  g.fillRect(dx + 4, baseTop + 36, 34, 28);
  g.fillRect(dx + 42, baseTop + 36, 34, 28);
  lights.fillStyle(C.windowLit, 1);
  lights.fillRect(dx + 4, baseTop + 36, 72, 28);
}

// plain background building (not enterable)
function drawBlock(scene, g, lights, b) {
  const { x, y, w, h } = b;
  const r = rng(Math.floor(x) + 5);
  g.fillStyle(b.color, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(0x000000, 0.15);
  g.fillRect(x - 4, y - 8, w + 8, 10);
  for (let wy = y + 14; wy < y + h - 20; wy += 24) {
    for (let wx = x + 12; wx < x + w - 24; wx += 28) {
      g.fillStyle(0x8ecae6, 1);
      g.fillRect(wx, wy, 16, 14);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(wx + 2, wy + 2, 3, 10);
      if (r() > 0.45) {
        lights.fillStyle(C.windowLit, 1);
        lights.fillRect(wx, wy, 16, 14);
      }
    }
  }
  g.fillStyle(0x10131f, 1);
  g.fillRect(x + w / 2 - 14, y + h - 30, 28, 30);
}

DRAWERS.apartment = drawApartment;
DRAWERS.office = drawOffice;
DRAWERS.pizza = drawPizza;
DRAWERS.esb = drawEmpireState;
DRAWERS.grandcentral = drawGrandCentral;
DRAWERS.msg = drawMSG;
DRAWERS.wtc = drawTwinTowers;
DRAWERS.block = drawBlock;
