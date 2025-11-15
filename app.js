const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const pinoHttp = require('pino-http');
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const skuRoutes = require('./src/routes/sku.routes');
const orderRoutes = require('./src/routes/order.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const alertRoutes = require('./src/routes/alert.routes');
const userRoutes = require('./src/routes/user.routes');
const errorHandler = require('./src/middleware/errorHandler');
const { success } = require('./src/utils/response');
const { createHttpError } = require('./src/utils/httpError');
const errorCodes = require('./src/constants/errorCodes');
const logger = require('./src/utils/logger');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
	: true;

app.use(
	pinoHttp({
		logger,
		customLogLevel: (res, err) => {
			if (err || res.statusCode >= 500) {
				return 'error';
			}
			if (res.statusCode >= 400) {
				return 'warn';
			}
			return 'info';
		},
		customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
	})
);

app.use(helmet());
app.use(
	cors({
		origin: corsOrigin,
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET || 'change_me';
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'riom.sid';
if (!process.env.SESSION_SECRET) {
	logger.warn('SESSION_SECRET is not set. Using an insecure fallback secret.');
}

const sessionOptions = {
	name: sessionCookieName,
	secret: sessionSecret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
		maxAge: 1000 * 60 * 60 * 24,
	},
};

if (process.env.MONGODB_URI) {
	sessionOptions.store = MongoStore.create({
		mongoUrl: process.env.MONGODB_URI,
		collectionName: 'sessions',
	});
} else {
	logger.warn('MONGODB_URI is not set. Falling back to in-memory session store.');
}

if (process.env.NODE_ENV === 'production') {
	app.set('trust proxy', 1);
}

app.use(session(sessionOptions));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
	res.json(success({ status: 'ok' }, 'Healthy'));
});

app.use((req, res, next) => {
	next(createHttpError('Route not found', 404, errorCodes.ROUTE_NOT_FOUND));
});

app.use(errorHandler);

module.exports = app;
