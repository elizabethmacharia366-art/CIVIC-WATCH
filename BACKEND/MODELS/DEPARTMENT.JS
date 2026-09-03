const db = require('../config/db');

const Department = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM departments');
    return rows;
  },

  async create(name) {
    await db.query('INSERT INTO departments (name) VALUES (?)', [name]);
  }
};

module.exports = Department;
