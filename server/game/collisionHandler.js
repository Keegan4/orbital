const Matter = require('matter-js');
const { CONSTANTS } = require('../../public/js/constants.js');
const { POWERUPS, powerupsRarity, RARITIES } = require('../../public/js/powerups.js');
const { destroyBullet } = require('./bulletManager.js');
const { destroyPlayer } = require('./playerManager.js');
const { updateScore, getScoreboard } = require('./scoreManager.js');
const { spawnBullet } = require('./bulletManager.js');

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
  RARE_CHANCE,
  EXPLODE_COUNT
} = CONSTANTS;

// Simple function to select powerups to display
function choosePowerup() {
  let powerups = [];
  for (let i = 0; i < 3; i++) {
    while (true) {
      let select = Math.random();
      var choice = null;
      if (select <= LEGEND_CHANCE) {
        const legs = powerupsRarity("legendary");
        choice = legs[Math.floor(Math.random() * legs.length)];


      } else if (select <= RARE_CHANCE) {
        const rares = powerupsRarity("rare");
        choice = rares[Math.floor(Math.random() * rares.length)];

      } else {
        const commons = powerupsRarity("common");
        choice = commons[Math.floor(Math.random() * commons.length)];
      }
      if (!powerups.includes(choice)) {
        break;
      }
    }
    powerups.push(choice);
  }
  return powerups;
}

function handleContact(bodyA, bodyB, room) {
  
  var bot;
  var player;

  // Turn matterjs bodies into player objects
  const tankA = Object.values(room.players).find(p => p.body === bodyA);
  const tankB = Object.values(room.players).find(p => p.body === bodyB);

  // Dont kill other bots
  if (tankA.playerId.startsWith("BOT-") && tankB.playerId.startsWith("BOT-")) {
    return;
  } else if (tankA.playerId.startsWith("BOT-") && tankA.botType.contactDamage) {
    bot = tankA;
    player = tankB;
  } else if (tankB.playerId.startsWith("BOT-") && tankB.botType.contactDamage) {
    bot = tankB;
    player = tankA;
  } else {
    return;
  }
  if (!player.isAlive) return;
  // TODO: Change to damage instead
  killPlayer(player, room, bot);
  killBot(bot, room);
}

function killBot(bot, room) {
  const shouldExplode = bot.botType.explode && room.world;
  const pos = { x: bot.body.position.x, y: bot.body.position.y };

  destroyPlayer(bot.playerId, room);
  room.io.to(room.code).emit('playerDisconnect', bot.playerId); 
  room.io.to(room.code).emit('sfx', {
    type: 'tankHit',
    x: bot.body.position.x,
    y: bot.body.position.y,
    playerId: bot.playerId,
    score: bot.score,
    timeAlive: Date.now() - bot.createdAt,
    powerups: choosePowerup(),
    killerName: "BOT"
  });

  if (shouldExplode) {
    const inc = (Math.PI * 2) / EXPLODE_COUNT;
    var angle = 0;
    for (let i = 0; i < EXPLODE_COUNT; i++) {
      spawnBullet(room, pos.x, pos.y, angle, bot.stats, "Explosion!");
      angle += inc;
    }
  }
}

function killPlayer(player, room, killer, powerupType = null) {
  room.lives--; 
  if (room.lives === 0) {
    room.stop();
    room.io.to(room.code).emit('endGame', {
      mode: "PVE",
      round: room.roundNum,
      waitingRoomSceneData: { 
                          lobbyPlayers: Object.values(room.lobbyPlayers), 
                          gameConfig: room.gameConfig, 
                          code: room.code}
    });
  }
  room.io.to(room.code).emit('sfx', {
    type: 'tankHit',
    x: player.body.position.x,
    y: player.body.position.y,
    playerId: player.playerId,
    score: player.score,
    timeAlive: Date.now() - player.createdAt,
    powerups: killer && killer.team === player.team ? null : choosePowerup(),

    // Just a ton of fancy ternarys to make it accept a null killer
    killerName:  killer && killer.playerId.startsWith("BOT-") ? 'BOT' : (killer ? killer.name : 'BOT')
  });


  player.isAlive = false;
  Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(player.body, 0);
  player.body.isSensor = true;
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
        const wallBody = bodyA.label === 'wall' || bodyA.label === 'Boundary'
                         ? bodyA 
                         : bodyB.label === 'wall' 
                         ? bodyB 
                         : null;

      if (!bulletBody) {
        const tankA = bodyA.label === 'tank' ? bodyA: null;
        const tankB = bodyB.label === 'tank' ? bodyB: null;
        if (tankA && tankB) {
          handleContact(tankA, tankB, room);
        }
        return;
      }

      const bullet = Object.values(room.bullets).find(b => b.body === bulletBody);
      if (!bullet) return;

      // Bullet hit wall
      if (wallBody) {
        bullet.bounces++;
        if (bullet.bounces >= MAX_BOUNCES + bullet.stats.bulletBounce) {
          destroyBullet(bullet.id, room);
        } else {
          room.io.to(room.code).emit('sfx', { type: 'bulletBounce', x: bullet.body.position.x, y: bullet.body.position.y });
        }
        return;
      }

      // Bullet hit tank
      if (tankBody) {
        const player = Object.values(room.players).find(p => p.body === tankBody);
        if (!player || !player.isAlive) return;

        player.hp -= 1;
        const killer = Object.values(room.players).find(p => p.playerId === bullet.ownerId);
        destroyBullet(bullet.id, room);
        room.io.to(room.code).emit('tankHit', { playerId: player.playerId });
        
        if (player.hp <= 0) {
          if (!killer) {
            if (!player.playerId.startsWith("BOT")) {
              killPlayer(player, room, null);
            } else {
              killBot(player, room);
            }
            return;
          }

        // Preventing selfHarm if powerup is enabled
          if (player.stats.selfHarmImmune && bullet.ownerId === player.playerId) {
            return;
          }

          if (player.playerId.startsWith("BOT-")) {
            killBot(player, room);
          } else {
            /*
            if (killer.botType.debuf) {
              killPlayer(player, room, killer, "curse");
            } */
            killPlayer(player, room, killer);
          // Players cant shoot themselves for more points
            if (bullet.ownerId !== player.playerId && killer.team !== player.team) {
              updateScore(bullet.ownerId, room);
            }
          }
        }

        

      }
    })
  });
}




module.exports = {
  initialiseCollisions
};