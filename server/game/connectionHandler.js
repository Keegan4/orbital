const { createPlayer, destroyPlayer } = require('./playerManager.js');
const state = require('../state.js');
const { getScoreboard } = require('./bulletManager.js');

function initialiseConnections(io) {
  io.on('connection', function (socket) {
    console.log('user ' + socket.id + ': connected');

    // Create player
    state.players[socket.id] = createPlayer(socket.id);

    // Send scoreboard
    io.emit('scoreUpdate', getScoreboard());

    // Send the players object to the this player
    socket.emit('currentPlayers', Object.fromEntries(
      Object.entries(state.players).map(([id, p]) => [id, {
        playerId: p.playerId,
        team: p.team,
        x: p.body.position.x,
        y: p.body.position.y,
        rotation: p.body.angle,
      }])
    ));

    // Update all other players of this player
    socket.broadcast.emit('newPlayer', {
      playerId: state.players[socket.id].playerId,
      team: state.players[socket.id].team,
      x: state.players[socket.id].body.position.x,
      y: state.players[socket.id].body.position.y,
      rotation: state.players[socket.id].body.angle,
    });

    // Player input
    socket.on('playerInput', function (input) {
      if (state.players[socket.id]) {
        state.players[socket.id].input = input;
      }
    });

    // Respawn request
    socket.on('respawnRequest', () => {
      if (state.players[socket.id]) {
        const player = state.players[socket.id];
        const { spawn } = require('./playerManager.js');
        player.isAlive = true;
        player.body.isSensor = false;
        player.createdAt = Date.now();
        const { x, y } = spawn(player.body);
        const Matter = require('matter-js');
        Matter.Body.setPosition(player.body, { x, y });
        socket.emit('respawnSuccess');
      }
    });

    // Disconnect
    socket.on('disconnect', function () {
      console.log('user ' + socket.id + ': disconnected');
      if (state.players[socket.id]) {
        destroyPlayer(socket.id);
      }
      io.emit('playerDisconnect', socket.id);
      io.emit('scoreUpdate', getScoreboard());
    });
  });
}

module.exports = { initialiseConnections };
