// Every pixel of the kitchen, drawn with canvas paths — no image files, all
// original art. One job: paint the world state (and the title / pause /
// game-over screens) so the board, the counters and the timer read at a glance.

import { BOARD, BURNERS, FLOOR, INGREDIENTS, INGREDIENT_ORDER, RECIPES, SHIFTS, STATIONS, VIEW } from './config.js';
import { plateMatchesRecipe } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = 'system-ui, "Segoe UI", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function progressRing(ctx, x, y, radius, fraction, color, bg = 'rgba(0,0,0,0.25)') {
  ctx.lineWidth = 7;
  ctx.strokeStyle = bg;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, fraction)));
  ctx.stroke();
}

/** Draw one ingredient as a little dish of food. `state` changes the look: raw is plain, chopped is sliced, cooked is golden, burnt is charcoal. */
export function drawIngredientIcon(ctx, ing, x, y, size, state = 'raw') {
  const def = INGREDIENTS[ing];
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.3);
    ctx.lineTo(s * 0.4, s * 0.4);
    ctx.moveTo(s * 0.4, -s * 0.3);
    ctx.lineTo(-s * 0.4, s * 0.4);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // Little plate under everything.
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.55, s * 0.95, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c48f';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (ing === 'noodles') {
    ctx.strokeStyle = state === 'cooked' ? '#e8a91c' : def.color;
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, i * s * 0.22);
      ctx.bezierCurveTo(-s * 0.2, i * s * 0.22 - s * 0.3, s * 0.2, i * s * 0.22 + s * 0.3, s * 0.6, i * s * 0.22);
      ctx.stroke();
    }
  } else if (ing === 'rice') {
    ctx.fillStyle = state === 'cooked' ? '#f7d774' : '#fff8e0';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.62, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = state === 'cooked' ? '#e8a91c' : '#e8d9a8';
    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath();
      ctx.arc(-s * 0.4 + i * s * 0.13, -s * 0.1 + (i % 2) * s * 0.16, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ing === 'egg') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.72, s * 0.55, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state === 'cooked' ? '#f5a623' : '#ffd23e';
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.05, s * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(s * 0.02, -s * 0.14, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (ing === 'greens') {
    ctx.fillStyle = state === 'chopped' ? '#7cc98a' : def.color;
    for (let i = 0; i < 3; i += 1) {
      const a = -0.5 + i * 0.5;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.35, s * 0.3, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#2f7d3f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.5);
    ctx.lineTo(0, -s * 0.5);
    ctx.stroke();
  } else if (ing === 'chili') {
    ctx.strokeStyle = '#2f7d3f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s * 0.45, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.6, -s * 0.8, s * 0.75, -s * 0.7);
    ctx.stroke();
    ctx.fillStyle = state === 'chopped' ? '#ff7a59' : def.color;
    ctx.beginPath();
    if (state === 'chopped') {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.35 + i * s * 0.35, 0, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.moveTo(s * 0.5, -s * 0.55);
      ctx.quadraticCurveTo(s * 0.1, s * 0.75, -s * 0.55, s * 0.35);
      ctx.quadraticCurveTo(-s * 0.1, s * 0.05, s * 0.5, -s * 0.55);
      ctx.fill();
    }
  } else if (ing === 'skewer') {
    ctx.strokeStyle = '#8a5a28';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(s * 0.8, 0);
    ctx.stroke();
    const cubeColor = state === 'cooked' ? '#a8642a' : def.color;
    ctx.fillStyle = cubeColor;
    for (let i = -1; i <= 1; i += 1) {
      roundRect(ctx, i * s * 0.55 - s * 0.22, -s * 0.24, s * 0.44, s * 0.48, 4);
      ctx.fill();
    }
    ctx.fillStyle = '#57b368';
    roundRect(ctx, -s * 0.05, -s * 0.2, s * 0.3, s * 0.4, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlame(ctx, x, y, t) {
  const flick = Math.sin(t * 9 + x) * 2;
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.quadraticCurveTo(x - 14, y - 26 - flick, x, y - 34 - flick);
  ctx.quadraticCurveTo(x + 14, y - 26 + flick, x + 16, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(x - 9, y);
  ctx.quadraticCurveTo(x - 7, y - 16, x, y - 22);
  ctx.quadraticCurveTo(x + 7, y - 16, x + 9, y);
  ctx.closePath();
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawWallAndFloor(t) {
    // Warm plaster wall, wainscot, tiled floor.
    ctx.fillStyle = '#f7e8c8';
    ctx.fillRect(0, 0, VIEW.width, 430);
    ctx.fillStyle = '#e8d3a8';
    for (let x = 0; x < VIEW.width; x += 96) {
      ctx.fillRect(x, 300, 96, 2);
    }
    // Menu poster on the wall between the bins and the trash.
    ctx.fillStyle = '#2b2118';
    roundRect(ctx, 905, 96, 175, 96, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, '— MENU —', 992, 112, 12, '#ffd23e', '800', 'center');
    text(ctx, 'Noodle Bowl   12', 918, 134, 12, '#f7e8c8', '600');
    text(ctx, 'Fried Rice     12', 918, 154, 12, '#f7e8c8', '600');
    text(ctx, 'Skewer Plate  14', 918, 174, 12, '#f7e8c8', '600');
    // String lights.
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(330, 60);
    ctx.quadraticCurveTo(640, 110, 950, 60);
    ctx.stroke();
    const bulbColors = ['#ffd23e', '#ff6b6b', '#57b368'];
    for (let i = 0; i < 9; i += 1) {
      const bx = 360 + i * 70;
      const by = 60 + Math.sin((bx - 330) / 620 * Math.PI) * 42;
      ctx.fillStyle = bulbColors[i % 3];
      ctx.beginPath();
      ctx.arc(bx, by + 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Floor tiles.
    ctx.fillStyle = '#c98a5a';
    ctx.fillRect(0, 430, VIEW.width, 370);
    ctx.fillStyle = '#b97a4b';
    for (let y = 430; y < VIEW.height; y += 62) {
      for (let x = (y % 124 === 0 ? 0 : 62); x < VIEW.width; x += 124) {
        ctx.fillRect(x, y, 60, 60);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 430, VIEW.width, 8);
    // A woven runner in front of the counters, a crate of veg and a potted plant.
    ctx.fillStyle = '#a33d2a';
    roundRect(ctx, 330, 448, 940, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#c65a3d';
    ctx.fillRect(350, 458, 900, 6);
    ctx.fillRect(350, 478, 900, 6);
    ctx.fillStyle = '#8a5a28';
    roundRect(ctx, 48, 668, 110, 72, 8);
    ctx.fill();
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(48, 692);
    ctx.lineTo(158, 692);
    ctx.moveTo(48, 716);
    ctx.lineTo(158, 716);
    ctx.stroke();
    ctx.fillStyle = '#57b368';
    ctx.beginPath();
    ctx.arc(76, 660, 14, 0, Math.PI * 2);
    ctx.arc(108, 654, 16, 0, Math.PI * 2);
    ctx.arc(136, 662, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e4572e';
    ctx.beginPath();
    ctx.arc(92, 656, 7, 0, Math.PI * 2);
    ctx.arc(124, 660, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b65a3d';
    roundRect(ctx, 1150, 690, 64, 50, 8);
    ctx.fill();
    ctx.fillStyle = '#57b368';
    ctx.beginPath();
    ctx.ellipse(1182, 668, 12, 30, 0.3, 0, Math.PI * 2);
    ctx.ellipse(1182, 664, 10, 26, -0.3, 0, Math.PI * 2);
    ctx.ellipse(1182, 672, 12, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud(state, screen) {
    const config = SHIFTS[state.shift];
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(0, 0, VIEW.width, 64);
    ctx.fillStyle = '#ffd23e';
    text(ctx, 'SIZZLE & SERVE', 20, 34, 26, '#ffd23e', '800');
    text(ctx, config.name, 250, 36, 15, '#f7e8c8', '600');
    // The shift timer: big, centred, red and pulsing when it runs low.
    const low = state.timeLeft <= 30 && screen === SCREEN_PLAY;
    const pulse = low ? 1 + Math.sin(performance.now() / 120) * 0.08 : 1;
    ctx.save();
    ctx.translate(640, 32);
    ctx.scale(pulse, pulse);
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 0, 0, 34, low ? '#ff6b6b' : '#ffffff', '800', 'center');
    ctx.restore();
    text(ctx, 'SHIFT', 640, 12, 11, '#c9b896', '700', 'center');
    // Coins and target.
    text(ctx, `🪙 ${state.coins}`, 1000, 34, 24, '#ffd23e', '800');
    text(ctx, `target ${config.target}`, 1000, 54, 12, '#c9b896', '600');
    text(ctx, `served ${state.served}`, 1150, 26, 15, '#f7e8c8', '700');
    text(ctx, state.combo > 1 ? `COMBO x${state.combo}` : 'no combo', 1150, 48, 13, state.combo > 1 ? '#ff9f43' : '#c9b896', '700');
  }

  function drawOrderBoard(state, t) {
    const { x, y, w, h } = BOARD;
    ctx.fillStyle = '#8a5a28';
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 12);
    ctx.fill();
    ctx.fillStyle = '#a9713a';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    text(ctx, 'ORDER BOARD', x + w / 2, y + 24, 18, '#ffe9b8', '800', 'center');
    ctx.strokeStyle = '#7a4a1e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 42);
    ctx.lineTo(x + w - 16, y + 42);
    ctx.stroke();
    if (state.orders.length === 0) {
      text(ctx, 'No tickets yet…', x + w / 2, y + 120, 16, '#ffe9b8', '600', 'center');
      text(ctx, '…the lunch crowd', x + w / 2, y + 146, 14, '#e8c98f', '600', 'center');
      text(ctx, 'is coming!', x + w / 2, y + 168, 14, '#e8c98f', '600', 'center');
      return;
    }
    state.orders.forEach((order, index) => {
      const recipe = RECIPES.find((r) => r.id === order.recipe);
      const ty = y + 50 + index * 112;
      const urgent = order.patience < 12;
      const flash = urgent && Math.sin(t * 8) > 0;
      ctx.fillStyle = flash ? '#ffe1d6' : '#fff8e7';
      roundRect(ctx, x + 12, ty, w - 24, 104, 8);
      ctx.fill();
      ctx.strokeStyle = urgent ? '#e4572e' : '#d9c48f';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, `#${order.id}  ${recipe.name}`, x + 26, ty + 18, 15, '#2b2118', '800');
      text(ctx, recipe.blurb, x + 26, ty + 38, 12, '#8a6d3b', '600');
      recipe.parts.forEach((part, pi) => {
        drawIngredientIcon(ctx, part.ing, x + 44 + pi * 62, ty + 66, 36, part.state);
      });
      // Patience bar drains as the ticket ages.
      const frac = Math.max(0, order.patience / order.maxPatience);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      roundRect(ctx, x + 26, ty + 90, w - 52, 8, 4);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? '#57b368' : frac > 0.25 ? '#ff9f43' : '#e4572e';
      roundRect(ctx, x + 26, ty + 90, (w - 52) * frac, 8, 4);
      ctx.fill();
    });
  }

  function drawBins(state, hover) {
    const box = STATIONS.bins;
    ctx.fillStyle = '#7a4a1e';
    roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#a9713a';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    text(ctx, 'INGREDIENTS — click or press 1–6', box.x + 14, box.y + 16, 12, '#ffe9b8', '700');
    const binW = box.w / INGREDIENT_ORDER.length;
    INGREDIENT_ORDER.forEach((ing, i) => {
      const bx = box.x + i * binW;
      ctx.fillStyle = i % 2 === 0 ? '#8a5a28' : '#7d5024';
      roundRect(ctx, bx + 5, box.y + 28, binW - 10, 58, 6);
      ctx.fill();
      drawIngredientIcon(ctx, ing, bx + binW / 2, box.y + 52, 38, 'raw');
      text(ctx, `${i + 1}`, bx + 12, box.y + 40, 11, '#ffe9b8', '800');
      text(ctx, INGREDIENTS[ing].short, bx + binW / 2, box.y + 78, 10, '#ffe9b8', '700', 'center');
    });
  }

  function drawBoardStation(state) {
    const box = STATIONS.board;
    ctx.fillStyle = '#7a4a1e';
    roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#d9b380';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    text(ctx, 'CHOP BOARD', box.x + box.w / 2, box.y + 18, 13, '#5a3a14', '800', 'center');
    // Wooden board.
    ctx.fillStyle = '#e8c98f';
    roundRect(ctx, box.x + 22, box.y + 34, box.w - 44, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#b98a4e';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (state.board) {
      const item = state.board.item;
      drawIngredientIcon(ctx, item.ing, box.x + box.w / 2, box.y + 62, 44, item.state);
      if (state.board.progress < state.board.need) {
        progressRing(ctx, box.x + box.w / 2, box.y + 62, 30, state.board.progress / state.board.need, '#57b368');
        text(ctx, 'CHOPPING…', box.x + box.w / 2, box.y + 98, 11, '#5a3a14', '800', 'center');
      } else {
        text(ctx, 'READY — pick it up!', box.x + box.w / 2, box.y + 98, 11, '#2f7d3f', '800', 'center');
      }
    } else {
      text(ctx, 'greens / chilli', box.x + box.w / 2, box.y + 62, 12, '#8a6d3b', '600', 'center');
      text(ctx, 'click to chop', box.x + box.w / 2, box.y + 98, 11, '#8a6d3b', '600', 'center');
    }
  }

  function drawStove(state, t) {
    const box = STATIONS.stove;
    ctx.fillStyle = '#3a3f4a';
    roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#565d6b';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    text(ctx, 'STOVE', box.x + box.w / 2, box.y + 16, 13, '#f7e8c8', '800', 'center');
    BURNERS.forEach((burner, i) => {
      const slot = state.burners[i];
      ctx.fillStyle = '#2b2f38';
      ctx.beginPath();
      ctx.arc(burner.x, burner.y, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1d2026';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (slot) {
        drawFlame(ctx, burner.x, burner.y + 32, t + i * 2);
        const item = slot.item;
        drawIngredientIcon(ctx, item.ing, burner.x, burner.y - 4, 44, item.state);
        if (!slot.done) {
          progressRing(ctx, burner.x, burner.y - 4, 30, slot.progress / slot.need, '#ff9f43');
        } else if (item.state === 'cooked') {
          const graceFrac = slot.grace / 4;
          progressRing(ctx, burner.x, burner.y - 4, 30, graceFrac, graceFrac > 0.4 ? '#57b368' : '#e4572e');
          text(ctx, 'DONE!', burner.x, burner.y + 50, 12, '#57b368', '800', 'center');
        } else {
          text(ctx, 'BURNT!', burner.x, burner.y + 50, 12, '#e4572e', '800', 'center');
        }
      } else {
        text(ctx, 'empty', burner.x, burner.y, 12, '#9aa1ad', '600', 'center');
      }
    });
  }

  function drawPlateStation(state) {
    const box = STATIONS.plate;
    const match = state.orders.some((order) => plateMatchesRecipe(state.plate, RECIPES.find((r) => r.id === order.recipe)));
    ctx.fillStyle = match ? '#2f7d3f' : '#7a4a1e';
    roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#a9713a';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    text(ctx, match ? 'READY TO SERVE!' : 'PLATING', box.x + box.w / 2, box.y + 18, 13, match ? '#b8f0c0' : '#ffe9b8', '800', 'center');
    // The plate itself.
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + 66, 62, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = match ? '#57b368' : '#d9c48f';
    ctx.lineWidth = match ? 4 : 2;
    ctx.stroke();
    if (state.plate.length === 0) {
      text(ctx, 'empty plate', box.x + box.w / 2, box.y + 66, 12, '#b9a06a', '600', 'center');
    } else {
      state.plate.forEach((item, i) => {
        drawIngredientIcon(ctx, item.ing, box.x + 42 + i * 52, box.y + 62, 40, item.state);
      });
    }
    const slots = state.plate.length;
    text(ctx, `${slots}/3 parts`, box.x + box.w / 2, box.y + 98, 11, '#ffe9b8', '700', 'center');
  }

  function drawServeWindow(state, t) {
    const box = STATIONS.serve;
    const match = state.orders.some((order) => plateMatchesRecipe(state.plate, RECIPES.find((r) => r.id === order.recipe)));
    ctx.fillStyle = '#7a4a1e';
    roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#2e4a6b';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    // A hungry customer silhouette at the window.
    ctx.fillStyle = '#1d2f45';
    ctx.beginPath();
    ctx.arc(box.x + box.w / 2, box.y + 52, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + 108, 42, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(box.x + box.w / 2 - 7, box.y + 50, 3, 0, Math.PI * 2);
    ctx.arc(box.x + box.w / 2 + 7, box.y + 50, 3, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'SERVE', box.x + box.w / 2, box.y + 18, 13, '#ffe9b8', '800', 'center');
    // Service bell, ringing when a dish is ready.
    const bellY = box.y + box.h - 16;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(box.x + 24, bellY - 8, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(box.x + 18, bellY - 8, 12, 4);
    if (match) {
      const glow = 0.5 + Math.sin(t * 6) * 0.3;
      ctx.fillStyle = `rgba(255,210,62,${glow})`;
      ctx.beginPath();
      ctx.arc(box.x + 24, bellY - 8, 18, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'RING IT!', box.x + box.w / 2, box.y + box.h - 12, 12, '#ffd23e', '800', 'center');
    }
  }

  function drawTrash(state) {
    const box = STATIONS.trash;
    ctx.fillStyle = '#7a4a1e';
    roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#565d6b';
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
    ctx.fillStyle = '#3a3f4a';
    roundRect(ctx, box.x + 52, box.y + 34, 66, 46, 6);
    ctx.fill();
    ctx.fillStyle = '#2b2f38';
    ctx.fillRect(box.x + 46, box.y + 26, 78, 10);
    text(ctx, 'TRASH', box.x + box.w / 2, box.y + 16, 12, '#f7e8c8', '800', 'center');
    text(ctx, 'bin the burnt', box.x + box.w / 2, box.y + 88, 10, '#c9b896', '600', 'center');
  }

  function drawChef(state) {
    const chef = state.chef;
    const bob = chef.moving ? Math.sin(chef.walkPhase) * 3 : 0;
    const x = chef.x;
    const y = chef.y + bob;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, chef.y + 34, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: apron and arms.
    ctx.fillStyle = '#e8e4da';
    roundRect(ctx, x - 20, y - 6, 40, 40, 12);
    ctx.fill();
    ctx.fillStyle = '#2e86ab';
    roundRect(ctx, x - 20, y + 8, 40, 26, 10);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#f2c094';
    ctx.beginPath();
    ctx.arc(x, y - 22, 17, 0, Math.PI * 2);
    ctx.fill();
    // Chef hat.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 10, y - 34, 10, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 34, 10, 0, Math.PI * 2);
    ctx.arc(x, y - 38, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 15, y - 32, 30, 8);
    // Eyes look the way the chef faces.
    ctx.fillStyle = '#2b2118';
    ctx.beginPath();
    ctx.arc(x + chef.face * 4 - 5, y - 22, 2.2, 0, Math.PI * 2);
    ctx.arc(x + chef.face * 4 + 5, y - 22, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // What the chef carries, held high over the hat.
    if (state.hands) {
      drawIngredientIcon(ctx, state.hands.ing, x, y - 62, 40, state.hands.state);
    }
    // Walk target marker.
    if (chef.moving) {
      ctx.strokeStyle = 'rgba(255,210,62,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(chef.tx, chef.ty + 30, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSteam(state) {
    for (const puff of state.steam) {
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, puff.life) * 0.5})`;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.size * (1.6 - puff.life), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPopups(state) {
    for (const popup of state.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, popup.life));
      text(ctx, popup.text, popup.x, popup.y - (1.4 - popup.life) * 30, 22, popup.color, '800', 'center');
      ctx.restore();
    }
  }

  function drawHint(state) {
    if (state.hintTimer <= 0 || !state.hint) return;
    ctx.fillStyle = 'rgba(43,33,24,0.88)';
    const w = Math.min(720, 40 + state.hint.length * 8.5);
    roundRect(ctx, VIEW.width / 2 - w / 2, 700, w, 40, 20);
    ctx.fill();
    text(ctx, state.hint, VIEW.width / 2, 721, 16, '#ffe9b8', '700', 'center');
  }

  function drawControlsBar(state) {
    ctx.fillStyle = 'rgba(43,33,24,0.85)';
    ctx.fillRect(0, 764, VIEW.width, 36);
    text(ctx, 'Click a station to walk there & work it  •  WASD / arrows to walk  •  Space to work nearest station  •  1–6 grab ingredients  •  P pause  •  M music', VIEW.width / 2, 782, 13, '#f7e8c8', '600', 'center');
  }

  function drawTitleOverlay(state, best) {
    ctx.fillStyle = 'rgba(43,33,24,0.55)';
    ctx.fillRect(0, 64, VIEW.width, 700);
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, 340, 170, 600, 380, 16);
    ctx.fill();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, 'SIZZLE & SERVE', 640, 230, 46, '#e4572e', '800', 'center');
    text(ctx, 'The Little Noodle Stall', 640, 272, 20, '#8a6d3b', '700', 'center');
    text(ctx, 'Tickets come in on the board. Chop it, cook it,', 640, 322, 17, '#2b2118', '600', 'center');
    text(ctx, 'plate it, ring the bell — before patience runs out!', 640, 348, 17, '#2b2118', '600', 'center');
    text(ctx, '3 shifts. Beat each coin target to keep the stall open.', 640, 382, 15, '#8a6d3b', '600', 'center');
    ctx.fillStyle = '#e4572e';
    roundRect(ctx, 490, 410, 300, 56, 12);
    ctx.fill();
    text(ctx, 'OPEN THE STALL  ▶', 640, 439, 20, '#ffffff', '800', 'center');
    text(ctx, 'Click or press Space to start  •  best shift score: ' + best, 640, 500, 14, '#8a6d3b', '600', 'center');
  }

  function drawPausedOverlay() {
    ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillRect(0, 64, VIEW.width, 700);
    text(ctx, 'PAUSED', 640, 380, 54, '#ffffff', '800', 'center');
    text(ctx, 'Press P or Space to keep cooking', 640, 430, 18, '#ffe9b8', '600', 'center');
  }

  function drawOverOverlay(state, best) {
    ctx.fillStyle = 'rgba(43,33,24,0.62)';
    ctx.fillRect(0, 64, VIEW.width, 700);
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, 340, 180, 600, 360, 16);
    ctx.fill();
    ctx.strokeStyle = state.won ? '#57b368' : '#e4572e';
    ctx.lineWidth = 4;
    ctx.stroke();
    if (state.won) {
      text(ctx, 'STALL LEGEND!', 640, 250, 44, '#2f7d3f', '800', 'center');
      text(ctx, 'Three shifts survived — the night market', 640, 300, 17, '#2b2118', '600', 'center');
      text(ctx, 'is yours. The little stall made it big.', 640, 326, 17, '#2b2118', '600', 'center');
    } else {
      text(ctx, 'SHIFT OVER', 640, 250, 44, '#e4572e', '800', 'center');
      text(ctx, `Target was ${SHIFTS[state.shift].target} coins — you made ${state.coins}.`, 640, 300, 17, '#2b2118', '600', 'center');
      text(ctx, 'The stall closes early tonight…', 640, 326, 17, '#2b2118', '600', 'center');
    }
    text(ctx, `Dishes served: ${state.served}    Best combo: x${state.bestCombo}    Walk-outs: ${state.expired}`, 640, 380, 15, '#8a6d3b', '700', 'center');
    text(ctx, `Coins: ${state.coins}    Best: ${best}`, 640, 412, 18, '#2b2118', '800', 'center');
    ctx.fillStyle = state.won ? '#2f7d3f' : '#e4572e';
    roundRect(ctx, 490, 440, 300, 56, 12);
    ctx.fill();
    text(ctx, state.won ? 'PLAY AGAIN  ▶' : 'TRY AGAIN  ▶', 640, 469, 20, '#ffffff', '800', 'center');
    text(ctx, 'Click or press Space to restart', 640, 520, 14, '#8a6d3b', '600', 'center');
  }

  return {
    draw(state, screen, best, t) {
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      drawWallAndFloor(t);
      drawOrderBoard(state, t);
      drawBins(state);
      drawBoardStation(state);
      drawStove(state, t);
      drawPlateStation(state);
      drawServeWindow(state, t);
      drawTrash(state);
      drawSteam(state);
      drawChef(state);
      drawPopups(state);
      drawHint(state);
      drawControlsBar(state);
      drawHud(state, screen);
      if (screen === SCREEN_TITLE) drawTitleOverlay(state, best);
      else if (screen === SCREEN_PAUSED) drawPausedOverlay();
      else if (screen === SCREEN_OVER) drawOverOverlay(state, best);
    },
  };
}
