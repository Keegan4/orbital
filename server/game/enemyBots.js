const Matter = require('matter-js');
const { CONSTANTS, WALL_POS, coords} = require('../../public/js/constants.js');
const { createPlayer, destroyPlayer, spawn, spawnInDungeon } = require('./playerManager.js');
var EasyStar = require('easystarjs');
const { Composite, Engine } = require('matter-js');


 const {FRIENDLY_TEAM,
    ENEMY_TEAM,
    SPAWN_COOLDOWN,
    BOT_LIMIT,
    CELL_SIZE,
    TURN_THRESHOLD,
    NEW_TARGET,
    FIRE_CHANCE,
    GAME_WIDTH,
    GAME_HEIGHT,
    WALL_BUFFER
} = CONSTANTS;


// More variables 
var lastTarget = 0;
var botNum = 0;
const SPRITE_HEIGHT = 46;

// AI Bot creation, we will cheat and use the createPlayer

function createBot(room) {
  const BotID = `BOT-${Date.now()}`;
  console.log('bot create')
  var bot = createPlayer(BotID, room);
  console.log('bot created')

  bot.team = ENEMY_TEAM;

  //Bot specific attributes
  bot.path = null;
  bot.pathIdx = 0;
  bot.target = null;

  reqPath(bot, pixelToTile(spawnInDungeon(room.bspDungeons, SPRITE_HEIGHT)));

  room.io.to(room.code).emit("newPlayer", {
    playerId : room.players[BotID].playerId,
    team : room.players[BotID].team,
    x : room.players[BotID].body.position.x,
    y : room.players[BotID].body.position.y,
    rotation : room.players[BotID].body.angle,
  });
  return bot;
}


const GRID_W = GAME_WIDTH / CELL_SIZE;
const GRID_H = GAME_HEIGHT / CELL_SIZE;

function initEasyStar(room) {
  var easystar = new EasyStar.js();
  easystar.setGrid(room.wallGrid);
  easystar.setAcceptableTiles(0);
  easystar.setTileCost(2);
  easystar.enableDiagonals();
  easystar.enableSync();
  return easystar;
}



function tileToPixel(coord) {
  return {
    x: coord.x * CELL_SIZE + CELL_SIZE / 2,
    y: coord.y * CELL_SIZE + CELL_SIZE / 2
  };
}

function pixelToTile(coord) {
  return {
    x: Math.floor(coord.x / CELL_SIZE),
    y: Math.floor(coord.y / CELL_SIZE)
  }
}

function reqPath(room, bot, coord, botCoords) {

  // Turns out there is a super easy function that helps you create additional points
  // We want to do this so enemies stop overlapping withe each other
  if (botCoords) {
    botCoords.forEach(bot => {
      room.easystar.avoidAdditionalPoint(bot.x, bot.y);
    });
  }
  console.log(bot.body)
  const {x: startx, y: starty} = closestValid(room, pixelToTile(bot.body.position));
  room.easystar.findPath(startx, starty, coord.x, coord.y, path => {
    if (path) {
      bot.path = path;
      bot.pathIdx = 0;
    }else {
      bot.path = null;
    }
    room.easystar.stopAvoidingAllAdditionalPoints();
  });
  room.easystar.calculate();
  
}

function tankSighted(bot, target, room) {

  // Cast a ray forward, anc check if you can see
  // any walls
  const walls = Composite.allBodies(room.world).filter(x => {
    return x.label === "wall" || x.label === "boundary";
  });
  const hits = Matter.Query.ray(
    walls,
    bot.body.position,
    target.body.position
  )

  return hits.length === 0;
}

function botFacing(bot, target) {
  var dy = target.body.position.y - bot.body.position.y;
  var dx = target.body.position.x - bot.body.position.x;
  var reqAngle = Math.atan2(dy, dx) - Math.PI / 2;

  let diff = reqAngle - bot.body.angle;

  // Normalize to [-pi, pi]
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < 0.20;
}

function isOpen(room, x, y) {
  return room.wallGrid[y] !== undefined && room.wallGrid[y][x] !== undefined && room.wallGrid[y][x] !== 0;
}

function closestValid(room, tile) {

  if (isOpen(room, tile.x, tile.y)) {
    return tile;
  } 
  const around = [
    {x:0, y:1}, {x:1, y:0}, {x:0, y:-1}, {x:-1, y:0},
    {x:-1, y:-1}, {x:-1, y:1}, {x:1, y:-1}, {x:1, y:1}
  ];
  for (const i of around) {
    const nearX = tile.x + i.x;
    const nearY = tile.y + i.y;
    if (isOpen(nearX, nearY)) {
      return {x: nearX, y: nearY};
    }
  }
  return tile;
}

function botTarget(bot, room) {
  const choices = Object.values(room.players).filter(p => {
    return !p.playerId.startsWith("BOT-") &&
    p.isAlive;
  });
  if (choices.length === 0) {
    return null;
  }
  let dist = Number.MAX_SAFE_INTEGER;
  let target = choices[0];
  for (let i = 0; i < choices.length; i++) {
    const temp = choices[i];
    var dy = temp.body.position.y - bot.body.position.y;
    var dx = temp.body.position.x - bot.body.position.x;
    var newDist = Math.sqrt(dy * dy + dx * dx);
    if (newDist < dist) {
      dist = newDist;
      target = temp;
    }

  }
  return target; 
}

function moveBot(bot) {

  Object.keys(bot.input).forEach(x => {
    bot.input[x] = false;
  });
  if (!bot.path || bot.pathIdx >= bot.path.length) {
    return;
  }
  
  var nextPoint = tileToPixel(bot.path[bot.pathIdx]);
  var dy = nextPoint.y - bot.body.position.y;
  var dx = nextPoint.x - bot.body.position.x;

  if (Math.sqrt(dy * dy + dx * dx) < 15) {
    bot.pathIdx++;
    
    return;
  }

  var reqAngle = Math.atan2(dy, dx) - Math.PI / 2;
  var toTurn = reqAngle - bot.body.angle;

  // To keep the bot within the range [-pi, pi]
  // So you dont turn 360 for no reason
  if (toTurn > Math.PI) {
    toTurn -= Math.PI * 2;
  } else if (toTurn < -Math.PI) {
    toTurn += Math.PI * 2;
  }

  if (Math.abs(toTurn) < TURN_THRESHOLD) {
    bot.input.up = true;
    
  } else if (Math.abs(toTurn) < TURN_THRESHOLD * 3) {
    // Bots will try to move and turn if 
    // roughly close enough
    bot.input.up = true;
    if (toTurn > 0) {
      bot.input.right = true;
    } else {
      bot.input.left = true;
    }
    
  } else if (toTurn > TURN_THRESHOLD) {
    bot.input.right = true;
  } else {
    bot.input.left = true;
  }
}

function calculatePaths(room) {
  room.easystar.calculate();
}

module.exports = { createBot,
  moveBot,
  botTarget,
  pixelToTile,
  tileToPixel,
  reqPath,
  calculatePaths,
  tankSighted,
  botFacing,
  closestValid,
  initEasyStar
};
