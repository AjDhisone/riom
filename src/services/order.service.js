const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Sku = require('../models/sku.model');
const skuService = require('./sku.service');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');

const MAX_PAGE_SIZE = 100;
const VALID_STATUSES = new Set(['pending', 'completed', 'cancelled']);

const createValidationError = (message, code = errorCodes.INVALID_INPUT, details) =>
	createHttpError(message, 400, code, details);

const normalizePositiveInt = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return fallback;
	}
	return parsed;
};

const parseDateInput = (value, label) => {
	if (!value) {
		return undefined;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw createValidationError(`Invalid ${label} date`);
	}
	return date;
};

/*
 Steps for transactional order creation:

 1. Start MongoDB session and transaction

 2. Validate all items:
	 - SKU exists
	 - quantity > 0
	 - check stock availability

 3. For each order item:
	 - Deduct stock (use skuService.adjustStock WITH session)
	 - Create StockHistory entry inside transaction

 4. Calculate totals:
	 - subTotal
	 - tax
	 - total

 5. Generate orderNumber (use generateOrderNumber util)
 
 6. Save order inside transaction

 7. Commit transaction

 8. Return order

  On any error:
	 - Abort transaction
	 - Throw error
*/

/*
 Dashboard report helpers:
	 - getSalesSummary({ from, to }) -> totals + averages via aggregation
	 - getTopSelling({ from, to, limit }) -> group by SKU quantities
	 - getDailySalesTrend({ from, to }) -> date-based rollups for charts
*/
const sanitizeCustomer = (customer = {}) => ({
	name: typeof customer.name === 'string' ? customer.name.trim() : 'Walk-in',
	phone: typeof customer.phone === 'string' ? customer.phone.trim() : undefined,
	email: typeof customer.email === 'string' ? customer.email.trim() : undefined,
});

const toPositiveInteger = (value) => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw createHttpError('Quantity must be a positive integer', 400, errorCodes.INVALID_INPUT);
	}
	return num;
};

const cloneAttributes = (attributes) => {
	if (!attributes) {
		return undefined;
	}
	if (typeof attributes.toObject === 'function') {
		return attributes.toObject();
	}
	if (attributes instanceof Map) {
		return Object.fromEntries(attributes.entries());
	}
	if (typeof attributes === 'object') {
		return { ...attributes };
	}
	return undefined;
};

const createOrder = async (data, userId) => {
	if (!data || !Array.isArray(data.items) || data.items.length === 0) {
		throw createHttpError('Order items are required', 400, errorCodes.INVALID_INPUT);
	}

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const orderNumber = generateOrderNumber();
		const orderDoc = new Order({
			orderNumber,
			customer: sanitizeCustomer(data.customer),
			items: [],
			subTotal: 0,
			tax: 0,
			total: 0,
			status: 'completed',
			createdBy: userId || undefined,
			metadata: data.metadata,
		});

		let subTotal = 0;
		const preparedItems = [];

		for (const item of data.items) {
			if (!item || !item.skuId) {
				throw createHttpError('Each order item must include skuId', 400, errorCodes.INVALID_INPUT);
			}

			const quantity = toPositiveInteger(item.quantity);
			const sku = await Sku.findById(item.skuId).session(session);

			if (!sku) {
				throw createHttpError('SKU not found', 404, errorCodes.SKU_NOT_FOUND);
			}

			if (sku.stock < quantity) {
				throw createHttpError(
					`Insufficient stock for SKU ${sku.sku}`,
					400,
					errorCodes.INSUFFICIENT_STOCK
				);
			}

			const lineTotal = quantity * sku.price;
			subTotal += lineTotal;

			preparedItems.push({
				skuId: sku._id,
				productId: sku.productId,
				sku: sku.sku,
				quantity,
				unitPrice: sku.price,
				lineTotal,
				attributes: cloneAttributes(sku.attributes),
			});
		}

		let tax = 0;
		if (data.tax != null) {
			const providedTax = Number(data.tax);
			if (!Number.isFinite(providedTax) || providedTax < 0) {
				throw createHttpError('tax must be a non-negative number', 400, errorCodes.INVALID_INPUT);
			}
			tax = providedTax;
		} else if (data.taxRate != null) {
			const taxRate = Number(data.taxRate);
			if (!Number.isFinite(taxRate) || taxRate < 0) {
				throw createHttpError('taxRate must be a non-negative number', 400, errorCodes.INVALID_INPUT);
			}
			tax = Number((subTotal * taxRate).toFixed(2));
		}

		const total = subTotal + tax;

		orderDoc.items = preparedItems;
		orderDoc.subTotal = Number(subTotal.toFixed(2));
		orderDoc.tax = Number(tax.toFixed(2));
		orderDoc.total = Number(total.toFixed(2));

		for (const item of preparedItems) {
			await skuService.adjustStock(
				item.skuId,
				-item.quantity,
				`order:${orderNumber}`,
				userId,
				session,
				{ referenceOrderId: orderDoc._id }
			);
		}

		await orderDoc.save({ session });
		await session.commitTransaction();
		const responseObject = orderDoc.toObject();
		responseObject.totalItems = preparedItems.reduce((sum, item) => sum + item.quantity, 0);
		return responseObject;
	} catch (error) {
		await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}
};

