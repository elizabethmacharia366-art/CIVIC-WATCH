const db = require('../config/db');

const Task = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM tasks ORDER BY due_date ASC');
    return rows;
  },

  async create(title, description, assigned_to, due_date) {
    await db.query(
      'INSERT INTO tasks (title, description, assigned_to, due_date, status) VALUES (?, ?, ?, ?, ?)',
      [title, description, assigned_to, due_date, 'pending']
    );
  },

  async updateStatus(task_id, status) {
    await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, task_id]);
  }
};

module.exports = Task;
