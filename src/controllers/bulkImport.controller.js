const multer = require('multer');
const { parse } = require('csv-parse');
const productService = require('../services/product.service');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

// Configure multer for file upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];
        if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
});

/**
 * Parse CSV content and validate rows
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Array>} Parsed rows
 */
const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const parser = parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true, // Handle BOM from Excel
        });

        parser.on('data', (row) => {
            results.push(row);
        });

        parser.on('error', (err) => {
            reject(err);
        });

        parser.on('end', () => {
            resolve(results);
        });

        parser.write(buffer);
        parser.end();
    });
};

/**
 * Validate and transform a CSV row to product payload
 * @param {Object} row - CSV row
 * @param {number} rowIndex - Row number for error messages
 * @returns {Object} Validation result
 */
const validateRow = (row, rowIndex) => {
    const errors = [];
    const payload = {};

    // Required: name
    if (!row.name || typeof row.name !== 'string' || !row.name.trim()) {
        errors.push(`Row ${rowIndex}: 'name' is required`);
    } else {
        payload.name = row.name.trim();
    }

    // Required: category
    if (!row.category || typeof row.category !== 'string' || !row.category.trim()) {
        errors.push(`Row ${rowIndex}: 'category' is required`);
    } else {
        payload.category = row.category.trim();
    }

    // Required: basePrice
    const basePrice = parseFloat(row.basePrice || row.base_price || row.price);
    if (isNaN(basePrice) || basePrice < 0) {
        errors.push(`Row ${rowIndex}: 'basePrice' must be a non-negative number`);
    } else {
        payload.basePrice = basePrice;
    }

    // Optional: description
    if (row.description) {
        payload.description = row.description.trim();
    }

    // Optional: minStock (defaults to 0)
    const minStock = parseFloat(row.minStock || row.min_stock || 0);
    if (isNaN(minStock) || minStock < 0) {
        errors.push(`Row ${rowIndex}: 'minStock' must be a non-negative number`);
    } else {
        payload.minStock = minStock;
    }

    // Optional: initialStock (defaults to 0)
    const initialStock = parseFloat(row.initialStock || row.initial_stock || row.stock || 0);
    if (isNaN(initialStock) || initialStock < 0) {
        errors.push(`Row ${rowIndex}: 'initialStock' must be a non-negative number`);
    } else {
        payload.initialStock = initialStock;
    }

    return {
        valid: errors.length === 0,
        errors,
        payload,
    };
};

/**
 * Bulk import products from CSV
 */
const bulkImport = async (req, res, next) => {
    try {
        if (!req.file) {
            throw createHttpError('No file uploaded', 400, errorCodes.INVALID_INPUT);
        }

        // Parse CSV
        let rows;
        try {
            rows = await parseCSV(req.file.buffer);
        } catch (parseError) {
            logger.error({ err: parseError }, 'Failed to parse CSV');
            throw createHttpError(
                'Failed to parse CSV file. Please check the format.',
                400,
                errorCodes.INVALID_INPUT
            );
        }

        if (!rows.length) {
            throw createHttpError('CSV file is empty or has no valid data rows', 400, errorCodes.INVALID_INPUT);
        }

        // Validate all rows first
        const validationResults = rows.map((row, idx) => validateRow(row, idx + 2)); // +2 for header and 1-based
        const allErrors = validationResults.flatMap((r) => r.errors);

        if (allErrors.length > 0) {
            throw createHttpError(
                'Validation failed',
                400,
                errorCodes.INVALID_INPUT,
                allErrors.slice(0, 10) // Return first 10 errors
            );
        }

        // Create products
        const created = [];
        const failed = [];

        for (let i = 0; i < validationResults.length; i++) {
            const { payload } = validationResults[i];
            try {
                const product = await productService.createProduct(payload);
                created.push({
                    row: i + 2,
                    name: product.name,
                    id: product._id,
                });
            } catch (err) {
                logger.error({ err, row: i + 2 }, 'Failed to create product from import');
                failed.push({
                    row: i + 2,
                    name: payload.name,
                    error: err.message,
                });
            }
        }

        const message =
            failed.length === 0
                ? `Successfully imported ${created.length} products`
                : `Imported ${created.length} products, ${failed.length} failed`;

        return res.status(201).json(
            success(
                {
                    totalRows: rows.length,
                    created: created.length,
                    failed: failed.length,
                    createdProducts: created,
                    failedProducts: failed.slice(0, 10), // Return first 10 failures
                },
                message
            )
        );
    } catch (error) {
        logger.error({ err: error }, 'Bulk import failed');
        return next(error);
    }
};

/**
 * Get CSV template format information
 */
const getImportTemplate = (req, res) => {
    const template = {
        format: 'CSV',
        encoding: 'UTF-8',
        requiredColumns: ['name', 'category', 'basePrice'],
        optionalColumns: ['description', 'minStock', 'initialStock'],
        alternateColumnNames: {
            basePrice: ['base_price', 'price'],
            minStock: ['min_stock'],
            initialStock: ['initial_stock', 'stock'],
        },
        example: [
            {
                name: 'Blue T-Shirt',
                category: 'Clothing',
                basePrice: 29.99,
                description: 'Cotton t-shirt in blue',
                minStock: 10,
                initialStock: 100,
            },
            {
                name: 'Wireless Mouse',
                category: 'Electronics',
                basePrice: 49.99,
                description: 'Ergonomic wireless mouse',
                minStock: 5,
                initialStock: 50,
            },
        ],
        sampleCSV: `name,category,basePrice,description,minStock,initialStock
Blue T-Shirt,Clothing,29.99,Cotton t-shirt in blue,10,100
Wireless Mouse,Electronics,49.99,Ergonomic wireless mouse,5,50
Leather Wallet,Accessories,39.99,Genuine leather wallet,15,75`,
        instructions: [
            'Save your spreadsheet as CSV (Comma Separated Values)',
            'First row must contain column headers',
            'Required columns: name, category, basePrice',
            'Use numbers for basePrice, minStock, and initialStock',
            'Do not include currency symbols in price fields',
            'Maximum file size: 5MB',
        ],
        googleSheetsInstructions: [
            'Create a new Google Sheet',
            'Add headers in row 1: name, category, basePrice, description, minStock, initialStock',
            'Fill in your product data starting from row 2',
            'Go to File → Download → Comma Separated Values (.csv)',
            'Upload the downloaded CSV file',
        ],
        excelInstructions: [
            'Create a new Excel workbook',
            'Add headers in row 1: name, category, basePrice, description, minStock, initialStock',
            'Fill in your product data starting from row 2',
            'Go to File → Save As → Choose "CSV (Comma delimited)"',
            'Upload the saved CSV file',
        ],
    };

    return res.json(success(template, 'Import template retrieved'));
};

module.exports = {
    upload,
    bulkImport,
    getImportTemplate,
};
