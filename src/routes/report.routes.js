const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const reportController = require('../controllers/report.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/top-selling', reportController.getTopSellingProducts);

module.exports = router;
