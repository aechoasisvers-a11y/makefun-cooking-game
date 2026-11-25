// The screenshot scenes behind ?shot=cover|start|rush|serve. Each one stages a
// real world state through the world's own functions — real orders, real items
// on the board, the stove and the plate — then the renderer paints it, so the
// frame is exactly what the game looks like in that moment. Same seed, same frame.

import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Put a raw ingredient on a burner and advance it to the given progress. */
function stageBurner(world, index, ing, progress) {
  const state = world.state;
  state.burners[index] = {
    item: { ing, state: progress >= 1 ? 'cooked' : 'raw' },
    progress,
    need: 1,
    done: progress >= 1,
    grace: 4,
  };
}

/** Stage `name` on `world` and return the screen to draw over it. */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();

  if (name === 'start') {
    world.spawnOrder();
    state.chef.x = 640;
    state.chef.y = 600;
    state.timeLeft = 150;
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'rush') {
    // Four tickets, two burners going, one nearly burnt, one ticket almost out.
    // Shift 2 allows four tickets on the board, so set it before spawning.
    state.shift = 1;
    world.spawnOrder();
    world.spawnOrder();
    world.spawnOrder();
    world.spawnOrder();
    state.orders[0].patience = 9;
    state.orders[1].patience = 22;
    stageBurner(world, 0, 'noodles', 0.55);
    stageBurner(world, 1, 'egg', 1);
    state.burners[1].grace = 0.8;
    state.board = { item: { ing: 'greens', state: 'raw' }, progress: 1.4, need: 2 };
    state.hands = { ing: 'chili', state: 'raw' };
    state.chef.x = 470;
    state.chef.y = 430;
    state.chef.face = 1;
    state.coins = 86;
    state.served = 7;
    state.combo = 3;
    state.timeLeft = 64;
    return { screen: SCREEN_PLAY, best: 142 };
  }

  if (name === 'serve') {
    // A finished Noodle Bowl on the plate, matching the top ticket — bell ringing.
    world.spawnOrder();
    state.orders[0].recipe = 'noodle-bowl';
    state.orders[0].patience = 38;
    world.spawnOrder();
    state.plate = [
      { ing: 'noodles', state: 'cooked' },
      { ing: 'greens', state: 'chopped' },
      { ing: 'egg', state: 'cooked' },
    ];
    stageBurner(world, 0, 'rice', 0.7);
    state.hands = null;
    state.chef.x = 1010;
    state.chef.y = 430;
    state.chef.face = 1;
    state.coins = 124;
    state.served = 10;
    state.combo = 4;
    state.timeLeft = 96;
    state.shift = 1;
    state.popups.push({ x: 1180, y: 372, text: '+20', life: 1.2, color: '#ffd23e' });
    return { screen: SCREEN_PLAY, best: 142 };
  }

  if (name === 'end') {
    world.spawnOrder();
    state.coins = 96;
    state.served = 8;
    state.timeLeft = 0;
    state.over = true;
    state.won = false;
    return { screen: SCREEN_OVER, best: 142 };
  }

  // The cover: the fullest moment — three tickets, a dish mid-assembly on the
  // plate, noodles boiling, greens being chopped, a plate part in hand, timer running.
  world.spawnOrder();
  world.spawnOrder();
  world.spawnOrder();
  state.orders[0].recipe = 'noodle-bowl';
  state.orders[1].recipe = 'fried-rice';
  state.orders[2].recipe = 'skewer-plate';
  state.orders[0].patience = 41;
  state.orders[1].patience = 30;
  state.orders[2].patience = 18;
  stageBurner(world, 0, 'noodles', 0.62);
  stageBurner(world, 1, 'skewer', 0.3);
  state.board = { item: { ing: 'greens', state: 'raw' }, progress: 1.1, need: 2 };
  state.plate = [
    { ing: 'noodles', state: 'cooked' },
    { ing: 'egg', state: 'cooked' },
  ];
  state.hands = { ing: 'greens', state: 'chopped' };
  state.chef.x = 950;
  state.chef.y = 430;
  state.chef.face = -1;
  state.coins = 54;
  state.served = 4;
  state.combo = 2;
  state.timeLeft = 108;
  state.shift = 0;
  return { screen: SCREEN_PLAY, best: 142 };
}
