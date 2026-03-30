const db = require('../config/db');

const Report = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM reports ORDER BY created_at DESC');
    return rows;
  },

  async create(title, description, user_id) {
    await db.query(
      'INSERT INTO reports (title, description, user_id, created_at) VALUES (?, ?, ?, NOW())',
      [title, description, user_id]
    );
  }
};

module.exports = Report;
