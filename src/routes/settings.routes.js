const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;
