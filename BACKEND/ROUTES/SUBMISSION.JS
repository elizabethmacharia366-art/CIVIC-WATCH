// routes/submission.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const reportsController = require('../controllers/reportsController');

router.post('/report', authMiddleware, reportsController.createReport);

module.exports = router;
