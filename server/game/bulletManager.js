const Matter = require('matter-js');
const { engine, world } = require('./physics.js');
const state = require('../state.js');
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

function createBullet(player) {
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

  Matter.Composite.add(world, body);

  const bullet = {
    id: state.incrementBulletId(),
    ownerId: player.playerId,
    body,
    bounces: 0,
    createdAt: Date.now()
  };

  state.bullets[bullet.id] = bullet;
  return bullet;
}

function destroyBullet(id) {
  if (!state.bullets[id]) return;
  Matter.Composite.remove(world, state.bullets[id].body);
  delete state.bullets[id];
}

function initialiseCollisions(io) {
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

      const bullet = Object.values(state.bullets).find(b => b.body === bulletBody);
      if (!bullet) return;

      // Bullet hit wall
      if (wallBody) {
        bullet.bounces++;
        if (bullet.bounces >= MAX_BOUNCES) {
          destroyBullet(bullet.id);
        } else {
          io.emit('sfx', { type: 'bulletBounce', x: bullet.body.position.x, y: bullet.body.position.y });
        }
        return;
      }

      // Bullet hit tank
      if (tankBody) {
        const player = Object.values(state.players).find(p => p.body === tankBody);
        if (!player || !player.isAlive) return;
        //if (bullet.ownerId === player.playerId) return; // no self hit
        player.isAlive = false;
        Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(player.body, 0);
        player.body.isSensor = true;
        destroyBullet(bullet.id);

        io.emit('sfx', {
          type: 'tankHit',
          x: player.body.position.x,
          y: player.body.position.y,
          playerId: player.playerId,
          score: player.score,
          timeAlive: Date.now() - player.createdAt
        });

        // Players cant shoot themselves for more points
        if (bullet.ownerId !== player.playerId) {
          const firer = state.players[bullet.ownerId];
          if (firer) {
            firer.score++;
            io.emit('scoreUpdate', getScoreboard());
          }
        }
      }
    });
  });
}

function getScoreboard() {
  return Object.values(state.players)
    .map(player => ({
      name: player.playerId.slice(0, 5),
      score: player.score
    }))
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  createBullet,
  destroyBullet,
  initialiseCollisions,
  getScoreboard
};
