const pino = require('pino');

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const logger = pino({
	level,
	base: {
		service: process.env.APP_NAME || 'riom-server',
		env: process.env.NODE_ENV || 'development',
	},
	timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
