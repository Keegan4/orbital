var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  } 
};

var game = new Phaser.Game(config);

function preload() {
  this.load.spritesheet("tank1", "assets/tanks.png", {
    frameWidth: 171,
    frameHeight: 202
  });
  this.load.spritesheet("bullet", "assets/bullets.png", {
    frameWidth: 17,
    frameHeight: 17
  });
  this.load.spritesheet("wall", "assets/techblocks2.png", {
    frameWidth: 32,
    frameHeight: 32
  });
}

function create() {
  // Scene fields
  this.tank;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.walls = this.physics.add.staticGroup();
  this.bullets = this.physics.add.group();
  this.cursors = this.input.keyboard.createCursorKeys();
  this.lastFired = 0;
  this.fireRate = 500;

  this.physics.add.collider(this.bullets, this.walls, (bullet, wall) => {
    bullet.bounces++;
    if (bullet.bounces >= bullet.maxBounce) {
      bullet.destroy();
    }
  });

   // Wall creation
  this.walls.create(5, 10, "wall").setScale(50, 1).refreshBody();
  this.walls.create(5, 590, "wall").setScale(50, 1).refreshBody();
  this.walls.create(15, 150, "wall", 2).setScale(1, 30).refreshBody();
  this.walls.create(790, 150, "wall", 2).setScale(1, 30).refreshBody();

  this.socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
      if (players[id].playerId === this.socket.id) {
        addSelf(this, players[id]);
        this.physics.add.collider(this.tank, this.walls);
      } else {
        addOtherPlayers(this, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', (playerInfo) => {
    addOtherPlayers(this, playerInfo);
  });

  this.socket.on('playerDisconnect', (playerId) => {
    this.otherPlayers.getChildren().forEach((otherPlayer) => {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on('playerMoved', (playerInfo) => {
    this.otherPlayers.getChildren().forEach((otherPlayer) => {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on("playerShoot", (playerInfo) => {
    fireBullet(this, playerInfo);
  });
}

function update() {
  if (this.tank) {
    if (this.cursors.right.isDown) {
      this.tank.setAngularVelocity(150);
    } else if (this.cursors.left.isDown) {
      this.tank.setAngularVelocity(-150);
    } else {
      this.tank.setAngularVelocity(0);
    }
    
    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.tank.rotation + Math.PI / 2, 100, this.tank.body.velocity);
    } else if (this.cursors.down.isDown) {
      this.physics.velocityFromRotation(this.tank.rotation + Math.PI / 2, -100, this.tank.body.velocity);
    } else {
      this.tank.setVelocity(0);
    }
    
  // Emit player movement
  var x = this.tank.x;
  var y = this.tank.y;
  var r = this.tank.rotation;
  if (this.tank.oldPosition && (x !== this.tank.oldPosition.x || y !== this.tank.oldPosition.y 
                                  || r !== this.tank.oldPosition.rotation)) {
    this.socket.emit('playerMovement', { x : x, y : y, rotation : r });
  }
  this.tank.oldPosition = {
    x : this.tank.x,
    y : this.tank.y,
    rotation : this.tank.rotation
  };

  if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && this.time.now > this.fireRate + this.lastFired) {
    fireBullet(this, this.tank);
    this.socket.emit("playerShot", {x: this.tank.x, y: this.tank.y, rotation: this.tank.rotation });
    this.lastFired = this.time.now;
  }
  }

  if (this.bullets) {
    this.bullets.getChildren().forEach((bullet) => {
      bullet.rotation = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x) + Math.PI/2;
    })
  }
}

// Helper functions
function addSelf(scene, playerInfo) {
  scene.tank = scene.physics.add.sprite(playerInfo.x, playerInfo.y, 'tank1', 0)
               .setOrigin(0.5, 0.5)
               .setScale(0.3);
  if (playerInfo.team === 'blue') {
    //scene.tank.setTint(0x000000);
  } else {
    //scene.tank.setTint(0x220000);
  }
  scene.tank.setDrag(100);
  scene.tank.setAngularDrag(100);
  scene.tank.setMaxVelocity(200);
}

function addOtherPlayers(scene, playerInfo) {
  const otherPlayer = scene.physics.add.sprite(playerInfo.x, playerInfo.y, 'tank1', 1)
                      .setOrigin(0.5, 0.5)
                      .setScale(0.3);
  if (playerInfo.team === 'blue') {
    //otherPlayer.setTint(0x000000);
  } else {
    //otherPlayer.setTint(0x220000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  scene.otherPlayers.add(otherPlayer);
}

function fireBullet(scene, tank) {
  var dist = 40;
  var x = dist * Math.cos(tank.rotation + Math.PI/2) + tank.x;
  var y = dist * Math.sin(tank.rotation + Math.PI/2) + tank.y;
  const bullet = scene.bullets.create(x, y, 'bullet', 1).setOrigin(0.5, 0.5).setScale(2); 
  bullet.bounces = 0;
  bullet.maxBounce = 7;

  scene.physics.velocityFromRotation(tank.rotation + Math.PI/2, 500, bullet.body.velocity);
  bullet.setBounce(1.1);
}

function playerHit(bullet, tank) {
  bullet.destroy();
  tank.setTint(0xff0000);
  //tank.disableBody(true, true);
  //bullet.disableBody(true, true);
}