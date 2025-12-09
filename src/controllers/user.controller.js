const userService = require('../services/user.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const getUsers = async (req, res, next) => {
	try {
		const { page, limit, role, q } = req.query;
		const result = await userService.getUsers({ page, limit, role, q });
		return res.json(success(result));
	} catch (error) {
		logger.error({ err: error }, 'Failed to fetch users');
		return next(error);
	}
};

const createUser = async (req, res, next) => {
	try {
		const { username, email, password, role } = req.body;
		if (!username || !email || !password) {
			throw createHttpError('username, email, and password are required', 400, errorCodes.INVALID_INPUT);
		}

		const user = await userService.createUser({ username, email, password, role });
		return res.status(201).json(success({ user }, 'User created successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to create user');
		return next(error);
	}
};

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

const updateUserPassword = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { password } = req.body;
		if (!password) {
			throw createHttpError('password is required', 400, errorCodes.INVALID_INPUT);
		}

		const user = await userService.updateUserPassword(id, password, req.user?.id);
		return res.json(success({ user }, 'Password updated successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to update user password');
		return next(error);
	}
};

const deleteUser = async (req, res, next) => {
	try {
		const { id } = req.params;
		const requestingUserId = req.session?.user?.id;

		const result = await userService.deleteUser(id, requestingUserId);
		return res.json(success(result, 'User deleted successfully'));
	} catch (error) {
		logger.error({ err: error }, 'Failed to delete user');
		return next(error);
	}
};

module.exports = {
	getUsers,
	createUser,
	updateUserRole,
	updateUserPassword,
	deleteUser,
};
