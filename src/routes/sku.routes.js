const express = require('express');
const {
	createSku,
	getSkus,
	getSkuById,
	updateSku,
	adjustSkuStock,
	bulkAdjustSkuStock,
	searchSku,
	scanSku,
} = require('../controllers/sku.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), createSku);
router.post('/bulk-adjust', requireAuth, requireRole('admin'), bulkAdjustSkuStock);
router.get('/search', requireAuth, searchSku);
router.get('/scan', requireAuth, scanSku);
router.get('/', requireAuth, getSkus);
router.get('/:id', requireAuth, getSkuById);
router.put('/:id', requireAuth, requireRole('admin'), updateSku);
router.post('/:id/adjust', requireAuth, requireRole('admin'), adjustSkuStock);

module.exports = router;
