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
    WALL_BUFFER,
    MIN_VALID_MOVE,
    REVERSE_TIME,
    STUCK_THRESHOLD
} = CONSTANTS;


// More variables 
var lastTarget = 0;
var botNum = 0;
const SPRITE_HEIGHT = 46;

// We just gonna stamp these attributes onto the different bots
const botTypes = {
  chaser: {
    name: "chaser",
    speedUps: 0, 
    turnBoost: 0,
    bulletLife: 0,
    bounceUp: -4,
    hpUp: 0,
    canShoot: true, 
    contactDamage: false, 
    explode: false,
    color: "black"
  },

  berserker: {
    name: "berserker",
    speedUps: 4, 
    turnBoost: 4,
    bounceUp: 0,
    hpUp: 1,
    bulletLife: 0,
    canShoot: false, 
    contactDamage: true, 
    explode: false,
    color: "sand"
  },

  exploder: {
    name: "exploder",
    speedUps: -8, 
    bounceUp: 0,
    turnBoost: 0,
    bulletLife: -10,
    hpUp: 2,
    canShoot: false, 
    contactDamage: true, 
    explode: true,
    color: "green"
  },
}

// AI Bot creation, we will cheat and use the createPlayer

function createBot(room, type) {
  const BotID = `BOT-${Date.now()}`;
  var bot = createPlayer(BotID, room, 1 + (type.hpUp || 0));
  bot.team = type.color;

  //Bot specific attributes
  bot.path = null;
  bot.pathIdx = 0;
  bot.target = null;
  bot.botType = type;


  // Stuck detection
  bot.lastPos = { x: bot.body.position.x, y: bot.body.position.y };
  bot.stuckSince = Date.now();
  bot.reverseUntil = 0;
  bot.reverseTurn = 0; //We randomly reverse and turn together



  const x = pixelToTile(spawnInDungeon(room.bspDungeons[Math.floor(Math.random() * room.bspDungeons.length)], SPRITE_HEIGHT));
  reqPath(room, bot, x);

  room.io.to(room.code).emit("newPlayer", {
    playerId : room.players[BotID].playerId,
    name: type.name,
    team : room.players[BotID].team,
    x : room.players[BotID].body.position.x,
    y : room.players[BotID].body.position.y,
    rotation : room.players[BotID].body.angle,
  });
  return bot;
}

function initEasyStar(room) {
  var easystar = new EasyStar.js();
  easystar.setGrid(room.wallGrid);
  easystar.setAcceptableTiles([0, 2]);
  easystar.setTileCost(2, 5);
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

function botFacing(bot, target, error = 0.2) {
  var dy = target.body.position.y - bot.body.position.y;
  var dx = target.body.position.x - bot.body.position.x;
  var reqAngle = Math.atan2(dy, dx) - Math.PI / 2;

  let diff = reqAngle - bot.body.angle;

  // Normalize to [-pi, pi]
  while (diff > Math.PI)  diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < error;
}

function isOpen(room, x, y) {
  return room.wallGrid[y] !== undefined && room.wallGrid[y][x] !== undefined && room.wallGrid[y][x] !== 1;
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
    if (isOpen(room, nearX, nearY)) {
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

  const now = Date.now();

  // Reverse if its triggered
  if (bot.reverseUntil > now) {
    bot.input.down = true;
    if (bot.reverseTurn > 0) {
      bot.input.right = true;
    } else {
      bot.input.left = true;
    }
    return;
  }

  const movedX = bot.body.position.x - bot.lastPos.x;
  const movedY = bot.body.position.y - bot.lastPos.y;
  const movedDist = Math.sqrt(movedX * movedX + movedY * movedY);

  if (movedDist > MIN_VALID_MOVE) {
    // Bot is movinggg
    bot.lastPos = { x: bot.body.position.x, y: bot.body.position.y };
    bot.stuckSince = now;
  } else if (now - bot.stuckSince > STUCK_THRESHOLD) {
    // Reverse since stuck too long
    bot.reverseUntil = now + REVERSE_TIME;
    bot.reverseTurn = Math.random() < 0.5 ? 1 : -2;
    bot.stuckSince = now;
    bot.lastPos = { x: bot.body.position.x, y: bot.body.position.y };
    bot.input.down = true;
  }



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
  initEasyStar,
  botTypes
};
