const Matter = require('matter-js');
const { CONSTANTS } = require('../../public/js/constants.js');
const { destroyBullet } = require('./bulletManager.js');

const {
  CATEGORY_TANK,
  CATEGORY_WALL,
  CATEGORY_BULLET,
  RESPAWN_LIMIT,
  MIN_DIST,
  CATEGORY_BOUNDARY,
  RED_TEAM,
  BLUE_TEAM
} = CONSTANTS;

const SPRITE_WIDTH = 42;
const SPRITE_HEIGHT = 46;

// Respawn with no params just gives you a random spawn
function spawnRand() {
  return {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
  };
}

// Ensure respawn is not within a certain radius of other tanks
function spawn(body, room) {
  var tries = 0;

  while (tries < RESPAWN_LIMIT) {
    var {x, y} = spawnRand();
    if (Object.values(room.players).every(player => {
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

function createPlayer(socketId, room) {

  // Using spawn makes sure it wont spawn too close to things
  const { x, y } = spawn(null, room);

  const body = Matter.Bodies.rectangle(x, y, SPRITE_WIDTH, SPRITE_HEIGHT, {
    frictionAir: 0.1,
    label: 'tank',
    collisionFilter: {
      category: CATEGORY_TANK,
      mask: CATEGORY_WALL | CATEGORY_BULLET | CATEGORY_TANK | CATEGORY_BOUNDARY
    }
  });

  Matter.Composite.add(room.world, body);

  const player = {
    playerId: socketId,
    team: Math.floor(Math.random() * 2) === 0 ? RED_TEAM : BLUE_TEAM,
    body,
    input: { left: false, right: false, up: false, down: false, fire: false },
    lastFired: 0,
    isAlive: true,
    score: 0,
    createdAt: Date.now(),
    powerups: [],
    stats: {}
  };
  room.players[socketId] = player;
  return player;
}

function destroyPlayer(id, room) {
  if (!room.players[id]) return;
  Object.values(room.bullets).forEach(x => {
    console.log(x);
    if (x.ownerId === id) {
      destroyBullet(x.id, room);
    }
  });
  Matter.Composite.remove(room.world, room.players[id].body);
  delete room.players[id];
}

module.exports = {
  createPlayer,
  destroyPlayer,
  spawn
};
