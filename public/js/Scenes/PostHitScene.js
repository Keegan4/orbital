export default class PostHitScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PostHitScene' });
  }

  // Data passed in from GameScene when player dies
  init(data) {
    this.killCount = data.killCount || 0;
    this.team = data.team || 'blue';
    this.timeAlive = data.timeAlive || 0;
    this.socket = data.socket;
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // YOU WERE HIT
    this.add.text(width / 2, height / 3, 'YOU WERE HIT', {
      fontSize : '48px',
      color : '#ff4444',
      fontStyle : 'bold'
    }).setOrigin(0.5);

    // Stats
    this.add.text(width / 2, height / 2, 
      `Kills: ${this.killCount}\nTime alive: ${this.timeAlive}s`, {
      fontSize : '24px',
      color : '#ffffff',
      align : 'center'
    }).setOrigin(0.5);

    // Respawn button — wired to server later
    const btn = this.add.text(width / 2, height * 0.75, '[ RESPAWN ]', {
      fontSize : '32px',
      color : '#44ff44',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#88ff88'));
    btn.on('pointerout', () => btn.setColor('#44ff44'));
    btn.on('pointerdown', () => this.handleRespawn());

    // Respawn countdown
    this.respawnTimer = 5;
    this.timerText = this.add.text(width / 2, height * 0.65, 
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
    this.socket.emit('respawnRequest');
    this.socket.once("respawnSuccess", () => {
      this.tankDead = false;
      this.scene.stop('PostHitScene');
      this.scene.resume('GameScene');
    })
    
  }
}