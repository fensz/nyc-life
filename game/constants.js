// Shared constants (no imports, so no circular-import problems).
export const WIDTH = 960;
export const HEIGHT = 540;

// Palette (mirrored as CSS vars in app/globals.css)
export const C = {
  navy: 0x1b1f3b,
  navyLight: 0x2a2f55,
  asphalt: 0x3a3d4a,
  asphaltDark: 0x30323d,
  sidewalk: 0xa9adb8,
  sidewalkDark: 0x8f939e,
  brick: 0xb5523b,
  brickDark: 0x8e3d2b,
  taxi: 0xf7c948,
  glass: 0x4aa3df,
  glassDark: 0x2f78ad,
  awning: 0xe63946,
  cream: 0xf1e3c6,
  white: 0xf8f8f2,
  park: 0x5a9e4b,
  parkDark: 0x3f7a35,
  energy: 0x52d273,
  happy: 0xff7eb6,
  windowLit: 0xffd96b,
};

export const HEX = Object.fromEntries(
  Object.entries(C).map(([k, v]) => [k, '#' + v.toString(16).padStart(6, '0')])
);

export const FONT = 'ui-monospace, "Cascadia Mono", "SFMono-Regular", Menlo, Consolas, monospace';

// Map layout. Buildings face the camera; their doors sit on the y = FACADE_Y line.
export const FACADE_Y = 300;
export const WALK_TOP = 312; // player's feet can't go above this (in front of facades)
export const STREET_Y = 370;
export const STREET_H = 90;

export const BUILDINGS = [
  { location: 0, key: 'apartment', name: 'Apartment', x: 30, y: 90, w: 250, h: FACADE_Y - 90, doorX: 155 },
  { location: 1, key: 'office', name: 'Office', x: 390, y: 34, w: 230, h: FACADE_Y - 34, doorX: 505 },
  { location: 2, key: 'pizza', name: "Joe's Pizza", x: 680, y: 150, w: 250, h: FACADE_Y - 150, doorX: 805 },
];

export const DOOR_ZONE = { halfW: 42, top: FACADE_Y, bottom: FACADE_Y + 58 };

export const TIMES = ['Morning', 'Afternoon', 'Evening'];
