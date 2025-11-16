/*
	Role guard accepts a flexible list of allowed roles and returns 403 when the
	current user is not permitted.
*/
const toRoleList = (input) => (Array.isArray(input) ? input : [input]).filter(Boolean);
const { error } = require('../utils/response');
const errorCodes = require('../constants/errorCodes');

const requireRole = (...allowedRoles) => {
	const normalized = allowedRoles
		.flatMap(toRoleList)
		.map((role) => String(role).trim().toLowerCase())
		.filter(Boolean);

	return (req, res, next) => {
		const user = req.user || req.session?.user;
		if (!user) {
			return res
				.status(401)
				.json(error('Authentication required', errorCodes.NOT_AUTHORIZED));
		}

		if (!normalized.length) {
			return next();
		}

		const userRole = typeof user.role === 'string' ? user.role.toLowerCase() : '';
		if (!normalized.includes(userRole)) {
			return res
				.status(403)
				.json(error('Forbidden', errorCodes.NOT_AUTHORIZED));
		}

		return next();
	};
};

module.exports = requireRole;
