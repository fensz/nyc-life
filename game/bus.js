import Phaser from 'phaser';

// Tiny event bridge between Phaser scenes and React components.
// Phaser -> React: 'day-complete' {actions, score, state}, 'day-reset', 'record-request'
// React -> Phaser: 'chain-status' {state, message, ...}, 'chain-stats' {best, days} | null
export const bus = new Phaser.Events.EventEmitter();

// Last known values so late subscribers (scenes that start later) can read them.
export const busState = {
  chainEnabled: false,
  chainMode: 'memo', // 'program' (Anchor program scores it) or 'memo' (day saved with the Memo program)
  chainStats: null,
  lastStatus: null,
};

bus.on('chain-stats', (s) => {
  busState.chainStats = s;
});
bus.on('chain-status', (s) => {
  busState.lastStatus = s;
});
bus.on('day-reset', () => {
  busState.lastStatus = null;
});
