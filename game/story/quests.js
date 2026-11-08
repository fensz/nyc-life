// Story layer: quests, directives and dialogue. Pure data + logic (no Phaser, no imports) so it can be unit-tested.
// IMPORTANT: nothing here touches the 3 scored actions or the on-chain score (see rules.js).
// Story points are a separate, off-chain layer.

const N = (name, text, choices = []) => ({ name, text, choices });
const C = (label, next = null, run = null) => ({ label, next, run });
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function add(s, api, n, msg) {
  s.points += n;
  api.toast(`+${n} story: ${msg}`);
}

// ---------- progress ----------
export const MAIN_FLAGS = ['letter', 'key', 'locker', 'marge', 'finale'];
export const SIDE_FLAGS = ['cat_done', 'slice_given', 'jersey_done'];
export const TOTAL_STEPS = MAIN_FLAGS.length + SIDE_FLAGS.length;

export function storyProgress(s) {
  const f = s.flags;
  const done = [...MAIN_FLAGS, ...SIDE_FLAGS].filter((k) => f[k]).length;
  return { done, total: TOTAL_STEPS, points: s.points };
}

// What the player should do next (shown in the quest tracker).
export function directives(s) {
  const f = s.flags;
  let main;
  if (!f.letter) main = 'Talk to Rosa outside your apartment. She has mail for you.';
  else if (!f.key) main = "Ask Joe, outside Joe's Pizza, about Uncle Ray's key.";
  else if (!f.locker) main = 'Open Locker 42 at Grand Central. Walk off the right edge to reach Midtown.';
  else if (!f.marge) main = 'Find Marge near the Empire State Building.';
  else if (!f.finale) main = 'Visit the Twin Towers observation deck in Lower Manhattan.';
  else main = 'Story complete! Finish the side quests and keep exploring.';

  const side = [];
  if (f.cat_quest && !f.cat_done) side.push(f.cat_found ? 'Tell Rosa you found Bagel.' : "Find Rosa's cat Bagel. Try Lower Manhattan.");
  if (f.slice_quest && !f.slice_given) side.push('Bring the slice to Vinnie in Midtown.');
  if (f.jersey_quest && !f.jersey_done) side.push(f.jersey ? 'Bring the jersey to Tony in Midtown.' : 'Ask MSG security for a signed jersey.');
  return { main, side, done: !!f.finale };
}

// A "!" floats over people who have something new for the player.
export function npcHasNews(id, s) {
  const f = s.flags;
  switch (id) {
    case 'rosa': return !f.letter || !f.cat_quest || (!!f.cat_found && !f.cat_done);
    case 'joe': return (!!f.letter && !f.key) || (!!f.key && !f.slice_quest);
    case 'vinnie': return !!f.slice && !f.slice_given;
    case 'tony': return !f.jersey_quest || (!!f.jersey && !f.jersey_done);
    case 'marge': return !!f.locker && !f.marge;
    case 'bagel': return !!f.cat_quest && !f.cat_found;
    default: return false;
  }
}

// What a person says when you walk up to them (voiced when the voice service is on).
export const GREETINGS = ['Hey there!', 'Hello!', 'Oh, hi!', 'Nice day, huh?'];

// ---------- small talk for background NPCs ----------
const small = (name, lines, tips) => () =>
  N(name, pick(lines), [C('Ask about the city', N(name, pick(tips), [C('Thanks!')])), C('See you around')]);

