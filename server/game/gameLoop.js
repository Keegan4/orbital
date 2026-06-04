const Matter = require('matter-js');
const { createBullet, destroyBullet } = require('./bulletManager.js');
const { CONSTANTS } = require('../../public/js/constants.js');

const {
  TICK_RATE,
  TANK_SPEED,
  TANK_ANGULAR_SPEED,
  FIRE_COOLDOWN,
  BULLET_LIFESPAN,
  TICK_DELTA
} = CONSTANTS;

function startGameLoop(room) {
  const interval = setInterval(() => {
    const now = Date.now();

    // Process player inputs
    Object.values(room.players).forEach(player => {
      if (!player.isAlive) return;

      const { input, body } = player;

      // Rotation
      let turnDirection = 0;
      if (input.left) turnDirection -= 1;
      if (input.right) turnDirection += 1;
      Matter.Body.setAngularVelocity(body, TANK_ANGULAR_SPEED * TICK_DELTA * turnDirection);

      // Movement
      let moveDirection = 0;
      const angle = body.angle - Math.PI / 2;
      if (input.up) moveDirection -= 1;
      if (input.down) moveDirection += 1;
      Matter.Body.setVelocity(body, {
        x: Math.cos(angle) * TANK_SPEED * TICK_DELTA * moveDirection,
        y: Math.sin(angle) * TANK_SPEED * TICK_DELTA * moveDirection
      });

      // Firing
      if (input.fire && now - player.lastFired > FIRE_COOLDOWN) {
        player.lastFired = now;
        createBullet(player, room);
        room.io.to(player.playerId).emit('sfx', { type: 'shoot' }); //only emits to shooter, but might want to find tanks within a radius to emit to too
      }
    });

    // Remove expired bullets
    Object.values(room.bullets).forEach(bullet => {
      if (Date.now() - bullet.createdAt > BULLET_LIFESPAN) {
        destroyBullet(bullet.id, room);
      }
    });

    // Physics step
    Matter.Engine.update(room.engine, 1000 / TICK_RATE);

    // Broadcast state
    room.io.to(room.code).emit('gameState', {
      players: Object.values(room.players).map(p => ({
        playerId: p.playerId,
        team: p.team,
        x: p.body.position.x,
        y: p.body.position.y,
        rotation: p.body.angle,
        isAlive: p.isAlive
      })),
      bullets: Object.values(room.bullets).map(b => ({
        id: b.id,
        x: b.body.position.x,
        y: b.body.position.y,
        vx: b.body.velocity.x,
        vy: b.body.velocity.y
      }))
    });
  }, 1000 / TICK_RATE);

  return interval;
}

module.exports = { startGameLoop };
