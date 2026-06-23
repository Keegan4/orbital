export default class WaitingRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndGameScene' });
  }

  init(data) {
    this.winner = data.winner;
    this.mode = data.mode;
    this.round = data.round
  }

  create() {
    if (this.mode === "PVE") {
       this.add.text(400, 100, `Game ended!`, {
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#0fe7e7',
       }).setOrigin(0.5, 0.5);

       this.add.text(400, 250, `You are out of lives!`, {
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#ff0000',
       }).setOrigin(0.5, 0.5);

       this.add.text(400, 400, `Round Achieved: ${this.round}`, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ff0000',
       }).setOrigin(0.5, 0.5);

    } else {
      this.add.text(400, 300, `Game ended: ${this.winner} won!`).setOrigin(0.5, 0.5);
    }
    const returnToLobbyButton = this.add.text(400, 550, 'Return to lobby').setOrigin(0.5, 0.5);
    
  }
}