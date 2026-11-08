import { FONT, HEX } from '../constants';

// One place to create crisp text. resolution 2 keeps it sharp when the canvas is scaled up.
export function txt(scene, x, y, str, size = 20, color = HEX.white, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: opts.bold === false ? 'normal' : 'bold',
    color,
    stroke: opts.stroke ?? HEX.navy,
    strokeThickness: opts.strokeThickness ?? Math.max(2, Math.round(size / 8)),
    align: opts.align ?? 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: opts.lineSpacing ?? 4,
    resolution: 2,
  });
  if (opts.origin !== undefined) {
    Array.isArray(opts.origin) ? t.setOrigin(...opts.origin) : t.setOrigin(opts.origin);
  }
  return t;
}