// ---------- NPC conversations: (story) => node ----------
export const NPC_TALK = {
  rosa(s) {
    const f = s.flags;
    if (!f.letter) {
      return N('Rosa (your landlady)', 'There you are! A letter came for you, from your Uncle Ray. Postmarked weeks ago. That man is a character.', [
        C('Open the letter', N('Uncle Ray (letter)', '"Kid, I left you something in this city. Start with Joe at the pizza place. He is holding a key for you. Do not lose it. - Ray"', [
          C('Pocket the letter', null, (st, api) => {
            st.flags.letter = true;
            add(st, api, 25, "Got Uncle Ray's letter");
          }),
        ])),
        C('Not right now'),
      ]);
    }
    if (f.cat_quest && f.cat_found && !f.cat_done) {
      return N('Rosa', 'You found Bagel?! You angel! I knew that orange menace could not stay away from the harbor.', [
        C("Happy to help, Rosa", null, (st, api) => {
          st.flags.cat_done = true;
          add(st, api, 30, 'Bagel is home safe');
        }),
      ]);
    }
    if (!f.cat_quest) {
      return N('Rosa', 'While you are out... my cat Bagel slipped out this morning. Big, orange, hates pigeons. If you spot him, let me know?', [
        C("I'll keep an eye out", null, (st) => { st.flags.cat_quest = true; }),
        C('Sorry, busy day'),
      ]);
    }
    if (f.cat_done) return N('Rosa', 'Bagel is asleep on the radiator. Rent is due Friday. Just kidding! Go get them, kid.', [C('Thanks, Rosa')]);
    return N('Rosa', 'Any sign of Bagel? Last time he was seen, he was heading downtown.', [C('Working on it')]);
  },

  joe(s) {
    const f = s.flags;
    if (!f.letter) {
      return N('Joe (pizza guy)', "Hey, new face! Rosa's been looking for you. Go see her first, then come back.", [C('Will do')]);
    }
    if (!f.key) {
      return N('Joe', "You're Ray's family, right? Same eyes. He left this with me years ago. Locker 42, Grand Central Terminal. Don't ask me what's in it.", [
        C('Take the key', N('Joe', "And hey, a favor. Vinnie plays guitar in Midtown and hasn't eaten all day. Would you bring him a slice?", [
          C("Sure, I'll deliver it", null, (st, api) => {
            st.flags.slice_quest = true;
            st.flags.slice = true;
            api.toast('Got a slice of pizza');
          }),
          C('Maybe later'),
        ]), (st, api) => {
          st.flags.key = true;
          add(st, api, 25, 'Got the key to Locker 42');
        }),
      ]);
    }
    if (!f.slice_quest) {
      return N('Joe', "Vinnie plays guitar in Midtown and hasn't eaten all day. Bring him a slice?", [
        C("Sure, I'll deliver it", null, (st, api) => {
          st.flags.slice_quest = true;
          st.flags.slice = true;
          api.toast('Got a slice of pizza');
        }),
        C('Maybe later'),
      ]);
    }
    if (f.slice_given) return N('Joe', "Vinnie wrote a song about my pizza? Ha! That's the best review I've ever had.", [C('It really is good pizza')]);
    return N('Joe', 'Keep that slice warm. Midtown is a short walk off the right edge of the map.', [C('On my way')]);
  },

  vinnie(s) {
    const f = s.flags;
    if (f.slice && !f.slice_given) {
      return N('Vinnie (busker)', "Is that... a slice? From Joe? Bless you, stranger. Here, a song just for you.", [
        C('Enjoy it!', null, (st, api) => {
          st.flags.slice_given = true;
          st.flags.slice = false;
          add(st, api, 30, 'Fed a hungry busker');
        }),
      ]);
    }
    if (f.slice_given) return N('Vinnie', 'This next one is called "Ode to a Plain Slice". It has four verses.', [C('Play on, Vinnie')]);
    return small('Vinnie (busker)', ['Request a song? I take tips and pizza.', 'The acoustics down here are everything.'], ['Best spot? Right here. People walk slow near the station.'])();
  },

  tony(s) {
    const f = s.flags;
    if (!f.jersey_quest) {
      return N('Tony (kid)', 'My favorite player plays at the Garden. Could you ask security for a signed jersey? They love it when you ask nicely.', [
        C("I'll see what I can do", null, (st) => { st.flags.jersey_quest = true; }),
        C('Sorry, kid'),
      ]);
    }
    if (f.jersey && !f.jersey_done) {
      return N('Tony', 'NO WAY! It is signed! I am never washing this. Ever.', [
        C('Wear it proudly', null, (st, api) => {
          st.flags.jersey_done = true;
          st.flags.jersey = false;
          add(st, api, 30, 'Made a kid very happy');
        }),
      ]);
    }
    if (f.jersey_done) return N('Tony', 'Best. Day. Ever.', [C('Enjoy it, Tony')]);
    return N('Tony', "Security is inside the Garden. They're the big guys in the red jackets.", [C('On it')]);
  },

  marge(s) {
    const f = s.flags;
    if (!f.locker) {
      return N('Marge (front desk)', f.key
        ? 'A key for Locker 42? Grand Central is down the block. Come see me after you open it.'
        : "Looking for something? This building has watched this city for a long, long time.", [C('Thanks, Marge')]);
    }
    if (!f.marge) {
      return N('Marge', "Ray's postcard! He was here every week. He said, if anybody ever came with that card, send them to the Twin Towers observation deck. The view starts there.", [
        C('Head downtown', null, (st, api) => {
          st.flags.marge = true;
          add(st, api, 50, "Marge pointed the way");
        }),
      ]);
    }
    return N('Marge', 'Go on, the view will not wait forever. Lower Manhattan is off the right edge.', [C('Heading there now')]);
  },

  bagel(s) {
    const f = s.flags;
    if (f.cat_quest && !f.cat_found) {
      return N('Bagel (cat)', 'Mrrp. (An orange cat blinks slowly. It has a tag that reads: BAGEL, ASK ROSA.)', [
        C('Found you!', null, (st, api) => {
          st.flags.cat_found = true;
          add(st, api, 10, 'Found Bagel');
        }),
      ]);
    }
    return N('Cat', 'Mrrp. (The cat ignores you completely.)', [C('Pet the cat')]);
  },
};

