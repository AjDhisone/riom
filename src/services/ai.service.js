const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let genAI = null;
let model = null;

/**
 * Initialize Gemini AI client
 */
const initializeGemini = () => {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
        return false;
    }

    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        logger.info('Gemini AI initialized successfully');
        return true;
    } catch (error) {
        logger.error('Failed to initialize Gemini AI:', error);
        return false;
    }
};

/**
 * Generate AI summary from inventory data
 */
const generateSummary = async (data) => {
    console.log('AI Service: generateSummary called');

    if (!model) {
        console.log('AI Service: Model not initialized, initializing...');
        if (!initializeGemini()) {
            throw new Error('Gemini AI is not configured. Please set GEMINI_API_KEY in environment variables.');
        }
    }

    console.log('AI Service: Building prompt with data:', JSON.stringify(data, null, 2));

    const prompt = `You are an AI assistant for an inventory management system called RIOM. 
Based on the following business data, provide a concise, actionable summary with insights and recommendations.

**Today's Date:** ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

**Business Data:**
- Total Products in Catalog: ${data.totalProducts}
- Total SKUs (Variants): ${data.totalSKUs}
- Today's Orders: ${data.todayOrders}
- Today's Revenue: ${data.currency} ${data.todayRevenue?.toFixed(2) || '0.00'}
- Low Stock Items: ${data.lowStockCount}
- Items Needing Restock: ${data.lowStockItems?.map(item => `${item.name} (${item.currentStock} left)`).join(', ') || 'None'}
- Top Selling Products Today: ${data.topSelling?.map(p => `${p.name} (${p.sold} units)`).join(', ') || 'No sales yet'}

Please provide:
1. **📊 Daily Overview** - Brief summary of today's performance
2. **⚠️ Alerts & Actions** - Critical items needing attention (focus on low stock)
3. **📈 Insights** - Notable trends or patterns
4. **💡 Recommendations** - 2-3 actionable suggestions to improve operations

Keep the response concise and business-focused. Use markdown formatting.`;

    try {
        console.log('AI Service: Calling Gemini API...');
        const result = await model.generateContent(prompt);
        console.log('AI Service: Got result from Gemini');
        const response = await result.response;
        console.log('AI Service: Got response object');
        const text = response.text();
        console.log('AI Service: Generated text length:', text?.length);
        return text;
    } catch (error) {
        console.error('AI Service: Gemini API Error:', error.message);
        console.error('AI Service: Error details:', error);
        throw new Error(`Gemini API error: ${error.message}`);
    }
};

module.exports = {
    initializeGemini,
    generateSummary,
};
