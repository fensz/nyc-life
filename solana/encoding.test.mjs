import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DISC, encodeSubmitDay, decodePlayerStats } from './encoding.js';

const disc = (s) => [...createHash('sha256').update(s).digest().subarray(0, 8)];

test('discriminators match Anchor sha256 scheme', () => {
  assert.deepEqual([...DISC.initPlayer], disc('global:init_player'));
  assert.deepEqual([...DISC.submitDay], disc('global:submit_day'));
  assert.deepEqual([...DISC.playerStatsAccount], disc('account:PlayerStats'));
});

test('submit_day data = disc + 3 bytes', () => {
  assert.deepEqual([...encodeSubmitDay([2, 4, 0])], [...disc('global:submit_day'), 2, 4, 0]);
  assert.throws(() => encodeSubmitDay([6, 0, 0]));
  assert.throws(() => encodeSubmitDay([0, 0]));
});

test('PlayerStats decode round-trip', () => {
  const buf = new Uint8Array(64);
  buf.set(DISC.playerStatsAccount, 0);
  buf.fill(7, 8, 40);
  const dv = new DataView(buf.buffer);
  dv.setUint32(40, 330, true);
  dv.setUint32(44, 2, true);
  dv.setUint32(48, 200, true);
  buf.set([3, 3, 3], 52);
  dv.setBigInt64(55, 1762560000n, true);
  buf[63] = 254;
  const s = decodePlayerStats(buf);
  assert.equal(s.bestScore, 330);
  assert.equal(s.daysCompleted, 2);
  assert.equal(s.lastScore, 200);
  assert.deepEqual(s.lastActions, [3, 3, 3]);
  assert.equal(s.lastPlayed, 1762560000);
  assert.equal(s.bump, 254);
});
