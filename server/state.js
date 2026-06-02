// Global game state
let players = {};
let bullets = {};
let bulletIdCounter = 0;

module.exports = {
  players,
  bullets,
  bulletIdCounter,
  incrementBulletId: () => bulletIdCounter++
};
