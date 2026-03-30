const db = require('../config/db');
const { generateToken } = require('../config/auth');

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, role FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerUser = async (req, res) => {
  const { username, password, role } = req.body;
  try {
    await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role]);
    res.status(201).json({ success: true, message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: rows[0].id, role: rows[0].role });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
