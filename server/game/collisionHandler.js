const Matter = require('matter-js');
const { CONSTANTS } = require('../../public/js/constants.js');
const { destroyBullet } = require('./bulletManager.js');
const { updateScore, getScoreboard } = require('./scoreManager.js');

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

function initialiseCollisions(room) {
  Matter.Events.on(room.engine, 'collisionStart', function(event) {
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

      const bullet = Object.values(room.bullets).find(b => b.body === bulletBody);
      if (!bullet) return;

      // Bullet hit wall
      if (wallBody) {
        bullet.bounces++;
        if (bullet.bounces >= MAX_BOUNCES) {
          destroyBullet(bullet.id, room);
        } else {
          room.io.emit('sfx', { type: 'bulletBounce', x: bullet.body.position.x, y: bullet.body.position.y });
        }
        return;
      }

      // Bullet hit tank
      if (tankBody) {
        const player = Object.values(room.players).find(p => p.body === tankBody);
        if (!player || !player.isAlive) return;
        player.isAlive = false;
        Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(player.body, 0);
        player.body.isSensor = true;
        destroyBullet(bullet.id, room);

        room.io.emit('sfx', {
          type: 'tankHit',
          x: player.body.position.x,
          y: player.body.position.y,
          playerId: player.playerId,
          score: player.score,
          timeAlive: Date.now() - player.createdAt
        });

        // Players cant shoot themselves for more points
        if (bullet.ownerId !== player.playerId) {
          updateScore(bullet.ownerId, room);
        }
      }
    });
  });
}

module.exports = {
  initialiseCollisions
};