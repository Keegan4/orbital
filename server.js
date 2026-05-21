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
const TICK_RATE = 60;
const TICK_DELTA = 1 / TICK_RATE;
const TANK_SPEED = 150;
const TANK_ANGULAR_SPEED = 2.5;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const WALL_THICKNESS = 100;

const BULLET_SPEED = 500;
const BULLET_RADIUS = 5;
const MAX_BOUNCES = 3;
const FIRE_COOLDOWN = 300; //ms
const BULLET_LIFESPAN = 1000; //ms

const CATEGORY_WALL   = 0x0001;
const CATEGORY_BULLET = 0x0002;
const CATEGORY_TANK   = 0x0004;

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
Matter.Composite.add(world, [topWall, bottomWall, leftWall, rightWall]);

// Global variables
var players = {};
var bullets = {};
var bulletIdCounter = 0;

// Helper functions
function createPlayer(socketId) {
  const spriteWidth = 42;
  const spriteHeight = 46;
  var x = Math.floor(Math.random() * 700) + 50;
  var y = Math.floor(Math.random() * 500) + 50;
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
    lastFired : 0
  };
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
      }
      return;
    }

    // Bullet hit a tank
    if (tankBody) {
      const player = Object.values(players).find(p => p.body === tankBody);
      if (!player) return;
      //if (bullet.ownerId === player.playerId) return; // no self hit

      io.emit('playerHit', { playerId: player.playerId });
      destroyBullet(bullet.id);
      destroyPlayer(player.playerId);
    }
  });
});

// GAME LOOP
setInterval(() => {
  const now = Date.now();
  
  Object.values(players).forEach(player => {
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

  // Disconnect of this player
  socket.on('disconnect', function () {
      console.log('user ' + socket.id + ': disconnected');
      if (players[socket.id]) {
        destroyPlayer(socket.id);
      }
      // Emit a message to all players to remove this player
      io.emit('playerDisconnect', socket.id);
    });
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});