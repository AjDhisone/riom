const mongoose = require('mongoose');
const Sku = require('../models/sku.model');
const Product = require('../models/product.model');
const StockHistory = require('../models/stockHistory.model');
const settingsService = require('./settings.service');
const { generateBarcode } = require('../utils/barcodeGenerator');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const normalizeAttributes = (attributes) => {
	if (!attributes || typeof attributes !== 'object') {
		return {};
	}

	const normalized = {};
	Object.entries(attributes).forEach(([key, value]) => {
		if (value == null) return;
		normalized[key] = String(value).trim();
	});
	return normalized;
};

const getDefaultReorderThreshold = async () => {
	const settings = await settingsService.getSettings();
	return Number(settings?.defaultReorderThreshold ?? 0);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toSkuResponse = (doc = {}) => ({
	skuId: doc.skuId?.toString?.() || doc.skuId || doc._id?.toString?.() || doc._id,
	productId: doc.productId?.toString?.() || doc.productId,
	sku: doc.sku,
	barcode: doc.barcode,
	productName: doc.productName,
	price: doc.price,
	stock: doc.stock,
	attributes: doc.attributes || {},
});

const createSku = async (data) => {
	const { productId, sku, price } = data;

	if (!productId || !sku || price == null) {
		throw createHttpError('productId, sku, and price are required', 400, errorCodes.INVALID_INPUT);
	}

	const priceValue = Number(price);
	if (!Number.isFinite(priceValue) || priceValue < 0) {
		throw createHttpError('Price must be a non-negative number', 400, errorCodes.INVALID_INPUT);
	}

	const stockValue = data.stock != null ? Number(data.stock) : 0;
	if (!Number.isFinite(stockValue) || stockValue < 0) {
		throw createHttpError('Stock must be a non-negative number', 400, errorCodes.INVALID_INPUT);
	}

	const reorderThresholdDefault = await getDefaultReorderThreshold();
	const reorderThresholdValue =
		data.reorderThreshold != null ? Number(data.reorderThreshold) : reorderThresholdDefault;

	if (!Number.isFinite(reorderThresholdValue) || reorderThresholdValue < 0) {
		throw createHttpError('reorderThreshold must be a non-negative number', 400, errorCodes.INVALID_INPUT);
	}

	const product = await Product.findById(productId);
	if (!product) {
		throw createHttpError('Parent product not found', 404, errorCodes.PRODUCT_NOT_FOUND);
	}

	const barcodeProvided = data.barcode != null ? String(data.barcode).trim() : undefined;

	if (barcodeProvided) {
		const existing = await Sku.exists({ barcode: barcodeProvided });
		if (existing) {
			throw createHttpError('Barcode already exists', 400, errorCodes.DUPLICATE_BARCODE);
		}
	}

	let effectiveBarcode = barcodeProvided;
	if (!effectiveBarcode) {
		let attempts = 0;
		let uniqueFound = false;
		while (attempts < 5 && !uniqueFound) {
			effectiveBarcode = await generateBarcode();
			const exists = await Sku.exists({ barcode: effectiveBarcode });
			if (!exists) {
				uniqueFound = true;
				break;
			}
			attempts += 1;
		}

		if (!uniqueFound) {
			throw createHttpError('Failed to generate unique barcode', 500, errorCodes.SERVER_ERROR);
		}
	}

	const skuPayload = {
		productId,
		sku: sku.trim(),
		attributes: normalizeAttributes(data.attributes),
		price: priceValue,
		barcode: effectiveBarcode,
		stock: stockValue,
		reorderThreshold: reorderThresholdValue,
	};

	const createdSku = await Sku.create(skuPayload);

	await Product.findByIdAndUpdate(productId, { $inc: { skuCount: 1 } }).exec();

	if (stockValue > 0) {
		await StockHistory.create({
			skuId: createdSku._id,
			productId,
			change: stockValue,
			previousStock: 0,
			newStock: stockValue,
			reason: 'Initial stock',
		});
	}

	return createdSku;
};

const getSkus = async (options = {}) => {
	const {
		page = 1,
		limit = 10,
		productId,
		q,
		barcode,
	} = options;

	const pageNumber = Number(page) > 0 ? Number(page) : 1;
	const limitNumber = Number(limit) > 0 ? Number(limit) : 10;

	const filter = {};

	if (productId) {
		filter.productId = productId;
	}

	const searchConditions = [];
	if (q) {
		const regex = new RegExp(q, 'i');
		searchConditions.push({ sku: regex }, { barcode: regex });
	}

	if (barcode) {
		searchConditions.push({ barcode: new RegExp(`^${barcode.trim()}$`, 'i') });
	}

	if (searchConditions.length) {
		filter.$or = searchConditions;
	}

	const skip = (pageNumber - 1) * limitNumber;

	const query = Sku.find(filter)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limitNumber)
		.lean();

	const [data, total] = await Promise.all([
		query.exec(),
		Sku.countDocuments(filter),
	]);

	return {
		data,
		total,
		page: pageNumber,
		limit: limitNumber,
	};
};

