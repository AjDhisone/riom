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

const startOfDay = (date) => {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
};

const endOfDay = (date) => {
	const next = new Date(date);
	next.setHours(23, 59, 59, 999);
	return next;
};

const subtractDays = (date, days) => {
	const next = new Date(date);
	next.setDate(next.getDate() - days);
	return next;
};

const parseDateOrThrow = (value, label) => {
	if (!value) {
		return undefined;
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw createHttpError(`Invalid ${label} date`, 400, errorCodes.INVALID_INPUT);
	}
	return parsed;
};

const resolveDateRange = (query) => {
	const now = new Date();
	const defaultTo = endOfDay(now);
	const defaultFrom = startOfDay(subtractDays(now, 29));

	const fromInput = parseDateOrThrow(query.from, 'from') || defaultFrom;
	const toInput = parseDateOrThrow(query.to, 'to') || defaultTo;

	const from = startOfDay(fromInput);
	const to = endOfDay(toInput);

	if (from > to) {
		throw createHttpError('from date must be earlier than or equal to to date', 400, errorCodes.INVALID_INPUT);
	}

	return { from, to };
};

const getSalesSummary = async (req, res, next) => {
	try {
		const { from, to } = resolveDateRange(req.query || {});
		const summary = await orderService.getSalesSummary({ from, to });
		return res.json(
			success(
				{
					range: { from: from.toISOString(), to: to.toISOString() },
					summary,
				},
				'Sales summary fetched successfully'
			)
		);
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch sales summary');
		return next(error);
	}
};

const getTopSelling = async (req, res, next) => {
	try {
		const { from, to } = resolveDateRange(req.query || {});
		const limit = toPositiveInt(req.query?.limit, 5);
		const items = await orderService.getTopSelling({ from, to, limit });
		return res.json(
			success(
				{
					range: { from: from.toISOString(), to: to.toISOString() },
					limit,
					items,
				},
				'Top selling SKUs fetched successfully'
			)
		);
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch top selling SKUs');
		return next(error);
	}
};

const getDailySalesTrend = async (req, res, next) => {
	try {
		const { from, to } = resolveDateRange(req.query || {});
		const data = await orderService.getDailySalesTrend({ from, to });
		return res.json(
			success(
				{
					range: { from: from.toISOString(), to: to.toISOString() },
					data,
				},
				'Daily sales trend fetched successfully'
			)
		);
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch daily sales trend');
		return next(error);
	}
};

const getCategoryBreakdown = async (req, res, next) => {
	try {
		const { from, to } = resolveDateRange(req.query || {});
		const data = await orderService.getCategoryBreakdown({ from, to });
		return res.json(
			success(
				{
					range: { from: from.toISOString(), to: to.toISOString() },
					data,
				},
				'Category breakdown fetched successfully'
			)
		);
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch category breakdown');
		return next(error);
	}
};

module.exports = {
	getSalesSummary,
	getTopSelling,
	getDailySalesTrend,
	getCategoryBreakdown,
};
