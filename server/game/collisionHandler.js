const Matter = require('matter-js');
const { CONSTANTS } = require('../../public/js/constants.js');
const { POWERUPS, powerupsRarity, RARITIES } = require('../../public/js/powerups.js');
const { destroyBullet } = require('./bulletManager.js');
const { destroyPlayer } = require('./playerManager.js');
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
  TICK_DELTA,
  LEGEND_CHANCE,
  RARE_CHANCE
} = CONSTANTS;

// Simple function to select powerups to display
function choosePowerup() {
  let powerups = [];
  for (let i = 0; i < 3; i++) {
    let select = Math.random();
    if (select <= LEGEND_CHANCE) {
      const legs = powerupsRarity("legendary");
      powerups.push(legs[Math.floor(Math.random() * legs.length)]);
    } else if (select <= RARE_CHANCE) {
      const rares = powerupsRarity("rare");
      powerups.push(rares[Math.floor(Math.random() * rares.length)]);
    }else {
      const commons = powerupsRarity("common");
      powerups.push(commons[Math.floor(Math.random() * commons.length)]);
    }
  }

  return powerups;
}

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
        if (bullet.bounces >= MAX_BOUNCES + bullet.stats.bulletBounce) {
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
        
        destroyBullet(bullet.id, room);

        // Preventing selfHarm if powerup is enabled
        if (player.stats.selfHarmImmune && bullet.ownerId === player.playerId) {
          return;
        }

        if (player.playerId.startsWith("BOT-")) {
          destroyPlayer(player.playerId, room);
          room.io.to(room.code).emit('playerDisconnect', player.playerId); 
        } else {
          player.isAlive = false;
          Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(player.body, 0);
          player.body.isSensor = true;
        }
        // This name is very misleading we should
        // Change to something more meaningful
        room.io.to(room.code).emit('sfx', {
          type: 'tankHit',
          x: player.body.position.x,
          y: player.body.position.y,
          playerId: player.playerId,
          score: player.score,
          timeAlive: Date.now() - player.createdAt,
          powerups: choosePowerup()
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