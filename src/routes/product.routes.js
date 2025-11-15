const express = require('express');
const {
	createProduct,
	getProducts,
	getProductById,
	updateProduct,
	deleteProduct,
} = require('../controllers/product.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), createProduct);
router.get('/', requireAuth, getProducts);
router.get('/:id', requireAuth, getProductById);
router.put('/:id', requireAuth, requireRole('admin'), updateProduct);
router.delete('/:id', requireAuth, requireRole('admin'), deleteProduct);

module.exports = router;
