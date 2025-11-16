const { error } = require('../utils/response');
const errorCodes = require('../constants/errorCodes');
const authService = require('../services/auth.service');

module.exports = async (req, res, next) => {
	const unauthorized = () =>
		res.status(401).json(error('Authentication required', errorCodes.NOT_AUTHORIZED));

	try {
		const session = req.session;
		if (!session) {
			return unauthorized();
		}

		if (session.user) {
			req.user = session.user;
			return next();
		}

		if (!session.userId) {
			return unauthorized();
		}

		const user = await authService.getUserById(session.userId);
		if (!user) {
			return unauthorized();
		}

		session.user = user;
		req.user = user;
		return next();
	} catch (err) {
		return next(err);
	}
};
