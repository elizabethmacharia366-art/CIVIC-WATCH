const db = require('../config/db');

const Notification = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    return rows;
  },

  async create(message, user_id) {
    await db.query(
      'INSERT INTO notifications (message, user_id, created_at) VALUES (?, ?, NOW())',
      [message, user_id]
    );
  }
};

module.exports = Notification;
