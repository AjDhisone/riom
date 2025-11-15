const createHttpError = (message, statusCode = 500, code = 'SERVER_ERROR', details = null) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	error.code = code;
	error.details = details;
	return error;
};

module.exports = {
	createHttpError,
};
