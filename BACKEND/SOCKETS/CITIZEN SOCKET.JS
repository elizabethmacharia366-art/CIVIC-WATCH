module.exports = (io, socket) => {
  socket.on('submitReport', (report) => {
    console.log(' Citizen report submitted:', report);
    io.emit('newReport', report); 
  });

  socket.on('joinNotifications', () => {
    socket.emit('notificationJoined', { message: 'You will now receive notifications' });
  });
};