const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { isAdmin, isEditor } = require('../middleware/auth');

// List Users
router.get('/', isAdmin, userManagementController.index);

// Approve User (POST)
router.post('/approve/:id', isAdmin, userManagementController.approveUser);

// Create User (POST)
router.post('/create', isAdmin, userManagementController.createUser);

// Reset Password (POST)
router.post('/reset-password/:id', isAdmin, userManagementController.resetPassword);

// Edit Role (POST)
router.post('/edit-role/:id', isAdmin, userManagementController.editRole);

// Approve Reset Password (POST)
router.post('/approve-reset/:id', isAdmin, userManagementController.approveResetPassword);

module.exports = router;
