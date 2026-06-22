const Matter = require('matter-js');
const { createBullet, destroyBullet } = require('./bulletManager.js');
const { CONSTANTS } = require('../../public/js/constants.js');
const { createBot,
  moveBot,
  botTarget,
  pixelToTile,
  tileToPixel,
  reqPath,
  calculatePaths,
  tankSighted,
  botFacing,
  closestValid
} = require('./enemyBots.js');


const {
  TICK_RATE,
  TANK_SPEED,
  TANK_ANGULAR_SPEED,
  FIRE_COOLDOWN,
  BULLET_LIFESPAN,
  TICK_DELTA,
  BOT_LIMIT,
  SPAWN_COOLDOWN,
  FIRE_CHANCE,
  NEW_TARGET,
  CATEGORY_BULLET,
  CATEGORY_TANK,
  CATEGORY_BOUNDARY
} = CONSTANTS;

// For the bot control
var lastSpawn = 0;
var lastTarget = 0;

// For computing PowerUp effects
function effectiveStats(player) {
  let changedStats = {
    // Multiplicative
    angularVelo: 1,
    velocity: 1,
    bulletVelo: 1,
    bulletLife: 1,
    bulletAccelerate: 1,

    // Additive
    bulletBounce: 0,
    frontBullets: 0,

    // Flags
    backShot: false,

    /* Ill implement these in a future patch
    rockShot: false,
    skullShot: false,
    */
    selfHarmImmune: false,
    wallPhase: false,
    bulletPhase: false,

  };

  const additive = [
    "bulletBounce", "frontBullets"
  ];

  player.powerups.forEach(powerup => {
    if (powerup === undefined) {
      return;
    }
    if (powerup.flag !== undefined) {
      Object.keys(powerup.flag).forEach(x => {
        // OR it so we any change would be true
        changedStats[x] = changedStats[x] || powerup.flag[x];
      });
    }
    if (powerup.stats !== undefined) {
      Object.keys(powerup.stats).forEach(x => {
        if (additive.includes(x)) {
          changedStats[x] += powerup.stats[x];
        } else {
          changedStats[x] *= powerup.stats[x];
        }
      });
    }
  });
  return changedStats;
}

function startGameLoop(room) {
  const interval = setInterval(() => {
    const now = Date.now();
    calculatePaths();

    const currentBots = Object.values(room.players).filter(p => p.playerId.startsWith("BOT-")).length;
    if (now - lastSpawn > SPAWN_COOLDOWN && currentBots < BOT_LIMIT && room.gameConfig.current.gameMode === 'PVE') {
      createBot(room);
      lastSpawn = now;
    }


    // To simulate difficulty, we will have a chance for Bots to missfire, meaning they 
    // Could see you and shoot, but missfired. This puts them on a cooldown before they 
    // Can shoot again
    const missFireChance = {'EASY': 0.6, 'MEDIUM': 0.4, 'HARD': 0};

    // Bot inputs 
    Object.values(room.players).forEach(player => {
      if (player.playerId.startsWith("BOT-")) {
        moveBot(player);
        // This checks if a target is in sight then it shoots 
        // every time it moves
        const targ = botTarget(player, room);
        if (targ && tankSighted(player, targ, room) && botFacing(player, targ)) {
            const randFire = Math.random();
            if (randFire >= missFireChance[room.gameConfig.current.difficulty]) {
              player.input.fire = true;
            }else {
              player.lastFired = now;
            }
        }
      }
    });

    if (now - lastTarget > NEW_TARGET) {
      Object.values(room.players).forEach(bot => {
        if (bot.playerId.startsWith("BOT-")) {
          const targ = botTarget(bot, room);
          if (targ) {
            const loc = closestValid(pixelToTile(targ.body.position));
            const otherBots = Object.values(room.players)
              .filter(x => x.playerId.startsWith("BOT-"))
              .filter(x => x.playerId !== bot.playerId)
              .map(x => pixelToTile(x.body.position));

            reqPath(bot, loc, otherBots);
          }
        }
      })
      lastTarget = now;
    }

    // Process player inputs
    Object.values(room.players).forEach(player => {
      if (!player.isAlive) return;

      // Powerups!
      const stats = effectiveStats(player);
      player.stats = stats;

      const { input, body } = player;

      // Changes the mask for wallphase
      if (stats.wallPhase) {
        player.body.collisionFilter.mask = CATEGORY_BULLET | CATEGORY_TANK | CATEGORY_BOUNDARY;
      }

      // Rotation
      let turnDirection = 0;
      if (input.left) turnDirection -= 1;
      if (input.right) turnDirection += 1;
      Matter.Body.setAngularVelocity(body, TANK_ANGULAR_SPEED * TICK_DELTA * turnDirection * stats.angularVelo);

      // Movement
      let moveDirection = 0;
      const angle = body.angle - Math.PI / 2;
      if (input.up) moveDirection -= 1;
      if (input.down) moveDirection += 1;
      Matter.Body.setVelocity(body, {
        x: Math.cos(angle) * TANK_SPEED * TICK_DELTA * stats.velocity * moveDirection,
        y: Math.sin(angle) * TANK_SPEED * TICK_DELTA * stats.velocity * moveDirection
      });

      // Firing
      if (input.fire && now - player.lastFired > FIRE_COOLDOWN) {
        player.lastFired = now;
        if (stats.backShot) {
          createBullet(player, room, stats, Math.PI);
        }
        // I chose 0.15 arbitrarily
        const seperation = 0.15;
        var angleOffset = -stats.frontBullets / 2 * seperation;
        for (let i = 0; i < stats.frontBullets; i++) {
          createBullet(player, room, stats, angleOffset);
          angleOffset += seperation;
        }

        createBullet(player, room, stats, 0);
        room.io.to(player.playerId).emit('sfx', { type: 'shoot' }); //only emits to shooter, but might want to find tanks within a radius to emit to too
      }
    });

    // Remove expired bullets
    Object.values(room.bullets).forEach(bullet => {
      if (Date.now() - bullet.createdAt > BULLET_LIFESPAN + bullet.stats.bulletLife) {
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
