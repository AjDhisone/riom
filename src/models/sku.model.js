const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema(
	{
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		sku: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			index: true,
		},
		attributes: {
			type: Map,
			of: String,
			default: {},
		},
		price: {
			type: Number,
			required: true,
			min: 0,
		},
		barcode: {
			type: String,
			trim: true,
			required: true,
			unique: true,
			index: true,
		},
		stock: {
			type: Number,
			default: 0,
			min: 0,
		},
		reorderThreshold: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{
		timestamps: true,
	}
);

skuSchema.index({ sku: 1 }, { unique: true });
skuSchema.index({ productId: 1 });
skuSchema.index({ barcode: 1 }, { unique: true });
skuSchema.index({ stock: 1 });

// Update parent product's totalStock after SKU save
skuSchema.post('save', async function(doc) {
	try {
		const Product = mongoose.model('Product');
		const Sku = mongoose.model('Sku');
		
		const skus = await Sku.find({ productId: doc.productId });
		const totalStock = skus.reduce((sum, sku) => sum + (sku.stock || 0), 0);
		
		await Product.findByIdAndUpdate(doc.productId, { totalStock });
	} catch (error) {
		console.error('Failed to update product totalStock:', error);
	}
});

// Update parent product's totalStock after SKU update
skuSchema.post('findOneAndUpdate', async function(doc) {
	if (doc) {
		try {
			const Product = mongoose.model('Product');
			const Sku = mongoose.model('Sku');
			
			const skus = await Sku.find({ productId: doc.productId });
			const totalStock = skus.reduce((sum, sku) => sum + (sku.stock || 0), 0);
			
			await Product.findByIdAndUpdate(doc.productId, { totalStock });
		} catch (error) {
			console.error('Failed to update product totalStock:', error);
		}
	}
});

module.exports = mongoose.models.Sku || mongoose.model('Sku', skuSchema);
