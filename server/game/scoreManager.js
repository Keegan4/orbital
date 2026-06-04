function updateScore(shooterId, room) {
  const firer = room.players[shooterId];
  if (firer) {
    firer.score++;
    room.io.emit('scoreUpdate', getScoreboard(room));
  }
}

function getScoreboard(room) {
  return Object.values(room.players)
    .map(p => ({ name: p.name || p.playerId.slice(0, 5), score: p.score }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { updateScore, getScoreboard };