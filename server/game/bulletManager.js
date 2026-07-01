const Matter = require('matter-js');
const { CONSTANTS } = require('../../public/js/constants.js');

const {
  BULLET_SPEED,
  BULLET_RADIUS,
  MAX_BOUNCES,
  BULLET_LIFESPAN,
  CATEGORY_BULLET,
  CATEGORY_WALL,
  CATEGORY_TANK,
  TICK_RATE,
  TICK_DELTA,
  CATEGORY_BOUNDARY
} = CONSTANTS;

function spawnBullet(room, x, y, angle, stats, ownerId) {
  const spawnX = x + Math.cos(angle) * 40;
  const spawnY = y + Math.sin(angle) * 40; 
  var collisions =  CATEGORY_WALL | CATEGORY_TANK | CATEGORY_BOUNDARY;
  if (stats.bulletPhase) {
    collisions = CATEGORY_TANK | CATEGORY_BOUNDARY;
  }
  const body = Matter.Bodies.circle(spawnX, spawnY, BULLET_RADIUS, {
    frictionAir: 0,
    friction: 0,
    restitution: stats.bulletAccelerate,
    isSensor: false,
    label: 'bullet',
    collisionFilter: {
      category: CATEGORY_BULLET,
      mask: collisions
    }
  });
    // Set initial velocity
  Matter.Body.setVelocity(body, {
    x: Math.cos(angle) * BULLET_SPEED * TICK_DELTA * stats.bulletVelo,
    y: Math.sin(angle) * BULLET_SPEED * TICK_DELTA * stats.bulletVelo,
  });

  Matter.Composite.add(room.world, body);

  const bullet = {
    id: room.bulletIdCounter++,
    ownerId: ownerId,
    body,
    bounces: 0,
    createdAt: Date.now(),
    stats: stats
  };

  room.bullets[bullet.id] = bullet;
  return bullet;
}

function createBullet(player, room, stats, angleOffset) {
  const angle = player.body.angle + angleOffset + Math.PI / 2;
  const spawnX = player.body.position.x;
  const spawnY = player.body.position.y;

  return spawnBullet(room, spawnX, spawnY, angle, stats, player.playerId);
}

function destroyBullet(id, room) {
  if (!room.bullets[id]) return;
  Matter.Composite.remove(room.world, room.bullets[id].body);
  delete room.bullets[id];
}

module.exports = {
  createBullet,
  destroyBullet,
  spawnBullet
};
