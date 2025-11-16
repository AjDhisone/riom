const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const alertController = require('../controllers/alert.controller');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['admin', 'manager', 'staff']));

router.get('/low-stock', alertController.getLowStockAlerts);

module.exports = router;
