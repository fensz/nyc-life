// Random one-liners NPCs say out loud. Pure data (no imports) so the voice generator script can read it too.
// Every line here is pre-recorded once into public/voice by scripts/generate-voices.mjs.
export const QUIPS = {
  rosa: ['Mail is late again.', 'Mind the stoop!', 'Rent is due Friday...'],
  joe: ['Fresh pies!', 'Hot slice, cold soda.', 'Best pizza on the block!'],
  dev: ['Late again!', 'Taxi!', 'Coffee... need coffee.'],
  kim: ['On your left!', 'Keep moving!'],
  edna: ['Come, my little friends.', 'Coo coo!'],
  vinnie: ['La la la...', 'Tips appreciated!'],
  marge: ['Welcome to the Empire State.', 'Mind the line, folks.'],
  tony: ['Go team!', 'Anybody got a jersey?'],
  hana: ['Photo time!', 'Is this Times Square?', 'Amazing!'],
  dre: ['Doors at seven!', 'Tickets, please.'],
  reyes: ['Keep it moving, folks.', 'Enjoy the view.'],
  lena: ['Follow the flag!', 'Over here, everyone!'],
  sam: ['Ferry in ten!', 'Gotta run.'],
  pete: ['Soft pretzels!', 'Warm and salty!'],
};

export const DEATH_LINE = 'You were hit by a car. Always look both ways in New York.';

// Same cleaning on the game side and in the generator, so a line always finds its recording.
export function cleanLine(text) {
  return text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

export function lineKey(voice, text) {
  return `${voice}|${cleanLine(text)}`;
}
