export default class LobbyMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyMenuScene' });
  }

  preload() {
    this.load.audio('click', 'assets/click_003.ogg');
    this.load.audio('tick', 'assets/tick_001.ogg');
    this.load.audio('error', 'assets/error_008.ogg')
  }

  create() {
    this.socket = this.registry.get('socket');

    // Title
    this.add.text(400, 100, 'TANKS EVOLVED LOBBY', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

    // Error placeholder
    this.errorText = this.add.text(400, 450, '', { fontSize: '18px', fill: '#ff0000' }).setOrigin(0.5);

    // Button for create room
    const createBtn = this.add.text(400, 200, '[ Create Room ]', { fontSize: '24px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

    createBtn.on('pointerover', () => {
      this.tweens.add({
          targets: createBtn,
          scale: 1.1,
          duration: 120,
          ease: 'Back.easeOut',
          onStart: () => createBtn.setTint(0x88ff88)
      });
    });

    createBtn.on('pointerout', () => {
      this.tweens.add({
          targets: createBtn,
          scale: 1.0,
          duration: 100,
          ease: 'Power1',
          onStart: () => createBtn.clearTint()
      });
    });

    createBtn.on('pointerdown', () => {
      createBtn.setScale(0.95);
      createBtn.setTint(0x00aa00);
      this.sound.play('click');
    });

    createBtn.on('pointerup', () => {
      createBtn.setScale(1.1);
      createBtn.setTint(0x88ff88);
      this.socket.emit('createRoom');
    });

    // Join room textbox
    this.add.text(400, 280, 'Enter Room Code(6 characters):', { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);
    this.roomInput = this.add.dom(400, 320, 'input', {
            type: 'text',
            style: 'font-size: 20px; width: 150px; text-align: center; padding: 5px;'
        });
    this.roomInput.node.maxLength = 6;
    this.roomInput.node.placeholder = 'Room code';
    this.roomInput.node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
          const roomCode = this.roomInput.node.value.trim().toUpperCase();
          if (roomCode) {
              this.socket.emit('joinRoom', { code: roomCode });
          } else {
              this.showError({ message: 'Please enter a room code' });
          }
          this.roomInput.node.blur();
      }
    })

    // Join room button
    const joinBtn = this.add.text(400, 380, '[ Join Room ]', { fontSize: '24px', fill: '#0cf' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    joinBtn.on('pointerover', () => {
      this.tweens.add({
          targets: joinBtn,
          scale: 1.1,
          duration: 120,
          ease: 'Back.easeOut',
          onStart: () => joinBtn.setTint(0x88ffff)
      });
    });

    joinBtn.on('pointerout', () => {
      this.tweens.add({
          targets: joinBtn,
          scale: 1.0,
          duration: 100,
          ease: 'Power1',
          onStart: () => joinBtn.clearTint()
      });
    });

    joinBtn.on('pointerdown', () => {
      joinBtn.setScale(0.95);
      joinBtn.setTint(0x0088cc);
      this.sound.play('click');
    });

    joinBtn.on('pointerup', () => {
      this.sound.play('click');
      joinBtn.setScale(1.1);
      joinBtn.setTint(0x88ffff);
      const code = this.roomInput.node.value.trim().toUpperCase();
      if (code) {
        this.socket.emit('joinRoom', { code: code });
      } else {
          this.showError({ message: 'Please enter a room code' });
      }
    });

    // Event listeners
    this.socket.on('roomCreated', (data) => this.handleSuccess(data));
    this.socket.on('roomJoined', (data) => this.handleSuccess(data));
    this.socket.on('lobbyError', (message) => this.showError(message));
  }

  handleSuccess(data) {
    // Remove listeners
    this.removeListeners();
    this.scene.start('WaitingRoomScene', data);
  }

  showError(message) {
    this.sound.play('error');
    this.errorText.setText(`Error: ${message.message}`);
    this.tweens.add({         // vibrate effect
      targets: this.errorText,
      x: { from: 400, to: 408 },
      duration: 50,
      yoyo: true,
      repeat: 3
    });
    this.cameras.main.flash(200, 50, 0, 0); // Flash red to signal error
  }

  removeListeners() {
      this.socket.off('roomCreated');
      this.socket.off('roomJoined');
      this.socket.off('lobbyError');
  }

  update() {
    
  }
}