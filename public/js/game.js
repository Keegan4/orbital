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


}
function create() {
  var self = this;
  this.socket = io();
  this.bullet = this.physics.add.group();
  this.otherPlayers = this.physics.add.group();
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on('playerDisconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  this.socket.on('playerMoved', function (playerInfo) {
  self.otherPlayers.getChildren().forEach(function (otherPlayer) {
    if (playerInfo.playerId === otherPlayer.playerId) {
      otherPlayer.setRotation(playerInfo.rotation);
      otherPlayer.setPosition(playerInfo.x, playerInfo.y);
    }
  });
});
  this.socket.on("playerShoot", (playerInfo) =>{
    fireBullet(self, playerInfo);
    console.log("playerShoot received:", playerInfo);

  });
  this.cursors = this.input.keyboard.createCursorKeys();

  this.lastFired = 0;
  this.fireRate = 500;
}
function update() {
  if (this.tank) {
    if (this.cursors.left.isDown) {
      this.tank.setAngularVelocity(-150);
    }  else {
      this.tank.setAngularVelocity(0);
    }

    if (this.cursors.right.isDown) {
      this.tank.setAngularVelocity(150);
    } 
    
    
  
    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.tank.rotation + 1.5, 100, this.tank.body.velocity);
    } else if (this.cursors.down.isDown) {
      this.physics.velocityFromRotation(this.tank.rotation + 1.5, -100, this.tank.body.velocity);
    } else {
      this.tank.setVelocity(0);
    }
    
  // emit player movement
  var x = this.tank.x;
  var y = this.tank.y;
  var r = this.tank.rotation;
  if (this.tank.oldPosition && (x !== this.tank.oldPosition.x || y !== this.tank.oldPosition.y || r !== this.tank.oldPosition.rotation)) {
    this.socket.emit('playerMovement', { x: this.tank.x, y: this.tank.y, rotation: this.tank.rotation });
  }
  this.tank.oldPosition = {
  x: this.tank.x,
  y: this.tank.y,
  rotation: this.tank.rotation
  };

  if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && this.time.now > this.fireRate + this.lastFired) {
    fireBullet(this, this.tank);
    this.socket.emit("PlayerShot", {x: this.tank.x, y: this.tank.y, rotation: this.tank.rotation });
    this.lastFired = this.time.now;
  }

  }
}

function addPlayer(self, playerInfo) {
  self.tank = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'tank1', 0).setOrigin(0.5, 0.5).setScale(0.3).setCollideWorldBounds(true);
  if (playerInfo.team === 'blue') {
    //self.tank.setTint(0x000000);
  } else {
    //self.tank.setTint(0x220000);
  }
  self.tank.setDrag(100);
  self.tank.setAngularDrag(100);
  self.tank.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'tank1', 1).setOrigin(0.5, 0.5).setScale(0.3);
  if (playerInfo.team === 'blue') {
    //otherPlayer.setTint(0x000000);
  } else {
    //otherPlayer.setTint(0x220000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

function fireBullet(scene, tank) {
  scene.bullet = scene.physics.add.sprite(tank.x, tank.y, 'bullet', 1).setOrigin(0.5, 0.5).setScale(2);
  scene.bullet.setRotation(tank.rotation +3.141592654);
  scene.physics.velocityFromRotation(tank.rotation + Math.PI/2, 500, scene.bullet.body.velocity);
}