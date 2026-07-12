const {GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS} = CONSTANTS;
export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndGameScene' });
  }

  preload() {
  }

  init(data) {
    this.winner = data.winner;
    this.mode = data.mode;
    this.round = data.round;
    this.waitingRoomSceneData = data.waitingRoomSceneData;
    
  }

  create() {
    this.socket = this.registry.get('socket');
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "backG").setOrigin(0.5, 0.5).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.text(400, 100, `GAME OVER`, {
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#F0F0D0',
      stroke: '#5A6B28',
      strokeThickness: 5,
      fontFamily: 'Fredoka, sans-serif',
      resolution: 2,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5, 0.5);

    if (this.mode === "PVE") {
       this.add.text(400, 250, `You Are Out Of Lives!`, {
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#C4507A',
        stroke: '#3F4A18',
        fontFamily: 'Fredoka, sans-serif',
        resolution: 2,
        strokeThickness: 6,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
       }).setOrigin(0.5, 0.5);

       this.add.text(400, 400, `Round Achieved: ${this.round}`, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#F0F0D0',
        stroke: '#4A5620',
        strokeThickness: 4,
        fontFamily: 'Fredoka, sans-serif',
        resolution: 2,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
       }).setOrigin(0.5, 0.5);

    } else {
      this.add.text(400, 300, `${this.winner} won!`.toUpperCase(), {
        fontSize: '60px',
        fontStyle: 'bold',
        color: '#E0B060',
        stroke: '#4A3418',
        strokeThickness: 2,
        fontFamily: 'Fredoka, sans-serif',
        resolution: 2,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
      }).setOrigin(0.5, 0.5);
    }

    makeButton(this, 400, 550, 'Return to lobby', 0x4A5620, () => {
      this.socket.off('lobbyUpdate');
      this.scene.start('WaitingRoomScene', this.waitingRoomSceneData);
    });
    /*
    const returnToLobbyButton = this.add.text(400, 550, 'Return to lobby',"#4A5620", {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#F0F0F0',
      stroke: '#4A5620',
      strokeThickness: 3,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    returnToLobbyButton.on('pointerdown', () => {
      this.socket.off('lobbyUpdate');
      this.scene.start('WaitingRoomScene', this.waitingRoomSceneData);
    })
    */
    this.socket.on('lobbyUpdate', (data) => {
      this.waitingRoomSceneData.lobbyPlayers = data.lobbyPlayers;
      this.waitingRoomSceneData.gameConfig = data.gameConfig;
    })

    
  }
}