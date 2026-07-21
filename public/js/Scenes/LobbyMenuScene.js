const {GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS} = CONSTANTS;
export default class LobbyMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyMenuScene' });
  }

  preload() {
    this.load.audio('click', 'assets/click_003.ogg');
    this.load.audio('tick', 'assets/tick_001.ogg');
    this.load.audio('error', 'assets/error_008.ogg');
    this.load.svg("bg", 'assets/lobby_cartoon.svg');
    this.load.audio('theme', 'assets/Title.mp3');
    this.load.audio('battle', 'assets/battle.mp3');
    this.load.audio('menu', 'assets/menu.mp3');

  }

  create() {
    this.socket = this.registry.get('socket');
    makeMusic(this, "theme");

    if (!window.globalMuteRegistered) {
      window.globalMuteRegistered = true;
      window.addEventListener('keydown', (event) => {
        if (event.key === 'm' || event.key === 'M') {
          const activeElement = document.activeElement;
          const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
          );
          if (!isTyping) {
            this.toggleMute();
          }
        }
      });
    }

    const createText = () => {

      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2;
      
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg").setOrigin(0.5, 0.5);
      this.add.text(GAME_WIDTH / 2, 55, 'TANKS EVOLVED LOBBY', {
        fontFamily: 'Fredoka',
        fontSize: '40px',
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#141a2b',     
        strokeThickness: 5,
        resolution: 2
      }).setOrigin(0.5).setShadow(0, 4, '#0d1220', 0, false, true);
      
      this.muteBtn = makeButton(this, cx, this.cameras.main.height - 60, this.sound.mute ? '🔇' : '🔊',
        '', () => this.toggleMute(), 50);

      const hintText = this.add.text(cx, this.cameras.main.height - 100, 'Tip: Press [ M ] to toggle sound anytime', { 
        fontSize: '14px', 
        fill: '#ffffff',
        backgroundColor: '#222222',
        fontFamily: 'Fredoka', resolution: 2,
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5);

      hintText.setAlpha(0);

      this.muteBtn.on('pointerover', () => {
        this.tweens.killTweensOf(hintText);
        this.tweens.add({
          targets: hintText,
          alpha: 1,
          duration: 200,
          ease: 'Power1'
        });
      });

      this.muteBtn.on('pointerout', () => {
        this.tweens.killTweensOf(hintText);
        this.tweens.add({
          targets: hintText,
          alpha: 0,
          duration: 200,
          ease: 'Power1',
          onComplete: () => {
            hintText.setText('Tip: Press [ M ] to toggle sound anytime');
          }
        });
      });

      // Error placeholder
      this.errorText = this.add.text(400, 450, '', { fontSize: '18px', fill: '#ff0000', fontFamily: 'Fredoka', resolution: 2}).setOrigin(0.5);

      // Button for create room
      makeButton(this, cx, 180, 'Create Room', 0x4caf50, () => this.socket.emit('createRoom'));

      // Join room textbox
      this.add.text(cx, 260, 'Enter Room Code (6 characters):', { 
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px', 
        fill: '#fff',
        resolution: 2
      }).setOrigin(0.5);
      this.roomInput = this.add.dom(cx, 300, 'input', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '20px',
        width: '180px',
        textAlign: 'center',
        padding: '10px',
        border: '4px solid #141a2b',
        borderRadius: '14px',
        background: '#eaf4ff',
        outline: 'none',
        resolution: 2
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
      makeButton(this, cx, 400, 'Join Room', 0x3aa0d8, () => {
        const code = this.roomInput.node.value.trim().toUpperCase();
        if (code) this.socket.emit('joinRoom', { code });
        else this.showError({ message: 'Please enter a room code' });
      });
    };


    // Title
    document.fonts.load('700 40px "Fredoka"').then(() => {
      createText(this);  
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

  toggleMute() {
    this.sound.mute = !this.sound.mute;
    if (this.muteBtn) {
      this.muteBtn.setText(!this.sound.mute ? '🔇' : '🔊');
    }
  }

  update() {
    
  }
}