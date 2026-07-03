export default class PostHitScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PostHitScene' });
  }

  // Data passed in from GameScene when player dies
  init(data) {
    this.score = data.score || 0;
    this.team = data.team || 'blue';
    this.timeAlive = Math.floor(data.timeAlive / 1000) || 0;
    this.socket = data.socket;
    this.powerups = data.powerups;
    this.killerName = data.killerName;
    
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // YOU WERE HIT
    this.add.text(width / 2, height / 7, `YOU HAVE BEEN KILLED`, {
      fontSize : '48px',
      color : '#ff4444',
      fontStyle : 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 5, `SHOT BY: ${this.killerName}`, {
      fontSize : '23px',
      color : '#ff4444',
      fontStyle : 'bold'
    }).setOrigin(0.5);

    // Stats
    this.add.text(width / 2, height * 0.75, 
      `Kills: ${this.score}\nTime alive: ${this.timeAlive}s`, {
      fontSize : '24px',
      color : '#ffffff',
      align : 'center',
     
    }).setOrigin(0.5);

    if (!this.powerups) {
      this.add.text(width / 2, height / 2, 
        `YOU WERE KILLED BY YOURSELF\n OR A TEAM MATE!`, {
        fontSize : '40px',
        color : '#ff4444',
        align : 'center',
        fontStyle : 'bold'
      }).setOrigin(0.5);
    }

    const cardW = 150;
    const cardH = 200;
    const createPower = (x, y, powerup) => {
      const rect = this.add.rectangle(0, 0, cardW, cardH, 0xffffff);
      rect.setStrokeStyle(2, 0x000000);
      const title = this.add.text(0, -30, powerup.display, {
      fontSize : '12px',
      color : '#000000',
      align : 'center',
      wordWrap: {width: cardW - 40}
      }).setOrigin(0.5);

      const rarity = this.add.text(0, -60, powerup.rarity.toUpperCase(), {
      fontSize : '20px',
      color : RARITIES[powerup.rarity],
      align : 'center'
      }).setOrigin(0.5);

      const disc = this.add.text(0, 40, powerup.disc, {
      fontSize : '12px',
      color : "#000000",
      align : 'center',
      wordWrap: {width: cardW - 40}
      }).setOrigin(0.5);
      return this.add.container(x, y, [rect, title, rarity, disc])
    };

    let x = 190;
    let y = 270; //Hardcoded found to be the best looking

    if (this.powerups) {
      let powers = []

      for (let i = 0; i < 3; i++) {
        const power = createPower(x, y, this.powerups[i]);

        // Coordinates are relative to the container, so you need this
        // Weird looking coordinates for your rectangle
        power.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
          Phaser.Geom.Rectangle.Contains);
        power.on('pointerover', () => this.tweens.add({ targets: power, scale: 1.08, duration: 100 }));
        power.on('pointerout', () => {
          if (this.selectedPower === undefined) {
            this.tweens.add({ targets: power, scale: 1, duration: 100 });
          } else {
            if (this.selectedPower !== this.powerups[i]) {
            this.tweens.add({ targets: power, scale: 0.8, duration: 100 });
            } 
          }
          
        });
        power.on("pointerdown", () => {
          this.tweens.add({ targets: power, scale: 1.08, duration: 100 });
          powers.forEach(x => {
            if (x !== power) {
              this.tweens.add({ targets: x, scale: 0.8, duration: 80 });
            }
          })

          this.selectedPower = this.powerups[i];
        });
        powers.push(power);
        x += cardW + 40;
      }
    }

    // Respawn button — wired to server 
    const btn = this.add.text(width / 2, height * 0.90, '[ RESPAWN ]', {
      fontSize : '32px',
      color : '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#88ff88'));
    btn.on('pointerout', () => btn.setColor('#44ff44'));
    btn.on('pointerdown', () => this.handleRespawn());

    // Respawn countdown
    this.respawnTimer = CONSTANTS.RESPAWN_TIME;
    this.timerText = this.add.text(width / 2, height * 0.85, 
      `Respawn available in ${this.respawnTimer}s`, {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Count down every second
    this.time.addEvent({
      delay: 1000,
      repeat: this.respawnTimer - 1,
      callback: () => {
        this.respawnTimer--;
        if (this.respawnTimer <= 0) {
          this.timerText.setText('');
          btn.setColor('#44ff44');
        } else {
          this.timerText.setText(`Respawn available in ${this.respawnTimer}s`);
          btn.setColor('#888888');  // greyed out during countdown
        }
      }
    });

    // Disable button during countdown
    btn.disableInteractive();
    this.time.delayedCall(this.respawnTimer * 1000, () => {
      btn.setInteractive({ useHandCursor: true });
    });
  }



  handleRespawn() {
    // Tell server to respawn
    this.socket.emit('respawnRequest', {
      powerup: this.selectedPower
    });
    this.selectedPower = undefined;
    this.socket.once("respawnSuccess", () => {
      this.tankDead = false;
      this.scene.stop('PostHitScene');
      this.scene.resume('GameScene');
    })
    
  }


}