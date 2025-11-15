const { v4: uuidv4 } = require('uuid');

const generateOrderNumber = () => {
	const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
	const uniqueSuffix = uuidv4().split('-')[0].toUpperCase();
	return `ORD-${timestamp}-${uniqueSuffix}`;
};

module.exports = generateOrderNumber;
