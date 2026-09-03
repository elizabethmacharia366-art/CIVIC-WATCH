function success(res, data, message = 'OK') {
  res.json({ success: true, message, data });
}

function failure(res, error, status = 500) {
  res.status(status).json({ success: false, error });
}

module.exports = { success, failure };
