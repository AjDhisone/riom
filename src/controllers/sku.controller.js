const skuService = require('../services/sku.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const parsePositiveNumber = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createSku = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract body
	 2. Call skuService.createSku
	 3. Return created SKU
	*/
	try {
		const payload = {
			productId: req.body?.productId,
			sku: req.body?.sku,
			price: req.body?.price,
			attributes: req.body?.attributes,
			reorderThreshold: req.body?.reorderThreshold,
			barcode: req.body?.barcode,
			stock: req.body?.stock,
		};

		const sku = await skuService.createSku(payload);
		return res.status(201).json(success({ sku }, 'SKU created successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to create SKU');
		return next(error);
	}
};

const getSkus = async (req, res, next) => {
	/*
	 Steps:
	 1. Read query params: page, limit, q, productId, barcode
	 2. Call skuService.getSkus
	 3. Return result
	*/
	try {
		const page = parsePositiveNumber(req.query.page, 1);
		const limit = parsePositiveNumber(req.query.limit, 10);
		const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
		const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
		const barcode = typeof req.query.barcode === 'string' ? req.query.barcode.trim() : undefined;

		const result = await skuService.getSkus({
			page,
			limit,
			q,
			productId,
			barcode,
		});

		return res.json(success(result, 'SKUs fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to list SKUs');
		return next(error);
	}
};

const getSkuById = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract id
	 2. Call service
	 3. If not found return 404
	 4. Else return SKU
	*/
	try {
		const { id } = req.params;
		const sku = await skuService.getSkuById(id);
		if (!sku) {
			throw createHttpError('SKU not found', 404, errorCodes.SKU_NOT_FOUND);
		}
		return res.json(success({ sku }, 'SKU fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch SKU');
		return next(error);
	}
};

const updateSku = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract id + body
	 2. Call service
	 3. Return updated SKU
	*/
	try {
		const { id } = req.params;
		const payload = {
			sku: req.body?.sku,
			price: req.body?.price,
			attributes: req.body?.attributes,
			reorderThreshold: req.body?.reorderThreshold,
			barcode: req.body?.barcode,
		};

		const sku = await skuService.updateSku(id, payload);
		if (!sku) {
			throw createHttpError('SKU not found', 404, errorCodes.SKU_NOT_FOUND);
		}
		return res.json(success({ sku }, 'SKU updated successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to update SKU');
		return next(error);
	}
};

const adjustSkuStock = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract id + delta + reason
	 2. Call skuService.adjustStock
	 3. Return updated SKU and history entry
	*/
	try {
		const { id } = req.params;
		const { delta, reason, referenceOrderId, metadata } = req.body || {};

		if (delta == null || Number(delta) === 0) {
			throw createHttpError('delta must be a non-zero number', 400, errorCodes.INVALID_INPUT);
		}

		if (!reason) {
			throw createHttpError('reason is required', 400, errorCodes.INVALID_INPUT);
		}

		const userId = req.session?.user?.id;

		const result = await skuService.adjustStock(
			id,
			Number(delta),
			reason,
			userId,
			null,
			{ referenceOrderId, metadata }
		);

		return res.json(success(result, 'SKU stock adjusted successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to adjust SKU stock');
		return next(error);
	}
};

const bulkAdjustSkuStock = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract adjustments array
	 2. Call skuService.bulkUpdateStock
	 3. Return results
	*/
	try {
		const adjustmentsInput = Array.isArray(req.body?.adjustments)
			? req.body.adjustments
			: Array.isArray(req.body)
				? req.body
				: [];

		if (!adjustmentsInput.length) {
			throw createHttpError('adjustments array is required', 400, errorCodes.INVALID_INPUT);
		}

		const userId = req.session?.user?.id;

		const adjustments = adjustmentsInput.map((item) => ({
			skuId: item.skuId,
			delta: item.delta,
			reason: item.reason,
			userId: item.userId || userId,
			referenceOrderId: item.referenceOrderId,
			metadata: item.metadata,
		}));

		const { results } = await skuService.bulkUpdateStock(adjustments);
		return res.json(success({ results }, 'SKU stock adjusted in bulk'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to bulk adjust stock');
		return next(error);
	}
};

const searchSku = async (req, res, next) => {
	try {
		const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
		if (!query) {
			return res.json(success([], 'No query provided'));
		}

		const results = await skuService.searchSku(query);
		return res.json(success(results, 'SKUs matched'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to search SKUs');
		return next(error);
	}
};

const scanSku = async (req, res, next) => {
	try {
		const { barcode } = req.query;
		if (!barcode || !barcode.trim()) {
			throw createHttpError('barcode query parameter is required', 400, errorCodes.INVALID_INPUT);
		}

		const sku = await skuService.findByBarcode(barcode);
		if (!sku) {
			throw createHttpError('SKU not found', 404, errorCodes.SKU_NOT_FOUND);
		}
		return res.json(success(sku, 'SKU fetched by barcode'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to scan SKU by barcode');
		return next(error);
	}
};

module.exports = {
	createSku,
	getSkus,
	getSkuById,
	updateSku,
	adjustSkuStock,
	bulkAdjustSkuStock,
	searchSku,
	scanSku,
};
