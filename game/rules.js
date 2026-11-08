// NYC LIFE scoring rules.
// SINGLE SOURCE OF TRUTH: this file must stay identical in behaviour to program/lib.rs.
// If you change a number here, change it in lib.rs too and re-run `npm test`.

export const START_STATE = Object.freeze({ money: 20, energy: 60, happiness: 50 });

export const LOCATIONS = [
  { id: 0, key: 'apartment', name: 'Apartment' },
  { id: 1, key: 'office', name: 'Office' },
  { id: 2, key: 'pizza', name: "Joe's Pizza" },
];

export const ACTIONS = [
  { id: 0, location: 0, name: 'Nap', blurb: '+40 energy, +5 happiness' },
  { id: 1, location: 0, name: 'Cook at home', blurb: '$5: +10 energy, +10 happiness' },
  { id: 2, location: 1, name: 'Work a shift', blurb: '+$60, -30 energy, -10 happiness' },
  { id: 3, location: 1, name: 'Pull a double', blurb: '+$100, -50 energy, -25 happiness' },
  { id: 4, location: 2, name: 'Grab a slice', blurb: '$15: +15 energy, +20 happiness' },
  { id: 5, location: 2, name: 'Hang with friends', blurb: '$10: +30 happiness, -10 energy' },
];

export const BALANCED_BONUS = 50;
export const ACTIONS_PER_DAY = 3;

const clamp = (v) => Math.max(0, Math.min(100, v));

// Returns { state, delta, note } for one action. Pure: does not mutate input.
export function applyAction(state, id) {
  let { money: m, energy: e, happiness: h } = state;
  let note = '';
  switch (id) {
    case 0:
      e += 40; h += 5;
      break;
    case 1:
      if (m >= 5) { m -= 5; e += 10; h += 10; } else { h -= 5; note = "Can't afford groceries"; }
      break;
    case 2:
      if (e >= 30) { m += 60; e -= 30; h -= 10; } else { m += 25; e -= 20; h -= 20; note = 'Too tired: half pay'; }
      break;
    case 3:
      if (e >= 50) { m += 100; e -= 50; h -= 25; } else { m += 40; e -= 40; h -= 30; note = 'Burnout: reduced pay'; }
      break;
    case 4:
      if (m >= 15) { m -= 15; e += 15; h += 20; } else { h -= 10; note = "Can't afford a slice"; }
      break;
    case 5:
      if (m >= 10) { m -= 10; h += 30; e -= 10; } else { h += 10; e -= 10; note = 'Broke, but good company'; }
      break;
    default:
      throw new Error(`Invalid action id: ${id}`);
  }
  e = clamp(e);
  h = clamp(h);
  const next = { money: m, energy: e, happiness: h };
  const delta = {
    money: next.money - state.money,
    energy: next.energy - state.energy,
    happiness: next.happiness - state.happiness,
  };
  return { state: next, delta, note };
}

export function visitedAllLocations(actions) {
  const seen = new Set(actions.map((a) => Math.floor(a / 2)));
  return seen.size === LOCATIONS.length;
}

export function scoreState(state, actions) {
  const bonus = visitedAllLocations(actions) ? BALANCED_BONUS : 0;
  return state.money + state.energy + 2 * state.happiness + bonus;
}

// Simulates a full day. Returns final state, per-step log and score.
export function simulateDay(actions) {
  if (!Array.isArray(actions) || actions.length !== ACTIONS_PER_DAY) {
    throw new Error(`A day needs exactly ${ACTIONS_PER_DAY} actions`);
  }
  let state = { ...START_STATE };
  const steps = [];
  for (const id of actions) {
    const r = applyAction(state, id);
    steps.push({ id, ...r });
    state = r.state;
  }
  const bonus = visitedAllLocations(actions) ? BALANCED_BONUS : 0;
  return { state, steps, bonus, score: scoreState(state, actions) };
}
