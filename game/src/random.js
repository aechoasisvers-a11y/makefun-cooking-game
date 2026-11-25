// A tiny seeded random number generator (mulberry32). One job: deterministic
// randomness, so a ?seed=N game and a ?shot= scene always play the same way.

/** Return a function that yields numbers in [0, 1) from the given seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `items` using the seeded random function. */
export function pickRandom(random, items) {
  return items[Math.floor(random() * items.length)];
}
