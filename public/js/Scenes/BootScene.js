export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.backG = this.load.image("backG", "assets/GIU AMA 005-08.png");
  }

  create() {
    this.registry.set('socket', io());
    this.scene.start('LobbyMenuScene');
  }

  update() {
    
  }
}