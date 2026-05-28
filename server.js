// Dependencies
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Matter = require('matter-js');

app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// CONSTANTS
const {CONSTANTS, WALL_POS} = require('./public/js/constants.js');

const {TICK_RATE, 
    TANK_SPEED,
    TANK_ANGULAR_SPEED,
    GAME_WIDTH,
    GAME_HEIGHT,
    WALL_THICKNESS,
    BULLET_SPEED,
    BULLET_RADIUS,
    MAX_BOUNCES,
    FIRE_COOLDOWN,
    BULLET_LIFESPAN,
    CATEGORY_WALL,
    CATEGORY_BULLET,
    CATEGORY_TANK,
    RESPAWN_LIMIT,
    MIN_DIST
  } = CONSTANTS;
const TICK_DELTA = 1 / TICK_RATE;

// Physics engine initialisation
var engine = Matter.Engine.create();
engine.gravity.y = 0;
var world = engine.world;

// Walls
const wallOptions = { isStatic : true, 
                      label : 'wall', 
                      collisionFilter : { category : CATEGORY_WALL,
                                          mask : CATEGORY_BULLET | CATEGORY_TANK
                                        }
                    };
const topWall    = Matter.Bodies.rectangle(GAME_WIDTH / 2, -WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOptions);
const bottomWall = Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOptions);
const leftWall   = Matter.Bodies.rectangle(-WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);
const rightWall  = Matter.Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);

const interiorWalls = WALL_POS.map(w => 
  Matter.Bodies.rectangle(
    w.x + w.w / 2,
    w.y + w.h / 2,
    w.w,
    w.h,
    wallOptions 
  )
)
Matter.Composite.add(world, [topWall, bottomWall, leftWall, rightWall, ...interiorWalls]);
//Matter.Composite.add(world, interiorWalls);

// Global variables
var players = {};
var bullets = {};
var bulletIdCounter = 0;

