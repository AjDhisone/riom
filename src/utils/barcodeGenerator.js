const Sku = require('../models/sku.model');

const START_BARCODE = 10000001;

const padBarcode = (value) => String(value);

const parseBarcodeNumber = (barcode) => {
	const numeric = Number(barcode);
	return Number.isFinite(numeric) ? numeric : null;
};

const findLastBarcodeValue = async () => {
	const lastSku = await Sku.findOne({ barcode: { $exists: true, $ne: null } })
		.sort({ barcode: -1 })
		.select({ barcode: 1 })
		.lean();

	if (!lastSku?.barcode) {
		return null;
	}

	return parseBarcodeNumber(lastSku.barcode);
};

const generateBarcode = async () => {
	const lastValue = await findLastBarcodeValue();
	if (!lastValue) {
		return padBarcode(START_BARCODE);
	}

	const nextValue = lastValue + 1;
	return padBarcode(nextValue);
};

module.exports = {
	generateBarcode,
};
