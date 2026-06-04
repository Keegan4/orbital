const { createPlayer, destroyPlayer, spawn } = require('./playerManager.js');
const { initialiseCollisions } = require('./collisionHandler.js');
const { getScoreboard } = require('./scoreManager.js');
const { createRoom, getRoom, destroyRoom } = require('../lobby/roomManager.js');
const { WALL_POS } = require('../../public/js/constants.js')
const Matter = require('matter-js');

let defaultRoom = null;

function initialiseConnections(io) {

  io.on('connection', function (socket) {
    if (!defaultRoom) {
      defaultRoom = createRoom(socket.id, io);
      defaultRoom.start(WALL_POS);
    }
    console.log('user ' + socket.id + ': connected');

    const room = defaultRoom;

    // Socket.io room so broadcasts are lobby/room specific
    socket.join(room.code);

    // Create player in room
    createPlayer(socket.id, room);

    // Send scoreboard from server to specific room
    room.io.to(room.code).emit('scoreUpdate', getScoreboard(room));

    // Send the players object to the this player
    socket.emit('currentPlayers', Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, {
        playerId: p.playerId,
        team: p.team,
        x: p.body.position.x,
        y: p.body.position.y,
        rotation: p.body.angle,
      }])
    ));

    // Update all other players of this player
    socket.broadcast.to(room.code).emit('newPlayer', {
      playerId: room.players[socket.id].playerId,
      team: room.players[socket.id].team,
      x: room.players[socket.id].body.position.x,
      y: room.players[socket.id].body.position.y,
      rotation: room.players[socket.id].body.angle,
    });

    // Player input
    socket.on('playerInput', function (input) {
      if (room.players[socket.id]) {
        room.players[socket.id].input = input;
      }
    });

    // Respawn request
    socket.on('respawnRequest', () => {
      if (room.players[socket.id]) {
        const player = room.players[socket.id];
        player.isAlive = true;
        player.body.isSensor = false;
        player.createdAt = Date.now();
        const { x, y } = spawn(player.body, room);
        Matter.Body.setPosition(player.body, { x, y });
        socket.emit('respawnSuccess');
      }
    });

    // Disconnect
    socket.on('disconnect', function () {
      console.log('user ' + socket.id + ': disconnected');
      if (room.players[socket.id]) {
        destroyPlayer(socket.id, room);
      }
      room.io.to(room.code).emit('playerDisconnect', socket.id);
      room.io.to(room.code).emit('scoreUpdate', getScoreboard(room));
    });
  });
}

module.exports = { initialiseConnections };
