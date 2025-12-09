const { z } = require('zod');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');

/**
 * Creates a validation middleware using Zod schema
 * @param {Object} schemas - Object containing body, query, and/or params schemas
 * @param {z.ZodSchema} [schemas.body] - Schema for request body validation
 * @param {z.ZodSchema} [schemas.query] - Schema for query parameters validation
 * @param {z.ZodSchema} [schemas.params] - Schema for URL parameters validation
 * @returns {Function} Express middleware function
 */
const validateRequest = (schemas = {}) => {
    return async (req, res, next) => {
        try {
            const errors = [];

            // Validate body
            if (schemas.body) {
                const bodyResult = schemas.body.safeParse(req.body);
                if (!bodyResult.success) {
                    errors.push(...formatZodErrors(bodyResult.error, 'body'));
                } else {
                    req.body = bodyResult.data;
                }
            }

            // Validate query
            if (schemas.query) {
                const queryResult = schemas.query.safeParse(req.query);
                if (!queryResult.success) {
                    errors.push(...formatZodErrors(queryResult.error, 'query'));
                } else {
                    req.query = queryResult.data;
                }
            }

            // Validate params
            if (schemas.params) {
                const paramsResult = schemas.params.safeParse(req.params);
                if (!paramsResult.success) {
                    errors.push(...formatZodErrors(paramsResult.error, 'params'));
                } else {
                    req.params = paramsResult.data;
                }
            }

            if (errors.length > 0) {
                throw createHttpError(
                    'Validation failed',
                    400,
                    errorCodes.INVALID_INPUT,
                    errors
                );
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
};

/**
 * Formats Zod errors into a consistent structure
 * @param {z.ZodError} error - Zod error object
 * @param {string} location - Where the error occurred (body, query, params)
 * @returns {Array} Formatted error array
 */
const formatZodErrors = (error, location) => {
    return error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        location,
        code: issue.code,
    }));
};

// Common reusable schemas
const schemas = {
    // MongoDB ObjectId validation
    objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

    // Pagination schemas
    pagination: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
    }),

    // Date range schema
    dateRange: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
    }),

    // Email validation
    email: z.string().email('Invalid email format').toLowerCase().trim(),

    // Password validation (min 6 chars)
    password: z.string().min(6, 'Password must be at least 6 characters'),

    // Non-empty string
    nonEmptyString: z.string().min(1, 'This field is required').trim(),

    // Positive number
    positiveNumber: z.coerce.number().positive('Must be a positive number'),

    // Non-negative number
    nonNegativeNumber: z.coerce.number().min(0, 'Must be a non-negative number'),
};

// Auth validation schemas
const authSchemas = {
    login: {
        body: z.object({
            email: schemas.email,
            password: z.string().min(1, 'Password is required'),
        }),
    },
    register: {
        body: z.object({
            email: schemas.email,
            password: schemas.password,
            name: schemas.nonEmptyString,
            role: z.enum(['admin', 'manager', 'staff']).optional(),
        }),
    },
};

// Product validation schemas
const productSchemas = {
    create: {
        body: z.object({
            name: schemas.nonEmptyString,
            description: z.string().trim().optional(),
            category: schemas.nonEmptyString,
            basePrice: schemas.nonNegativeNumber,
            minStock: schemas.nonNegativeNumber.optional(),
            initialStock: schemas.nonNegativeNumber.optional(),
            images: z.array(z.string().url()).optional(),
        }),
    },
    update: {
        params: z.object({
            id: schemas.objectId,
        }),
        body: z.object({
            name: z.string().trim().optional(),
            description: z.string().trim().optional(),
            category: z.string().trim().optional(),
            basePrice: schemas.nonNegativeNumber.optional(),
            minStock: schemas.nonNegativeNumber.optional(),
            images: z.array(z.string().url()).optional(),
        }),
    },
    getById: {
        params: z.object({
            id: schemas.objectId,
        }),
    },
};

// Order validation schemas
const orderSchemas = {
    create: {
        body: z.object({
            items: z.array(z.object({
                skuId: schemas.objectId,
                quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
            })).min(1, 'At least one item is required'),
            customer: z.object({
                name: z.string().trim().optional(),
                phone: z.string().trim().optional(),
                email: z.string().email().optional(),
            }).optional(),
            metadata: z.record(z.unknown()).optional(),
        }),
    },
    list: {
        query: z.object({
            page: z.coerce.number().int().min(1).default(1),
            limit: z.coerce.number().int().min(1).max(100).default(10),
            status: z.enum(['pending', 'completed', 'cancelled']).optional(),
            from: z.string().optional(),
            to: z.string().optional(),
        }),
    },
};

// SKU validation schemas
const skuSchemas = {
    create: {
        body: z.object({
            productId: schemas.objectId,
            sku: schemas.nonEmptyString,
            price: schemas.nonNegativeNumber,
            stock: schemas.nonNegativeNumber.optional(),
            barcode: z.string().trim().optional(),
            attributes: z.record(z.string()).optional(),
            reorderThreshold: schemas.nonNegativeNumber.optional(),
        }),
    },
    update: {
        params: z.object({
            id: schemas.objectId,
        }),
        body: z.object({
            sku: z.string().trim().optional(),
            price: schemas.nonNegativeNumber.optional(),
            stock: schemas.nonNegativeNumber.optional(),
            barcode: z.string().trim().optional(),
            attributes: z.record(z.string()).optional(),
            reorderThreshold: schemas.nonNegativeNumber.optional(),
        }),
    },
    adjustStock: {
        params: z.object({
            id: schemas.objectId,
        }),
        body: z.object({
            change: z.coerce.number().int().refine(val => val !== 0, 'Change cannot be zero'),
            reason: z.string().trim().optional(),
        }),
    },
};

// User validation schemas
const userSchemas = {
    create: {
        body: z.object({
            username: schemas.nonEmptyString,
            email: schemas.email,
            password: schemas.password,
            role: z.enum(['admin', 'manager', 'staff']).optional(),
        }),
    },
    updateRole: {
        params: z.object({
            id: schemas.objectId,
        }),
        body: z.object({
            role: z.enum(['admin', 'manager', 'staff']),
        }),
    },
    updatePassword: {
        params: z.object({
            id: schemas.objectId,
        }),
        body: z.object({
            password: schemas.password,
        }),
    },
};

module.exports = {
    validateRequest,
    schemas,
    authSchemas,
    productSchemas,
    orderSchemas,
    skuSchemas,
    userSchemas,
};
