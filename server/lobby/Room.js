const { createPhysics } = require('../game/physics.js');
const { startGameLoop } = require('../game/gameLoop.js');
const { initialiseCollisions } = require('../game/collisionHandler.js');

class Room {
  constructor(code, host, io) {
    this.io = io;
    this.code = code;
    this.host = host;     // socket id of creator
    this.status = 'waiting'; // waiting or playing

    this.gameConfig = {
        current: {
            gameMode: 'PVE',
            difficulty: 'MEDIUM',
            round: 10
        },
        options: {
            gameModes: ['PVE', 'PVP'],
            difficulties: ['EASY', 'MEDIUM', 'HARD'],
            rounds: [5, 10, 15]
        }
    };
    this.capacity = 5; // 5 or 10 based on gamemode

    // Pre-game player info (name, team, ready state)
    // Separate from in-game player representation
    this.lobbyPlayers = {};

    // Game state
    this.players = {};
    this.bullets = {};
    this.bulletIdCounter = 0;

    // Physics 
    this.engine = null;
    this.world = null;
    this.gameLoopInterval = null;

    // PVE settings
    this.roundNum = 0;
    this.enemiesRem = 3;
    this.lives = 0;
    this.waveCountDown = 0;
  }

  start(walls) {
    if (this.status === 'playing') return;
    this.status = 'playing';

    // Create isolated physics world for this room
    const { engine, world } = createPhysics(walls);
    this.engine = engine;
    this.world = world;

    // Wire collision events to this room's engine and state
    initialiseCollisions(this);

    // Start the game loop for this room
    this.gameLoopInterval = startGameLoop(this);
  }

  // Called when room is empty or game ends
  stop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.engine = null;
    this.world = null;
    this.players = {};
    this.bullets = {};
    this.status = 'waiting';
  }
}

module.exports = Room;