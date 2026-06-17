const { createRoom, getRoom, destroyRoom } = require('./roomManager.js');
const { createPlayer } = require('../game/playerManager.js');
const { getScoreboard } = require('../game/scoreManager.js');
const { WALL_POS } = require('../../public/js/constants.js');

function initialiseLobby(io, socket) {
  // Create a new room
  socket.on('createRoom', () => {
    const room = createRoom(socket.id, io);

    socket.roomCode = room.code;
    socket.join(room.code);

    room.lobbyPlayers[socket.id] = {
      socketId: socket.id,
      name: socket.id.slice(0, 5),
      team: 'red', // Host defaults to red
      isReady: false,
      isHost: true
    };

    socket.emit('roomCreated', {
      code: room.code,
      lobbyPlayers: Object.values(room.lobbyPlayers),
      difficulty: room.difficulties[room.diffSlider],
      color: room.diffColors[room.diffSlider]
    });

    console.log(`Room ${room.code} created by ${socket.id}`);
  });

  socket.on('joinRoom', ({ code }) => {
    const room = getRoom(code);

    if (!room) {
      socket.emit('lobbyError', { message: 'Room not found' });
      return;
    }
    if (room.status === 'playing') {
      socket.emit('lobbyError', { message: 'Game already started' });
      return;
    }

    socket.roomCode = code;
    socket.join(code);

    room.lobbyPlayers[socket.id] = {
      socketId: socket.id,
      name: socket.id.slice(0, 5),
      team: 'blue', // Otheres default to blue
      isReady: false,
      isHost: false
    };

    // Send room state to this player
    socket.emit('roomJoined', {
      code: room.code,
      lobbyPlayers: Object.values(room.lobbyPlayers),
      difficulty: room.difficulties[room.diffSlider],
      color: room.diffColors[room.diffSlider]
    });

    // Tell everyone else in room about this player
    socket.broadcast.to(code).emit('lobbyUpdate', {
      lobbyPlayers: Object.values(room.lobbyPlayers),
      difficulty: room.difficulties[room.diffSlider],
      color: room.diffColors[room.diffSlider]
    });

    console.log(`${socket.id} joined room ${code}`);
  });

  // Update name
  socket.on('setName', ({ name }) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.lobbyPlayers[socket.id]) return;

    room.lobbyPlayers[socket.id].name = name.trim().slice(0, 16); // max 16 chars
    broadcastLobbyUpdate(room);
  });

  // Update team
  socket.on('setTeam', ({ team }) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.lobbyPlayers[socket.id]) return;
    if (team !== 'red' && team !== 'blue') return;

    room.lobbyPlayers[socket.id].team = team;
    broadcastLobbyUpdate(room);
  });

  // Toggle ready
  socket.on('setReady', ({ isReady }) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.lobbyPlayers[socket.id]) return;

    room.lobbyPlayers[socket.id].isReady = isReady;
    broadcastLobbyUpdate(room);
    if (!isReady) {
      cancelCountdown(room);
    } else {
      checkAllReady(io, room);
    }
  });

  // Toggle aiBots
  socket.on('toggleAiBots', () => {
    const room = getRoom(socket.roomCode);
    if (!room || room.lobbyPlayers[socket.id].isHost !== true) return;
    room.diffSlider++;
    if (room.diffSlider >= room.difficulties.length) {
      room.diffSlider = 0;
    }
    broadcastLobbyUpdate(room);
  });

  // Leave lobby
  socket.on('leaveLobby', () => {
    handleLobbyLeave(io, socket);
  });
}

// Helpers
function broadcastLobbyUpdate(room) {
  room.io.to(room.code).emit('lobbyUpdate', {
    lobbyPlayers: Object.values(room.lobbyPlayers),
    difficulty: room.difficulties[room.diffSlider],
    color: room.diffColors[room.diffSlider]
  });
}

function checkAllReady(io, room) {
  const players = Object.values(room.lobbyPlayers);
  if (!players.every(p => p.isReady)) return;

  startCountdown(io, room);
}

let countdownInterval = null;

function startCountdown(io, room) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  let timeLeft = 3;
  room.io.to(room.code).emit('countdownStart', { timeLeft });

  countdownInterval = setInterval(() => {
    timeLeft--;
    room.io.to(room.code).emit('countdownTick', { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      startGame(io, room);
    }
  }, 1000);
}

function cancelCountdown(room) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    room.io.to(room.code).emit('countdownCancelled');
  }
}

function startGame(io, room) {
  room.start(WALL_POS);

  // Create/Transfer lobby people to the players {}
  Object.values(room.lobbyPlayers).forEach(lobbyPlayer => {
    const player = createPlayer(lobbyPlayer.socketId, room);
    player.team = lobbyPlayer.team;
    player.name = lobbyPlayer.name;
  });

  // Tell all clients to start the game
  room.io.to(room.code).emit('gameStart', {
    players: Object.values(room.players).map(p => ({
      playerId: p.playerId,
      team: p.team,
      name: p.name,
      x: p.body.position.x,
      y: p.body.position.y,
      rotation: p.body.angle,
    })),
    walls: WALL_POS
  });

  console.log(`Game started in room ${room.code}`);
}

function handleLobbyLeave(io, socket) {
  const room = getRoom(socket.roomCode);
  if (!room) return;

  delete room.lobbyPlayers[socket.id];
  socket.leave(room.code);
  socket.roomCode = null;

  // If room empty, destroy it
  if (Object.keys(room.lobbyPlayers).length === 0) {
    destroyRoom(room.code);
    return;
  }

  // If host left, assign new host
  if (!Object.values(room.lobbyPlayers).find(p => p.isHost)) {
    const newHost = Object.values(room.lobbyPlayers)[0];
    newHost.isHost = true;
  }

  broadcastLobbyUpdate(room);
}

module.exports = { initialiseLobby, handleLobbyLeave };