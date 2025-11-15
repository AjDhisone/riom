const Product = require('../models/product.model');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');

const createProduct = async (data) => {
	const { name, category, basePrice } = data;
	if (!name || !category || basePrice == null) {
		throw createHttpError('Missing required product fields', 400, errorCodes.INVALID_INPUT);
	}

	const product = await Product.create({
		name,
		description: data.description,
		category,
		images: data.images || [],
		basePrice,
		skuCount: 0,
		isActive: true,
	});

	return product;
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

	return {
		data,
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
		name: data.name,
		description: data.description,
		category: data.category,
		basePrice: data.basePrice,
		images: data.images,
	};

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
