const { CONSTANTS } = require('../../public/js/constants.js');

function updateScore(shooterId, room) {
  const firer = room.players[shooterId];
  if (firer) {
    firer.score += 1;
    room.io.to(room.code).emit('scoreUpdate', getScoreboard(room));
  }
  if (room.gameConfig.current.gameMode === 'PVP') {
    const blueTotal = Object.values(room.players).filter(p => p.team === CONSTANTS.BLUE_TEAM).reduce((sum, p) => sum + p.score, 0);
    const redTotal = Object.values(room.players).filter(p => p.team === CONSTANTS.RED_TEAM).reduce((sum, p) => sum + p.score, 0);
    if (blueTotal >= room.gameConfig.current.round || redTotal >= room.gameConfig.current.round) {
      // destroy game
      room.stop();
      const winner = blueTotal >= room.gameConfig.current.round ? CONSTANTS.BLUE_TEAM : CONSTANTS.RED_TEAM
      // send clients to endgame
      room.io.to(room.code).emit('endGame', { winner,	blueTotal, redTotal, 
                                waitingRoomSceneData: { 
                                  lobbyPlayers: Object.values(room.lobbyPlayers), 
                                  gameConfig: room.gameConfig, 
                                  code: room.code 
                                }});
      // update history
      room.history.push({ gameModeConfig: room.gameConfig.current,
                                 winner: winner,
                                 blueTotal: blueTotal,
                                 redTotal: redTotal });
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