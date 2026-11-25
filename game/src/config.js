// Sizzle & Serve — tuning, ingredients, recipes and the kitchen layout.
// One file, one job: every number the world and the renderer agree on lives here,
// so balancing the rush means editing this file and nothing else.

export const VIEW = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const CHEF_SPEED = 360;
export const CHEF_RADIUS = 26;

// The shift: three working days in one game. Each shift is a timed rush with a
// coin target; reach it and the next shift opens, faster and hungrier.
export const SHIFTS = [
  { name: 'Shift 1 — First Lunch', length: 150, target: 110, spawnEvery: 14, patience: 52, maxOrders: 3 },
  { name: 'Shift 2 — Dinner Rush', length: 150, target: 170, spawnEvery: 11, patience: 46, maxOrders: 4 },
  { name: 'Shift 3 — Night Market', length: 150, target: 230, spawnEvery: 9, patience: 40, maxOrders: 4 },
];

export const GRACE_AFTER_DONE = 4; // seconds a finished dish waits on the burner before it burns
export const COMBO_WINDOW = 20; // seconds between serves that keep the combo alive
export const BASE_PAY = 12; // coins for any served dish
export const TIP_MAX = 8; // extra coins for serving while the ticket is still fresh
export const EXPIRE_PENALTY = 5; // coins lost when a ticket runs out of patience

// Every ingredient: how it is prepared and how long that takes. A dish is ready
// only when each of its parts is in its finished state.
export const INGREDIENTS = {
  noodles: { name: 'Noodles', short: 'NOOD', color: '#f2c94c', dark: '#c79a1d', cook: 'boil', cookTime: 4, chop: false },
  rice: { name: 'Rice', short: 'RICE', color: '#fff3d6', dark: '#d9c48f', cook: 'fry', cookTime: 4, chop: false },
  egg: { name: 'Egg', short: 'EGG', color: '#ffd23e', dark: '#d9a400', cook: 'fry', cookTime: 3, chop: false },
  greens: { name: 'Greens', short: 'LEAF', color: '#57b368', dark: '#2f7d3f', cook: null, chop: true, chopTime: 2 },
  chili: { name: 'Chilli', short: 'HOT', color: '#e4572e', dark: '#a82f14', cook: null, chop: true, chopTime: 2 },
  skewer: { name: 'Skewer', short: 'SKEW', color: '#c98a4b', dark: '#8a5a28', cook: 'grill', cookTime: 5, chop: false },
};
export const INGREDIENT_ORDER = ['noodles', 'rice', 'egg', 'greens', 'chili', 'skewer'];

// A recipe part is { ing, state } where state is 'cooked' or 'chopped'.
export const RECIPES = [
  {
    id: 'noodle-bowl',
    name: 'Noodle Bowl',
    blurb: 'Slurp-worthy',
    pay: 12,
    parts: [
      { ing: 'noodles', state: 'cooked' },
      { ing: 'greens', state: 'chopped' },
      { ing: 'egg', state: 'cooked' },
    ],
  },
  {
    id: 'fried-rice',
    name: 'Sunny Fried Rice',
    blurb: 'Wok-kissed',
    pay: 12,
    parts: [
      { ing: 'rice', state: 'cooked' },
      { ing: 'egg', state: 'cooked' },
      { ing: 'chili', state: 'chopped' },
    ],
  },
  {
    id: 'skewer-plate',
    name: 'Ember Skewer Plate',
    blurb: 'Char-grilled',
    pay: 14,
    parts: [
      { ing: 'skewer', state: 'cooked' },
      { ing: 'greens', state: 'chopped' },
      { ing: 'chili', state: 'chopped' },
    ],
  },
];

// Kitchen stations, in logical pixels. The chef walks the floor strip (y 430..760)
// and works the counters above it; each station has a stand point the chef walks to.
export const STATIONS = {
  bins: { x: 330, y: 96, w: 560, h: 96, standY: 232 },
  board: { x: 330, y: 224, w: 190, h: 110, standY: 372 },
  stove: { x: 548, y: 224, w: 300, h: 110, standY: 372 },
  plate: { x: 876, y: 224, w: 190, h: 110, standY: 372 },
  serve: { x: 1094, y: 224, w: 170, h: 110, standY: 372 },
  trash: { x: 1094, y: 96, w: 170, h: 96, standY: 232 },
};
export const BOARD = { x: 16, y: 80, w: 288, h: 500 };
export const FLOOR = { top: 430, bottom: 762 };
export const BURNERS = [
  { x: 612, y: 276 },
  { x: 762, y: 276 },
];
