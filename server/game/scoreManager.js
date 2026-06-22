const { CONSTANTS } = require('../../public/js/constants.js');

function updateScore(shooterId, room) {
  const firer = room.players[shooterId];
  if (firer) {
    firer.score++;
    room.io.emit('scoreUpdate', getScoreboard(room));
  }
  if (room.gameConfig.current.gameMode === 'PVP') {
    const blueTotal = Object.values(room.players).filter(p => p.team === CONSTANTS.BLUE_TEAM).reduce((sum, p) => sum + p.score, 0);
    const redTotal = Object.values(room.players).filter(p => p.team === CONSTANTS.RED_TEAM).reduce((sum, p) => sum + p.score, 0);
    if (blueTotal >= room.gameConfig.current.round || redTotal >= room.gameConfig.current.round) {
      room.io.emit('endGame', { winner: blueTotal >= room.gameConfig.current.round ? 'blue' : 'red',
					blueTotal,
					redTotal
				});
    }
  }
}

function getScoreboard(room) {
  return Object.values(room.players)
    .filter(p => !p.playerId.startsWith("BOT-"))
    .map(p => ({ name: p.name || p.playerId.slice(0, 5), score: p.score, team: p.team }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { updateScore, getScoreboard };