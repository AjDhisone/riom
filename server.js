require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const startServer = async () => {
	try {
		if (!MONGODB_URI) {
			throw new Error('MONGODB_URI is not defined');
		}

		await mongoose.connect(MONGODB_URI);
		logger.info('Connected to MongoDB');

		app.listen(PORT, () => {
			logger.info({ port: PORT }, 'Server listening');
		});
	} catch (error) {
		logger.error({ err: error }, 'Server initialization failed');
		process.exit(1);
	}
};

startServer();
