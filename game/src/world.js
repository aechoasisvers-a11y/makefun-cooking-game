// The kitchen's rules and state: orders, the chef, the chopping board, the stove,
// the plate and the till. One job: decide what happens when the chef acts, and
// advance timers. It never draws anything and never touches the DOM.

import {
  BASE_PAY, BURNERS, CHEF_RADIUS, CHEF_SPEED, COMBO_WINDOW, EXPIRE_PENALTY, FLOOR,
  GRACE_AFTER_DONE, INGREDIENTS, INGREDIENT_ORDER, RECIPES, SHIFTS, STATIONS, TIP_MAX,
} from './config.js';
import { pickRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_CHOP = 1 << 0;
export const EVENT_COOK_DONE = 1 << 1;
export const EVENT_BURNT = 1 << 2;
export const EVENT_SERVED = 1 << 3;
export const EVENT_EXPIRED = 1 << 4;
export const EVENT_SHIFT_END = 1 << 5;
export const EVENT_GAME_OVER = 1 << 6;

let nextOrderId = 1;

/** A carried or stationed food item: { ing, state } where state is raw/chopped/cooked/burnt. */
function makeItem(ing) {
  return { ing, state: 'raw' };
}

function recipeFor(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

function shiftConfig(index) {
  return SHIFTS[Math.min(index, SHIFTS.length - 1)];
}

/** Does this plate hold exactly the parts of this recipe, in any order? */
export function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.parts.length) return false;
  return recipe.parts.every((part) =>
    plate.some((item) => item.ing === part.ing && item.state === part.state),
  );
}

