const {GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS} = CONSTANTS;
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.players = data.players;
    this.walls = data.walls;
    // A simple array of numbers, then the numbers represent the number of enemies
    this.roundInfo = data.roundInfo;
    this.gameMode = data.gameConfig.current.gameMode;
  }

  preload() {
    // Load images
    this.load.image('blue', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_blue.png');
    this.load.image('red', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_red.png');
    this.load.image('black', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_dark.png');
    this.load.image('bullet', 'assets/kenney_topdownTanksRedux/PNG/Default size/bulletRed2.png');
    this.load.svg("background", "assets/tank_background.svg");
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
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "background").setOrigin(0.5, 0.5);
    this.wallGroup = this.add.group();

    this.leaveButton = this.add.text(730, 30, 'LEAVE', { 
			fontSize: '18px', 
			fill: '#ffffff', 
			fontStyle: 'bold',
			backgroundColor: '#772222', 
			padding: { x: 12, y: 8 },
			shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
		}).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).setDepth(100).setAlpha(0.85);

    this.leaveButton.on('pointerdown', () => {
      this.socket.emit('leaveGame');
    })

    this.socket.on('returnToLobby', (data) => {
      // remove everything on client side
      this.socket.off('updatePVE');
      this.socket.off('newRound');
      this.socket.off('startRound');
      this.socket.off('sfx');
      this.socket.off('respawnSuccess');
      this.socket.off('scoreUpdate');
      this.socket.off('gameState');
      this.socket.off('newPlayer');
      this.socket.off('playerDisconnect');
      this.socket.off('endGame');
      this.scene.start('WaitingRoomScene', data);
    })

    const sbBg = this.add.graphics().setDepth(99); 
    sbBg.fillStyle(0x1a1a1a, 0.55);
    sbBg.lineStyle(2, 0xffcc00, 1);
    sbBg.fillRoundedRect(10, 10, 180, 290, 8);
    sbBg.strokeRoundedRect(10, 10, 180, 290, 8).setAlpha(0.55);
    this.add.text(100, 25, 'LEADERBOARD', {
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
    
    if (this.gameMode === 'PVP') {
      this.teamScoreTally = this.add.text(400, 0, 'BLUE: 0  |  RED: 0', {
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#000000bb',
        padding: { x: 15, y: 5 }
      }).setOrigin(0.5, 0).setDepth(100).setAlpha(0.95);
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
      this.roundPanel.fillRoundedRect(220, 245, 359, 90, 12);

      this.roundComplete = this.add.text(400, 250, 'ROUND COMPLETE!', {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffd700',
      }).setOrigin(0.5, 0).setDepth(100).setVisible(false);

      this.nextRound = this.add.text(400, 300, '', {
        fontFamily: 'Arial Black',
        fontSize: '22px',
        color: '#ffffff',
      }).setOrigin(0.5, 0).setDepth(100).setVisible(false);
    }
    
    this.socket.on("updatePVE", (data) => {
      this.curRound.text = `ROUND ${data.roundNum}`;
      this.enemiesRem.text = `Enemies: ${data.enemiesRem}`;
      this.livesRem.text = `Lives Left: ${data.lives}`;
    });

    this.socket.on("newRound", (data) => {
      this.roundComplete.setVisible(true);
      this.nextRound.setVisible(true);
      this.roundPanel.setVisible(true);
      this.nextRound.text = `Next Round in: ${Math.floor(data.cooldown / 1000)}`

    });
    this.socket.on("startRound", () => {
      this.roundComplete.setVisible(false);
      this.nextRound.setVisible(false);
      this.roundPanel.setVisible(false);
    });

    // Aesthetics
    this.sounds = { shoot : this.sound.add('shoot', { volume: 0.4 }),
                    bulletBounce : this.sound.add('bulletBounce', { volume: 0.3 }),
                    tankHit : this.sound.add('tankHit', { volume: 0.6 }) };
    
    this.anims.create({
      key: 'explode',
      frames: Array.from({ length: 5 }, (_, i) => ({ key: `exp${i + 1}` })),
      frameRate: 15,
      repeat: 0
    });

    this.socket.on('sfx', (data) => {
      if (data.type === 'tankHit') {
        // Explosion animation
        const explosion = this.add.sprite(data.x, data.y, 'exp1')
          .setDepth(30)
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
    });

    
    this.walls.forEach(w => {
      const sprite = this.add.tileSprite(
        w.x + w.w/2,
        w.y + w.h / 2,
        w.w,
        w.h,
        'wall-tile'
      );
      sprite.setDepth(20);
      this.wallGroup.add(sprite);
    });

    // Debug, you click then you know
    this.input.on('pointerdown', (pointer) => {
      console.log(`Click: x=${Math.round(pointer.x)}, y=${Math.round(pointer.y)}`);
    });

    // Spawn players onto the screen for the first time
    Object.keys(this.players).forEach((id) => {
      if (this.players[id].playerId === this.socket.id) {
        this.tank = this.add.sprite(this.players[id].x, this.players[id].y, this.players[id].team)
                      .setOrigin(0.5, 0.5);
        console.log('My tank spawned at:', this.players[id].x, this.players[id].y);
      } else {
        this.otherPlayers[this.players[id].playerId] = this.add.sprite(this.players[id].x, this.players[id].y, this.players[id].team)
                                                    .setOrigin(0.5, 0.5);
      }
    })

    // Respawn logic
    this.socket.on("respawnSuccess", () => {
      this.tankDead = false;
    });

    // Show scoreboard on gameScene start
    this.socket.emit("getScore");

    // Scoreboard update
    this.socket.on("scoreUpdate", scores => {
        this.scoreSlots.forEach(x => {
          x.setVisible(false);
        });
        if (this.gameMode === 'PVP') {
          const blueTotal = scores.filter(p => p.team === CONSTANTS.BLUE_TEAM).reduce((sum, p) => sum + p.score, 0);
          const redTotal = scores.filter(p => p.team === CONSTANTS.RED_TEAM).reduce((sum, p) => sum + p.score, 0);
          this.teamScoreTally.setText(`BLUE: ${blueTotal}  |  RED: ${redTotal}`);
        }

        for (let i = 0; i < scores.length; i++) {
          this.scoreSlots[i].setText(`${scores[i].name}: ${scores[i].score}`);
          if (this.gameMode === 'PVP') {
            this.scoreSlots[i].setFill(scores[i].team === CONSTANTS.RED_TEAM ? '#ff4d4d' : '#4da6ff');
          }
          this.scoreSlots[i].setVisible(true);
        }
    });

    this.socket.on('gameState', (state) => {
      if (!this.tank) return;


      state.players.forEach(p => {
        if (p.playerId === this.socket.id) {
          this.tank.x = p.x;
          this.tank.y = p.y;
          this.tank.rotation = p.rotation;
          this.tankDead = !p.isAlive;
          p.isAlive ? this.tank.clearTint() : this.tank.setTint(0x808080);
        } else {
            if (!this.otherPlayers[p.playerId]) {
              this.otherPlayers[p.playerId] = this.add.sprite(p.x, p.y, p.team)
                .setOrigin(0.5, 0.5);
            }
            this.otherPlayers[p.playerId].x = p.x;
            this.otherPlayers[p.playerId].y = p.y;
            this.otherPlayers[p.playerId].rotation = p.rotation;
            p.isAlive 
              ? this.otherPlayers[p.playerId].clearTint() 
              : this.otherPlayers[p.playerId].setTint(0x808080);
          }
      });
      
      // presentTanks gives the players that exist in the gameState sent by the server
      // we assume that the server correctly creates/destroys entities accordingly
      const presentTanks = new Set(state.players.map(x => x.playerId));
      
      Object.keys(this.otherPlayers).forEach(id => {
        if (!presentTanks.has(id)) {
          this.otherPlayers[id].destroy();
          delete this.otherPlayers[id];
        }
      });


      // Update bullets — create new, remove destroyed
      const activeBulletIds = new Set(state.bullets.map(b => b.id));
      state.bullets.forEach(b => {
        if (!this.bullets[b.id]) {
          this.bullets[b.id] = this.add.sprite(b.x, b.y, 'bullet')
            .setOrigin(0.5, 0.5);
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
    });

    this.socket.on('newPlayer', (playerInfo) => {
      console.log('New player joined:', playerInfo.playerId);
      if (this.otherPlayers[playerInfo.playerId]) {
        this.otherPlayers[playerInfo.playerId].destroy();
      }
      this.otherPlayers[playerInfo.playerId] = this.add.sprite(playerInfo.x, playerInfo.y, playerInfo.team)
                                                .setOrigin(0.5, 0.5);
    });

    this.socket.on('playerDisconnect', (id) => {
      console.log('Player left:', id);
      if (this.otherPlayers[id]) {
        this.otherPlayers[id].destroy();
        delete this.otherPlayers[id];
      }
    });

    this.socket.on('endGame', (data) => {
      console.log(`Game ended: ${data.winner} won!`);
      // off all listeners
      this.scene.start('EndGameScene', data);
    })
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

  // This happens every time we transition away and weird things happen
  shutdown() {
    if (!this.socket) return;
    this.socket.off('updatePVE');
    this.socket.off('newRound');
    this.socket.off('startRound');
    this.socket.off('sfx');
    this.socket.off('respawnSuccess');
    this.socket.off('scoreUpdate');
    this.socket.off('gameState');
    this.socket.off('newPlayer');
    this.socket.off('playerDisconnect');
    this.socket.off('endGame');
  }
}