const settingsService = require('../services/settings.service');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

const getSettings = async (req, res, next) => {
	try {
		const settings = await settingsService.getSettings();
		return res.json(success({ settings }, 'Settings fetched successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch settings');
		return next(error);
	}
};

const updateSettings = async (req, res, next) => {
	try {
		const settings = await settingsService.updateSettings(req.body || {});
		return res.json(success({ settings }, 'Settings updated successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to update settings');
		return next(error);
	}
};

module.exports = {
	getSettings,
	updateSettings,
};
