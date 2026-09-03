module.exports = (io, socket) => {
  socket.on('adminAlert', (data) => {
    console.log('Admin alert:', data);
    io.emit('systemAlert', data);
  });

  socket.on('getStats', (data) => {
    socket.emit('statsResponse', { users: 10, reports: 5 });
  });
};
