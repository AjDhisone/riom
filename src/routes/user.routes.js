const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.put('/:id/role', requireAuth, requireRole('admin'), userController.updateUserRole);

module.exports = router;
