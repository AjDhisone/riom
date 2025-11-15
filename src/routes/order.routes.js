const express = require('express');
const { createOrder, listOrders, getOrderById } = require('../controllers/order.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/', requireAuth, createOrder);
router.get('/', requireAuth, listOrders);
router.get('/:id', requireAuth, getOrderById);

module.exports = router;
