const aiService = require('../services/ai.service');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const SKU = require('../models/sku.model');
const Settings = require('../models/settings.model');
const { success } = require('../utils/response');
const { createHttpError } = require('../utils/httpError');
const errorCodes = require('../constants/errorCodes');

/**
 * Parse date parameter, returns Date object or undefined
 */
const parseDateParam = (value) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
};

/**
 * Generate AI summary of business data
 * Accepts optional query params: from, to (ISO date strings)
 */
const getSummary = async (req, res, next) => {
    try {
        console.log('AI Controller: Starting getSummary');

        // Parse optional date range from query params (for POST, check body too)
        const fromParam = req.query?.from || req.body?.from;
        const toParam = req.query?.to || req.body?.to;

        // Default to today if no dates provided
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Use provided dates or default to today
        let startDate = parseDateParam(fromParam);
        let endDate = parseDateParam(toParam);

        if (startDate) {
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = today;
        }

        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        } else {
            endDate = tomorrow;
        }

        const dateRangeLabel = fromParam || toParam
            ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
            : 'today';

        console.log('AI Controller: Date range:', { startDate, endDate, dateRangeLabel });
        console.log('AI Controller: Fetching data from database...');

        // Fetch all required data in parallel
        const [
            totalProducts,
            totalSKUs,
            periodOrders,
            lowStockSKUs,
            topSellingPeriod,
            settings,
        ] = await Promise.all([
            Product.countDocuments(),
            SKU.countDocuments(),
            Order.find({ createdAt: { $gte: startDate, $lte: endDate }, status: 'completed' }),
            SKU.find({ $expr: { $lte: ['$stock', '$reorderThreshold'] } })
                .populate('productId', 'name')
                .limit(10),
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'completed' } },
                { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$items.productId',
                        totalSold: { $sum: { $ifNull: ['$items.quantity', 0] } },
                    },
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 },
            ]),
            Settings.findOne(),
        ]);

        console.log('AI Controller: Database queries complete', {
            totalProducts,
            totalSKUs,
            ordersCount: periodOrders?.length,
            lowStockCount: lowStockSKUs?.length,
            topSellingCount: topSellingPeriod?.length
        });

        // Calculate period revenue
        const periodRevenue = periodOrders.reduce((sum, order) => sum + (order.total || 0), 0);

        // Get product names for top selling
        const topSellingProductIds = topSellingPeriod.map((item) => item._id);
        const topSellingProducts = await Product.find({ _id: { $in: topSellingProductIds } });
        const productMap = new Map(topSellingProducts.map((p) => [p._id.toString(), p.name]));

        // Prepare data for AI
        const data = {
            dateRange: dateRangeLabel,
            totalProducts,
            totalSKUs,
            periodOrders: periodOrders.length,
            periodRevenue,
            currency: settings?.currency || 'INR',
            lowStockCount: lowStockSKUs.length,
            lowStockItems: lowStockSKUs.map((sku) => ({
                name: sku.productId?.name || 'Unknown',
                sku: sku.sku,
                currentStock: sku.stock,
                reorderThreshold: sku.reorderThreshold,
            })),
            topSelling: topSellingPeriod.map((item) => ({
                name: productMap.get(item._id?.toString()) || 'Unknown',
                sold: item.totalSold,
            })),
        };

        // Generate AI summary
        const summary = await aiService.generateSummary(data);

        res.json(success({ summary, data, dateRange: dateRangeLabel }, 'AI summary generated successfully'));
    } catch (error) {
        console.error('AI Summary Error:', error.message, error.stack);
        if (error.message?.includes('GEMINI_API_KEY')) {
            return next(createHttpError(error.message, 503, errorCodes.SERVICE_UNAVAILABLE));
        }
        next(error);
    }
};

module.exports = {
    getSummary,
};
