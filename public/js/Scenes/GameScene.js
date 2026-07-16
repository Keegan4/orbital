const {GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS, MAP_CONFIG} = CONSTANTS;
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.players = data.players;
    // A simple array of numbers, then the numbers represent the number of enemies
    this.roundInfo = data.roundInfo;
    this.gameMode = data.gameConfig.current.gameMode;
    this.wallGrid = data.wallGrid;
    this.hazards = data.hazards;
  }

  preload() {
    // Load images
    this.load.image('blue', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_blue.png');
    this.load.image('red', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_red.png');
    this.load.image('black', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_dark.png');
    this.load.image('bullet', 'assets/kenney_topdownTanksRedux/PNG/Default size/bulletRed2.png');
    this.load.image('floor-tile', 'assets/kenney_topdownTanksRedux/PNG/Default size/tileGrass1.png');
    this.load.image("green", 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_green.png');
    this.load.image("bigRed", 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_bigRed.png');
    this.load.image("sand", 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_sand.png');
    this.load.svg("wall-tile", "assets/wall_tile.svg");

    // Load audio
    this.load.audio('shoot',       'assets/shoot.ogg');
    this.load.audio('bulletBounce','assets/bounce.ogg');
    this.load.audio('tankHit',     'assets/explosion.ogg');

    // Load animations
    for (let i = 1; i <= 5; i++) {
      this.load.image(`exp${i}`, `assets/explosion${i}.png`);
    }
  }

  create() {
    this.socket = this.registry.get('socket');
    this.tank = null;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up : this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down : this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left : this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right : this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.lastInput = {};
    this.otherPlayers = {};
    this.bullets = {};
    this.playerNames = {};
    Object.values(this.players).forEach(p => {
      this.playerNames[p.playerId] = p.name;   
    })
    console.log(this.players);

    // Create hazards

    Object.values(this.hazards).forEach(hazard => {
      var color = 0xffffff;
      if (hazard.type === "bounce") {
        color = 0x005500;
      } else if (hazard.type === "spike") {
        color = 0x000000;
      }
      this.add.rectangle(hazard.x, 
          hazard.y, 
          hazard.size, 
          hazard.size, color).setDepth(95);
    });


    // To manage the scoreboard, pvp, pve
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setScrollFactor(0);
    this.uiContainer.setDepth(100);
    const elementsToAdd = [];

    this.instanceId = Math.random().toString(36).slice(2, 7);
    console.log(`[GameScene ${this.instanceId}] created`);

    // Track socket listeners so clean up is easier with this.cleanup()
    this.cleanups = [];
    this.trackSocket('returnToLobby', data => this.handleReturnToLobby(data));
    this.trackSocket("updatePVE", data => this.handleUpdatePVE(data));
    this.trackSocket("newRound", data => this.handleNewRound(data));
    this.trackSocket("startRound", () => this.handleStartRound());
    this.trackSocket('sfx', data => this.handleSfx(data));
    this.trackSocket("respawnSuccess", () => this.handleRespawnSuccess());
    this.trackSocket("scoreUpdate", scores => this.handleScoreUpdate(scores));
    this.trackSocket('gameState', state => this.handleGameState(state));
    this.trackSocket('newPlayer', playerInfo => this.handleNewPlayer(playerInfo));
    this.trackSocket('playerDisconnect', id => this.handlePlayerDisconnect(id));
    this.trackSocket('endGame', data => this.handleEndGame(data));
    this.trackSocket('tankHit', data => this.handleTankHit(data));

    this.leaveButton = this.add.text(730, 30, 'LEAVE', { 
			fontSize: '18px', 
			fill: '#ffffff', 
			fontStyle: 'bold',
			backgroundColor: '#772222', 
			padding: { x: 12, y: 8 },
			shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
		}).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).setDepth(100).setAlpha(0.85).setScrollFactor(0);

    this.leaveButton.on('pointerdown', () => {
      this.socket.emit('leaveGame');
    })

    const sbBg = this.add.graphics().setDepth(99); 
    sbBg.fillStyle(0x1a1a1a, 0.55);
    sbBg.lineStyle(2, 0xffcc00, 0.55);
    sbBg.fillRoundedRect(10, 10, 180, 290, 8);
    sbBg.strokeRoundedRect(10, 10, 180, 290, 8);
    const sbText = this.add.text(100, 25, 'SCOREBOARD', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffcc00', 
    }).setOrigin(0.5).setDepth(100);

    this.scoreSlots = [];

    // create 10 places that are revealed later
    for (let i = 0; i < 10; i++) {
      const text = this.add.text(25, 55 + i * 23, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#ffffff', 
      }).setVisible(false).setDepth(100);
      
      this.scoreSlots.push(text);
    }
    this.scoreboardContainer = this.add.container(0, 0);
    this.scoreboardContainer.add([sbBg, sbText, ...this.scoreSlots]);

    if (this.gameMode === 'PVP') {
      const tallyBg = this.add.graphics().setDepth(99);
      tallyBg.fillStyle(0x1a1a1a, 0.55);
      tallyBg.lineStyle(2, 0xffcc00, 0.55);
      tallyBg.fillRoundedRect(280, 10, 240, 45, 6);
      tallyBg.strokeRoundedRect(280, 10, 240, 45, 6);

      const tallyFontStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'bold'
      };
      this.blueScoreText = this.add.text(300, 22, 'BLUE: 0', {
        ...tallyFontStyle,
        color: '#4da6ff'
      }).setDepth(100);
      this.scoreDivider = this.add.text(400, 22, '|', {
        ...tallyFontStyle,
        color: '#ffcc00'
      }).setOrigin(0.5, 0).setDepth(100);
      this.redScoreText = this.add.text(430, 22, 'RED: 0', {
        ...tallyFontStyle,
        color: '#ff4d4d'
      }).setDepth(100);

      this.pvpContainer = this.add.container(0, 0);
      this.pvpContainer.add([tallyBg, this.blueScoreText, this.scoreDivider, this.redScoreText]);
      elementsToAdd.push(this.pvpContainer);
    }

    if (this.gameMode === 'PVE') {
      this.curRound = this.add.text(400, 20, 'ROUND 1', {
        fontSize : '34px',
        color : '#ffffff',
        backgroundColor: '#000000aa',
      }).setOrigin(0.5).setDepth(100);

      this.enemiesRem = this.add.text(280, 55 , 'Enemies: ', {
        fontSize : '20px',
        color : '#ffffff',
        backgroundColor: '#000000aa',
      }).setOrigin(0.5).setVisible(true).setDepth(100);

      this.livesRem = this.add.text(520, 55 , 'Lives Left: ', {
        fontSize : '20px',
        color : '#ff0303',
        backgroundColor: '#000000aa',
      }).setOrigin(0.5).setVisible(true).setDepth(100);


      // For the round complete
      this.roundPanel = this.add.graphics().setDepth(99).setVisible(false);
      this.roundPanel.fillStyle(0x000000, 0.75);
      this.roundPanel.fillRoundedRect(220, 145, 359, 90, 12);

      this.roundComplete = this.add.text(400, 150, 'ROUND COMPLETE', {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffd700',
      }).setOrigin(0.5, 0).setDepth(100).setVisible(false);

      this.nextRound = this.add.text(400, 200, '', {
        fontFamily: 'Arial Black',
        fontSize: '22px',
        color: '#ffffff',
      }).setOrigin(0.5, 0).setDepth(100).setVisible(false);

      this.pveContainer = this.add.container(0, 0);
      this.pveContainer.add([this.curRound, this.enemiesRem, this.livesRem, this.roundPanel, this.roundComplete, this.nextRound]);
      elementsToAdd.push(this.pveContainer);
    }
    elementsToAdd.push(this.scoreboardContainer);
    this.uiContainer.add(elementsToAdd);
    
    // Aesthetics
    this.sounds = { shoot : this.sound.add('shoot', { volume: 0.4 }),
                    bulletBounce : this.sound.add('bulletBounce', { volume: 0.3 }),
                    tankHit : this.sound.add('tankHit', { volume: 0.6 }) };
    if (!this.anims.exists('explode')) {
      this.anims.create({
        key: 'explode',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: `exp${i + 1}` })),
        frameRate: 15,
        repeat: 0
      });
    }

    const mapTileWidth = this.wallGrid.length;
    const mapTileHeight = this.wallGrid[0].length;
    const map = this.make.tilemap({
      tileWidth: MAP_CONFIG.CELL_SIZE,
      tileHeight: MAP_CONFIG.CELL_SIZE,
      width: mapTileWidth,
      height: mapTileHeight
    });
    const floorTileSet = map.addTilesetImage('floor-tile', null, MAP_CONFIG.CELL_SIZE, MAP_CONFIG.CELL_SIZE);
    const floorLayer = map.createBlankLayer('floor', floorTileSet).setDepth(90);
    for (let r = 0; r < mapTileHeight; r++) {
      for (let c = 0; c < mapTileWidth; c++) {
        if (this.wallGrid[r][c] !== 1) {
          floorLayer.putTileAt(1, c, r);
        }
      }
    }

    // Debug, you click then you know
    this.input.on('pointerdown', (pointer) => {
      console.log(`Click: x=${Math.round(pointer.worldX)}, y=${Math.round(pointer.worldY)}`);
    });

    // Spawn players onto the screen for the first time
    Object.keys(this.players).forEach((id) => {
      this.playerNames[this.players[id].playerId] = this.players[id].name; 
      if (this.players[id].playerId === this.socket.id) {
        this.tank = this.add.sprite(this.players[id].x, this.players[id].y, this.players[id].team)
                      .setOrigin(0.5, 0.5)
                      .setDepth(100);
        this.createTankLabel(this.tank, this.players[id].playerId);
        console.log('My tank spawned at:', this.players[id].x, this.players[id].y);
      } else {
        this.otherPlayers[this.players[id].playerId] = this.add.sprite(this.players[id].x, this.players[id].y, this.players[id].team)
                                                    .setOrigin(0.5, 0.5)
                                                    .setDepth(100);
        this.createTankLabel(this.otherPlayers[pid], pid);
      }
    })

    this.cameras.main.startFollow(this.tank);

    // Show scoreboard on gameScene start
    this.socket.emit("getScore");

    this.events.once('shutdown', () => {
      this.cleanup();
    })
  }

  trackSocket(event, handler) {
    this.socket.on(event, handler);
    this.cleanups.push(() => {
      this.socket.off(event, handler);
    });
  }

  cleanup() {
    console.log(`[GameScene ${this.instanceId}] cleanup`);
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];
  }

  handleReturnToLobby(data) {
    this.scene.start('WaitingRoomScene', data);
  }

  createTankLabel(sprite, id) {
    const name = this.playerNames[id];
    const label = this.add.text(sprite.x, sprite.y - 30, name, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5, 1).setAlpha(0.7).setDepth(101);
    // We attaching the label so we can reference it 
    sprite.label = label;
    return sprite;
  }

  handleUpdatePVE(data) {
    this.curRound.text = `ROUND ${data.roundNum}`;
    this.enemiesRem.text = `Enemies: ${data.enemiesRem}`;
    this.livesRem.text = `Lives Left: ${data.lives}`;
  }

  handleNewRound(data) {
    this.roundComplete.setVisible(true);
    this.nextRound.setVisible(true);
    this.roundPanel.setVisible(true);
    this.nextRound.text = `Next Round In: ${Math.floor(data.cooldown / 1000)}`
  }

  handleStartRound() {
    this.roundComplete.setVisible(false);
    this.nextRound.setVisible(false);
    this.roundPanel.setVisible(false);
  }

  handleSfx(data) {
    if (data.type === 'tankHit') {
      // Explosion animation
      const explosion = this.add.sprite(data.x, data.y, 'exp1')
        .setDepth(100)
        .play('explode');
      if (data.playerId === this.socket.id) {
        explosion.on('animationcomplete', () => {
          explosion.destroy();
          this.scene.pause('GameScene');
          this.scene.launch('PostHitScene', {
            socket: this.socket,
            score: data.score,
            timeAlive: data.timeAlive,
            powerups: data.powerups,
            killerName: data.killerName
          });
        });
      } else {
        explosion.on('animationcomplete', () => explosion.destroy());
      }
    }

    const sound = this.sounds[data.type];
    if (!sound) return;
    if (!data.x || !data.y || !this.tank) {
      sound.play();
      return;
    }
    // Modulate sound by dist from this tank
    const dx = data.x - this.tank.x;
    const dy = data.y - this.tank.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 600;
    const volume = Math.max(0, 1 - dist / maxDist);
    sound.play({ volume });
  }

  handleRespawnSuccess() {
    this.tankDead = false;
    
  }

  handleScoreUpdate(scores) {
    this.scoreSlots.forEach(x => {
      x.setVisible(false);
    });
    if (this.gameMode === 'PVP') {
      const blueTotal = scores.filter(p => p.team === CONSTANTS.BLUE_TEAM).reduce((sum, p) => sum + p.score, 0);
      const redTotal = scores.filter(p => p.team === CONSTANTS.RED_TEAM).reduce((sum, p) => sum + p.score, 0);
      this.blueScoreText.setText(`BLUE: ${blueTotal}`);
      this.redScoreText.setText(`RED: ${redTotal}`);
    }

    for (let i = 0; i < scores.length; i++) {
      this.scoreSlots[i].setText(`${scores[i].name}: ${scores[i].score}`);
      if (this.gameMode === 'PVP') {
        this.scoreSlots[i].setFill(scores[i].team === CONSTANTS.RED_TEAM ? '#ff4d4d' : '#4da6ff');
      }
      this.scoreSlots[i].setVisible(true);
    }
  }

  handleGameState(state) {
    if (!this.tank) return;

    const labeler = (id, hp) => {
      // Just a fallback in case somehow there are no names
      const name = this.playerNames[id] || (id.startsWith('BOT-') ? 'BOT' : '');
      return `${name}\nHP: ${hp}`;
    }
    state.players.forEach(p => {
      if (p.playerId === this.socket.id) {
        this.tank.x = p.x;
        this.tank.y = p.y;
        this.tank.rotation = p.rotation;
        if (this.tank.label) {
          this.tank.label.x = p.x;
          this.tank.label.y = p.y - 30;
          const txt = labeler(p.playerId, p.hp);
          if (this.tank.label.text !== txt) {
            this.tank.label.setText(txt);
          }
          this.tank.label.setVisible(p.isAlive);
        }
        this.tankDead = !p.isAlive;
        if (!this.tank.isFlashing) {
          p.isAlive ? this.tank.clearTint() : this.tank.setTint(0x808080);
        }
      } else {
          if (!this.otherPlayers[p.playerId]) {
            this.otherPlayers[p.playerId] = this.add.sprite(p.x, p.y, p.team)
              .setOrigin(0.5, 0.5)
              .setDepth(100);
            this.createTankLabel(this.otherPlayers[p.playerId], p.playerId);
          }
          this.otherPlayers[p.playerId].x = p.x;
          this.otherPlayers[p.playerId].y = p.y;
          this.otherPlayers[p.playerId].rotation = p.rotation;
          if (this.otherPlayers[p.playerId].label) {
            this.otherPlayers[p.playerId].label.x = p.x;
            this.otherPlayers[p.playerId].label.y = p.y - 30;
            const txt = labeler(p.playerId, p.hp);
            if (this.otherPlayers[p.playerId].label !== txt) {
              this.otherPlayers[p.playerId].label.setText(txt);
            }
            this.otherPlayers[p.playerId].label.setVisible(p.isAlive);
          }
          if (!this.otherPlayers[p.playerId].isFlashing) {
            p.isAlive 
              ? this.otherPlayers[p.playerId].clearTint() 
              : this.otherPlayers[p.playerId].setTint(0x808080);
          }
        }
    });
    
    // presentTanks gives the players that exist in the gameState sent by the server
    // we assume that the server correctly creates/destroys entities accordingly
    const presentTanks = new Set(state.players.map(x => x.playerId));
    
    Object.keys(this.otherPlayers).forEach(id => {
      if (!presentTanks.has(id)) {
        this.otherPlayers[id].destroy();
        if (this.otherPlayers[id].label) {
          this.otherPlayers[id].label.destroy();
        }
        delete this.otherPlayers[id];
      }
    });


    // Update bullets - create new, remove destroyed
    const activeBulletIds = new Set(state.bullets.map(b => b.id));
    state.bullets.forEach(b => {
      if (!this.bullets[b.id]) {
        this.bullets[b.id] = this.add.sprite(b.x, b.y, 'bullet')
          .setOrigin(0.5, 0.5)
          .setDepth(100);
      }
      // Update position
      this.bullets[b.id].x = b.x;
      this.bullets[b.id].y = b.y;
      this.bullets[b.id].rotation = Math.atan2(b.vy, b.vx) + Math.PI / 2; // + pi/2 since bullet faces south initially
    });

    // Remove expired bullets
    Object.keys(this.bullets).forEach(id => {
      if (!activeBulletIds.has(Number(id))) {
        this.bullets[id].destroy();
        delete this.bullets[id];
      }
    });
  }

  handleNewPlayer(playerInfo) {
    console.log('New player joined:', playerInfo);
    if (this.otherPlayers[playerInfo.playerId]) {
      this.otherPlayers[playerInfo.playerId].destroy();
    }
    this.otherPlayers[playerInfo.playerId] = this.add.sprite(playerInfo.x, 
      playerInfo.y, 
      playerInfo.team
    ).setOrigin(0.5, 0.5)
      .setDepth(100);
    this.playerNames[playerInfo.playerId] = playerInfo.name;
    this.createTankLabel(this.otherPlayers[playerInfo.playerId], playerInfo.playerId);
  }

  handlePlayerDisconnect(id) {
    console.log('Player left:', id);
    if (this.otherPlayers[id]) {
      this.otherPlayers[id].destroy();
      if (this.otherPlayers[id].label) {
        this.otherPlayers[id].label.destroy();
      }
      delete this.otherPlayers[id];
    }
  }
  handleTankHit(data) {
    const sprite = (data.playerId === this.socket.id)
      ? this.tank
      : this.otherPlayers[data.playerId]
    console.log(sprite);
    if (!sprite) {
      return;
    }
    sprite.isFlashing = true;
    sprite.setTintFill(0xff0000);
    this.time.delayedCall(100, () => {
      sprite.clearTint();
      sprite.isFlashing = false;
    });
  }

  handleEndGame(data) {
    console.log(`Game ended: ${data.winner} won!`);
    // off all listeners
    if (this.scene.isActive('PostHitScene')) {
        this.scene.stop('PostHitScene');
    }
    this.scene.start('EndGameScene', data);
  }
  
  update() {
    if (!this.tank) return;

    const input = {
      left : this.cursors.left.isDown || this.wasd.left.isDown,
      right : this.cursors.right.isDown || this.wasd.right.isDown,
      up : this.cursors.up.isDown || this.wasd.up.isDown,
      down : this.cursors.down.isDown || this.wasd.down.isDown,
      fire : this.cursors.space.isDown,
      alt_fire: this.cursors.shift.isDown
    };

    if (JSON.stringify(input) !== JSON.stringify(this.lastInput)) {
      this.socket.emit('playerInput', input);
      this.lastInput = input;
    }
  }

}
