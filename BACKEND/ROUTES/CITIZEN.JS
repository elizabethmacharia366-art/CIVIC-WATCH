const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const reportsController = require('../controllers/reportsController');

router.get('/reports', authMiddleware, reportsController.getReports);
router.post('/reports', authMiddleware, reportsController.createReport);

module.exports = router;
