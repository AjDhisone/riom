const skuService = require('../services/sku.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

const formatAlert = (doc) => ({
	productId: doc.productId?.toString?.() || doc.productId,
	skuId: doc.skuId?.toString?.() || doc.skuId,
	productName: doc.productName,
	sku: doc.sku,
	stock: doc.stock,
	minStock: doc.minStock,
	reorderThreshold: doc.reorderThreshold,
});

const getLowStockAlerts = async (req, res, next) => {
	try {
		const results = await skuService.findLowStock();
		return res.json(success({ alerts: results.map(formatAlert) }, 'Low stock alerts fetched'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch low stock alerts');
		return next(error);
	}
};

module.exports = {
	getLowStockAlerts,
};
