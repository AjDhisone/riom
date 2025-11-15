const mongoose = require('mongoose');
const User = require('../models/user.model');

const ALLOWED_ROLES = ['admin', 'staff'];

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

module.exports = {
	updateUserRole,
};
