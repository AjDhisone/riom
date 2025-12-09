const express = require('express');
const {
	createProduct,
	getProducts,
	getProductById,
	updateProduct,
	deleteProduct,
} = require('../controllers/product.controller');
const { upload, bulkImport, getImportTemplate } = require('../controllers/bulkImport.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Bulk import routes
router.get('/import/template', requireAuth, getImportTemplate);
router.post('/import', requireAuth, requireRole(['admin', 'manager']), upload.single('file'), bulkImport);

router.post('/', requireAuth, requireRole(['admin', 'manager']), createProduct);
router.get('/', requireAuth, getProducts);
router.get('/:id', requireAuth, getProductById);
router.put('/:id', requireAuth, requireRole(['admin', 'manager']), updateProduct);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteProduct);

module.exports = router;

