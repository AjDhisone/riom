const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const requireAuth = require('../middleware/requireAuth');

// All AI routes require authentication
router.use(requireAuth);

// POST /api/ai/summary - Generate AI summary
router.post('/summary', (req, res, next) => {
    console.log('AI Route: Request received for /summary');
    next();
}, aiController.getSummary);

module.exports = router;
