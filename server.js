// Dependencies
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Global variables
var players = {};

io.on('connection', function (socket) {
  console.log('user ' + socket.id + ': connected');

  // Start state of this player
  players[socket.id] = {
  rotation: 0,
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50,
  playerId: socket.id,
  team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  };

  // Send the players object to the this player
  socket.emit('currentPlayers', players);

  // Update all other players of this player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Disconnect of this player
  socket.on('disconnect', function () {
      console.log('user ' + socket.id + ': disconnected');
      delete players[socket.id];
      // Emit a message to all players to remove this player
      io.emit('playerDisconnect', socket.id);
    });

  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // Emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('playerShot', function (info) {
    socket.broadcast.emit('playerShoot', {
      playerId: socket.id,
      x: info.x,
      y: info.y,
      rotation: info.rotation
    });
  });
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});