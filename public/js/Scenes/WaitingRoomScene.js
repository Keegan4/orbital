const {GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS} = CONSTANTS;
export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WaitingRoomScene' });
  }

  init(data) {
    this.roomCode = data.code;
    this.lobbyPlayers = data.lobbyPlayers;
    this.gameConfig = data.gameConfig;
  }

  preload() {
    this.load.svg("backg", 'assets/versus_bg.svg');
    this.load.image("dark", "assets/kenney_topdownTanksRedux/PNG/Default size/tank_dark.png")
  }

  create() {
    makeMusic(this, "menu");
    this.input.keyboard.clearCaptures();
    this.socket = this.registry.get('socket');
    this.lobbyPlayer = this.lobbyPlayers.find(p => p.socketId === this.socket.id);
    this.currentTeam = this.lobbyPlayer.team;
    this.isReady = this.lobbyPlayer.isReady;
    this.selectedMode = this.gameConfig.current.gameMode;
  	this.selectedDifficulty = this.gameConfig.current.difficulty;
  	this.selectedRounds = this.gameConfig.current.round;

    this.cleanups = [];
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "backg").setOrigin(0.5, 0.5);

    
    this.instanceId = Math.random().toString(36).slice(2, 7);
    console.log(`[WaitingRoomScene ${this.instanceId}] created`);

    this.createRoomCodeText();
    this.createLeaveButton();
    this.createSetNameButton();
    this.createGameModeSelector(400, 550);
    this.createReadyButton(700, 550);
    this.createPveStaticPlayerList();
    this.createPvpStaticPlayerList();
    this.createCountDown();

    // Track socket listeners so clean up is easier with this.cleanup()
    this.trackSocket('lobbyUpdate', data => this.handleLobbyUpdate(data));
    this.trackSocket('gameStart', gameData => this.handleGameStart(gameData));
    this.trackSocket('countdownStart', data => this.handleCountdownStart(data));
    this.trackSocket('countdownTick', data => this.handleCountdownTick(data));
    this.trackSocket('countdownCancelled', () => this.handleCountdownCancelled());

    // Update once when player sees the scene
    this.handleLobbyUpdate({ lobbyPlayers: this.lobbyPlayers, gameConfig: this.gameConfig });

    // Cleanup when scene closes
    this.events.once('shutdown', () => {
      this.cleanup();
    });
  }

  trackSocket(event, handler) {
    this.socket.on(event, handler);
    this.cleanups.push(() => {
      this.socket.off(event, handler);
    });
  }

  cleanup() {
    console.log(`[WaitingRoomScene ${this.instanceId}] cleanup`);
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];
  }

  handleLobbyUpdate(data) {
    this.lobbyPlayers = data.lobbyPlayers;
    this.lobbyPlayer = this.lobbyPlayers.find(p => p.socketId === this.socket.id);
    this.selectedMode = data.gameConfig.current.gameMode;
  	this.selectedDifficulty = data.gameConfig.current.difficulty;
  	this.selectedRounds = data.gameConfig.current.round;
    if (this.selectedMode === 'PVE') {
  			this.modeSelectButton.setText(`MODE: PVE - ${this.selectedDifficulty.toUpperCase()}`);
        this.pvePlayerList.setVisible(true);
        const diffColor = this.selectedDifficulty.toLowerCase() === 'hard' ? 0xe74c3c 
        : this.selectedDifficulty.toLowerCase() === 'medium' ? 0xe67e22 
        : 0x2ecc71;
        this.badgeBg.setFillStyle(diffColor);
        this.pvpPlayerList.setVisible(false);
        this.enemySubtext.setText(`Mode: ${this.selectedDifficulty.toUpperCase()}`);
        this.renderPvePlayerList();
  		} else {
  			this.modeSelectButton.setText(`MODE: PVP - ${this.selectedRounds} ROUNDS`);
        this.pvePlayerList.setVisible(false);
        this.pvpPlayerList.setVisible(true);
        this.renderPvpPlayerList(this.redSlots, this.lobbyPlayers.filter(p => p.team === CONSTANTS.RED_TEAM));
        this.renderPvpPlayerList(this.blueSlots, this.lobbyPlayers.filter(p => p.team === CONSTANTS.BLUE_TEAM));
  		}
  }

  handleGameStart(gameData) {
    this.scene.start('GameScene', gameData);
  }

  handleLobbyLeave() {
    this.scene.start('LobbyMenuScene');
  }

  addButtonHover(target, scaleUp = 1.08) {
    target.on('pointerover', () => this.tweens.add({ targets: target, scale: scaleUp, duration: 100 }));
    target.on('pointerout', () => this.tweens.add({ targets: target, scale: 1.0, duration: 100 }));
  }

  createRoomCodeText(x = 400, y = 50) {
    this.roomCodeText = makeButton(this, x, y, `ROOM CODE: ${this.roomCode}`, '', () => {
      const rawCode = this.roomCode; 
      navigator.clipboard.writeText(rawCode)
        .then(() => {
          hintText.setText('Copied to Clipboard!');
        })
        .catch(err => {
          hintText.setText('Failed to copy');
          console.error('Clipboard error:', err);
        });
    }, 280);

    const hintText = this.add.text(x, y - 36, 'Click to copy code', { 
        fontSize: '14px', 
        fill: '#ffffff',
        backgroundColor: '#222222',
        fontFamily: 'Fredoka', resolution: 2,
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
  }

  createLeaveButton(x = 710, y = 50) {
    this.leaveBtn = makeButton(this, x, y, 'LEAVE', '#772222', () => {
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
    }, 130);
  }

  createSetNameButton(x = 120, y = 50) {
    // Set name button to container screen
    const setNameButton = makeButton(this, x, y, "Set Name", 0x4caf50, () => {
      setNameContainer.setVisible(true);
      setTimeout(() => { inputNode.focus(); }, 10); 
    }, 180, 64)

    const setNameContainer = this.add.container(400, 300);
    const clickBlocker = this.add.rectangle(0, 0, 800, 600, 0x000000, 0).setInteractive(); // blocks entire screen
    const setNameBackground = this.add.rectangle(0, 0, 650, 450, 0x111111, 0.95);
    setNameBackground.setStrokeStyle(1, 0x4a4a4a);
    this.addButtonHover(setNameButton);
    const setNameTitle = this.add.text(0, -80, 'Type Name (max 16 characters) & Press Enter:', {
        fontSize: '20px', 
        fill: '#cccccc',
        fontFamily: 'Fredoka', resolution: 2, 
    }).setOrigin(0.5);

    const setNameInputHtml = `
      <input type="text" id="lobbyNameInput"
      style="font-family: 'Fredoka', sans-serif; font-size: 20px; width: 160px; text-align: center; 
      padding: 5px; border-radius: 4px; border: none;" />`;
    this.nameInput = this.add.dom(0, -10).createFromHTML(setNameInputHtml);

    const inputNode = this.nameInput.getChildByID('lobbyNameInput');
    inputNode.title = 'Type Name(max 16 characters) & Press Enter:';
    inputNode.maxLength = 16;
    inputNode.placeholder = `Default: ${this.lobbyPlayer.name}`;
    if (inputNode) {
      inputNode.onfocus = () => {
        this.input.keyboard.enabled = false; 
      };
    
      inputNode.onblur = () => {
        this.input.keyboard.enabled = true; 
      };
    }

    const submitNameAction = () => {
      const finalName = inputNode.value.trim().length === 0
                      ? this.lobbyPlayer.name
                      : inputNode.value.trim();
      this.socket.emit('setName', { name: finalName });
      this.cameras.main.flash(150, 0, 150, 0); // Flash green as confirmation
      setNameContainer.setVisible(false);
      setNameButton.setVisible(true);
    };

    const setNameSubmitButton = makeButton(this, 0, 60, 'SUBMIT', '#ff9f43', submitNameAction);
    setNameContainer.add([clickBlocker, setNameBackground, setNameTitle, this.nameInput, setNameSubmitButton]);
    setNameContainer.setDepth(100);
    setNameContainer.setVisible(false);

    inputNode.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        submitNameAction();
      }
      else if (event.key === 'Escape') {
        inputNode.blur();
        setNameContainer.setVisible(false);
      }
    });
  }

  createGameModeSelector(x = 400, y = 130) {
    // Gamemode selection button
    this.modeSelectButton = makeButton(this, x, y, 'MODE: CHOOSE GAME MODE', '', () => {modeContainer.setVisible(true)}, 300);

  	const modeContainer = this.add.container(400, 300);
  	modeContainer.setDepth(100);

  	const modeBlocker = this.add.rectangle(0, 0, 800, 600, 0x000000, 0).setInteractive();
  	const modeBg = this.add.rectangle(0, 0, 650, 450, 0x111111, 0.95);
  	modeBg.setStrokeStyle(1, 0x4a4a4a);

  	const modeTitle = this.add.text(0, -180, 'CONFIG GAME SETUP', { fontSize: '24px', fill: '#ffffff', fontFamily: 'Fredoka', resolution: 2,}).setOrigin(0.5);

    // Left PVE side
  	const pveTitle = this.add.text(-160, -110, 'PVE', { fontSize: '20px', fill: '#cccccc', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);
  	const pveSubTitle = this.add.text(-160, -50, 'Select Difficulty:', { fontSize: '15px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);

  	// Difficulty choice buttons
  	const btnEasy = this.add.text(-250, 10, '[ EASY ]', { fontSize: '16px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2,}).setOrigin(0.5).setInteractive({ useHandCursor: true });
  	const btnMed  = this.add.text(-160, 10, '[ MEDIUM ]',  { fontSize: '16px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  	const btnHard = this.add.text(-70, 10, '[ HARD ]', { fontSize: '16px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.addButtonHover(btnEasy);
    this.addButtonHover(btnMed);
    this.addButtonHover(btnHard);

    // Right PVP side
  	const pvpTitle = this.add.text(160, -110, 'PVP', { fontSize: '20px', fill: '#cccccc', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);
  	const pvpSubTitle = this.add.text(160, -50, 'Select Rounds:', { fontSize: '15px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);

  	// Round choice buttons
  	const btnRnd5  = this.add.text(70, 10, '[ 5 ]',  { fontSize: '16px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  	const btnRnd10 = this.add.text(160, 10, '[ 10 ]', { fontSize: '16px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  	const btnRnd15 = this.add.text(250, 10, '[ 15 ]', { fontSize: '16px', fill: '#888888', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.addButtonHover(btnRnd5);
    this.addButtonHover(btnRnd10);
    this.addButtonHover(btnRnd15);

    // Bottom confirm button
  	const btnConfirm = this.add.text(0, 160, 'CONFIRM SELECTION', {
  		fontSize: '22px', fill: '#888888', padding: 8, fontFamily: 'Fredoka', resolution: 2,
  	}).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.addButtonHover(btnConfirm);
    
  	modeContainer.add([
  		modeBlocker, modeBg, modeTitle,
  		pveTitle, pveSubTitle, btnEasy, btnMed, btnHard,
  		pvpTitle, pvpSubTitle, btnRnd5, btnRnd10, btnRnd15,
  		btnConfirm
  	]);

  	modeContainer.setVisible(false);

  	// Helper to set colours
  	const clearPvpSelections = () => {
  		pvpTitle.setStyle({ fill: '#cccccc' });
  		btnRnd5.setStyle({ fill: '#888888' });
  		btnRnd10.setStyle({ fill: '#888888' });
  		btnRnd15.setStyle({ fill: '#888888' });
  	};

  	const clearPveSelections = () => {
  		pveTitle.setStyle({ fill: '#cccccc' });
  		btnEasy.setStyle({ fill: '#888888' });
  		btnMed.setStyle({ fill: '#888888' });
  		btnHard.setStyle({ fill: '#888888' });
  	};

  	// PVE options buttons
  	btnEasy.on('pointerdown', () => {
  		this.selectedMode = 'PVE';
  		this.selectedDifficulty = 'EASY';
  		clearPvpSelections();
  		pveTitle.setStyle({ fill: '#00ff00' });
  		btnEasy.setStyle({ fill: '#00ff00' });
  		btnMed.setStyle({ fill: '#888888' });
  		btnHard.setStyle({ fill: '#888888' });
  	});

  	btnMed.on('pointerdown', () => {
  		this.selectedMode = 'PVE';
  		this.selectedDifficulty = 'MEDIUM';
  		clearPvpSelections();
  		pveTitle.setStyle({ fill: '#ff9f43' });
  		btnEasy.setStyle({ fill: '#888888' });
  		btnMed.setStyle({ fill: '#ff9f43' });
  		btnHard.setStyle({ fill: '#888888' });
  	});

  	btnHard.on('pointerdown', () => {
  		this.selectedMode = 'PVE';
  		this.selectedDifficulty = 'HARD';
  		clearPvpSelections();
  		pveTitle.setStyle({ fill: '#ff0000' });
  		btnEasy.setStyle({ fill: '#888888' });
  		btnMed.setStyle({ fill: '#888888' });
  		btnHard.setStyle({ fill: '#ff0000' });
  	});

  	// PVP options buttons
  	btnRnd5.on('pointerdown', () => {
  		this.selectedMode = 'PVP';
  		this.selectedRounds = 5;
  		clearPveSelections();
  		pvpTitle.setStyle({ fill: '#ff9f43' });
  		btnRnd5.setStyle({ fill: '#ff9f43' });
  		btnRnd10.setStyle({ fill: '#888888' });
  		btnRnd15.setStyle({ fill: '#888888' });
  	});

  	btnRnd10.on('pointerdown', () => {
  		this.selectedMode = 'PVP';
  		this.selectedRounds = 10;
  		clearPveSelections();
  		pvpTitle.setStyle({ fill: '#ff9f43' });
  		btnRnd5.setStyle({ fill: '#888888' });
  		btnRnd10.setStyle({ fill: '#ff9f43' });
  		btnRnd15.setStyle({ fill: '#888888' });
  	});

  	btnRnd15.on('pointerdown', () => {
  		this.selectedMode = 'PVP';
  		this.selectedRounds = 15;
  		clearPveSelections();
  		pvpTitle.setStyle({ fill: '#ff9f43' });
  		btnRnd5.setStyle({ fill: '#888888' });
  		btnRnd10.setStyle({ fill: '#888888' });
  		btnRnd15.setStyle({ fill: '#ff9f43' });
  	});

  	btnConfirm.on('pointerdown', () => {
  		modeContainer.setVisible(false);
  		if (this.selectedMode === 'PVE') {
  			this.modeSelectButton.setText(`MODE: PVE - ${this.selectedDifficulty.toUpperCase()}`);
  		} else {
  			this.modeSelectButton.setText(`MODE: PVP - ${this.selectedRounds} ROUNDS`);
  		}

      this.gameConfig.current.gameMode = this.selectedMode;
  	  this.gameConfig.current.difficulty = this.selectedDifficulty;
  	  this.gameConfig.current.round = this.selectedRounds;
      this.socket.emit('setGameConfig', this.gameConfig);
  	});
  }
  

  createReadyButton(x = 520, y = 210) {
    // Ready button
    const handleReadyBtn = () => {
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
    };
    this.readyBtn = makeButton(this, x, y, 'NOT READY', '#ffcc00', handleReadyBtn, 160)
  }

  createPveStaticPlayerList() {
  	this.pvePlayerList = this.add.container(400, 300);

  	// PVE CONTAINER SETUP
  	const width = 650;
  	const height = 400;

  	//const bg = this.add.rectangle(0, 0, width, height, 0x000000, 1);
  	const divider = this.add.rectangle(0, 0, 2, height - 40, 0xCCCCCC, 1);
  	const playerHeader = this.add.text(-160, -160, 'PLAYERS', { fontSize: '20px', fontWeight: 'bold', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);
  	const enemyHeader = this.add.text(160, -160, 'ENEMY', { fontSize: '20px', fontWeight: 'bold', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);

  	//this.pvePlayerList.add([bg, divider, playerHeader, enemyHeader]);
  	this.pvePlayerList.add([divider, playerHeader, enemyHeader]);

  	// Array for player slots
  	this.pveSlots = [];

  	const startY = -110;
  	const spacingY = 55;

  	for (let i = 0; i < 5; i++) {
  		const slotY = startY + (i * spacingY);

  		// Placeholders for each slot
  		const slotBg = this.add.rectangle(-160, slotY, 260, 45, 0x141a2b, 0.55).setOrigin(0.5).setStrokeStyle(3, 0x141a2b, 1); ;
  		const emptyTxt = this.add.text(-160, slotY, '[ Open Slot ]', { fontSize: '14px', fill: '#BBBBBB', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);
  		const slotText = this.add.text(-280, slotY, '', { fontSize: '16px', fill: '#fff',fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0, 0.5);
  		const slotStatus = this.add.text(-50, slotY, '', { fontSize: '14px', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(1, 0.5);

  		this.pvePlayerList.add([slotBg, emptyTxt, slotText, slotStatus]);
  		this.pveSlots.push({ slotBg, emptyTxt, slotText, slotStatus });
  	}

    // Just making things prettier
    const enemyShadow = this.add.rectangle(163, 3, 260, 220, 0x000000, 0.08).setOrigin(0.5);
  	const enemyBg = this.add.rectangle(160, 0, 260, 220, 0xF9F2F2, 1).setOrigin(0.5)
    const enemyHeaderBg = this.add.rectangle(160, -88, 260, 44, 0x2a2a3e, 1).setOrigin(0.5);
  	const enemyText = this.add.text(160, -88, 'ENEMY BOT', { 
      fontSize: '22px', 
      fill: '#ff4444', 
      fontWeight: 'bold', 
      fontFamily: 'Fredoka', 
      resolution: 2,
    }).setOrigin(0.5);

    const diffColor = this.selectedDifficulty.toLowerCase() === 'hard' ? 0xe74c3c 
      : this.selectedDifficulty.toLowerCase() === 'medium' ? 0xe67e22 
      : 0x2ecc71;

    this.badgeBg = this.add.rectangle(160, 55, 120, 32, diffColor, 1)
      .setOrigin(0.5)
      .setStrokeStyle(0);

    const badgeText = this.add.image(160, -10, "dark")
      .setOrigin(0.5)
      .setScale(1.5)
      .setRotation(-Math.PI / 2);

  	this.enemySubtext = this.add.text(160, 55, ``, { 
      fontSize: '14px', 
      fill: '#666666', 
      fontFamily: 'Fredoka', 
      resolution: 2, 
      fontStyle: "bold"
    }).setOrigin(0.5);
  
  	this.pvePlayerList.add([enemyShadow, enemyBg, enemyHeaderBg, enemyText, this.badgeBg, badgeText, this.enemySubtext]);
  }

  createPvpStaticPlayerList() {
  	this.pvpPlayerList = this.add.container(400, 300);

  	const width = 800;
  	const height = 400;

  	//const bg = this.add.rectangle(0, 0, width, height, 0x000000, 1);
  	const divider = this.add.rectangle(0, 0, 2, height - 40, 0xCCCCCC, 1);
  	const redHeader = this.add.text(-200, -160, 'RED TEAM', { fontSize: '20px', fill: '#ff5a52', fontWeight: 'bold', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);
  	const blueHeader = this.add.text(200, -160, 'BLUE TEAM', { fontSize: '20px', fill: '#0004f9', fontWeight: 'bold', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);

  	//this.pvpPlayerList.add([bg, divider, redHeader, blueHeader]);
  	this.pvpPlayerList.add([divider, redHeader, blueHeader]);

  	// Array for player slots
  	this.redSlots = [];
  	this.blueSlots = [];

  	const startY = -110;
  	const spacingY = 55;

  	// Instantiate the static red side
  	for (let i = 0; i < 5; i++) {
  		const slotY = startY + (i * spacingY);
  		this.redSlots.push(this.instantiateStaticPvpSlot(-200, slotY, '→', 0xFDF2F2));
  	}

  	// Instantiate the static blue side 
  	for (let i = 0; i < 5; i++) {
  		const slotY = startY + (i * spacingY);
  		this.blueSlots.push(this.instantiateStaticPvpSlot(200, slotY, '←', 0xF2F4FD));
  	}
    this.pvpPlayerList.setVisible(false);
  }

  instantiateStaticPvpSlot(xOffset, y, buttonText, bgColor) {
    const slotWidth = 340;
    const halfWidth = slotWidth / 2;
    const leftEdge = xOffset - halfWidth;
    const rightEdge = xOffset + halfWidth;

  	const rowBg = this.add.rectangle(xOffset, y, slotWidth, 45, 0x141a2b, 0.55).setOrigin(0.5).setStrokeStyle(3, 0x141a2b, 1); 
  	const emptyBg = this.add.rectangle(xOffset, y, slotWidth, 45, 0x141a2b, 0.55).setOrigin(0.5).setStrokeStyle(3, 0x141a2b, 1); 
  	const emptyTxt = this.add.text(xOffset, y, '[ Empty Slot ]', { fontSize: '14px', fill: '#BBBBBB', fontFamily: 'Fredoka', resolution: 2, }).setOrigin(0.5);
  
    const hostIcon = this.add.text(leftEdge + 15, y, '[ 👑 ]', { fill: '#000000', fontFamily: 'Fredoka', resolution: 2,}).setOrigin(0, 0.5).setVisible(false);
  	const nameTxt = this.add.text(xOffset - 10, y, '', { 
      fontSize: '14px', 
      fill: '#ffffff',
      fontWeight: 'bold',
      fontFamily: 'Fredoka', resolution: 2,
    }).setOrigin(0.5, 0.5);
    const statusTxt = this.add.text(rightEdge - 50, y, '', { 
      fontSize: '12px',
      fontWeight: 'bold',
      fontFamily: 'Fredoka', resolution: 2,
    }).setOrigin(1, 0.5);
    const switchBtn = this.add.text(rightEdge - 15, y, buttonText, { 
      fontSize: '16px', 
      fill: '#333333',
      padding: { x: 5, y: 4 },
      fontFamily: 'Fredoka', resolution: 2,
    }).setOrigin(1, 0.5);
    
  	this.pvpPlayerList.add([rowBg, emptyBg, emptyTxt, hostIcon, nameTxt, statusTxt, switchBtn]);
  	return { rowBg, emptyBg, emptyTxt, hostIcon, nameTxt, statusTxt, switchBtn, leftEdge };
  }

  renderPvePlayerList() {
    for (let i = 0; i < 5; i++) {
      const slot = this.pveSlots[i];
      const player = this.lobbyPlayers[i];

      if (player) {
        slot.emptyTxt.setVisible(false);
        slot.slotText.setVisible(true).setText(player.isHost ? ` [👑] ${player.name}` : player.name);
        const statusText = player.isReady ? '🟢' : '🟡';
        const statusColor = player.isReady ? '#00aa00' : '#ffaa00';
        slot.slotStatus.setVisible(true).setText(statusText);
      } else {
        slot.emptyTxt.setVisible(true);
        slot.slotText.setVisible(false).setText('');
        slot.slotStatus.setVisible(false).setText('');
      }
    }    
  }

  renderPvpPlayerList(uiSlots, playerArray) {
    for (let i = 0; i < 5; i++) {
      const slot = uiSlots[i];
      const player = playerArray[i];
      slot.switchBtn.off('pointerdown');
      if (player) {
        slot.rowBg.setVisible(true);
        slot.emptyBg.setVisible(false);
        slot.emptyTxt.setVisible(false);
        if (player.isHost) {
          slot.hostIcon.setVisible(true);
          //slot.nameTxt.setX(slot.leftEdge + 36);
        } else {
          slot.hostIcon.setVisible(false);
          //slot.nameTxt.setX(slot.leftEdge + 15);
        }
        slot.nameTxt.setVisible(true).setText(player.name);
        const statusText = player.isReady ? '🟢' : '🟡';
        const statusColor = player.isReady ? '#00aa00' : '#ffaa00';
        slot.statusTxt.setVisible(true).setText(statusText);
        slot.switchBtn.setVisible(this.lobbyPlayer.socketId === player.socketId || this.lobbyPlayer.isHost).setInteractive({ useHandCursor: true });
        slot.switchBtn.on('pointerdown', () => {
          this.socket.emit('setTeam', { team: player.team === CONSTANTS.RED_TEAM ? CONSTANTS.BLUE_TEAM : CONSTANTS.RED_TEAM, target: player.socketId});
        })
      } else {
          slot.rowBg.setVisible(false);
          slot.emptyBg.setVisible(true);
          slot.emptyTxt.setVisible(true);
          slot.hostIcon.setVisible(false);
          slot.nameTxt.setVisible(false).setText('');
          slot.statusTxt.setVisible(false).setText('');
          slot.switchBtn.setVisible(false);
      }
    }
  }

  createCountDown() {
    this.countDownContainer = this.add.container(400, 300).setVisible(false);
    const countDownBg = this.add.rectangle(0, 0, 800, 600, 0x111111, 0.5);
    this.countDownText = this.add.text(0, 0, '', {
      fontSize: '96px',
      fill: '#ff3333',
      fontStyle: 'bold',
      fontFamily: 'Fredoka', resolution: 2,
    }).setOrigin(0.5);
    const countDownLabel = this.add.text(0, -100, 'GAME STARTING IN', {
      fontSize: '24px',
      fill: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Fredoka', resolution: 2,
    }).setOrigin(0.5);
    this.countDownContainer.add([countDownBg, countDownLabel, this.countDownText]);
  }

  playCountdownAnimation(newText) {
    this.countDownText.setText(newText);
    this.countDownText.setScale(2);
    this.countDownText.setAlpha(0);
    this.tweens.killTweensOf(this.countDownText);
    this.tweens.add({
      targets: this.countDownText,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.countDownText,
          scaleX: 0.85,
          scaleY: 0.85,
          alpha: 0.7,
          duration: 700,
          ease: 'Linear'
        });
      }
    });
  }

  handleCountdownStart(data) {
    this.countDownContainer.setVisible(true).setAlpha(1);
    this.playCountdownAnimation(data.timeLeft);
  }

  handleCountdownTick(data) {
    this.playCountdownAnimation(data.timeLeft);
  }

  handleCountdownCancelled() {
    this.tweens.killTweensOf(this.countDownContainer);
    this.tweens.add({
      targets: this.countDownContainer,
      alpha: 0,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.countDownContainer.setVisible(false);
        this.countDownText.setText('');
      }
    });
  }

  update() {

  }
}