const Settings = require('../models/settings.model');

const DEFAULT_SETTINGS_ID = 'global';

const sanitizePayload = (data = {}) => {
	const update = {};

	if (data.defaultReorderThreshold != null) {
		const value = Number(data.defaultReorderThreshold);
		if (!Number.isFinite(value) || value < 0) {
			const error = new Error('defaultReorderThreshold must be a non-negative number');
			error.statusCode = 400;
			throw error;
		}
		update.defaultReorderThreshold = value;
	}

	if (data.currency != null) {
		if (typeof data.currency !== 'string' || !data.currency.trim()) {
			const error = new Error('currency must be a non-empty string');
			error.statusCode = 400;
			throw error;
		}
		update.currency = data.currency.trim().toUpperCase();
	}

	return update;
};

const initSettingsIfMissing = async () => {
	const existing = await Settings.findById(DEFAULT_SETTINGS_ID);
	if (existing) {
		return existing;
	}

	return Settings.create({
		_id: DEFAULT_SETTINGS_ID,
		defaultReorderThreshold: 0,
		currency: 'INR',
	});
};

const getSettingsDocument = async () => {
	let settings = await Settings.findById(DEFAULT_SETTINGS_ID).lean();
	if (!settings) {
		await initSettingsIfMissing();
		settings = await Settings.findById(DEFAULT_SETTINGS_ID).lean();
	}
	return settings;
};

const getSettings = async () => getSettingsDocument();

const updateSettings = async (data = {}) => {
	const update = sanitizePayload(data);
	if (!Object.keys(update).length) {
		return getSettingsDocument();
	}

	update.updatedAt = new Date();

	await Settings.updateOne(
		{ _id: DEFAULT_SETTINGS_ID },
		{ $set: update },
		{ upsert: true }
	);

	return getSettingsDocument();
};

module.exports = {
	getSettings,
	updateSettings,
	initSettingsIfMissing,
};
