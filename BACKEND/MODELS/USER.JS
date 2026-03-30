const db = require('../config/db');

const User = {
  async getAll() {
    const [rows] = await db.query('SELECT id, username, role, department_id FROM users');
    return rows;
  },

  async findByUsername(username) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  async create(username, password, role, department_id) {
    await db.query(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      [username, password, role, department_id]
    );
  }
};

module.exports = User;
