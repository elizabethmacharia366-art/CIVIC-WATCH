module.exports = (io, socket) => {
  socket.on('assignTask', (task) => {
    console.log(' Task assigned:', task);
    io.emit('taskAssigned', task);
  });

  socket.on('departmentUpdate', (update) => {
    console.log(' Department update:', update);
    io.emit('newDepartmentUpdate', update);
  });
};

function errorHandler(err, req, res, next) {
  console.error(' Error:', err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
}

module.exports = errorHandler;