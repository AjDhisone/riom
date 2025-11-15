const userService = require('../services/user.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const updateUserRole = async (req, res, next) => {
	try {
		const { id } = req.params;
		const nextRole = req.body?.role;
		if (!nextRole) {
			throw createHttpError('role is required', 400, errorCodes.INVALID_INPUT);
		}

		const user = await userService.updateUserRole(id, nextRole);
		return res.json(success({ user }, 'User role updated successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to update user role');
		return next(error);
	}
};

module.exports = {
	updateUserRole,
};
