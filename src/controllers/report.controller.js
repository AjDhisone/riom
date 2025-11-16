const reportService = require('../services/report.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const startOfDay = (date) => {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
};

const endOfDay = (date) => {
	const next = new Date(date);
	return new Date(next.setHours(23, 59, 59, 999));
};

const subtractDays = (date, days) => {
	const next = new Date(date);
	next.setDate(next.getDate() - days);
	return next;
};

const parseDateParam = (value, label) => {
	if (!value) {
		return undefined;
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw createHttpError(`Invalid ${label} date`, 400, errorCodes.INVALID_INPUT);
	}
	return parsed;
};

const coercePositiveInt = (value, fallback) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return fallback;
	}
	return parsed;
};

const resolveRange = (query = {}) => {
	const now = new Date();
	const toCandidate = parseDateParam(query.to, 'to') || now;
	const fromCandidate = parseDateParam(query.from, 'from') || subtractDays(toCandidate, 29);

	const from = startOfDay(fromCandidate);
	const to = endOfDay(toCandidate);

	if (from > to) {
		throw createHttpError('from date must be earlier than or equal to to date', 400, errorCodes.INVALID_INPUT);
	}

	return { from, to };
};

const mapProductForResponse = (item = {}) => ({
	productId: item.productId,
	skuId: item.skuId,
	sku: item.sku,
	name: item.productName || item.sku,
	category: item.productCategory,
	attributes: item.attributes,
	totalSales: item.totalSales,
	totalQty: item.totalQty,
});

const getTopSellingProducts = async (req, res, next) => {
	try {
		const { from, to } = resolveRange(req.query);
		const limit = coercePositiveInt(req.query?.limit, 5);
		const products = await reportService.getTopSellingProducts({ from, to, limit });

		return res.json(
			success(
				{
					range: { from: from.toISOString(), to: to.toISOString() },
					limit,
					totalSKUs: products.length,
					products: products.map(mapProductForResponse),
				},
				'Top selling products fetched successfully'
			)
		);
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch top selling products');
		return next(error);
	}
};

module.exports = {
	getTopSellingProducts,
};
