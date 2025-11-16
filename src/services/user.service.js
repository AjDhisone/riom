const mongoose = require('mongoose');
const User = require('../models/user.model');

const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

const normalizeRole = (role) => (typeof role === 'string' ? role.trim().toLowerCase() : '');

const toSafeUser = (userDoc) => {
	if (!userDoc) {
		return null;
	}
	if (typeof userDoc.toSafeObject === 'function') {
		return userDoc.toSafeObject();
	}
	const plain = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
	delete plain.password;
	return plain;
};

const getUsers = async (options = {}) => {
	const { page = 1, limit = 10, role, q } = options;

	const pageNumber = Number(page) > 0 ? Number(page) : 1;
	const limitNumber = Math.min(Number(limit) > 0 ? Number(limit) : 10, 100);

	const filter = {};

	if (role && ALLOWED_ROLES.includes(normalizeRole(role))) {
		filter.role = normalizeRole(role);
	}

	if (q && typeof q === 'string') {
		const regex = new RegExp(q.trim(), 'i');
		filter.$or = [
			{ name: regex },
			{ email: regex },
		];
	}

	const skip = (pageNumber - 1) * limitNumber;

	const [users, total] = await Promise.all([
		User.find(filter)
			.select('-password')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limitNumber)
			.lean(),
		User.countDocuments(filter),
	]);

	return {
		users,
		total,
		page: pageNumber,
		limit: limitNumber,
		totalPages: Math.ceil(total / limitNumber),
	};
};

const createUser = async (data) => {
	const { username, email, password, role } = data;

	if (!username || !email || !password) {
		const error = new Error('username, email, and password are required');
		error.statusCode = 400;
		throw error;
	}

	const normalizedRole = role ? normalizeRole(role) : 'staff';
	if (!ALLOWED_ROLES.includes(normalizedRole)) {
		const error = new Error('Invalid role');
		error.statusCode = 400;
		throw error;
	}

	const existingUser = await User.findOne({
		$or: [{ name: username.trim() }, { email: email.trim() }],
	});

	if (existingUser) {
		const error = new Error('Username or email already exists');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.create({
		name: username.trim(),
		email: email.trim(),
		password,
		role: normalizedRole,
	});

	return toSafeUser(user);
};

const updateUserRole = async (userId, newRole) => {
	if (!userId) {
		const error = new Error('userId is required');
		error.statusCode = 400;
		throw error;
	}

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		const error = new Error('Invalid user id');
		error.statusCode = 400;
		throw error;
	}

	const normalizedRole = normalizeRole(newRole);
	if (!ALLOWED_ROLES.includes(normalizedRole)) {
		const error = new Error('Invalid role');
		error.statusCode = 400;
		throw error;
	}

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{ role: normalizedRole, updatedAt: new Date() },
		{ new: true }
	);

	if (!updatedUser) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	return toSafeUser(updatedUser);
};

const updateUserPassword = async (userId, newPassword, requestingUserId) => {
	if (!userId) {
		const error = new Error('userId is required');
		error.statusCode = 400;
		throw error;
	}

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		const error = new Error('Invalid user id');
		error.statusCode = 400;
		throw error;
	}

	if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
		const error = new Error('Password must be at least 6 characters');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findById(userId);
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	// Set the new password (will be hashed by the pre-save hook)
	user.password = newPassword;
	user.updatedAt = new Date();
	await user.save();

	return toSafeUser(user);
};

module.exports = {
	getUsers,
	createUser,
	updateUserRole,
	updateUserPassword,
};
