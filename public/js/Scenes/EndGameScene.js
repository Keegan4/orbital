export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndGameScene' });
  }

  init(data) {
    this.winner = data.winner;
  }

  create() {
    this.add.text(400, 300, `Game ended: ${this.winner} won!`).setOrigin(0.5, 0.5);
    const returnToLobbyButton = this.add.text(400, 550, 'Return to lobby').setOrigin(0.5, 0.5);
    
  }
}