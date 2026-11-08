// One-time voice generator: records every NPC line with ElevenLabs into public/voice/*.mp3
// and writes public/voice/manifest.json. The game only ever plays these static files,
// so playing never calls the API and never costs credits.
//
//   node scripts/generate-voices.mjs --dry   count lines and characters, spend nothing
//   node scripts/generate-voices.mjs         record every missing line (existing files are skipped)
//
// Needs ELEVENLABS_API_KEY in .env.local (gitignored). Re-run after adding new lines.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { QUIPS, DEATH_LINE, cleanLine, lineKey } from '../game/story/lines.js';
import { LINES, TIPS, GREETINGS } from '../game/story/quests.js';

const VOICES = {
  narrator: 'JBFqnCBsd6RMkjVDRZzb', // George
  rosa: 'XrExE9yKIg1WjnnlVkGX', // Matilda
  joe: 'iP95p4xoKVk53GoZ742B', // Chris
  dev: 'bIHbv24MWmeRgasZH58o', // Will
  kim: 'FGY2WhTYpPnrIDTdsKH5', // Laura
  edna: 'pFZP5JQG7iQjIQuC4Bku', // Lily
  vinnie: 'N2lVS1w4EtoT3dr4eOWO', // Callum
  marge: 'hpp4J3VqNfWAUOO0d1Us', // Bella
  tony: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
  hana: 'cgSgspJ2msm6clMCkdW9', // Jessica
  dre: 'CwhRBWXzGAHq8TQ4Fs17', // Roger
  reyes: 'nPczCjzI2devNBz1zQrb', // Brian
  lena: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  sam: 'cjVigY5qzO86Huf0OWal', // Eric
  pete: 'pqHfZKP75CvOlQylNhV4', // Bill
};
const PEOPLE = Object.keys(VOICES).filter((v) => v !== 'narrator');
const MODEL = 'eleven_flash_v2_5';

// ---- the list of lines to record ----
const wanted = new Map(); // key -> { voice, text }
const add = (voice, text) => {
  if (!VOICES[voice]) return;
  wanted.set(lineKey(voice, text), { voice, text: cleanLine(text) });
};
for (const [voice, lines] of Object.entries(QUIPS)) lines.forEach((t) => add(voice, t)); // random quips
for (const [voice, lines] of Object.entries(LINES)) lines.forEach((t) => add(voice, t)); // small talk
for (const [voice, lines] of Object.entries(TIPS)) lines.forEach((t) => add(voice, t));
for (const voice of PEOPLE) GREETINGS.forEach((t) => add(voice, t)); // hello when you walk up
add('narrator', DEATH_LINE);

const lines = [...wanted.values()];
const chars = lines.reduce((n, l) => n + l.text.length, 0);
console.log(`${lines.length} lines, ${chars} characters (about ${Math.ceil(chars / 2)}-${chars} credits)`);
if (process.argv.includes('--dry')) process.exit(0);

// ---- key from .env.local (never printed) ----
let apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey && existsSync('.env.local')) {
  apiKey = readFileSync('.env.local', 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
}
if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY in .env.local');
  process.exit(1);
}

mkdirSync('public/voice', { recursive: true });
const manifestPath = 'public/voice/manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

let made = 0;
let spent = 0;
for (const { voice, text } of lines) {
  const key = lineKey(voice, text);
  const file = `voice/${voice}/${createHash('sha1').update(key).digest('hex').slice(0, 10)}.mp3`;
  if (manifest[key] && existsSync(`public/${manifest[key]}`)) continue;
  mkdirSync(`public/voice/${voice}`, { recursive: true });
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice]}?output_format=mp3_22050_32`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  if (!res.ok) {
    console.error(`STOP: ${voice} "${text}" failed with HTTP ${res.status}. Saved ${made} lines so far.`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
    process.exit(1);
  }
  writeFileSync(`public/${file}`, Buffer.from(await res.arrayBuffer()));
  manifest[key] = file;
  made += 1;
  spent += text.length;
  if (made % 10 === 0) writeFileSync(manifestPath, JSON.stringify(manifest, null, 1)); // checkpoint
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`Done: recorded ${made} new lines (${spent} characters). ${Object.keys(manifest).length} lines in the manifest.`);