// background NPCs with small talk only
export const LINES = {
  dev: ['Late again! The train just left.', 'Coffee first, talking later.'],
  kim: ['Keep up! Three laps to go.', "Can't stop, new personal best."],
  edna: ['These pigeons know me by name.', "Don't scare my friends!"],
  sal: ['Hot dogs! Best on the block.', 'Mustard or ketchup? Wrong answer is ketchup.'],
  hana: ['Is this Times Square? It is not? Oh no.', 'I have taken forty photos of the same corner.'],
  dre: ['Doors open at seven. Game starts at eight.', "I've seen every game from this very spot."],
  reyes: ['Nearly 110 floors up there. Longest view in the city.', 'Keep moving, folks. Plenty of room on the plaza.'],
  lena: ['These towers were completed in 1973. They changed the skyline.', 'Follow the flag, tour group!'],
  sam: ['Ferry is in ten. I never miss it.', 'Lower Manhattan sure moves fast in the morning.'],
  pete: ['Soft pretzels! Salted to perfection.', 'One dollar. Okay, three dollars.'],
};
export const TIPS = {
  dev: ['Walk with purpose. Nobody stops on the sidewalk.'],
  kim: ['The park loop is the best part of the day.'],
  edna: ['Bread crumbs, never seeds. Pigeons have standards.'],
  sal: ['The cart has been right here for twenty years.'],
  hana: ['Everyone tells me the skyline is that way. They all point differently.'],
  dre: ['The Garden is called "the world\'s most famous arena". And it is.'],
  reyes: ['The deck is worth the ride. Ask for the telescope on the north side.'],
  lena: ['Two towers, side by side. The city is full of pairs like that.'],
  sam: ['If you miss one ferry, the next is always coming.'],
  pete: ['Pretzel tip: eat it warm and fast.'],
};
const NAMES = {
  dev: 'Dev (commuter)', kim: 'Kim (jogger)', edna: 'Edna', sal: 'Sal (hot dogs)', hana: 'Hana (tourist)', dre: 'Dre (usher)',
  reyes: 'Officer Reyes', lena: 'Lena (tour guide)', sam: 'Sam (commuter)', pete: 'Pete (pretzels)',
};
Object.keys(LINES).forEach((id) => {
  NPC_TALK[id] = small(NAMES[id], LINES[id], TIPS[id]);
});