const listOrders = async (options = {}) => {
	const page = normalizePositiveInt(options.page, 1);
	const rawLimit = normalizePositiveInt(options.limit, 20);
	const limit = Math.min(rawLimit, MAX_PAGE_SIZE);

	const filters = {};

	const status = typeof options.status === 'string' ? options.status.trim().toLowerCase() : undefined;
	if (status) {
		if (!VALID_STATUSES.has(status)) {
			throw createValidationError('Invalid status filter');
		}
		filters.status = status;
	}

	const fromDate = parseDateInput(options.from, 'from');
	const toDate = parseDateInput(options.to, 'to');
	if (fromDate && toDate && fromDate > toDate) {
		throw createValidationError('from date must be earlier than or equal to to date');
	}

	if (fromDate || toDate) {
		filters.createdAt = {};
		if (fromDate) {
			filters.createdAt.$gte = fromDate;
		}
		if (toDate) {
			filters.createdAt.$lte = toDate;
		}
	}

	if (options.createdBy) {
		if (!mongoose.Types.ObjectId.isValid(options.createdBy)) {
			throw createValidationError('Invalid createdBy value');
		}
		filters.createdBy = new mongoose.Types.ObjectId(options.createdBy);
	}

	const skip = (page - 1) * limit;
	const query = Order.find(filters)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();

	const [orders, total] = await Promise.all([
		query.exec(),
		Order.countDocuments(filters),
	]);

	const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

	return {
		data: orders,
		total,
		page,
		limit,
		totalPages,
	};
};

const getOrderById = async (id) => {
	if (!id) {
		throw createValidationError('Order id is required');
	}
	if (!mongoose.Types.ObjectId.isValid(id)) {
		throw createValidationError('Invalid order id');
	}

	return Order.findById(id).lean();
};

const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;

const getSalesSummary = async (options = {}) => {
	const fromDate = parseDateInput(options.from, 'from');
	const toDate = parseDateInput(options.to, 'to');
	if (fromDate && toDate && fromDate > toDate) {
		throw createValidationError('from date must be earlier than or equal to to date');
	}

	const match = { status: 'completed' };
	if (fromDate || toDate) {
		match.createdAt = {};
		if (fromDate) {
			match.createdAt.$gte = fromDate;
		}
		if (toDate) {
			match.createdAt.$lte = toDate;
		}
	}

	const [result] = await Order.aggregate([
		{ $match: match },
		{
			$facet: {
				orderStats: [
					{
						$group: {
							_id: null,
							totalOrders: { $sum: 1 },
							totalSales: { $sum: '$total' },
						},
					},
				],
				unitStats: [
					{ $unwind: '$items' },
					{
						$group: {
							_id: null,
							totalUnitsSold: { $sum: '$items.quantity' },
						},
					},
				],
			},
		},
		{
			$project: {
				orderStats: {
					$ifNull: [
						{ $arrayElemAt: ['$orderStats', 0] },
						{ totalOrders: 0, totalSales: 0 },
					],
				},
				unitStats: {
					$ifNull: [
						{ $arrayElemAt: ['$unitStats', 0] },
						{ totalUnitsSold: 0 },
					],
				},
			},
		},
		{
			$project: {
				totalOrders: '$orderStats.totalOrders',
				totalSales: '$orderStats.totalSales',
				totalUnitsSold: '$unitStats.totalUnitsSold',
			},
		},
	]).exec();

	const totalOrders = result?.totalOrders || 0;
	const totalSales = roundCurrency(result?.totalSales || 0);
	const totalUnitsSold = result?.totalUnitsSold || 0;
	const avgOrderValue = totalOrders > 0 ? roundCurrency(totalSales / totalOrders) : 0;

	return {
		totalOrders,
		totalSales,
		totalUnitsSold,
		avgOrderValue,
	};
};

