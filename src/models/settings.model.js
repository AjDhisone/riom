const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
	{
		_id: {
			type: String,
			required: true,
			default: 'global',
			immutable: true,
		},
		defaultReorderThreshold: {
			type: Number,
			default: 0,
			min: 0,
		},
		currency: {
			type: String,
			default: 'INR',
			uppercase: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
