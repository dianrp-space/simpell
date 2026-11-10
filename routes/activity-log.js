const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// All log routes require authentication and admin role
router.get('/', isAuthenticated, isAdmin, logController.index);

module.exports = router;