const getTopSelling = async (options = {}) => {
	const fromDate = parseDateInput(options.from, 'from');
	const toDate = parseDateInput(options.to, 'to');
	if (fromDate && toDate && fromDate > toDate) {
		throw createValidationError('from date must be earlier than or equal to to date');
	}

	const match = { status: 'completed' };
	if (fromDate || toDate) {
		match.createdAt = {};
		if (fromDate) {
			match.createdAt.$gte = fromDate;
		}
		if (toDate) {
			match.createdAt.$lte = toDate;
		}
	}

	const rawLimit = normalizePositiveInt(options.limit, 5);
	const limit = Math.min(rawLimit, MAX_PAGE_SIZE);

	const topSelling = await Order.aggregate([
		{ $match: match },
		{ $unwind: '$items' },
		{
			$group: {
				_id: '$items.skuId',
				productId: { $first: '$items.productId' },
				skuCode: { $first: '$items.sku' },
				totalQty: { $sum: '$items.quantity' },
				totalSales: { $sum: '$items.lineTotal' },
			},
		},
		{ $sort: { totalQty: -1, totalSales: -1 } },
		{ $limit: limit },
		{
			$lookup: {
				from: 'skus',
				localField: '_id',
				foreignField: '_id',
				as: 'skuDoc',
			},
		},
		{ $unwind: { path: '$skuDoc', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'products',
				localField: 'skuDoc.productId',
				foreignField: '_id',
				as: 'productDoc',
			},
		},
		{ $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'skus',
				let: {
					productId: {
						$ifNull: ['$skuDoc.productId', '$productId'],
					},
				},
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$productId', '$$productId'] },
						},
					},
					{
						$group: {
							_id: null,
							totalStock: {
								$sum: {
									$ifNull: ['$stock', 0],
								},
							},
						},
					},
				],
				as: 'productStock',
			},
		},
		{
			$addFields: {
				productTotalStock: {
					$ifNull: [{ $arrayElemAt: ['$productStock.totalStock', 0] }, 0],
				},
			},
		},
		{
			$project: {
				_id: 0,
				skuId: '$_id',
				totalQty: 1,
				totalSales: 1,
				productId: {
					$ifNull: ['$skuDoc.productId', '$productId'],
				},
				sku: {
					$ifNull: ['$skuDoc.sku', '$skuCode'],
				},
				attributes: '$skuDoc.attributes',
				stock: '$productTotalStock',
				productName: '$productDoc.name',
				productCategory: '$productDoc.category',
			},
		},
	]).exec();

	return topSelling.map((item) => ({
		...item,
		totalSales: roundCurrency(item.totalSales),
	}));
};

const getDailySalesTrend = async (options = {}) => {
	const fromDate = parseDateInput(options.from, 'from');
	const toDate = parseDateInput(options.to, 'to');
	if (fromDate && toDate && fromDate > toDate) {
		throw createValidationError('from date must be earlier than or equal to to date');
	}

	const match = { status: 'completed' };
	if (fromDate || toDate) {
		match.createdAt = {};
		if (fromDate) {
			match.createdAt.$gte = fromDate;
		}
		if (toDate) {
			match.createdAt.$lte = toDate;
		}
	}

	const trend = await Order.aggregate([
		{ $match: match },
		{ $unwind: '$items' },
		{
			$group: {
				_id: {
					$dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
				},
				totalQty: { $sum: '$items.quantity' },
				totalSales: { $sum: '$items.lineTotal' },
			},
		},
		{ $sort: { _id: 1 } },
		{
			$project: {
				_id: 0,
				date: '$_id',
				totalQty: 1,
				totalSales: 1,
			},
		},
	]).exec();

	return trend.map((item) => ({
		...item,
		totalSales: roundCurrency(item.totalSales),
	}));
};

const getCategoryBreakdown = async (options = {}) => {
	const fromDate = parseDateInput(options.from, 'from');
	const toDate = parseDateInput(options.to, 'to');
	if (fromDate && toDate && fromDate > toDate) {
		throw createValidationError('from date must be earlier than or equal to to date');
	}

	const match = { status: 'completed' };
	if (fromDate || toDate) {
		match.createdAt = {};
		if (fromDate) {
			match.createdAt.$gte = fromDate;
		}
		if (toDate) {
			match.createdAt.$lte = toDate;
		}
	}

	const breakdown = await Order.aggregate([
		{ $match: match },
		{ $unwind: '$items' },
		{
			$lookup: {
				from: 'skus',
				localField: 'items.skuId',
				foreignField: '_id',
				as: 'skuDoc',
			},
		},
		{ $unwind: { path: '$skuDoc', preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'products',
				localField: 'skuDoc.productId',
				foreignField: '_id',
				as: 'productDoc',
			},
		},
		{ $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
		{
			$group: {
				_id: { $ifNull: ['$productDoc.category', 'Uncategorized'] },
				totalSales: { $sum: '$items.lineTotal' },
				totalQty: { $sum: '$items.quantity' },
				productCount: { $addToSet: '$productDoc._id' },
			},
		},
		{
			$project: {
				_id: 0,
				category: '$_id',
				totalSales: 1,
				totalQty: 1,
				productCount: { $size: '$productCount' },
			},
		},
		{ $sort: { totalSales: -1 } },
	]).exec();

	return breakdown.map((item) => ({
		...item,
		totalSales: roundCurrency(item.totalSales),
	}));
};

module.exports = {
	createOrder,
	listOrders,
	getOrderById,
	getSalesSummary,
	getTopSelling,
	getDailySalesTrend,
	getCategoryBreakdown,
};
