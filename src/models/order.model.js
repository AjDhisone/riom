const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
	{
		skuId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Sku',
			required: true,
		},
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		sku: {
			type: String,
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
		},
		unitPrice: {
			type: Number,
			required: true,
			min: 0,
		},
		lineTotal: {
			type: Number,
			required: true,
			min: 0,
		},
		attributes: {
			type: Map,
			of: String,
		},
	},
	{ _id: false }
);

const orderSchema = new mongoose.Schema(
	{
		orderNumber: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ['pending', 'completed', 'cancelled'],
			default: 'completed',
		},
		customer: {
			name: { type: String, trim: true },
			phone: { type: String, trim: true },
			email: { type: String, trim: true },
		},
		items: {
			type: [orderItemSchema],
			required: true,
		},
		subTotal: {
			type: Number,
			required: true,
			min: 0,
		},
		tax: {
			type: Number,
			required: true,
			min: 0,
		},
		total: {
			type: Number,
			required: true,
			min: 0,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{
		timestamps: true,
	}
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
