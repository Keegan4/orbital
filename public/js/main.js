import BootScene from './Scenes/BootScene.js';
import LobbyMenuScene from './Scenes/LobbyMenuScene.js';
import WaitingRoomScene from './Scenes/WaitingRoomScene.js';
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
  parent: 'game-container',
  scene: [ BootScene, LobbyMenuScene, WaitingRoomScene, GameScene, PostHitScene ],
  dom: { createContainer: true }
};

var game = new Phaser.Game(config);