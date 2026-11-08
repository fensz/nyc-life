// Run state that must survive moving between districts (each district is a fresh Phaser scene start).
import { START_STATE } from '../rules';

const newStory = () => ({ flags: {}, points: 0 });

export const session = {
  dayState: { ...START_STATE },
  actions: [],
  story: newStory(),
  lastY: null,
};

// Brand new run (title screen, or after dying): everything resets.
export function resetAll() {
  session.dayState = { ...START_STATE };
  session.actions = [];
  session.story = newStory();
  session.lastY = null;
}

// "Play again" after a finished day: a new day, but the story carries over.
export function newDay() {
  session.dayState = { ...START_STATE };
  session.actions = [];
  session.lastY = null;
}
