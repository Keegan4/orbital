const { test } = require('node:test');
const assert = require('node:assert');
const { pixelToTile, tileToPixel, closestValid } = require('./enemyBots.js');


test('pixelToTile floors into the correct cell', () => {
  // CELL_SIZE = 32, so pixel 40 -> tile 1, pixel 15 -> tile 0
  assert.deepStrictEqual(pixelToTile({ x: 40, y: 15 }), { x: 1, y: 0 });
});


test('tileToPixel returns the CENTER of the cell, not the corner', () => {
  // tile (1, 0) center = (1*32 + 16, 0*32 + 16) = (48, 16)
  assert.deepStrictEqual(tileToPixel({ x: 1, y: 0 }), { x: 48, y: 16 });
});

test('the function correctly inverses', () => {
  const tile = { x: 3, y: 5 }
  assert.deepStrictEqual(pixelToTile(tileToPixel(tile)), tile);
});

// Testing closest valid

// we need to create a makeshift grid to test this

test('closestValid returns the same tile if it is already floor', () => {
  const room = {
    wallGrid: [
      [1, 1, 1],
      [1, 0, 1],   // 0 = floor at (1,1)
      [1, 1, 1],
    ],
  };
  assert.deepStrictEqual(closestValid(room, { x: 1, y: 1 }), { x: 1, y: 1 });
});

test('closestValid will return a empty spot if floor', () => {
  const room = {
    wallGrid: [
      [1, 1, 1],
      [1, 1, 0],   // 0 = floor at (2,1)
      [1, 1, 1],   // 1 = wall at (1, 1)
    ],
  };
  assert.deepStrictEqual(closestValid(room, { x: 1, y: 1 }), { x: 2, y: 1 });
});


test('closestValid falls back to the original if no available spot', () => {
  const room = { wallGrid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] }; // all walls
  assert.deepStrictEqual(closestValid(room, { x: 1, y: 1 }), { x: 1, y: 1 });
});