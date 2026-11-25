// Keyboard and mouse input, translated into game actions. One job: turn raw
// events into "the chef should go there and do that", plus the held movement keys.
// Click a station to walk to it and work it; click the floor to walk there;
// WASD or arrows walk directly; Space/E works the nearest station; 1-6 grab an
// ingredient; M toggles the music; P pauses.

import { BURNERS, INGREDIENT_ORDER, STATIONS } from './config.js';

export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_MUSIC = 1 << 2;
export const ACTION_INTERACT = 1 << 3;

const KEY_MAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
};

export function createInput(canvas, world, onAction) {
  const keys = new Set();
  let actions = ACTION_NONE;
  let interacted = false;

  function stationAt(px, py) {
    for (const name of Object.keys(STATIONS)) {
      const box = STATIONS[name];
      if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) return name;
    }
    return null;
  }

  function clickToLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function workStation(name, point) {
    const chef = world.state.chef;
    const box = STATIONS[name];
    const standX = Math.max(box.x + 20, Math.min(box.x + box.w - 20, point ? point.x : chef.x));
    const standY = box.standY;
    if (name === 'bins' && point) {
      const binWidth = box.w / INGREDIENT_ORDER.length;
      const index = Math.max(0, Math.min(INGREDIENT_ORDER.length - 1, Math.floor((point.x - box.x) / binWidth)));
      world.walkTo(standX, standY, () => {
        const result = world.interactAt('bin', INGREDIENT_ORDER[index]);
        onAction(result);
      });
      return;
    }
    if (name === 'stove' && point) {
      const burner = point.x < (BURNERS[0].x + BURNERS[1].x) / 2 ? 0 : 1;
      world.walkTo(standX, standY, () => {
        const result = world.interactAt('stove', burner);
        onAction(result);
      });
      return;
    }
    world.walkTo(standX, standY, () => {
      const result = world.interactAt(name);
      onAction(result);
    });
  }

  function interactNearest() {
    const name = world.nearestStation();
    if (!name) return;
    if (name === 'bins' || name === 'stove') {
      // Keyboard interact uses the chef's current x to pick the bin/burner.
      workStation(name, { x: world.state.chef.x, y: 0 });
      return;
    }
    const box = STATIONS[name];
    world.walkTo(box.x + box.w / 2, box.standY, () => {
      const result = world.interactAt(name);
      onAction(result);
    });
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = clickToLogical(event);
    const name = stationAt(point.x, point.y);
    if (name) workStation(name, point);
    else world.walkTo(point.x, point.y, null);
  });

  window.addEventListener('keydown', (event) => {
    const move = KEY_MAP[event.key];
    if (move) {
      keys.add(move);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (event.key === ' ' || event.key === 'Enter' || event.key === 'e' || event.key === 'E') {
      actions |= ACTION_CONFIRM;
      if (!interacted) {
        interacted = true;
        interactNearest();
        window.setTimeout(() => { interacted = false; }, 120);
      }
      event.preventDefault();
    } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.key === 'm' || event.key === 'M') {
      actions |= ACTION_MUSIC;
    } else if (/^[1-6]$/.test(event.key)) {
      const ing = INGREDIENT_ORDER[Number(event.key) - 1];
      const box = STATIONS.bins;
      const binWidth = box.w / INGREDIENT_ORDER.length;
      const index = INGREDIENT_ORDER.indexOf(ing);
      const standX = box.x + binWidth * index + binWidth / 2;
      world.walkTo(standX, box.standY, () => {
        const result = world.interactAt('bin', ing);
        onAction(result);
      });
    }
  });

  window.addEventListener('keyup', (event) => {
    const move = KEY_MAP[event.key];
    if (move) keys.delete(move);
  });

  window.addEventListener('blur', () => keys.clear());

  return {
    keys,
    /** Actions raised since the last call (confirm / pause / music). */
    takeActions() {
      const taken = actions;
      actions = ACTION_NONE;
      return taken;
    },
  };
}
