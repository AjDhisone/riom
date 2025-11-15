const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema(
	{
		skuId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Sku',
			required: true,
			index: true,
		},
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		change: {
			type: Number,
			required: true,
		},
		previousStock: {
			type: Number,
			required: true,
		},
		newStock: {
			type: Number,
			required: true,
		},
		reason: {
			type: String,
			trim: true,
			required: true,
		},
		referenceOrderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Order',
		},
		changedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	}
);

stockHistorySchema.index({ skuId: 1, createdAt: -1 });

module.exports = mongoose.models.StockHistory || mongoose.model('StockHistory', stockHistorySchema);
