const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const DEFAULT_ROLE = 'staff';
const ALLOWED_ROLES = ['admin', 'staff'];

const normalizeRole = (role) => (ALLOWED_ROLES.includes(role) ? role : DEFAULT_ROLE);

const sanitizeUser = (userDoc) => {
	if (!userDoc) return userDoc;
	if (typeof userDoc.toSafeObject === 'function') {
		return userDoc.toSafeObject();
	}
	const plain = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
	delete plain.password;
	return plain;
};

const registerUser = async ({ email, password, name, role = DEFAULT_ROLE }) => {
	try {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			throw new Error('User already exists');
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await User.create({
			email,
			password: hashedPassword,
			name,
			role: normalizeRole(role),
		});

		return sanitizeUser(user);
	} catch (error) {
		logger.error({ err: error }, 'Failed to register user');
		throw error;
	}
};

const loginUser = async ({ email, password }) => {
	try {
		const user = await User.findOne({ email });
		if (!user) {
			throw new Error('Invalid credentials');
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			throw new Error('Invalid credentials');
		}

		user.lastLogin = new Date();
		await user.save();

		return sanitizeUser(user);
	} catch (error) {
		logger.error({ err: error }, 'Failed to login user');
		throw error;
	}
};

const getUserById = async (id) => {
	if (!id) {
		return null;
	}
	const user = await User.findById(id);
	return sanitizeUser(user);
};

module.exports = {
	registerUser,
	loginUser,
	getUserById,
};
