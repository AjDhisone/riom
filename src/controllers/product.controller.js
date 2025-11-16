const productService = require('../services/product.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const toNumberOrDefault = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createProduct = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract body
	 2. Call productService.createProduct
	 3. Return created product
	*/
	try {
		const payload = {
			name: typeof req.body?.name === 'string' ? req.body.name.trim() : '',
			description: typeof req.body?.description === 'string' ? req.body.description.trim() : undefined,
			category: typeof req.body?.category === 'string' ? req.body.category.trim() : '',
			images: Array.isArray(req.body?.images) ? req.body.images.filter(Boolean) : [],
			basePrice: req.body?.basePrice,
			minStock: req.body?.minStock,
			initialStock: req.body?.initialStock,
		};

		if (typeof payload.basePrice !== 'number' || payload.basePrice < 0) {
			throw createHttpError('basePrice must be a non-negative number', 400, errorCodes.INVALID_INPUT);
		}

		if (typeof payload.minStock !== 'undefined') {
			const parsedMinStock = Number(payload.minStock);
			if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
				throw createHttpError('minStock must be a non-negative number', 400, errorCodes.INVALID_INPUT);
			}
			payload.minStock = parsedMinStock;
		} else {
			delete payload.minStock;
		}

		if (typeof payload.initialStock !== 'undefined') {
			const parsedInitialStock = Number(payload.initialStock);
			if (!Number.isFinite(parsedInitialStock) || parsedInitialStock < 0) {
				throw createHttpError('initialStock must be a non-negative number', 400, errorCodes.INVALID_INPUT);
			}
			payload.initialStock = parsedInitialStock;
		} else {
			delete payload.initialStock;
		}

		const product = await productService.createProduct(payload);
		return res.status(201).json(success({ product }, 'Product created successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to create product');
		return next(error);
	}
};

const getProducts = async (req, res, next) => {
	/*
	 Steps:
	 1. Read query params: page, limit, q, category
	 2. Call productService.getProducts
	 3. Return result
	*/
	try {
		const page = toNumberOrDefault(req.query.page, 1);
		const limit = toNumberOrDefault(req.query.limit, 10);
		const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
		const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
		const isActive = typeof req.query.isActive === 'string'
			? req.query.isActive === 'true'
			: undefined;

		const result = await productService.getProducts({
			page,
			limit,
			name: q,
			category,
			isActive,
		});

		const products = Array.isArray(result.data) ? result.data : [];
		const pageSize = Number(result.limit) || products.length || 1;
		const totalItems = Number(result.total) || 0;
		const payload = {
			products,
			page: Number(result.page) || page,
			limit: pageSize,
			total: totalItems,
			totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
		};

		return res.json(success(payload, 'Products fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch products');
		return next(error);
	}
};

const getProductById = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract id
	 2. Call service
	 3. If not found return 404
	 4. Else return product
	*/
	try {
		const { id } = req.params;
		const product = await productService.getProductById(id);
		if (!product) {
			throw createHttpError('Product not found', 404, errorCodes.PRODUCT_NOT_FOUND);
		}
		return res.json(success({ product }, 'Product fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch product');
		return next(error);
	}
};

const updateProduct = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract id + body
	 2. Call service
	 3. Return updated product
	*/
	try {
		const { id } = req.params;
		const payload = {
			name: typeof req.body?.name === 'string' ? req.body.name.trim() : undefined,
			description: typeof req.body?.description === 'string' ? req.body.description.trim() : undefined,
			category: typeof req.body?.category === 'string' ? req.body.category.trim() : undefined,
			images: Array.isArray(req.body?.images) ? req.body.images.filter(Boolean) : undefined,
			basePrice: req.body?.basePrice,
			minStock: req.body?.minStock,
		};

		if (typeof payload.basePrice !== 'undefined' && (typeof payload.basePrice !== 'number' || payload.basePrice < 0)) {
			throw createHttpError('basePrice must be a non-negative number', 400, errorCodes.INVALID_INPUT);
		}

		if (typeof payload.minStock !== 'undefined') {
			const parsedMinStock = Number(payload.minStock);
			if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
				throw createHttpError('minStock must be a non-negative number', 400, errorCodes.INVALID_INPUT);
			}
			payload.minStock = parsedMinStock;
		}

		const product = await productService.updateProduct(id, payload);
		if (!product) {
			throw createHttpError('Product not found', 404, errorCodes.PRODUCT_NOT_FOUND);
		}
		return res.json(success({ product }, 'Product updated successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to update product');
		return next(error);
	}
};

const deleteProduct = async (req, res, next) => {
	/*
	 Steps:
	 1. Extract id
	 2. Call productService.deleteProduct(id)
	 3. Return { success: true }
	*/
	try {
		const { id } = req.params;
		const product = await productService.deleteProduct(id);
		if (!product) {
			throw createHttpError('Product not found', 404, errorCodes.PRODUCT_NOT_FOUND);
		}
		return res.json(success({ success: true }, 'Product archived successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to delete product');
		return next(error);
	}
};

module.exports = {
	createProduct,
	getProducts,
	getProductById,
	updateProduct,
	deleteProduct,
};
