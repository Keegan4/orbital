import GameScene from './Scenes/GameScene.js';
import PostHitScene from './Scenes/PostHitScene.js';

var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [ GameScene, PostHitScene ]
};

var game = new Phaser.Game(config);