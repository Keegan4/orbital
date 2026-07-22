export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load images
    this.load.image("backG", "assets/GIU AMA 005-08.png");
    this.load.svg("backg", 'assets/versus_bg.svg');
    this.load.image('blue', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_blue.png');
    this.load.image('red', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_red.png');
    this.load.image('black', 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_dark.png');
    this.load.image('bullet', 'assets/kenney_topdownTanksRedux/PNG/Default size/bulletRed2.png');
    this.load.image('floor-tile', 'assets/kenney_topdownTanksRedux/PNG/Default size/tileGrass1.png');
    this.load.image("green", 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_green.png');
    this.load.image("bigRed", 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_bigRed.png');
    this.load.image("sand", 'assets/kenney_topdownTanksRedux/PNG/Default size/tank_sand.png');
    this.load.svg("spike", "assets/spike_hazard.svg");
    this.load.svg("bounce", "assets/bounce_pad.svg");

    // Load audio
    this.load.audio('shoot', 'assets/shoot.ogg');
    this.load.audio('bulletBounce','assets/bounce.ogg');
    this.load.audio('tankHit', 'assets/explosion.ogg');
    this.load.audio('click', 'assets/click_003.ogg');
    this.load.audio('tick', 'assets/tick_001.ogg');
    this.load.audio('error', 'assets/error_008.ogg');
    this.load.svg("bg", 'assets/lobby_cartoon.svg');
    this.load.audio('theme', 'assets/Title.mp3');
    this.load.audio('battle', 'assets/battle.mp3');
    this.load.audio('menu', 'assets/menu.mp3');

    // Load animations
    for (let i = 1; i <= 5; i++) {
      this.load.image(`exp${i}`, `assets/explosion${i}.png`);
    }    
  }

  create() {
    this.registry.set('socket', io());
    this.scene.start('LobbyMenuScene');
  }

  update() {
    
  }
}