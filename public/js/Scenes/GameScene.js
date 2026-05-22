const {GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS} = CONSTANTS;
export default class PostHitScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('blue', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_blue.png');
    this.load.image('red', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_red.png');
    this.load.image('bullet', 'assets/kenney_topdownTanksRedux/PNG/Default size/bulletRed2.png');
    this.load.svg("background", "assets/tank_background.svg");
    this.load.svg("wall-tile", "assets/wall_tile.svg");
  }

  create() {
    this.socket = io();
    this.tank;
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

    WALL_POS.forEach(w => {
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

    this.socket.on('currentPlayers', (players) => {
      console.log('I,', this.socket.id, 'connected. Players online:', Object.keys(players).length);
      Object.keys(players).forEach((id) => {
        if (players[id].playerId === this.socket.id) {
          this.tank = this.add.sprite(players[id].x, players[id].y, players[id].team)
                        .setOrigin(0.5, 0.5)
                        //.setScale(0.3);
          console.log('My tank spawned at:', players[id].x, players[id].y);
        } else {
          this.otherPlayers[players[id].playerId] = this.add.sprite(players[id].x, players[id].y, players[id].team)
                                                      .setOrigin(0.5, 0.5)
                                                      //.setScale(0.3);
        }
      })
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
            if (this.otherPlayers[p.playerId]) {
              this.otherPlayers[p.playerId].x = p.x;
              this.otherPlayers[p.playerId].y = p.y;
              this.otherPlayers[p.playerId].rotation = p.rotation;
              p.isAlive 
                ? this.otherPlayers[p.playerId].clearTint() 
                : this.otherPlayers[p.playerId].setTint(0x808080);
            }
          }
      });
      // Update bullets — create new, remove destroyed
      const activeBulletIds = new Set(state.bullets.map(b => b.id));
      state.bullets.forEach(b => {
        if (!this.bullets[b.id]) {
          this.bullets[b.id] = this.add.sprite(b.x, b.y, 'bullet')
            .setOrigin(0.5, 0.5)
            //.setScale(0.5);
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
      this.otherPlayers[playerInfo.playerId] = this.add.sprite(playerInfo.x, playerInfo.y, playerInfo.team)
                                                .setOrigin(0.5, 0.5)
                                                //.setScale(0.3);
    });

  //  this.socket.on('playerHit', (data) => {
  //    if (data.playerId === this.socket.id) {
  //      console.log('You were hit');
  //      this.tank.setTint(0x808080);
  //      this.tank.disable();
  //      // respawn logic goes here later
  //    } else {
  //      if (this.otherPlayers[data.playerId]) {
  //        this.otherPlayers[data.playerId].setTint(0x808080);
  //        //this.otherPlayers[data.playerId].destroy();
  //        //delete this.otherPlayers[data.playerId];
  //      }
  //    }
  //  });

    this.socket.on('playerDisconnect', (id) => {
      console.log('Player left:', id);
      if (this.otherPlayers[id]) {
        this.otherPlayers[id].destroy();
        delete this.otherPlayers[id];
      }
    });
  }

  update() {
    if (!this.tank) return;

    if (this.tankDead) {
      this.scene.pause('GameScene');
      this.scene.launch('PostHitScene', {
        killCount: 2,
        team: this.playerTeam,
        timeAlive: 30
      });
    }
    const input = {
      left : this.cursors.left.isDown || this.wasd.left.isDown,
      right : this.cursors.right.isDown || this.wasd.right.isDown,
      up : this.cursors.up.isDown || this.wasd.up.isDown,
      down : this.cursors.down.isDown || this.wasd.down.isDown,
      fire : this.cursors.space.isDown
    };

    if (JSON.stringify(input) !== JSON.stringify(this.lastInput)) {
      this.socket.emit('playerInput', input);
      this.lastInput = input;
    }
  }
}