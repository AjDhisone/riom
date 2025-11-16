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
	deleteSku,
} = require('../controllers/sku.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.post('/', requireAuth, requireRole(['admin', 'manager']), createSku);
router.post('/bulk-adjust', requireAuth, requireRole(['admin', 'manager']), bulkAdjustSkuStock);
router.get('/search', requireAuth, searchSku);
router.get('/scan', requireAuth, scanSku);
router.get('/', requireAuth, getSkus);
router.get('/:id', requireAuth, getSkuById);
router.put('/:id', requireAuth, requireRole(['admin', 'manager']), updateSku);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteSku);
router.post('/:id/adjust', requireAuth, requireRole(['admin', 'manager']), adjustSkuStock);

module.exports = router;
