const { createPhysics } = require('../game/physics.js');
const { startGameLoop } = require('../game/gameLoop.js');
const { initialiseCollisions } = require('../game/collisionHandler.js');
const { Node, buildMap } = require('../../public/js/Node.js');
const { CONSTANTS } = require('../../public/js/constants.js');
const { initEasyStar } = require('../game/enemyBots.js');

class Room {
  constructor(code, host, io) {
    this.io = io;
    this.code = code;
    this.host = host;     // socket id of creator
    this.status = 'waiting'; // waiting or playing
    this.history = [];

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
    this.countdownInterval = null;

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
    
    // Map
    this.totalPlayableSpaces = null;
    this.bspDungeons = null;
    this.bspCorridors = null;
    this.wallGrid = null;

    // PVE settings
    this.roundNum = 0;
    this.enemiesRem = 3;
    this.lives = 0;
    this.waveCountDown = 0;
  }

  start() {
    if (this.status === 'playing') return;
    this.status = 'playing';

    const { MAP_CONFIG } = CONSTANTS;
    const rootX = MAP_CONFIG.GLOBAL_PADDING;
    const rootY = MAP_CONFIG.GLOBAL_PADDING;
    const rootW = MAP_CONFIG.MAP_WIDTH - (MAP_CONFIG.GLOBAL_PADDING * 2);
    const rootH = MAP_CONFIG.MAP_HEIGHT - (MAP_CONFIG.GLOBAL_PADDING * 2)
    
    const rootNode = new Node(rootX, rootY, rootW, rootH);
    const generatedTree = buildMap(rootNode, 
      MAP_CONFIG.NO_PARTITIONS,
      MAP_CONFIG.PADDING,
      MAP_CONFIG.MIN_PARTITION_SIZE,
      MAP_CONFIG.CORRIDOR_SIZE,
      MAP_CONFIG.MIN_DUNGEON_WIDTH,
      MAP_CONFIG.MIN_DUNGEON_HEIGHT);
    const bspDungeons = generatedTree.getDungeons();
    const bspCorridors = generatedTree.getCorridors();
    const totalPlayableSpaces = [...bspDungeons, ...bspCorridors];

    this.totalPlayableSpaces = totalPlayableSpaces;
    this.bspDungeons = bspDungeons;
    this.bspCorridors = bspCorridors;

    // Create isolated physics world for this room
    const { engine, world, wallGrid } = createPhysics(MAP_CONFIG.MAP_WIDTH, MAP_CONFIG.MAP_HEIGHT, MAP_CONFIG.CELL_SIZE, this.totalPlayableSpaces, MAP_CONFIG.GLOBAL_PADDING);
    this.engine = engine;
    this.world = world;
    this.wallGrid = wallGrid;

    this.easystar = initEasyStar(this);

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
    this.totalPlayableSpaces = null;
    this.bspDungeons = null;
    this.bspCorridors = null;
    this.wallGrid = null;
    this.easystar = null;
    this.status = 'waiting';
    console.log('game closed');
  }
}

module.exports = Room;