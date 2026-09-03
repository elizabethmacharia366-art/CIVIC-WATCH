const { Server } = require('socket.io');
const adminSocket = require('./adminSocket');
const citizenSocket = require('./citizenSocket');
const departmentSocket = require('./departmentSocket');

function initSockets(server) {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    adminSocket(io, socket);
    citizenSocket(io, socket);
    departmentSocket(io, socket);

    socket.on('disconnect', () => {
      console.log(' Client disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = initSockets;
