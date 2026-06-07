export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WaitingRoomScene' });
  }

  init(data) {
    this.roomCode = data.code;
    this.lobbyPlayers = data.lobbyPlayers;
  }

  preload() {

  }

  create() {
    this.socket = this.registry.get('socket');
    this.lobbyPlayer = this.lobbyPlayers.find(p => p.socketId === this.socket.id);
    this.currentTeam = this.lobbyPlayer.team;
    this.isReady = this.lobbyPlayer.isReady;

    // Lobby leave button
    this.leaveBtn = this.add.text(730, 30, 'LEAVE', { 
			fontSize: '18px', 
			fill: '#ffffff', 
			fontStyle: 'bold',
			backgroundColor: '#772222', 
			padding: { x: 12, y: 8 },
			shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
		})
		.setOrigin(0.5)
		.setInteractive({ useHandCursor: true });

		this.leaveBtn.on('pointerover', () => this.tweens.add({ targets: this.leaveBtn, scale: 1.08, duration: 100 }));
		this.leaveBtn.on('pointerout', () => this.tweens.add({ targets: this.leaveBtn, scale: 1.0, duration: 100 }));
		this.leaveBtn.on('pointerdown', () => {
			this.leaveBtn.disableInteractive();
			this.tweens.add({
				targets: this.leaveBtn,
				x: 900,
				alpha: 0,
				duration: 250,
				ease: 'Cubic.easeIn',
				onComplete: () => {
					this.socket.emit('leaveLobby');
					this.handleLobbyLeave();
				}
			});
		});

    // Room code text
    this.add.text(400, 50, `ROOM CODE: ${this.roomCode}`, { 
      fontSize: '36px', 
      fill: '#ffff00'
    }).setOrigin(0.5);

    // Name input field
    this.add.text(400, 110, 'Type Name(max 16 characters) & Press Enter:', { fontSize: '18px', fill: '#ffffff' }).setOrigin(0.5);
    this.nameInput = this.add.dom(400, 145, 'input', {
      type: 'text',
      style: 'font-size: 20px; width: 150px;'
    });
    this.nameInput.node.maxLength = 16;
    this.nameInput.node.placeholder = `Default name: ${this.lobbyPlayer.name}`;
    this.nameInput.node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const finalName = this.nameInput.node.value.trim().length === 0
                          ? this.lobbyPlayer.name
                          : this.nameInput.node.value.trim();
        this.socket.emit('setName', { name: finalName });
        this.cameras.main.flash(150, 0, 150, 0); // Flash green as confirmation
        this.nameInput.node.blur();
      }
    })

    // Team selection button
    this.teamBtn = this.add.text(280, 210, ` TEAM: ${this.currentTeam.toUpperCase()} `, { 
      fontSize: '20px', 
      fill: '#ffffff', 
      backgroundColor: this.currentTeam.toUpperCase() === 'RED' ? '#ff4444' : '#4444ff',
      padding: { x: 15, y: 8 },
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    this.teamBtn.on('pointerover', () => this.tweens.add({ targets: this.teamBtn, scale: 1.08, duration: 100 }));
    this.teamBtn.on('pointerout', () => this.tweens.add({ targets: this.teamBtn, scale: 1.0, duration: 100 }));
    this.teamBtn.on('pointerdown', () => {
      this.currentTeam = this.currentTeam.toLowerCase() === 'red' ? 'blue' : 'red';
      const nextColorStr = this.currentTeam === 'red' ? '#ff4444' : '#4444ff';
      this.tweens.add({
        targets: this.teamBtn,
        scaleX: 0,
        duration: 120,
        yoyo: true,
        ease: 'Quad.easeIn',
        onYoyo: () => {
          this.teamBtn.setText(` TEAM: ${this.currentTeam.toUpperCase()} `);
          this.teamBtn.setBackgroundColor(nextColorStr);
        }
      });
      this.socket.emit('setTeam', { team: this.currentTeam });
    });

    // Ready button
    this.readyBtn = this.add.text(520, 210, ' NOT READY ', { 
      fontSize: '20px', 
      fill: '#000000', 
      backgroundColor: '#ffcc00',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.readyBtn.on('pointerover', () => this.tweens.add({ targets: this.readyBtn, scale: 1.08, duration: 100 }));
    this.readyBtn.on('pointerout', () => this.tweens.add({ targets: this.readyBtn, scale: 1.0, duration: 100 }));
    this.readyBtn.on('pointerdown', () => {
    	this.isReady = !this.isReady;
    	this.tweens.add({
    		targets: this.readyBtn,
    		scaleX: 0,
    		duration: 120,
    		yoyo: true,
    		ease: 'Quad.easeIn',
    		onYoyo: () => {
    			if (this.isReady) {
    				this.readyBtn.setText(' READY ✓ ');
    				this.readyBtn.setBackgroundColor('#00cc44');
    				this.readyBtn.setColor('#ffffff');
    			} else {
    				this.readyBtn.setText(' NOT READY ');
    				this.readyBtn.setBackgroundColor('#ffcc00');
    				this.readyBtn.setColor('#000000');
    			}
    		}
    	});
    	this.socket.emit('setReady', { isReady: this.isReady });
    });

    // Team columns
    this.add.text(200, 280, '--- RED TEAM ---', { fontSize: '20px', fill: '#ff4444', fontWeight: 'bold' }).setOrigin(0.5);
    this.add.text(600, 280, '--- BLUE TEAM ---', { fontSize: '20px', fill: '#4444ff', fontWeight: 'bold' }).setOrigin(0.5);
    this.redTeamTexts = [];
    this.blueTeamTexts = [];

    // Event listeners
    this.socket.on('lobbyUpdate', (data) => this.handleLobbyUpdate(data));
    this.socket.on('gameStart', (gameData) => this.handleGameStart(gameData));

    this.renderPlayerLists();
  }

  handleLobbyUpdate(data) {
    this.lobbyPlayers = data.lobbyPlayers;
    this.lobbyPlayer = this.lobbyPlayers.find(p => p.socketId === this.socket.id);
    this.renderPlayerLists();
  }

  renderPlayerLists() {
    this.redTeamTexts.forEach(text => text.destroy());
    this.blueTeamTexts.forEach(text => text.destroy());
    this.redTeamTexts = [];
    this.blueTeamTexts = [];
    let redCount = 0;
    let blueCount = 0;
    this.lobbyPlayers.forEach(player => {
      const hostTag = player.isHost ? ' [👑] ' : '';
      const displayName = hostTag + player.name;
      const statusIndicator = player.isReady ? ' [READY]' : '';
      const statusColor = player.isReady ? '#00ff00' : '#bbbbbb';
      
      if (player.team === 'red') {
        const yPos = 320 + (redCount * 32);
        const txt = this.add.text(200, yPos, displayName + statusIndicator, { fontSize: '18px', fill: statusColor }).setOrigin(0.5);
        this.redTeamTexts.push(txt);
        redCount++;
      } else {
        const yPos = 320 + (blueCount * 32);
        const txt = this.add.text(600, yPos, displayName + statusIndicator, { fontSize: '18px', fill: statusColor }).setOrigin(0.5);
        this.blueTeamTexts.push(txt);
        blueCount++;
      }
    });
  }

  handleGameStart(gameData) {
    this.removeListeners();
    this.scene.start('GameScene', gameData);
  }

  handleLobbyLeave() {
    this.removeListeners();
    this.scene.start('LobbyMenuScene');
  }

  removeListeners() {
    this.input.keyboard.off('keydown-ENTER');
    this.socket.off('lobbyUpdate');
    this.socket.off('gameStart');
  }

  update() {

  }
}