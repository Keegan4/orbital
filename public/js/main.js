import BootScene from './Scenes/BootScene.js';
import LobbyMenuScene from './Scenes/LobbyMenuScene.js';
import WaitingRoomScene from './Scenes/WaitingRoomScene.js';
import GameScene from './Scenes/GameScene.js';
import PostHitScene from './Scenes/PostHitScene.js';
import EndGameScene from './Scenes/EndGameScene.js';
import HowToPlayScene from './Scenes/HowToPlayScene.js';

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
  fps: {
    forceSetTimeOut: true 
  },
  parent: 'game-container',
  scene: [ BootScene, LobbyMenuScene, HowToPlayScene, WaitingRoomScene, GameScene, PostHitScene, EndGameScene ],
  dom: { createContainer: true }
};

var game = new Phaser.Game(config);