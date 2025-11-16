const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    minStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    skuCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