// Helper functions
function createPlayer(socketId) {
  const spriteWidth = 42;
  const spriteHeight = 46;
  var {x, y} = spawn(null);
  var body = Matter.Bodies.rectangle(x, y, spriteWidth, spriteHeight, 
    { frictionAir : 0.1, 
      label : 'tank',
      collisionFilter : { category : CATEGORY_TANK,
                         mask : CATEGORY_WALL | CATEGORY_BULLET | CATEGORY_TANK // collides with walls and bullets
                       } 
    });
  
  Matter.Composite.add(world, body);
  return {
    playerId : socketId,
    team : (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
    body : body,
    input : { left : false, right : false, up : false, down : false },
    lastFired : 0,
    isAlive : true,
    score: 0,
    createdAt: Date.now()
  };
}

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
    if (Object.values(players).every(player => {
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

function destroyPlayer(id) {
  if (!players[id]) return;
  Matter.Composite.remove(world, players[id].body);
  delete players[id];
}

function createBullet(player) {
  const angle  = player.body.angle + Math.PI / 2;
  const spawnX = player.body.position.x + Math.cos(angle) * 40;
  const spawnY = player.body.position.y + Math.sin(angle) * 40;

  const body = Matter.Bodies.circle(spawnX, spawnY, BULLET_RADIUS, {
    frictionAir : 0,        // bullets don't slow down
    friction : 0,
    restitution : 1,        // perfect bounce
    isSensor : false,
    label : 'bullet',
    collisionFilter: {
      category: CATEGORY_BULLET,
      mask: CATEGORY_WALL | CATEGORY_TANK
    }
  });

  // Set initial velocity
  Matter.Body.setVelocity(body, {
    x: Math.cos(angle) * BULLET_SPEED * TICK_DELTA,
    y: Math.sin(angle) * BULLET_SPEED * TICK_DELTA,
  });

  Matter.Composite.add(world, body);

  const bullet = {
    id : bulletIdCounter++,
    ownerId : player.playerId,
    body : body,
    bounces : 0,
    createdAt: Date.now()
  };

  bullets[bullet.id] = bullet;
  return bullet;
}

function destroyBullet(id) {
  if (!bullets[id]) return;
  Matter.Composite.remove(world, bullets[id].body);
  delete bullets[id];
}

// Event listener
Matter.Events.on(engine, 'collisionStart', function(event) {
  event.pairs.forEach(pair => {
    const { bodyA, bodyB } = pair;

    const bulletBody = bodyA.label === 'bullet' 
                       ? bodyA 
                       : bodyB.label === 'bullet' 
                       ? bodyB 
                       : null;
    const tankBody = bodyA.label === 'tank' 
                     ? bodyA 
                     : bodyB.label === 'tank' 
                     ? bodyB 
                     : null;
    const wallBody = bodyA.label === 'wall' 
                     ? bodyA 
                     : bodyB.label === 'wall' 
                     ? bodyB 
                     : null;
                  

    if (!bulletBody) return;

    const bullet = Object.values(bullets).find(b => b.body === bulletBody);
    if (!bullet) return;

    // Bullet hit a wall — count bounce
    if (wallBody) {
      bullet.bounces++;
      if (bullet.bounces >= MAX_BOUNCES) {
        destroyBullet(bullet.id);
      } else {
        io.emit('sfx', { type : 'bulletBounce', x : bullet.body.position.x, y : bullet.body.position.y });
      }
      return;
    }

    // Bullet hit a tank
    if (tankBody) {

      const player = Object.values(players).find(p => p.body === tankBody);
      if (!player || !player.isAlive) return;
      //if (bullet.ownerId === player.playerId) return; // no self hit
      player.isAlive = false;
      Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(player.body, 0);
      player.body.isSensor = true;      
      //io.emit('playerHit', { playerId: player.playerId });
      destroyBullet(bullet.id);

      io.emit('sfx', { 
        type : 'tankHit', 
        x : player.body.position.x, 
        y : player.body.position.y, 
        playerId: player.playerId,
        score: player.score,
        timeAlive: Date.now() - player.createdAt
      });

      // Players cant shoot themselves for more points
      if (bullet.ownerId !== player.playerId) {
        const firer = players[bullet.ownerId];
        if (firer) {
          firer.score++;
          scoreUpdate();
        }

      }
      //destroyPlayer(player.playerId);
    }
  });
});

function scoreUpdate() {
  // Basically we will be displaying a hashmap? (whatever its called in js)
  // Where the key is your name and the value is your score/kills
  // For now our name will just be the socketID

  var scoreBoard = Object.values(players)
    .map(player => ({
      name: player.playerId.slice(0, 5),
      score: player.score}))
    .sort((a, b) => b.score - a.score);
  io.emit("scoreUpdate", scoreBoard);
}

// GAME LOOP
setInterval(() => {
  const now = Date.now();
  
  Object.values(players).forEach(player => {
    if (!player.isAlive) return;
    const { input, body } = player;
    let turnDirection = 0;
    if (input.left) { 
      turnDirection -= 1;
    } 
    if (input.right) { 
      turnDirection += 1;
    }
    Matter.Body.setAngularVelocity(body, TANK_ANGULAR_SPEED * TICK_DELTA * turnDirection);

    let moveDirection = 0;
    const angle = body.angle - Math.PI / 2;
    if (input.up) {
      moveDirection -= 1;
    }
    if (input.down) {
      moveDirection += 1;
    }
    Matter.Body.setVelocity(body, { x : Math.cos(angle) * TANK_SPEED * TICK_DELTA * moveDirection, 
      y : Math.sin(angle) * TANK_SPEED * TICK_DELTA * moveDirection });

    if (input.fire && now - player.lastFired > FIRE_COOLDOWN) {
      player.lastFired = now;
      createBullet(player);
      io.to(player.playerId).emit('sfx', { type : 'shoot' }); //only emits to shooter, but might want to find tanks within a radius to emit to too
    }  
  });

  Object.values(bullets).forEach(bullet => {
    if (Date.now() - bullet.createdAt > BULLET_LIFESPAN) {
      destroyBullet(bullet.id);
    }
  });

  Matter.Engine.update(engine, 1000 / TICK_RATE);
  // Broadcast state to all clients
  io.emit('gameState', {
    players: Object.values(players).map(p => ({
      playerId : p.playerId,
      team : p.team,
      x : p.body.position.x,
      y : p.body.position.y,
      rotation : p.body.angle,
      isAlive:  p.isAlive
    })),
    bullets : Object.values(bullets).map(b => ({
      id : b.id,
      x : b.body.position.x,
      y : b.body.position.y,
      vx : b.body.velocity.x,
      vy : b.body.velocity.y
    }))
  });
}, 1000 / TICK_RATE);


io.on('connection', function (socket) {
  console.log('user ' + socket.id + ': connected');

  // Start state of this player
  players[socket.id] = createPlayer(socket.id);

  // Display the scoreboard once connected
  scoreUpdate();

  // Send the players object to the this player
  socket.emit('currentPlayers', Object.fromEntries(
    Object.entries(players).map(([id, p]) => [id, {
      playerId : p.playerId,
      team : p.team,
      x : p.body.position.x,
      y : p.body.position.y,
      rotation : p.body.angle,
    }])
  ));

  // Update all other players of this player
  socket.broadcast.emit('newPlayer', {
    playerId : players[socket.id].playerId,
    team : players[socket.id].team,
    x : players[socket.id].body.position.x,
    y : players[socket.id].body.position.y,
    rotation : players[socket.id].body.angle,
  });

  socket.on('playerInput', function (input) {
    if (players[socket.id]) {
      players[socket.id].input = input;
    }
  });

  socket.on("respawnRequest", () => {
    if (players[socket.id]) {
      const player = players[socket.id];
      player.isAlive = true;
      player.body.isSensor = false;
      player.createdAt = Date.now();    
      Matter.Body.setPosition(player.body, spawn(player.body));
      socket.emit("respawnSuccess");
    }
  });

  // Disconnect of this player
  socket.on('disconnect', function () {
      console.log('user ' + socket.id + ': disconnected');
      if (players[socket.id]) {
        destroyPlayer(socket.id);
      }
      // Emit a message to all players to remove this player
      io.emit('playerDisconnect', socket.id);

      // Remove them from the scoreboard
      scoreUpdate();
    });
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});