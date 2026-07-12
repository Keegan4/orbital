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

  }

  create() {
    this.socket = this.registry.get('socket');

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
      this.roomInput = this.add.dom(cx - 10, 300, 'input', {
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

  update() {
    
  }
}