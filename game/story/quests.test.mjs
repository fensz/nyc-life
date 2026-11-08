import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPC_TALK, PLACE_TALK, directives, storyProgress, npcHasNews, TOTAL_STEPS } from './quests.js';

const api = { toast: () => {}, changed: () => {} };
const fresh = () => ({ flags: {}, points: 0 });

// Walk a node's first-choice path, running every effect, until the conversation ends.
function runPath(node, s, pick = (n) => 0) {
  let guard = 0;
  while (node && guard++ < 20) {
    const ch = node.choices.length ? node.choices[pick(node)] : null;
    if (!ch) break;
    ch.run?.(s, api);
    node = ch.next;
  }
}
const choose = (label) => (n) => Math.max(0, n.choices.findIndex((c) => c.label === label));

test('main story chain can be completed in order', () => {
  const s = fresh();
  assert.match(directives(s).main, /Rosa/);

  runPath(NPC_TALK.rosa(s), s); // opens the letter
  assert.ok(s.flags.letter);
  assert.match(directives(s).main, /Joe/);

  runPath(NPC_TALK.joe(s), s); // takes the key and the slice favour
  assert.ok(s.flags.key);
  assert.match(directives(s).main, /Locker 42/);

  runPath(PLACE_TALK.grandcentral(s), s, choose('Check the lockers'));
  assert.ok(s.flags.locker);
  assert.match(directives(s).main, /Marge/);

  runPath(NPC_TALK.marge(s), s);
  assert.ok(s.flags.marge);
  assert.match(directives(s).main, /Twin Towers/);

  runPath(PLACE_TALK.wtc(s), s); // ride up and read the note
  assert.ok(s.flags.finale);
  assert.equal(directives(s).done, true);
});

test('locker stays locked without the key', () => {
  const s = fresh();
  runPath(PLACE_TALK.grandcentral(s), s, choose('Check the lockers'));
  assert.ok(!s.flags.locker);
});

test('the twin towers deck does not end the story early', () => {
  const s = fresh();
  runPath(PLACE_TALK.wtc(s), s);
  assert.ok(!s.flags.finale);
});

test('side quests: cat, slice and jersey', () => {
  const s = fresh();
  s.flags.letter = true;
  runPath(NPC_TALK.rosa(s), s, choose("I'll keep an eye out"));
  assert.ok(s.flags.cat_quest);
  runPath(NPC_TALK.bagel(s), s);
  assert.ok(s.flags.cat_found);
  runPath(NPC_TALK.rosa(s), s);
  assert.ok(s.flags.cat_done);

  s.flags.slice = true;
  s.flags.slice_quest = true;
  runPath(NPC_TALK.vinnie(s), s);
  assert.ok(s.flags.slice_given);

  runPath(NPC_TALK.tony(s), s, choose("I'll see what I can do"));
  assert.ok(s.flags.jersey_quest);
  runPath(PLACE_TALK.msg(s), s, choose('Ask security for an autograph'));
  assert.ok(s.flags.jersey);
  runPath(NPC_TALK.tony(s), s);
  assert.ok(s.flags.jersey_done);
});

test('progress and points add up and never exceed the total', () => {
  const s = fresh();
  [...['letter', 'key', 'locker', 'marge', 'finale', 'cat_done', 'slice_given', 'jersey_done']].forEach((k) => { s.flags[k] = true; });
  assert.equal(storyProgress(s).done, TOTAL_STEPS);
});

test('every NPC and place has a conversation with at most 3 choices', () => {
  const s = fresh();
  for (const talk of [...Object.values(NPC_TALK), ...Object.values(PLACE_TALK)]) {
    const node = talk(s);
    assert.ok(node.name && node.text);
    assert.ok(node.choices.length <= 3);
  }
});

test('the "!" marker follows the story', () => {
  const s = fresh();
  assert.equal(npcHasNews('rosa', s), true); // letter waiting
  assert.equal(npcHasNews('joe', s), false); // not yet
  runPath(NPC_TALK.rosa(s), s); // letter
  assert.equal(npcHasNews('joe', s), true); // key waiting
  runPath(NPC_TALK.joe(s), s);
  assert.equal(npcHasNews('joe', s), false);
  assert.equal(npcHasNews('vinnie', s), true); // slice to deliver
  assert.equal(npcHasNews('nobody', s), false);
});
