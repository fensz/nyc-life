import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateDay, applyAction } from './rules.js';

// Same vectors must pass on-chain (PLAN.md 3.5 / 4.3 step 9).
const VECTORS = [
  { actions: [2, 4, 0], final: [65, 85, 65], score: 330 },
  { actions: [3, 3, 3], final: [200, 0, 0], score: 200 },
  { actions: [0, 0, 0], final: [20, 100, 65], score: 250 },
  { actions: [5, 5, 5], final: [0, 30, 100], score: 230 },
  { actions: [1, 2, 5], final: [65, 30, 80], score: 305 },
];

for (const v of VECTORS) {
  test(`day ${JSON.stringify(v.actions)} -> ${v.score}`, () => {
    const r = simulateDay(v.actions);
    assert.deepEqual([r.state.money, r.state.energy, r.state.happiness], v.final);
    assert.equal(r.score, v.score);
  });
}

test('invalid action throws', () => {
  assert.throws(() => applyAction({ money: 0, energy: 0, happiness: 0 }, 6));
});

test('day must have 3 actions', () => {
  assert.throws(() => simulateDay([0, 0]));
});