const getSkuById = async (id) => {
	if (!id) {
		return null;
	}

	return Sku.findById(id).lean();
};

const updateSku = async (id, data) => {
	if (!id) {
		return null;
	}

	const update = {};

	if (data.sku) {
		update.sku = String(data.sku).trim();
	}

	if (data.price != null) {
		const priceValue = Number(data.price);
		if (!Number.isFinite(priceValue) || priceValue < 0) {
			throw createHttpError('Price must be a non-negative number', 400, errorCodes.INVALID_INPUT);
		}
		update.price = priceValue;
	}

	if (data.attributes) {
		update.attributes = normalizeAttributes(data.attributes);
	}

	if (data.barcode !== undefined) {
		const trimmed = data.barcode ? String(data.barcode).trim() : undefined;
		if (trimmed) {
			const existing = await Sku.findOne({ barcode: trimmed }).select({ _id: 1 }).lean();
			if (existing && existing._id.toString() !== id) {
				throw createHttpError('Barcode already exists', 400, errorCodes.DUPLICATE_BARCODE);
			}
			update.barcode = trimmed;
		} else {
			throw createHttpError('Barcode cannot be empty', 400, errorCodes.INVALID_INPUT);
		}
	}

	if (data.reorderThreshold != null) {
		const thresholdValue = Number(data.reorderThreshold);
		if (!Number.isFinite(thresholdValue) || thresholdValue < 0) {
			throw createHttpError('reorderThreshold must be a non-negative number', 400, errorCodes.INVALID_INPUT);
		}
		update.reorderThreshold = thresholdValue;
	}

	if (!Object.keys(update).length) {
		return Sku.findById(id).lean();
	}

	update.updatedAt = new Date();

	return Sku.findByIdAndUpdate(id, update, { new: true }).lean();
};

const adjustStockInternal = async (
	skuId,
	delta,
	reason,
	userId,
	session,
	options = {}
) => {
	const sku = await Sku.findById(skuId).session(session);
	if (!sku) {
		throw createHttpError('SKU not found', 404, errorCodes.SKU_NOT_FOUND);
	}

	const previousStock = sku.stock;
	const newStock = previousStock + Number(delta);

	if (!Number.isFinite(newStock)) {
		throw createHttpError('Invalid stock delta', 400, errorCodes.INVALID_INPUT);
	}

	if (newStock < 0) {
		throw createHttpError('Stock cannot be negative', 400, errorCodes.INSUFFICIENT_STOCK);
	}

	sku.stock = newStock;
	sku.updatedAt = new Date();
	await sku.save({ session });

	const historyDoc = await StockHistory.create(
		[
			{
				skuId: sku._id,
				productId: sku.productId,
				change: Number(delta),
				previousStock,
				newStock,
				reason,
				referenceOrderId: options.referenceOrderId,
				changedBy: userId,
				metadata: options.metadata,
			},
		],
		{ session }
	);

	logger.info(
		{
			skuId: sku._id.toString(),
			delta: Number(delta),
			reason,
			userId,
			referenceOrderId: options.referenceOrderId,
		},
		'Stock adjusted'
	);

	return { sku: sku.toObject(), history: historyDoc[0] };
};

const adjustStock = async (skuId, delta, reason, userId, session = null, options = {}) => {
	if (delta == null || Number(delta) === 0) {
		throw createHttpError('Stock delta must be a non-zero number', 400, errorCodes.INVALID_INPUT);
	}

	if (!reason) {
		throw createHttpError('Stock adjustment reason is required', 400, errorCodes.INVALID_INPUT);
	}

	if (session) {
		return adjustStockInternal(skuId, Number(delta), reason, userId, session, options);
	}

	const newSession = await mongoose.startSession();
	try {
		let result;
		await newSession.withTransaction(async () => {
			result = await adjustStockInternal(
				skuId,
				Number(delta),
				reason,
				userId,
				newSession,
				options
			);
		});
		return result;
	} catch (error) {
		logger.error(
			{
				err: error,
				skuId,
				delta,
				reason,
			},
			'Failed to adjust stock'
		);
		throw error;
	} finally {
		newSession.endSession();
	}
};

