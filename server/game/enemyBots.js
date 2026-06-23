const Matter = require('matter-js');
const { CONSTANTS, WALL_POS, coords} = require('../../public/js/constants.js');
const { createPlayer, destroyPlayer, spawn } = require('./playerManager.js');
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

// AI Bot creation, we will cheat and use the createPlayer

function createBot(room) {
  const BotID = `BOT-${Date.now()}`;

  var bot = createPlayer(BotID, room);


  bot.team = ENEMY_TEAM;

  //Bot specific attributes
  bot.path = null;
  bot.pathIdx = 0;
  bot.target = null;

  reqPath(bot, pixelToTile({ x: Math.floor(Math.random() * 700) + 50, y: Math.floor(Math.random() * 500) + 50 }));

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
const grid = []
for (var i = 0; i < GRID_H; i++) {
  grid[i] = []
  for (var j = 0; j < GRID_W; j++) {
    grid[i][j] = 1;
  }
}

coords.forEach(w => {

  const x1 = Math.floor((w.x1) / CELL_SIZE);
  const x2 = Math.ceil((w.x2) / CELL_SIZE);
  const y1 = Math.floor((w.y1) / CELL_SIZE);
  const y2 = Math.ceil((w.y2) / CELL_SIZE);

  // Buffer

  for (var y = y1 - WALL_BUFFER; y < y2 + WALL_BUFFER; y++) {
    for (var x = x1 - WALL_BUFFER; x < x2 + WALL_BUFFER; x++) {
      
      if (grid[y] === undefined || grid[y][x] === undefined ) {
        continue;
      } else if (y < y1 || y > y2 || x < x1 || x > x2) {
        // We set tiles close to the wall as 2
        // And increase the cost of these tiles to 
        // discourage tanks from being close to walls
        grid[y][x] = 2;
      } else {
        // We set impassable walls to be 0
        grid[y][x] = 0;
      }
    }
  }
});


var easystar = new EasyStar.js();
easystar.setGrid(grid);
easystar.setAcceptableTiles([1, 2]);
easystar.setTileCost(2, 5);
easystar.enableDiagonals();
easystar.enableSync();


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

function reqPath(bot, coord, botCoords) {

  // Turns out there is a super easy function that helps you create additional points
  // We want to do this so enemies stop overlapping withe each other
  if (botCoords) {
    botCoords.forEach(bot => {
      easystar.avoidAdditionalPoint(bot.x, bot.y);
    });
  }
  const {x: startx, y: starty} = pixelToTile(bot.body.position);
  easystar.findPath(startx, starty, coord.x, coord.y, path => {
    if (path) {
      bot.path = path;
      bot.pathIdx = 0;
    }else {
      bot.path = null;
    }
    easystar.stopAvoidingAllAdditionalPoints();
  });
  easystar.calculate();
  
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

function closestValid(tile) {
  // The ? is a optional chainer thingy
  // So if it is undefined it dosent explode
  if (grid[tile.y]?.[tile.x] !== 0) {
    return tile;
  } 
  const around = [
    {x:0, y:1}, {x:1, y:0}, {x:0, y:-1}, {x:-1, y:0},
    {x:-1, y:-1}, {x:-1, y:1}, {x:1, y:-1}, {x:1, y:1}
  ];
  for (const i of around) {
    const nearX = tile.x + i.x;
    const nearY = tile.y + i.y;
    if (grid[nearY]?.[nearX] !== 0) {
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

function calculatePaths() {
  easystar.calculate();
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
  closestValid
};
