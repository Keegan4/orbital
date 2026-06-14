const Matter = require('matter-js');
const { CONSTANTS, WALL_POS, coords} = require('../../public/js/constants.js');
const { createPlayer, destroyPlayer, spawn } = require('./playerManager.js');
var EasyStar = require('easystarjs');


 const {FRIENDLY_TEAM,
    ENEMY_TEAM,
    SPAWN_COOLDOWN,
    BOT_LIMIT,
    CELL_SIZE,
    TURN_THRESHOLD,
    NEW_TARGET,
    FIRE_CHANCE,
    GAME_WIDTH,
    GAME_HEIGHT
} = CONSTANTS;


// More variables 
var lastTarget = 0;
var botNum = 0;

// AI Bot creation, we will cheat and use the createPlayer

function createBot(room) {
  const BotID = `BOT-${Date.now()}-${botNum}`;
  botNum++;

  var bot = createPlayer(BotID, room);


  bot.team = ENEMY_TEAM;

  //Bot specific attributes
  bot.path = null;
  bot.pathIdx = 0;
  bot.target = null;

  reqPath(bot, pixelToTile({ x: Math.floor(Math.random() * 700) + 50, y: Math.floor(Math.random() * 500) + 50 }));

  console.log(`Bot created ID: ${BotID}`);
  room.io.to(room.code).emit("newPlayer", {
    playerId : room.players[BotID].playerId,
    team : room.players[BotID].team,
    x : room.players[BotID].body.position.x,
    y : room.players[BotID].body.position.y,
    rotation : room.players[BotID].body.angle,
  });
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
  const x1 = Math.floor(w.x1 / CELL_SIZE);
  const x2 = Math.ceil(w.x2 / CELL_SIZE);
  const y1 = Math.floor(w.y1 / CELL_SIZE);
  const y2 = Math.ceil(w.y2 / CELL_SIZE);
  for (var y = y1; y < y2; y++) {
    for (var x = x1; x < x2; x++) {
      // We set impassable walls to be 0
      if (grid[y] !== undefined && grid[y][x] !== undefined) {
        grid[y][x] = 0;
      }
    }
  }
});


var easystar = new EasyStar.js();
easystar.setGrid(grid);
easystar.setAcceptableTiles([1]);
easystar.enableDiagonals();


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

function reqPath(bot, coord) {
  const {x: startx, y: starty} = pixelToTile(bot.body.position);
  easystar.findPath(startx, starty, coord.x, coord.y, path => {
    if (path) {
      bot.path = path;
      bot.pathIdx = 0;
    }else {
      bot.path = null;
    }
  });
}

function botTarget(bot, room) {
  const choices = Object.values(room.players).filter(p => {
    return !p.playerId.startsWith("BOT-") &&
    p.isAlive;
  });
  if (choices.length === 0) {
    return null;
  }
  return choices[Math.floor(Math.random() * choices.length)]; 
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
  calculatePaths
};
