const orderService = require('../services/order.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const toPositiveInt = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return fallback;
	}
	return parsed;
};

const createOrder = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id;
		const order = await orderService.createOrder(req.body, userId);
		return res.status(201).json(success({ order }, 'Order created successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to create order');
		return next(error);
	}
};

const listOrders = async (req, res, next) => {
	try {
		const page = toPositiveInt(req.query.page, 1);
		const limit = toPositiveInt(req.query.limit, 20);
		const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
		const from = typeof req.query.from === 'string' ? req.query.from.trim() : undefined;
		const to = typeof req.query.to === 'string' ? req.query.to.trim() : undefined;
		const user = req.session?.user;
		const requesterRole = user?.role;
		const requesterId = user?.id;
		let createdBy = typeof req.query.createdBy === 'string' ? req.query.createdBy.trim() : undefined;

		// Staff members can only view their own order history.
		if (requesterRole === 'staff') {
			createdBy = requesterId;
		}

		const result = await orderService.listOrders({
			page,
			limit,
			from,
			to,
			status,
			createdBy,
		});

		return res.json(success(result, 'Orders fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to list orders');
		return next(error);
	}
};

const getOrderById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const order = await orderService.getOrderById(id);
		if (!order) {
			throw createHttpError('Order not found', 404, errorCodes.ORDER_NOT_FOUND);
		}

		const requester = req.session?.user;
		if (requester?.role === 'staff') {
			const createdBy = order.createdBy?.toString?.() || order.createdBy;
			if (!createdBy || createdBy !== requester.id) {
				throw createHttpError('Forbidden', 403, errorCodes.NOT_AUTHORIZED);
			}
		}
		return res.json(success({ order }, 'Order fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch order');
		return next(error);
	}
};

module.exports = {
	createOrder,
	listOrders,
	getOrderById,
};
