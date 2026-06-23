export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndGameScene' });
  }

  init(data) {
    this.winner = data.winner;
    this.waitingRoomSceneData = data.waitingRoomSceneData;
  }

  create() {
    this.socket = this.registry.get('socket');
    this.add.text(400, 300, `Game ended: ${this.winner} won!`).setOrigin(0.5, 0.5);
    const returnToLobbyButton = this.add.text(400, 550, 'Return to lobby').setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    returnToLobbyButton.on('pointerdown', () => {
      this.socket.off('lobbyUpdate');
      this.scene.start('WaitingRoomScene', this.waitingRoomSceneData);
    })

    this.socket.on('lobbyUpdate', (data) => {
      this.waitingRoomSceneData.lobbyPlayers = data.lobbyPlayers;
      this.waitingRoomSceneData.gameConfig = data.gameConfig;
    })


    
  }
}