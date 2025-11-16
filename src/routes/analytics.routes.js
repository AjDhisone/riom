const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['admin', 'manager']));

router.get('/sales-summary', analyticsController.getSalesSummary);
router.get('/top-selling', analyticsController.getTopSelling);
router.get('/daily-trend', analyticsController.getDailySalesTrend);

module.exports = router;
