const logger = require('../utils/logger');
const { error } = require('../utils/response');
const errorCodes = require('../constants/errorCodes');

module.exports = (err, req, res, next) => {
	const status = err.statusCode || err.status || 500;
	const message = err.message || 'Internal server error';
	const code = err.code || errorCodes.SERVER_ERROR;
	const details = err.details || null;

	const logPayload = {
		err,
		status,
		code,
		path: req.originalUrl,
		method: req.method,
	};

	if (process.env.NODE_ENV !== 'production') {
		logPayload.stack = err.stack;
	}

	logger.error(logPayload, 'Unhandled error');

	return res.status(status).json(error(message, code, details));
};
