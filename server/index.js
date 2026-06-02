const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const { initialiseConnections } = require('./game/connectionHandler.js');
const { startGameLoop } = require('./game/gameLoop.js');
const { initialiseCollisions } = require('./game/bulletManager.js');

// Initialize server
const app = express();
const server = http.Server(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(__dirname + '/../public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/../index.html');
});

// Initialise game systems
initialiseCollisions(io);
initialiseConnections(io);
startGameLoop(io);

// Start listening
server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});
