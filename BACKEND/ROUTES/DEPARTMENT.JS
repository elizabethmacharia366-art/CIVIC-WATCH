const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const Department = require('../models/department');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const departments = await Department.getAll();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    await Department.create(req.body.name);
    res.status(201).json({ success: true, message: 'Department created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

