const Room = require('./Room.js');

const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (rooms.has(code));  // regenerate if code already exists
  return code;
}

function createRoom(host, io) {
  const code = generateCode();
  const room = new Room(code, host, io);
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function destroyRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  room.stop();
  rooms.delete(code);
}

function getRooms() {
  return rooms;
}

module.exports = { createRoom, getRoom, destroyRoom, getRooms };