const { error } = require('../utils/response');
const errorCodes = require('../constants/errorCodes');

module.exports = (req, res, next) => {
	if (req.session && req.session.user) {
		return next();
	}

	return res
		.status(401)
		.json(error('Authentication required', errorCodes.NOT_AUTHORIZED));
};