// ---------- places (buildings you can enter that are not scored) ----------
export const PLACE_TALK = {
  grandcentral(s) {
    const f = s.flags;
    return N('Grand Central Terminal', 'Sunlight pours through the arched windows onto the Main Concourse. The famous clock glows above the information booth.', [
      C('Look at the clock', N('Grand Central Terminal', 'Four faces of opal glass, worth millions. Commuters have been meeting under it for generations.', [C('Nice')]),
        (st, api) => {
          if (!st.flags.v_gc) { st.flags.v_gc = true; add(st, api, 10, 'Admired the Main Concourse'); }
        }),
      C('Check the lockers', f.locker
        ? N('Locker 42', 'Empty now. The postcard is already in your pocket.', [C('Close it')])
        : f.key
          ? N('Locker 42', 'The key turns. Inside is a worn postcard: "ESB, 86th floor. Ask for Marge. She knows where the view starts. - Ray"', [
              C('Take the postcard', null, (st, api) => {
                st.flags.locker = true;
                add(st, api, 50, 'Opened Locker 42');
              }),
            ])
          : N('Lockers', 'Rows of metal lockers. Number 42 is locked tight. You need a key.', [C('Walk away')])),
      C('Leave'),
    ]);
  },

  esb(s) {
    return N('Empire State Building', 'Art deco lobby, brass doors, and a very long elevator line.', [
      C('Ride to the 86th floor', N('86th floor observatory', 'The whole city is a map beneath your feet. Taxis look like yellow grains of rice.', [C('Take it in')]),
        (st, api) => {
          if (!st.flags.v_esb) { st.flags.v_esb = true; add(st, api, 10, 'Saw the city from above'); }
        }),
      C('Ask the guard about Ray', N('Guard', 'Ray? Marge is the one to ask. She is out front. Short, with the red scarf.', [C('Thanks')])),
      C('Leave'),
    ]);
  },

  msg(s) {
    const f = s.flags;
    const choices = [
      C('Watch the game', N('Madison Square Garden', 'The crowd roars as the home team scores. You high-five a total stranger. It feels great.', [C('Cheer')]),
        (st, api) => {
          if (!st.flags.v_msg) { st.flags.v_msg = true; add(st, api, 10, 'Cheered at the Garden'); }
        }),
    ];
    if (f.jersey_quest && !f.jersey) {
      choices.push(C('Ask security for an autograph', N('Security', 'A kid wants a signed jersey? Here, the team signed one this morning. Tell him to keep it safe.', [
        C('Take the jersey', null, (st, api) => {
          st.flags.jersey = true;
          api.toast('Got a signed jersey');
        }),
      ])));
    } else {
      choices.push(C('Chat with security', N('Security', 'Nice and orderly in here. Anybody asking for an autograph, send them my way.', [C('Good to know')])));
    }
    choices.push(C('Leave'));
    return N('Madison Square Garden', 'The arena is loud, bright and packed. Tonight is a big game.', choices);
  },

  wtc(s) {
    const f = s.flags;
    const rideUp = f.marge && !f.finale
      ? N('Observation deck', 'Wind, sky and the whole harbor. A folded note is taped under the telescope: "Kid, there never was a lockbox. I left you the city. Every block it took to get here was the gift. Now go live in it. - Ray"', [
          C('Fold the note carefully', null, (st, api) => {
            st.flags.finale = true;
            add(st, api, 100, 'Story complete');
          }),
        ])
      : N('Observation deck', 'From up here the harbor stretches out to the horizon and the whole island looks small. Two towers, side by side.', [C('Take it in')]);
    return N('Twin Towers', 'The two towers rise over the plaza, straight up into the clouds.', [
      C('Ride to the observation deck', rideUp, (st, api) => {
        if (!st.flags.v_wtc) { st.flags.v_wtc = true; add(st, api, 10, 'Visited the observation deck'); }
      }),
      C('Read the plaque', N('Plaque', 'The Twin Towers. Completed in 1973. Two giants rising over Lower Manhattan.', [C('Remember')])),
      C('Leave'),
    ]);
  },
};
