const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');

router.get('/users', authMiddleware, roleMiddleware('admin'), userController.getUsers);

module.exports = router;
