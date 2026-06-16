export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WaitingRoomScene' });
  }

  init(data) {
    this.roomCode = data.code;
    this.lobbyPlayers = data.lobbyPlayers;
    this.aiBot = data.aiBot;
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
    this.roomCodeText = this.add.text(400, 50, `ROOM CODE: ${this.roomCode}`, { 
      fontSize: '36px', 
      fill: '#ffff00'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const hintText = this.add.text(400, 15, 'Click to copy code', { 
        fontSize: '14px', 
        fill: '#ffffff',
        backgroundColor: '#222222',
        padding: { x: 8, y: 4 }
    }).setOrigin(0.5);

    hintText.setAlpha(0);

    this.roomCodeText.on('pointerover', () => {
      this.tweens.killTweensOf(hintText);
      this.tweens.add({
        targets: hintText,
        alpha: 1,
        duration: 200,
        ease: 'Power1'
      });
      this.tweens.add({ targets: this.roomCodeText, scale: 1.08, duration: 100 });
    });

    this.roomCodeText.on('pointerout', () => {
      this.tweens.killTweensOf(hintText);
      this.tweens.add({
        targets: hintText,
        alpha: 0,
        duration: 200,
        ease: 'Power1',
        onComplete: () => {
          hintText.setText('Click to copy code');
        }
      });
      this.tweens.add({ targets: this.roomCodeText, scale: 1.0, duration: 100 });
    });

    this.roomCodeText.on('pointerdown', () => {
      this.sound.play('click');
      const rawCode = this.roomCode; 
      navigator.clipboard.writeText(rawCode)
        .then(() => {
          hintText.setText('Copied to Clipboard! ✅');
        })
        .catch(err => {
          hintText.setText('Failed to copy ❌');
          console.error('Clipboard error:', err);
        });
    });

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

    // aiBots toggle button (host only)
    this.aiBotsBtn = this.add.text(70, 30, this.aiBot ? ' AI BOTS: ON ' : ' AI BOTS: OFF ', { 
      fontSize: '16px', 
      fontStyle: 'bold',
      fill: '#ffffff', 
      backgroundColor: this.aiBot ? '#00ff00' : '#ff4444',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5)

    if (!this.lobbyPlayer.isHost) {
      this.aiBotsBtn.setAlpha(0.5);
    } else {
      this.aiBotsBtn.setInteractive({ useHandCursor: true });
      this.aiBotsBtn.on('pointerover', () => this.tweens.add({ targets: this.aiBotsBtn, scale: 1.08, duration: 100 }));
      this.aiBotsBtn.on('pointerout', () => this.tweens.add({ targets: this.aiBotsBtn, scale: 1.0, duration: 100 }));
      this.aiBotsBtn.on('pointerdown', () => {
        this.socket.emit('toggleAiBots');
      });
    }

    // Count down text
    this.countdownText = this.add.text(400, 350, '', {
      fontSize: '96px',
      fill: '#ff3333',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    this.countdownLabel = this.add.text(400, 260, 'GAME STARTING IN', {
      fontSize: '24px',
      fill: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    // Helper for animation
    const playCountdownAnimation = (textElement, newText) => {
      textElement.setText(newText);
      textElement.setVisible(true);

      textElement.setScale(2);
      textElement.setAlpha(0);

      this.tweens.add({
        targets: textElement,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 250,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: textElement,
            scaleX: 0.85,
            scaleY: 0.85,
            alpha: 0.7,
            duration: 700,
            ease: 'Linear'
          });
        }
      });
    };

    // Event listeners
    this.socket.on('lobbyUpdate', (data) => this.handleLobbyUpdate(data));
    this.socket.on('gameStart', (gameData) => this.handleGameStart(gameData));
    this.socket.on('countdownStart', (data) => {
      this.countdownLabel.setVisible(true).setAlpha(0);
      this.tweens.add({
        targets: this.countdownLabel,
        alpha: 1,
        duration: 300
      });
      playCountdownAnimation(this.countdownText, data.timeLeft);
    });
    this.socket.on('countdownTick', (data) => {
      playCountdownAnimation(this.countdownText, data.timeLeft);
    });
    this.socket.on('countdownCancelled', () => {
      this.tweens.add({
        targets: this.countdownLabel,
        alpha: 0,
        duration: 200,
        onComplete: () => this.countdownLabel.setVisible(false)
      });

      this.tweens.add({
        targets: this.countdownText,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => this.countdownText.setVisible(false)
      });
    });

    this.renderPlayerLists();
  }

  handleLobbyUpdate(data) {
    this.lobbyPlayers = data.lobbyPlayers;
    this.lobbyPlayer = this.lobbyPlayers.find(p => p.socketId === this.socket.id);
    this.aiBot = data.aiBot;
    this.aiBotsBtn.setText(this.aiBot ? ' AI BOTS: ON ' : ' AI BOTS: OFF ');
    this.aiBotsBtn.setBackgroundColor(this.aiBot ? '#00ff00' : '#ff4444');
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