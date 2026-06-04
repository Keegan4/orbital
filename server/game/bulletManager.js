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
  TICK_DELTA
} = CONSTANTS;

function createBullet(player, room) {
  const angle = player.body.angle + Math.PI / 2;
  const spawnX = player.body.position.x + Math.cos(angle) * 40;
  const spawnY = player.body.position.y + Math.sin(angle) * 40;

  const body = Matter.Bodies.circle(spawnX, spawnY, BULLET_RADIUS, {
    frictionAir: 0,
    friction: 0,
    restitution: 1,
    isSensor: false,
    label: 'bullet',
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

  Matter.Composite.add(room.world, body);

  const bullet = {
    id: room.bulletIdCounter++,
    ownerId: player.playerId,
    body,
    bounces: 0,
    createdAt: Date.now()
  };

  room.bullets[bullet.id] = bullet;
  return bullet;
}

function destroyBullet(id, room) {
  if (!room.bullets[id]) return;
  Matter.Composite.remove(room.world, room.bullets[id].body);
  delete room.bullets[id];
}

module.exports = {
  createBullet,
  destroyBullet
};
