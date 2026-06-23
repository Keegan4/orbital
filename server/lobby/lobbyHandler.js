const { createRoom, getRoom, destroyRoom } = require('./roomManager.js');
const { createPlayer } = require('../game/playerManager.js');
const { getScoreboard } = require('../game/scoreManager.js');
const { WALL_POS, CONSTANTS } = require('../../public/js/constants.js');

function initialiseLobby(io, socket) {
  // Create a new room
  socket.on('createRoom', () => {
    const room = createRoom(socket.id, io);

    socket.roomCode = room.code;
    socket.join(room.code);

    room.lobbyPlayers[socket.id] = {
      socketId: socket.id,
      name: socket.id.slice(0, 5),
      team: CONSTANTS.RED_TEAM, // Host defaults to red
      isReady: false,
      isHost: true
    };

    socket.emit('roomCreated', {
      code: room.code,
      lobbyPlayers: Object.values(room.lobbyPlayers),
      gameConfig: room.gameConfig
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
    if (Object.keys(room.lobbyPlayers).length >= room.capacity) {
      socket.emit('lobbyError', { message: 'Lobby full'});
      return;
    }

    socket.roomCode = code;
    socket.join(code);

    room.lobbyPlayers[socket.id] = {
      socketId: socket.id,
      name: socket.id.slice(0, 5),
      team: Object.keys(room.lobbyPlayers).length % 2 === 0 ? CONSTANTS.BLUE_TEAM : CONSTANTS.RED_TEAM,
      isReady: false,
      isHost: false
    };

    // Send room state to this player
    socket.emit('roomJoined', {
      code: room.code,
      lobbyPlayers: Object.values(room.lobbyPlayers),
      gameConfig: room.gameConfig
    });

    // Tell everyone else in room about this player
    socket.broadcast.to(code).emit('lobbyUpdate', {
      lobbyPlayers: Object.values(room.lobbyPlayers),
      gameConfig: room.gameConfig
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
  socket.on('setTeam', ({ team, target }) => {
    const room = getRoom(socket.roomCode);
    if (!room || !room.lobbyPlayers[socket.id]) return;
    if (team !== CONSTANTS.RED_TEAM && team !== CONSTANTS.BLUE_TEAM) return;
    if (room.lobbyPlayers[socket.id].isHost || room.lobbyPlayers[socket.id].socketId === target) {
      room.lobbyPlayers[target].team = team;
      broadcastLobbyUpdate(room);
    }
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

  // Leave lobby
  socket.on('leaveLobby', () => {
    handleLobbyLeave(io, socket);
  });

  socket.on('setGameConfig', (gameConfig) => {
    const room = getRoom(socket.roomCode);
    if (!room) return;
    console.log(gameConfig);
    room.gameConfig = gameConfig;
    if (gameConfig.current.gameMode == 'PVE') {
      room.capacity = 5;
    } else {
      room.capacity = 10;
    }

    broadcastLobbyUpdate(room);
  })
}

// Helpers
function broadcastLobbyUpdate(room) {
  room.io.to(room.code).emit('lobbyUpdate', {
    lobbyPlayers: Object.values(room.lobbyPlayers),
    gameConfig: room.gameConfig
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

  if (room.gameConfig.current.gameMode == "PVE") {
    room.lives = Object.values(room.players).length * CONSTANTS.LIVES_PLAYER;
    room.roundNum = 0;
    room.enemiesRem = CONSTANTS.STARTING_ENEMIES;
  }

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
    walls: WALL_POS,
    gameConfig: room.gameConfig
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