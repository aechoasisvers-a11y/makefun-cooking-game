// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// four screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=cover|start|rush|serve|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady (and the page title) for a screenshot.
// ?selftest=1 runs a scripted play-through of the real rules in the browser and
// writes PASS/FAIL into the page title, so a headless run can prove the game works.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  createWorld, EVENT_BURNT, EVENT_CHOP, EVENT_COOK_DONE, EVENT_EXPIRED, EVENT_GAME_OVER,
  EVENT_SERVED, EVENT_SHIFT_END,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUSIC, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;
const BEST_KEY = 'sizzle-and-serve-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
// Test hook: lets an automated play-through read the live game state.
window.__sizzleWorld = world;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.title = 'SHOT READY';
    }
  }
  requestAnimationFrame(paint);
}

/**
 * Scripted play-through of the real rules: pick noodles, boil them, pick greens,
 * chop them, pick egg, fry it, plate all three, serve the matching ticket.
 * Reports PASS or the first failing step in the page title.
 */
function runSelftest() {
  const failures = [];
  const check = (label, ok) => {
    if (!ok) failures.push(label);
  };
  const stepWorld = (seconds) => {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) world.step(STEP, { keys: new Set() });
  };

  world.reset();
  world.spawnOrder();
  world.state.orders[0].recipe = 'noodle-bowl';
  check('order spawned', world.state.orders.length === 1);

  // Noodles: bin -> stove, boil to done, then off the burner at once (the
  // grace window before burning is short on purpose) and onto the plate.
  let result = world.interactAt('bin', 'noodles');
  check('pick noodles', world.state.hands?.ing === 'noodles');
  result = world.interactAt('stove', 0);
  check('noodles on burner', world.state.burners[0]?.item.ing === 'noodles' && !world.state.hands);
  stepWorld(4.2);
  check('noodles cooked', world.state.burners[0]?.item.state === 'cooked');
  result = world.interactAt('stove', 0);
  check('pick cooked noodles', world.state.hands?.ing === 'noodles');
  result = world.interactAt('plate');
  check('noodles plated', world.state.plate.length === 1);

  // Greens: bin -> board, chop to done.
  result = world.interactAt('bin', 'greens');
  check('pick greens', world.state.hands?.ing === 'greens');
  result = world.interactAt('board');
  check('greens on board', world.state.board?.item.ing === 'greens');
  stepWorld(2.2);
  check('greens chopped', world.state.board?.item.state === 'chopped');
  result = world.interactAt('board');
  check('pick chopped greens', world.state.hands?.ing === 'greens' && world.state.hands.state === 'chopped');

  // Egg: bin -> stove, fry to done.
  result = world.interactAt('stove', 1);
  check('stove refuses chopped greens', world.state.burners[1] === null);
  result = world.interactAt('plate');
  check('greens plated', world.state.plate.length === 2);
  result = world.interactAt('bin', 'egg');
  result = world.interactAt('stove', 1);
  stepWorld(3.2);
  check('egg cooked', world.state.burners[1]?.item.state === 'cooked');
  result = world.interactAt('stove', 1);
  check('pick cooked egg', world.state.hands?.ing === 'egg');
  result = world.interactAt('plate');
  check('egg plated', world.state.plate.length === 3);

  // Serve the matching ticket.
  const coinsBefore = world.state.coins;
  const servedTicketId = world.state.orders[0].id;
  result = world.interactAt('serve');
  check('served', world.state.served === 1 && world.state.coins > coinsBefore);
  check('plate cleared', world.state.plate.length === 0);
  check('ticket gone', world.state.orders.every((order) => order.id !== servedTicketId));

  // Burnt path: leave an egg on the burner past its grace.
  world.interactAt('bin', 'egg');
  world.interactAt('stove', 0);
  stepWorld(3.2 + 4.2);
  check('egg burnt', world.state.burners[0]?.item.state === 'burnt');

  renderer.draw(world.state, SCREEN_PLAY, 0, 1);
  document.title = failures.length === 0 ? 'SELFTEST PASS' : `SELFTEST FAIL: ${failures.join(', ')}`;
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas, world, (result) => {
    if (!result) return;
    if (result.sound === 'chop') audio.chop();
    else if (result.sound === 'pickup') audio.pickup();
    else if (result.sound === 'place') audio.place();
    else if (result.sound === 'sizzle') audio.sizzle();
    else if (result.sound === 'coin') audio.coin();
    else if (result.sound === 'error') audio.error();
    if (result.events & EVENT_SERVED) audio.ding();
    if (result.events & EVENT_EXPIRED) audio.expire();
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve tickets before their patience runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    if (world.state.won) audio.win();
    announce(world.state.won ? `Stall legend! ${world.state.coins} coins.` : `Shift over. ${world.state.coins} coins. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUSIC) {
      const on = audio.toggleMusic();
      announce(on ? 'Music on.' : 'Music off.');
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const events = world.step(STEP, input);
    if (events & EVENT_CHOP) audio.chop();
    if (events & EVENT_COOK_DONE) audio.ding();
    if (events & EVENT_BURNT) audio.error();
    if (events & EVENT_EXPIRED) audio.expire();
    if (events & EVENT_SHIFT_END) audio.win();
    if (events & EVENT_GAME_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now / 1000);
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  canvas.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  // A click anywhere starts (or restarts) the game from the title / game-over
  // screens, as the overlays promise; the station click below it still walks
  // the chef once play begins.
  canvas.addEventListener('pointerdown', () => {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
  });
  announce('Sizzle and Serve. Press Space or click to open the stall.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else if (selftest) runSelftest();
else runGame();
