const { createPlayer, destroyPlayer, spawn } = require('./playerManager.js');
const { initialiseCollisions } = require('./collisionHandler.js');
const { getScoreboard } = require('./scoreManager.js');
const { createRoom, getRoom, destroyRoom } = require('../lobby/roomManager.js');
const { WALL_POS } = require('../../public/js/constants.js')
const Matter = require('matter-js');
const { initialiseLobby, handleLobbyLeave } = require('../lobby/lobbyHandler.js');

function initialiseConnections(io) {

  io.on('connection', function (socket) {
    console.log('user ' + socket.id + ': connected');

    initialiseLobby(io, socket);

    // Player input
    socket.on('playerInput', function (input) {
      const room = getRoom(socket.roomCode);
      if (!room || room.status !== 'playing') return;
      if (!room.players[socket.id]) return;
      room.players[socket.id].input = input;
    });

    // Respawn request
    socket.on('respawnRequest', (data) => {
      const room = getRoom(socket.roomCode);
      if (!room || !room.players[socket.id]) return;
      const player = room.players[socket.id];
      player.isAlive = true;
      player.body.isSensor = false;
      player.createdAt = Date.now();
      player.powerups.push(data.powerup);
      console.log(player.powerups);
      const { x, y } = spawn(player.body, room);
      Matter.Body.setPosition(player.body, { x, y });
      socket.emit('respawnSuccess');
    });

    // Disconnect
    socket.on('disconnect', function () {
      console.log('user ' + socket.id + ': disconnected');
      const room = getRoom(socket.roomCode);
      if (!room) return;

      if (room.status === 'playing') {
        destroyPlayer(socket.id, room);
        room.io.to(room.code).emit('playerDisconnect', socket.id);
        room.io.to(room.code).emit('scoreUpdate', getScoreboard(room));

        if (Object.keys(room.players).length === 0) {
          room.stop();
        }
      } else {
        handleLobbyLeave(io, socket);
      }
    });
  });
}

module.exports = { initialiseConnections };
