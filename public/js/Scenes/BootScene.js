export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {

  }

  create() {
    this.registry.set('socket', io());
    this.scene.start('LobbyMenuScene');
  }

  update() {
    
  }
}