const success = (data = null, message = 'OK') => ({
	success: true,
	message,
	data,
});

const error = (message = 'Error', code = 'ERROR', details = null) => ({
	success: false,
	message,
	error: {
		code,
		details,
	},
});

module.exports = {
	success,
	error,
};
