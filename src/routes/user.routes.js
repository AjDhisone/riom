const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), userController.getUsers);
router.post('/', requireAuth, requireRole('admin'), userController.createUser);
router.put('/:id/role', requireAuth, requireRole('admin'), userController.updateUserRole);
router.put('/:id/password', requireAuth, requireRole('admin'), userController.updateUserPassword);
router.delete('/:id', requireAuth, requireRole('admin'), userController.deleteUser);

module.exports = router;
