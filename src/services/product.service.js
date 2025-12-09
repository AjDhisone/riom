const Product = require('../models/product.model');
const Sku = require('../models/sku.model');
const skuService = require('./sku.service');
const logger = require('../utils/logger');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');

/**
 * Convert string to Title Case for consistent storage
 * @param {string} str - Input string
 * @returns {string} Title cased string (e.g., "blue shirt" → "Blue Shirt")
 */
const toTitleCase = (str) => {
	if (typeof str !== 'string' || !str.trim()) {
		return str;
	}
	return str
		.trim()
		.toLowerCase()
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};

const coerceNonNegative = (value, fallback = 0, fieldName = 'value') => {
	if (value == null) {
		return fallback;
	}

	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric < 0) {
		throw createHttpError(`${fieldName} must be a non-negative number`, 400, errorCodes.INVALID_INPUT);
	}
	return numeric;
};

const generateDefaultSkuCode = (name, price) => {
	const base = typeof name === 'string' && name.trim()
		? name
		: 'DEFAULT';
	const slug = base
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.toUpperCase()
		.replace(/^-+|-+$/g, '')
		.slice(0, 20);

	const priceFormatted = typeof price === 'number' && Number.isFinite(price)
		? price.toFixed(0)
		: '0';

	return `${slug || 'DEFAULT'}-${priceFormatted}`;
};

const createProduct = async (data) => {
	const { name, category, basePrice } = data;
	if (!name || !category || basePrice == null) {
		throw createHttpError('Missing required product fields', 400, errorCodes.INVALID_INPUT);
	}

	// Normalize name and category to Title Case for case-insensitive consistency
	const normalizedName = toTitleCase(name);
	const normalizedCategory = toTitleCase(category);

	const minStockValue = coerceNonNegative(data.minStock, 0, 'minStock');
	const hasInitialStock = Object.prototype.hasOwnProperty.call(data, 'initialStock');
	const initialStockValue = hasInitialStock
		? coerceNonNegative(data.initialStock, 0, 'initialStock')
		: 0;

	const product = await Product.create({
		name: normalizedName,
		description: data.description,
		category: normalizedCategory,
		images: data.images || [],
		minStock: minStockValue,
		basePrice,
		skuCount: 0,
		isActive: true,
	});

	let defaultSku = null;
	if (hasInitialStock) {
		try {
			const skuData = {
				productId: product._id.toString(),
				sku: generateDefaultSkuCode(name, basePrice),
				price: basePrice,
				stock: initialStockValue,
				reorderThreshold: minStockValue,
			};

			// Include attributes if provided
			if (data.attributes && typeof data.attributes === 'object') {
				skuData.attributes = data.attributes;
			}

			defaultSku = await skuService.createSku(skuData);
		} catch (error) {
			logger.error({ err: error, productId: product._id.toString() }, 'Failed to create default SKU for product');
			await Product.findByIdAndDelete(product._id).catch((cleanupError) => {
				logger.error({ err: cleanupError, productId: product._id.toString() }, 'Failed to cleanup product after default SKU creation error');
			});
			throw error;
		}
	}

	const freshProduct = await Product.findById(product._id).lean();
	const totalStock = defaultSku ? defaultSku.stock : 0;

	return {
		...(freshProduct || {}),
		totalStock,
	};
};

const getProducts = async (options = {}) => {
	const {
		page = 1,
		limit = 10,
		name,
		category,
		isActive,
	} = options;

	const filters = {};

	if (name) {
		filters.name = { $regex: name, $options: 'i' };
	}

	if (category) {
		filters.category = { $regex: category, $options: 'i' };
	}

	if (typeof isActive === 'boolean') {
		filters.isActive = isActive;
	}

	const skip = (Number(page) - 1) * Number(limit);
	const query = Product.find(filters).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });

	const [data, total] = await Promise.all([
		query.exec(),
		Product.countDocuments(filters),
	]);

	const productIds = data.map((doc) => doc._id).filter(Boolean);
	let stockMap = new Map();
	if (productIds.length) {
		const stockCounts = await Sku.aggregate([
			{ $match: { productId: { $in: productIds } } },
			{
				$group: {
					_id: '$productId',
					totalStock: {
						$sum: {
							$convert: {
								input: '$stock',
								to: 'double',
								onError: 0,
								onNull: 0,
							},
						},
					},
				},
			},
		]).exec();
		stockMap = new Map(stockCounts.map((entry) => [entry._id.toString(), entry.totalStock]));
	}

	const productsWithStock = data.map((doc) => {
		const product = typeof doc.toObject === 'function' ? doc.toObject() : doc;
		const totalStock = stockMap.get(product._id?.toString()) || 0;
		return {
			...product,
			totalStock,
		};
	});

	return {
		data: productsWithStock,
		total,
		page: Number(page),
		limit: Number(limit),
	};
};

const getProductById = async (id) => {
	if (!id) {
		return null;
	}

	return Product.findById(id);
};

const updateProduct = async (id, data) => {
	if (!id) {
		return null;
	}

	const fieldsToUpdate = {
		name: data.name ? toTitleCase(data.name) : undefined,
		description: data.description,
		category: data.category ? toTitleCase(data.category) : undefined,
		basePrice: data.basePrice,
		images: data.images,
	};

	if (Object.prototype.hasOwnProperty.call(data, 'minStock')) {
		fieldsToUpdate.minStock = coerceNonNegative(data.minStock, 0, 'minStock');
	}

	Object.keys(fieldsToUpdate).forEach((key) => {
		if (typeof fieldsToUpdate[key] === 'undefined') {
			delete fieldsToUpdate[key];
		}
	});

	fieldsToUpdate.updatedAt = new Date();

	return Product.findByIdAndUpdate(id, fieldsToUpdate, { new: true });
};

const deleteProduct = async (id) => {
	if (!id) {
		return null;
	}

	return Product.findByIdAndUpdate(
		id,
		{ isActive: false, updatedAt: new Date() },
		{ new: true }
	);
};

module.exports = {
	createProduct,
	getProducts,
	getProductById,
	updateProduct,
	deleteProduct,
};
