// The map: three districts in a row. Walk off the left/right screen edge to travel between them.
//   Your Block  <->  Midtown  <->  Lower Manhattan
import { BUILDINGS, FACADE_Y } from './constants';
import { QUIPS } from './story/lines';

const SIDEWALK = [20, 320, 940, 356]; // zone for sidewalk strollers (feet y)
const PARK = [20, 496, 940, 526];

export const DISTRICTS = {
  home: {
    id: 'home',
    name: 'Your Block',
    skySeed: 42,
    exits: { right: 'midtown' },
    alleys: true,
    crosswalkX: 304,
    buildings: BUILDINGS, // scored buildings: apartment, office, pizza
    decor: [],
    trees: [70, 250, 470, 700, 880],
    benches: [160, 590],
    lamps: [340, 650],
    cart: 912,
    pigeons: [120, 420, 560],
    npcs: [
      { id: 'rosa', name: 'Rosa', talk: 'rosa', x: 232, y: 340, mode: 'stand', look: { hair: 0x6b6b6b, top: 0xc0392b, jeans: 0x4a4a5a, skin: 0xe0ac69 }, quips: QUIPS.rosa },
      { id: 'joe', name: 'Joe', talk: 'joe', x: 872, y: 338, mode: 'stand', look: { hair: 0x222222, top: 0xffffff, jeans: 0x3d3d3d, skin: 0xd9a066, hat: 0xe63946 }, quips: QUIPS.joe },
      { id: 'dev', name: 'Dev', talk: 'dev', x: 520, y: 336, mode: 'stroll', zone: SIDEWALK, speed: 55, look: { hair: 0x111111, top: 0x34495e, jeans: 0x222a3a, skin: 0xc68642 }, quips: QUIPS.dev },
      { id: 'kim', name: 'Kim', talk: 'kim', x: 300, y: 510, mode: 'jog', zone: PARK, speed: 130, look: { hair: 0xaa3377, top: 0x00b4d8, jeans: 0x111111, skin: 0xf1c27d }, quips: QUIPS.kim },
      { id: 'edna', name: 'Edna', talk: 'edna', x: 592, y: 512, mode: 'feed', look: { hair: 0xdddddd, top: 0x8e44ad, jeans: 0x4a4a5a, skin: 0xf1c27d }, quips: QUIPS.edna },
    ],
  },

  midtown: {
    id: 'midtown',
    name: 'Midtown',
    skySeed: 17,
    exits: { left: 'home', right: 'downtown' },
    alleys: false,
    crosswalkX: 580,
    buildings: [
      { key: 'grandcentral', place: 'grandcentral', name: 'Grand Central', x: 20, y: 150, w: 270, h: FACADE_Y - 150, doorX: 160 },
      { key: 'esb', place: 'esb', name: 'Empire State Building', x: 330, y: 12, w: 210, h: FACADE_Y - 12, doorX: 435 },
      { key: 'msg', place: 'msg', name: 'Madison Square Garden', x: 600, y: 190, w: 330, h: FACADE_Y - 190, doorX: 765 },
    ],
    decor: [],
    trees: [60, 300, 620, 860],
    benches: [200, 700],
    lamps: [310, 560, 940],
    cart: null,
    pigeons: [150, 480, 800],
    extraTaxi: true,
    npcs: [
      { id: 'vinnie', name: 'Vinnie', talk: 'vinnie', x: 115, y: 340, mode: 'stand', look: { hair: 0x5a3b22, top: 0x2d6a4f, jeans: 0x3a3a3a, skin: 0xe0ac69, hat: 0x222222 }, quips: QUIPS.vinnie },
      { id: 'marge', name: 'Marge', talk: 'marge', x: 520, y: 338, mode: 'stand', look: { hair: 0xbcbcbc, top: 0xd62828, jeans: 0x4a4a5a, skin: 0xf1c27d }, quips: QUIPS.marge },
      { id: 'tony', name: 'Tony', talk: 'tony', x: 890, y: 340, mode: 'stand', look: { hair: 0x222222, top: 0xe85d04, jeans: 0x1d3557, skin: 0xd9a066 }, quips: QUIPS.tony },
      { id: 'hana', name: 'Hana', talk: 'hana', x: 400, y: 340, mode: 'stroll', zone: SIDEWALK, speed: 40, look: { hair: 0x1a1a1a, top: 0xffb703, jeans: 0x3d5a80, skin: 0xf1c27d }, quips: QUIPS.hana },
      { id: 'dre', name: 'Dre', talk: 'dre', x: 650, y: 336, mode: 'stroll', zone: [600, 320, 700, 352], speed: 35, look: { hair: 0x111111, top: 0x9d0208, jeans: 0x222222, skin: 0x8d5524 }, quips: QUIPS.dre },
    ],
  },

  downtown: {
    id: 'downtown',
    name: 'Lower Manhattan',
    skySeed: 91,
    exits: { left: 'midtown' },
    alleys: false,
    crosswalkX: 120,
    buildings: [
      { key: 'wtc', place: 'wtc', name: 'Twin Towers', x: 300, y: 8, w: 360, h: FACADE_Y - 8, doorX: 480 },
    ],
    decor: [
      { key: 'block', x: 10, y: 120, w: 250, h: FACADE_Y - 120, color: 0x9c5a3c },
      { key: 'block', x: 700, y: 80, w: 250, h: FACADE_Y - 80, color: 0x4a6a8a },
    ],
    trees: [70, 330, 640, 900],
    benches: [200, 760],
    lamps: [280, 690],
    cart: null,
    pigeons: [200, 500, 700],
    npcs: [
      { id: 'reyes', name: 'Officer Reyes', talk: 'reyes', x: 580, y: 338, mode: 'stand', look: { hair: 0x222222, top: 0x1d3557, jeans: 0x1d3557, skin: 0xc68642, hat: 0x1d3557 }, quips: QUIPS.reyes },
      { id: 'bagel', name: 'Bagel', kind: 'cat', talk: 'bagel', x: 360, y: 512, mode: 'stroll', zone: PARK, speed: 55, quips: ['Mrrp.', 'Meow.'] },
      { id: 'lena', name: 'Lena', talk: 'lena', x: 220, y: 338, mode: 'stroll', zone: [120, 320, 330, 356], speed: 30, look: { hair: 0xb5651d, top: 0x2a9d8f, jeans: 0x264653, skin: 0xf1c27d }, quips: QUIPS.lena },
      { id: 'sam', name: 'Sam', talk: 'sam', x: 760, y: 340, mode: 'stroll', zone: SIDEWALK, speed: 60, look: { hair: 0x3d2b1f, top: 0x6c757d, jeans: 0x212529, skin: 0xe0ac69 }, quips: QUIPS.sam },
      { id: 'pete', name: 'Pete', talk: 'pete', x: 860, y: 340, mode: 'stand', look: { hair: 0x4a4a4a, top: 0xfaedcd, jeans: 0x6b4423, skin: 0xd9a066, hat: 0xf4a261 }, quips: QUIPS.pete },
    ],
  },
};