const bulkUpdateStock = async (adjustments = []) => {
	if (!Array.isArray(adjustments) || !adjustments.length) {
		return { results: [] };
	}

	const session = await mongoose.startSession();
	const results = [];

	try {
		await session.withTransaction(async () => {
			for (const adjustment of adjustments) {
				const { skuId, delta, reason, userId, referenceOrderId, metadata } = adjustment;
				if (!skuId || delta == null || !reason) {
					throw createHttpError('Invalid stock adjustment payload', 400, errorCodes.INVALID_INPUT);
				}

				const result = await adjustStockInternal(
					skuId,
					Number(delta),
					reason,
					userId,
					session,
					{ referenceOrderId, metadata }
				);
				results.push(result);
			}
		});

		return { results };
	} catch (error) {
		logger.error({ err: error }, 'Bulk stock update failed');
		throw error;
	} finally {
		session.endSession();
	}
};

const findLowStock = async () => {
	const defaultThreshold = await getDefaultReorderThreshold();

	return Sku.aggregate([
		{
			$match: {
				$expr: {
					$or: [
						{
							$and: [
								{ $ne: ['$reorderThreshold', null] },
								{ $lte: ['$stock', '$reorderThreshold'] },
							],
						},
						{ $lte: ['$stock', { $literal: defaultThreshold }] },
					],
				},
			},
		},
		{
			$lookup: {
				from: 'products',
				localField: 'productId',
				foreignField: '_id',
				as: 'product',
			},
		},
		{ $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
		{
			$project: {
				skuId: '$_id',
				productName: '$product.name',
				sku: 1,
				stock: 1,
				reorderThreshold: {
					$ifNull: ['$reorderThreshold', { $literal: defaultThreshold }],
				},
				productId: 1,
			},
		},
		{ $sort: { stock: 1, sku: 1 } },
	]);
};

/*
	Steps for barcode scan lookup:
	1. Validate barcode input
	2. Fetch SKU details via aggregation with product join
	3. Return normalized SKU payload for POS usage
*/
const findByBarcode = async (barcode) => {
	if (typeof barcode !== 'string') {
		return null;
	}

	const trimmed = barcode.trim();
	if (!trimmed) {
		return null;
	}

	const regex = new RegExp(`^${escapeRegex(trimmed)}$`, 'i');
	const [result] = await Sku.aggregate([
		{ $match: { barcode: regex } },
		{
			$lookup: {
				from: 'products',
				localField: 'productId',
				foreignField: '_id',
				as: 'product',
			},
		},
		{ $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
		{
			$project: {
				skuId: '$_id',
				productId: '$productId',
				sku: 1,
				barcode: 1,
				price: 1,
				stock: 1,
				attributes: {
					$ifNull: ['$attributes', {}],
				},
				productName: '$product.name',
			},
		},
		{ $limit: 1 },
	]).exec();

	if (!result) {
		return null;
	}

	return toSkuResponse(result);
};

/*
	Search helper for quick SKU lookup:
	1. Ignore empty queries to avoid full collection scans
	2. Perform case-insensitive matching on sku/barcode/product name/attributes
	3. Join product data and limit results for snappy UI updates
*/
const searchSku = async (query) => {
	if (typeof query !== 'string') {
		return [];
	}

	const trimmed = query.trim();
	if (!trimmed) {
		return [];
	}

	const regex = new RegExp(escapeRegex(trimmed), 'i');

	const results = await Sku.aggregate([
		{
			$lookup: {
				from: 'products',
				localField: 'productId',
				foreignField: '_id',
				as: 'product',
				pipeline: [
					{ $project: { name: 1 } },
				],
			},
		},
		{ $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
		{
			$addFields: {
				attributePairs: {
					$objectToArray: {
						$ifNull: ['$attributes', {}],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{ sku: regex },
					{ barcode: regex },
					{ 'product.name': regex },
					{
						attributePairs: {
							$elemMatch: { v: regex },
						},
					},
				],
			},
		},
		{
			$project: {
				skuId: '$_id',
				productId: '$productId',
				sku: 1,
				barcode: 1,
				price: 1,
				stock: 1,
				attributes: {
					$ifNull: ['$attributes', {}],
				},
				productName: '$product.name',
			},
		},
		{ $sort: { sku: 1 } },
		{ $limit: 10 },
	]).exec();

	return results.map((doc) => toSkuResponse(doc));
};

module.exports = {
	createSku,
	getSkus,
	getSkuById,
	updateSku,
	adjustStock,
	bulkUpdateStock,
	findLowStock,
	findByBarcode,
	searchSku,
};
