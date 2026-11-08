// Voice lines: plays pre-recorded files from public/voice (made once by scripts/generate-voices.mjs).
// There are no live API calls while playing, so there is no key in the game and no credit cost.
// A line with no recording (or a missing manifest) is just silent.
import { isMuted } from './sfx';
import { lineKey, cleanLine } from './story/lines';

let manifest = null;
let loading = null;
let current = null; // the line being spoken (one at a time)
let lastAmbient = 0;

export function preloadVoices() {
  if (!loading && typeof window !== 'undefined') {
    loading = fetch('/voice/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => { manifest = m; });
  }
  return loading;
}

// Which voice speaks a dialogue node, from the speaker name. null = stay silent.
export function voiceFor(name = '') {
  const n = name.toLowerCase();
  if (n.startsWith('bagel') || n === 'cat') return null;
  if (n.startsWith('officer reyes')) return 'reyes';
  const first = n.split(/[\s(]/)[0];
  const people = ['rosa', 'joe', 'dev', 'kim', 'edna', 'vinnie', 'marge', 'tony', 'hana', 'dre', 'lena', 'sam', 'pete'];
  return people.includes(first) ? first : 'narrator';
}

export function stopVoice() {
  if (current) {
    current.pause();
    current = null;
  }
}

// Speak a recorded line. `volume` is 0..1. Returns true if a recording exists and started.
export function speak(voice, text, volume = 1) {
  if (typeof window === 'undefined' || !voice || isMuted()) return false;
  if (!manifest) {
    preloadVoices();
    return false;
  }
  const file = manifest[lineKey(voice, cleanLine(text))];
  if (!file) return false;
  stopVoice();
  const audio = new Audio(`/${file}`);
  audio.volume = Math.max(0, Math.min(1, volume));
  current = audio;
  audio.addEventListener('ended', () => { if (current === audio) current = null; });
  audio.play().catch(() => {
    // autoplay blocked: stay silent
    if (current === audio) current = null;
  });
  return true;
}

export function speakNode(node) {
  return speak(voiceFor(node.name), node.text, 1);
}

// Ambient lines from NPCs wandering nearby: quieter with distance, at most one every few seconds.
export function speakAmbient(voice, text, distance) {
  const now = Date.now();
  if (now - lastAmbient < 5000 || distance > 320) return false;
  if (!speak(voice, text, Math.max(0.15, 1 - distance / 340) * 0.7)) return false;
  lastAmbient = now;
  return true;
}
