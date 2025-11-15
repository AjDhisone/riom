const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
	try {
		const { email, password, name, role } = req.body;

		if (!email || !password || !name) {
			throw createHttpError(
				'Email, password, and name are required',
				400,
				errorCodes.INVALID_INPUT
			);
		}

		const user = await authService.registerUser({ email, password, name, role });

		req.session.userId = user._id;

		return res.status(201).json(success(user, 'User registered successfully'));
	} catch (err) {
		logger.error({ err }, 'Registration failed');
		let error = err;
		if (!error.statusCode) {
			if (err.message === 'User already exists') {
				error = createHttpError('User already exists', 409, errorCodes.INVALID_INPUT);
			} else {
				error = createHttpError('Registration failed', 500, errorCodes.SERVER_ERROR);
			}
		}
		return next(error);
	}
};

const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			throw createHttpError('Email and password are required', 400, errorCodes.INVALID_INPUT);
		}

		const user = await authService.loginUser({ email, password });

		req.session.userId = user._id;

		return res.json(success(user, 'Logged in successfully'));
	} catch (err) {
		logger.error({ err }, 'Login failed');
		let error = err;
		if (!error.statusCode) {
			if (err.message === 'Invalid credentials') {
				error = createHttpError('Invalid credentials', 401, errorCodes.NOT_AUTHORIZED);
			} else {
				error = createHttpError('Login failed', 500, errorCodes.SERVER_ERROR);
			}
		}
		return next(error);
	}
};

const logout = async (req, res, next) => {
	const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'riom.sid';

	try {
		await new Promise((resolve, reject) => {
			if (!req.session) {
				return resolve();
			}

			req.session.destroy((err) => {
				if (err) {
					return reject(err);
				}
				return resolve();
			});
		});

		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
		};
		res.clearCookie(sessionCookieName, cookieOptions);
		return res.json(success(null, 'Logged out'));
	} catch (err) {
		logger.error({ err }, 'Failed to destroy session during logout');
		return next(createHttpError('Logout failed', 500, errorCodes.SERVER_ERROR));
	}
};

const getCurrentUser = async (req, res, next) => {
	try {
		const userId = req.session?.userId;
		if (!userId) {
			throw createHttpError('Authentication required', 401, errorCodes.NOT_AUTHORIZED);
		}

		const user = await authService.getUserById(userId);
		if (!user) {
			throw createHttpError('User not found', 404, errorCodes.NOT_AUTHORIZED);
		}

		return res.json(success(user, 'Current user fetched'));
	} catch (err) {
		logger.error({ err }, 'Failed to fetch current user');
		return next(err);
	}
};

module.exports = {
	register,
	login,
	logout,
	getCurrentUser,
};
