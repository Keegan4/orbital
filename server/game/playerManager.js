const Matter = require('matter-js');
const { engine, world } = require('./physics.js');
const state = require('../state.js');
const { CONSTANTS } = require('../../public/js/constants.js');

const {
  CATEGORY_TANK,
  CATEGORY_WALL,
  CATEGORY_BULLET,
  RESPAWN_LIMIT,
  MIN_DIST,
} = CONSTANTS;

// Respawn with no params just gives you a random spawn
function spawnRand() {
  return {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
  };
}

// Ensure respawn is not within a certain radius of other tanks
function spawn(body) {
  var tries = 0;

  while (tries < RESPAWN_LIMIT) {
    var {x, y} = spawnRand();
    if (Object.values(state.players).every(player => {
      if (player.body === body) return true;
      if (!player.isAlive) return true;
      const dx = player.body.position.x - x;
      const dy = player.body.position.y - y;

      //My debugging
      if (Math.sqrt(dx * dx + dy * dy) > MIN_DIST) {
        console.log(`Distance found!: ${Math.sqrt(dx * dx + dy * dy)}`);
      }
      return Math.sqrt(dx * dx + dy * dy) > MIN_DIST;
    })) {
      return {x: x, y: y};
    }else {
      tries++;
    }
  }
  console.log("No distance found :(");
  return {x: x, y: y};
}

function createPlayer(socketId) {
  const spriteWidth = 42;
  const spriteHeight = 46;
  const { x, y } = spawn(null);

  const body = Matter.Bodies.rectangle(x, y, spriteWidth, spriteHeight, {
    frictionAir: 0.1,
    label: 'tank',
    collisionFilter: {
      category: CATEGORY_TANK,
      mask: CATEGORY_WALL | CATEGORY_BULLET | CATEGORY_TANK
    }
  });

  Matter.Composite.add(world, body);

  return {
    playerId: socketId,
    team: Math.floor(Math.random() * 2) === 0 ? 'red' : 'blue',
    body,
    input: { left: false, right: false, up: false, down: false },
    lastFired: 0,
    isAlive: true,
    score: 0,
    createdAt: Date.now()
  };
}

function destroyPlayer(id) {
  if (!state.players[id]) return;
  Matter.Composite.remove(world, state.players[id].body);
  delete state.players[id];
}

module.exports = {
  createPlayer,
  destroyPlayer,
  spawn
};
