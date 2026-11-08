// Tiny WebAudio beeps: no audio files. Safe to call before user input (it just stays silent).
let ctx = null;
let muted = false;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) {
  muted = m;
}

export function tone(freq = 440, dur = 0.08, type = 'square', vol = 0.05, delay = 0) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(660, 0.05, 'square', 0.04),
  open: () => { tone(520, 0.06); tone(780, 0.08, 'square', 0.05, 0.06); },
  close: () => tone(330, 0.06, 'triangle', 0.05),
  good: () => { tone(523, 0.08); tone(659, 0.08, 'square', 0.05, 0.08); tone(784, 0.12, 'square', 0.05, 0.16); },
  bad: () => { tone(300, 0.1, 'sawtooth', 0.04); tone(220, 0.14, 'sawtooth', 0.04, 0.1); },
  step: () => tone(180, 0.03, 'triangle', 0.02),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.05, i * 0.11)),
  chain: () => [880, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.06, i * 0.09)),
};