export function createWorld(random) {
  const state = {
    shift: 0,
    timeLeft: SHIFTS[0].length,
    coins: 0,
    served: 0,
    expired: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    spawnTimer: 6,
    orders: [],
    chef: { x: 640, y: 600, tx: 640, ty: 600, moving: false, face: 1, walkPhase: 0 },
    hands: null,
    board: null, // { item, progress, need } while chopping, else the finished item waiting
    burners: [null, null], // { item, progress, need, done, grace } per burner
    plate: [],
    popups: [], // floating "+18" coin texts
    steam: [], // stove steam particles
    hint: '',
    hintTimer: 0,
    over: false,
    won: false,
    shiftDone: false,
    finalShift: false,
  };

  function say(message, seconds = 2.2) {
    state.hint = message;
    state.hintTimer = seconds;
  }

  function spawnOrder() {
    const config = shiftConfig(state.shift);
    if (state.orders.length >= config.maxOrders) return;
    const recipe = pickRandom(random, RECIPES);
    state.orders.push({
      id: nextOrderId,
      recipe: recipe.id,
      patience: config.patience,
      maxPatience: config.patience,
    });
    nextOrderId += 1;
  }

  function payFor(order) {
    const recipe = recipeFor(order.recipe);
    const freshness = Math.max(0, order.patience / order.maxPatience);
    const tip = Math.round(TIP_MAX * freshness);
    const comboBonus = Math.floor(state.combo * 0.1 * (recipe.pay + tip));
    return { total: recipe.pay + tip + comboBonus, tip, comboBonus };
  }

  function findMatchingOrder() {
    return state.orders.find((order) => plateMatchesRecipe(state.plate, recipeFor(order.recipe)));
  }

  function servePlate() {
    const order = findMatchingOrder();
    if (!order) {
      say('No ticket matches this plate yet — check the order board!');
      return { events: EVENT_NONE, sound: 'error' };
    }
    const pay = payFor(order);
    state.coins += pay.total;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.comboTimer = COMBO_WINDOW;
    state.orders = state.orders.filter((item) => item.id !== order.id);
    state.plate = [];
    state.popups.push({ x: STATIONS.serve.x + 85, y: STATIONS.serve.y - 6, text: `+${pay.total}`, life: 1.4, color: '#ffd23e' });
    if (pay.comboBonus > 0) {
      state.popups.push({ x: STATIONS.serve.x + 85, y: STATIONS.serve.y + 18, text: `COMBO x${state.combo}`, life: 1.4, color: '#ff9f43' });
    }
    return { events: EVENT_SERVED, sound: 'coin' };
  }

  function interactAt(station, detail) {
    // Returns { events, sound } for the main loop to announce and play.
    if (station === 'bin') {
      const ing = detail;
      if (state.hands) {
        say('Hands full! Serve, plate or bin it first.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      state.hands = makeItem(ing);
      return { events: EVENT_NONE, sound: 'pickup' };
    }
    if (station === 'board') {
      if (state.board && state.board.item && state.board.progress >= state.board.need && !state.hands) {
        state.hands = state.board.item;
        state.board = null;
        return { events: EVENT_NONE, sound: 'pickup' };
      }
      if (!state.board && state.hands && INGREDIENTS[state.hands.ing].chop && state.hands.state === 'raw') {
        state.board = { item: state.hands, progress: 0, need: INGREDIENTS[state.hands.ing].chopTime };
        state.hands = null;
        return { events: EVENT_NONE, sound: 'place' };
      }
      if (state.board && state.board.progress < state.board.need) {
        say('Still chopping — wait for the chop!');
        return { events: EVENT_NONE, sound: 'error' };
      }
      say('The board is for greens and chilli. Chop it, then pick it up.');
      return { events: EVENT_NONE, sound: 'error' };
    }
    if (station === 'stove') {
      const burner = state.burners[detail];
      if (burner && burner.done && burner.item.state === 'burnt' && !state.hands) {
        state.burners[detail] = null;
        say('Burnt! Binned it — watch the ring next time.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      if (burner && burner.done && burner.item.state === 'cooked' && !state.hands) {
        state.hands = burner.item;
        state.burners[detail] = null;
        return { events: EVENT_NONE, sound: 'pickup' };
      }
      if (!burner && state.hands && INGREDIENTS[state.hands.ing].cook && state.hands.state === 'raw') {
        state.burners[detail] = {
          item: state.hands,
          progress: 0,
          need: INGREDIENTS[state.hands.ing].cookTime,
          done: false,
          grace: GRACE_AFTER_DONE,
        };
        state.hands = null;
        return { events: EVENT_NONE, sound: 'sizzle' };
      }
      if (burner && !burner.done) {
        say('Still cooking — the ring shows when it is done.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      say('The stove fries, boils and grills. Raw noodles, rice, egg or skewer go here.');
      return { events: EVENT_NONE, sound: 'error' };
    }
    if (station === 'plate') {
      if (!state.hands) {
        say(state.plate.length === 0 ? 'Plate is empty — bring a cooked or chopped part.' : 'Plate holds parts — bring the next one.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      const item = state.hands;
      if (item.state !== 'cooked' && item.state !== 'chopped') {
        say('That part is not ready yet — chop it or cook it first.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      if (state.plate.length >= 3) {
        say('Plate is full — serve it at the window!');
        return { events: EVENT_NONE, sound: 'error' };
      }
      if (state.plate.some((part) => part.ing === item.ing)) {
        say('That part is already on the plate.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      state.plate.push(item);
      state.hands = null;
      return { events: EVENT_NONE, sound: 'place' };
    }
    if (station === 'serve') {
      if (state.plate.length === 0) {
        say('Nothing plated yet — build a dish first.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      return servePlate();
    }
    if (station === 'trash') {
      if (!state.hands) {
        say('Nothing in hand to bin.');
        return { events: EVENT_NONE, sound: 'error' };
      }
      state.hands = null;
      return { events: EVENT_NONE, sound: 'place' };
    }
    return { events: EVENT_NONE, sound: null };
  }

  /** The chef walks toward the clicked point; arrival triggers the queued action. */
  function moveChef(dt) {
    const chef = state.chef;
    if (!chef.moving) return;
    const dx = chef.tx - chef.x;
    const dy = chef.ty - chef.y;
    const dist = Math.hypot(dx, dy);
    const stepDistance = CHEF_SPEED * dt;
    if (dist <= stepDistance) {
      chef.x = chef.tx;
      chef.y = chef.ty;
      chef.moving = false;
      if (chef.queued) {
        const action = chef.queued;
        chef.queued = null;
        action();
      }
      return;
    }
    chef.x += (dx / dist) * stepDistance;
    chef.y += (dy / dist) * stepDistance;
    chef.face = dx >= 0 ? 1 : -1;
    chef.walkPhase += dt * 12;
  }

  function step(dt, input) {
    let events = EVENT_NONE;
    if (state.over) return events;

    // --- timers ---
    state.timeLeft -= dt;
    if (state.hintTimer > 0) state.hintTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    for (const popup of state.popups) popup.life -= dt;
    state.popups = state.popups.filter((popup) => popup.life > 0);

    // --- orders: patience drains, spawn clock ticks ---
    const config = shiftConfig(state.shift);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      state.spawnTimer = config.spawnEvery;
    }
    for (const order of state.orders) order.patience -= dt;
    const expiredNow = state.orders.filter((order) => order.patience <= 0);
    if (expiredNow.length > 0) {
      state.orders = state.orders.filter((order) => order.patience > 0);
      state.expired += expiredNow.length;
      state.coins = Math.max(0, state.coins - EXPIRE_PENALTY * expiredNow.length);
      state.combo = 0;
      events |= EVENT_EXPIRED;
      say('A customer walked out! -5 coins.');
    }

    // --- chopping board ---
    if (state.board && state.board.progress < state.board.need) {
      state.board.progress += dt;
      if (state.board.progress >= state.board.need) {
        state.board.item.state = 'chopped';
        events |= EVENT_CHOP;
      }
    }

    // --- stove burners ---
    for (let i = 0; i < state.burners.length; i += 1) {
      const burner = state.burners[i];
      if (!burner) continue;
      if (!burner.done) {
        burner.progress += dt;
        if (burner.progress >= burner.need) {
          burner.done = true;
          burner.item.state = 'cooked';
          events |= EVENT_COOK_DONE;
        }
      } else if (burner.item.state === 'cooked') {
        burner.grace -= dt;
        if (burner.grace <= 0) {
          burner.item.state = 'burnt';
          events |= EVENT_BURNT;
          say('Something burnt on the stove!');
        }
      }
      if (burner && Math.random() < dt * 6) {
        state.steam.push({
          x: BURNERS[i].x + (Math.random() - 0.5) * 30,
          y: BURNERS[i].y - 10,
          life: 0.9,
          size: 5 + Math.random() * 6,
        });
      }
    }
    for (const puff of state.steam) {
      puff.life -= dt;
      puff.y -= 26 * dt;
    }
    state.steam = state.steam.filter((puff) => puff.life > 0);

    // --- chef movement from keys or a click target ---
    const chef = state.chef;
    if (input.keys.size > 0) {
      chef.moving = false;
      chef.queued = null;
      let dx = 0;
      let dy = 0;
      if (input.keys.has('left')) dx -= 1;
      if (input.keys.has('right')) dx += 1;
      if (input.keys.has('up')) dy -= 1;
      if (input.keys.has('down')) dy += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        chef.x += (dx / len) * CHEF_SPEED * dt;
        chef.y += (dy / len) * CHEF_SPEED * dt;
        chef.face = dx !== 0 ? Math.sign(dx) : chef.face;
        chef.walkPhase += dt * 12;
      }
    } else {
      moveChef(dt);
    }
    chef.x = Math.max(40, Math.min(1240, chef.x));
    chef.y = Math.max(FLOOR.top, Math.min(FLOOR.bottom, chef.y));

    // --- shift end ---
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.shiftDone = true;
      const target = config.target;
      if (state.coins >= target) {
        state.won = state.shift >= SHIFTS.length - 1;
        state.finalShift = state.shift >= SHIFTS.length - 1;
        if (!state.won) {
          state.shift += 1;
          const next = shiftConfig(state.shift);
          state.timeLeft = next.length;
          state.shiftDone = false;
          state.spawnTimer = 5;
          state.orders = [];
          state.plate = [];
          state.hands = null;
          state.board = null;
          state.burners = [null, null];
          say(`${next.name} — faster tickets, bigger target!`, 3);
          events |= EVENT_SHIFT_END;
        } else {
          state.over = true;
          events |= EVENT_GAME_OVER;
        }
      } else {
        state.over = true;
        events |= EVENT_GAME_OVER;
      }
    }
    return events;
  }

  function reset() {
    nextOrderId = 1;
    state.shift = 0;
    state.timeLeft = SHIFTS[0].length;
    state.coins = 0;
    state.served = 0;
    state.expired = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.bestCombo = 0;
    state.spawnTimer = 6;
    state.orders = [];
    state.chef = { x: 640, y: 600, tx: 640, ty: 600, moving: false, face: 1, walkPhase: 0 };
    state.hands = null;
    state.board = null;
    state.burners = [null, null];
    state.plate = [];
    state.popups = [];
    state.steam = [];
    state.hint = '';
    state.hintTimer = 0;
    state.over = false;
    state.won = false;
    state.shiftDone = false;
    state.finalShift = false;
  }

  return {
    state,
    step,
    reset,
    interactAt,
    spawnOrder,
    findMatchingOrder,
    payFor,
    shiftConfig: () => shiftConfig(state.shift),
    /** Walk the chef to (x, y), then run `action` on arrival. */
    walkTo(x, y, action) {
      const chef = state.chef;
      chef.tx = Math.max(40, Math.min(1240, x));
      chef.ty = Math.max(FLOOR.top, Math.min(FLOOR.bottom, y));
      chef.moving = true;
      chef.queued = action ?? null;
      // Already standing there: act at once.
      if (Math.hypot(chef.tx - chef.x, chef.ty - chef.y) < 8) {
        chef.moving = false;
        if (chef.queued) {
          const queued = chef.queued;
          chef.queued = null;
          queued();
        }
      }
    },
    /** Is the chef close enough to work this station? */
    near(station) {
      const box = STATIONS[station];
      const cx = box.x + box.w / 2;
      return Math.abs(state.chef.x - cx) < box.w / 2 + 46 && state.chef.y < box.y + box.h + 78;
    },
    /** The nearest station the chef can work, or null. */
    nearestStation() {
      let best = null;
      let bestDist = Infinity;
      for (const name of Object.keys(STATIONS)) {
        const box = STATIONS[name];
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const dist = Math.hypot(state.chef.x - cx, state.chef.y - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = name;
        }
      }
      return bestDist < 210 ? best : null;
    },
    ingredientNames() {
      return INGREDIENT_ORDER;
    },
  };
}
