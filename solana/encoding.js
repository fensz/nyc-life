// Pure byte-level helpers for the nyc_life Anchor program. No web3.js import, so Node tests can use it.
// Discriminators = first 8 bytes of sha256("global:<ix_name>") / sha256("account:<Name>").
// Verified by solana/encoding.test.mjs.

export const DISC = {
  initPlayer: Uint8Array.from([114, 27, 219, 144, 50, 15, 228, 66]),
  submitDay: Uint8Array.from([72, 224, 17, 130, 158, 107, 140, 136]),
  playerStatsAccount: Uint8Array.from([169, 146, 242, 176, 102, 118, 231, 172]),
};

export const PLAYER_SEED = 'player';
export const PLAYER_STATS_SIZE = 64;

export function encodeInitPlayer() {
  return DISC.initPlayer.slice();
}

// submit_day(actions: [u8; 3]) -> borsh fixed array = 3 raw bytes, no length prefix
export function encodeSubmitDay(actions) {
  if (!Array.isArray(actions) || actions.length !== 3 || actions.some((a) => !Number.isInteger(a) || a < 0 || a > 5)) {
    throw new Error('actions must be 3 integers between 0 and 5');
  }
  const out = new Uint8Array(11);
  out.set(DISC.submitDay, 0);
  out.set(actions, 8);
  return out;
}

// Layout: disc 8 | authority 32 | best u32 | days u32 | last u32 | last_actions [3] | last_played i64 | bump u8
export function decodePlayerStats(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < PLAYER_STATS_SIZE) throw new Error('PlayerStats account too small');
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== DISC.playerStatsAccount[i]) throw new Error('Not a PlayerStats account');
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    authority: bytes.slice(8, 40),
    bestScore: dv.getUint32(40, true),
    daysCompleted: dv.getUint32(44, true),
    lastScore: dv.getUint32(48, true),
    lastActions: Array.from(bytes.slice(52, 55)),
    lastPlayed: Number(dv.getBigInt64(55, true)),
    bump: bytes[63],
  };
}
