const orderService = require('./order.service');

const getTopSellingProducts = async ({ from, to, limit }) => {
	const items = await orderService.getTopSelling({ from, to, limit });
	return Array.isArray(items) ? items : [];
};

module.exports = {
	getTopSellingProducts,
};
