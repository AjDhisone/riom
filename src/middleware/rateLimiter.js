const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            details: 'You have exceeded the rate limit. Please wait before making more requests.',
        },
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for health check
        return req.path === '/api/health';
    },
});

// Stricter rate limiter for auth routes (login, register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        error: {
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            details: 'Too many login/register attempts. Please wait 15 minutes before trying again.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiter for AI routes (expensive operations)
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 AI requests per minute
    message: {
        success: false,
        message: 'Too many AI requests, please try again later.',
        error: {
            code: 'AI_RATE_LIMIT_EXCEEDED',
            details: 'AI features are rate-limited. Please wait before making more requests.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    authLimiter,
    aiLimiter,
};
