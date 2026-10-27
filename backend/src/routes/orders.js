const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const v = require('../validators');

const router = express.Router();
const cartRouter = express.Router();

const MAX_QTY_PER_ITEM = 10;

/**
 * Turns the cart sent by the browser ([{productId, quantity}]) into trusted lines.
 * Prices, names and stock ALWAYS come from products.json - never from the browser.
 */
function buildLines(rawItems) {
  const products = db.read('products');
  const issues = [];
  const lines = [];

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { lines, issues: ['Your cart is empty'], fatal: true };
  }
  if (rawItems.length > 50) {
    return { lines, issues: ['Too many different items in the cart'], fatal: true };
  }

  const merged = new Map(); // merge duplicate product ids
  for (const raw of rawItems) {
    const productId = Number(raw && raw.productId);
    const quantity = Number(raw && raw.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      issues.push('Invalid item in cart');
      continue;
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  for (const [productId, requested] of merged) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      issues.push('A product in your cart is no longer available');
      lines.push({ productId, unavailable: true, quantity: 0, requested });
      continue;
    }
    const limit = Math.min(product.stock, MAX_QTY_PER_ITEM);
    const quantity = Math.min(requested, limit);
    if (product.stock === 0) {
      issues.push(`"${product.name}" is out of stock`);
    } else if (requested > limit) {
      issues.push(`Only ${limit} unit(s) of "${product.name}" can be ordered; quantity adjusted`);
    }
    lines.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      category: product.category,
      price: product.price,
      stock: product.stock,
      requested,
      quantity,
      subtotal: product.price * quantity
    });
  }
  return { lines, issues, fatal: false };
}

const sumTotal = (lines) => lines.reduce((t, l) => t + (l.subtotal || 0), 0);

// POST /api/cart/validate  - used by the cart/checkout pages to refresh prices & stock
cartRouter.post('/validate', (req, res) => {
  const { lines, issues, fatal } = buildLines(req.body && req.body.items);
  if (fatal) return res.status(400).json({ message: issues[0] });
  res.json({
    items: lines,
    total: sumTotal(lines),
    issues,
    valid: issues.length === 0
  });
});

// POST /api/orders  - place a Cash on Delivery order
router.post('/', requireAuth, (req, res) => {
  const { items, shipping, paymentMethod } = req.body || {};

  if (paymentMethod !== 'COD') {
    return res.status(400).json({ message: 'Only Cash on Delivery is supported' });
  }
  const errors = v.validateShipping(shipping);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
  }

  const { lines, issues, fatal } = buildLines(items);
  if (fatal) return res.status(400).json({ message: issues[0] });
  if (issues.length) {
    return res.status(409).json({
      message: 'Some items in your cart changed. Please review your cart and try again.',
      issues,
      items: lines
    });
  }

  // All checks passed: reduce stock and save the order in one go
  const products = db.read('products');
  for (const line of lines) {
    products.find((p) => p.id === line.productId).stock -= line.quantity;
  }
  db.write('products', products);

  const orders = db.read('orders');
  const id = db.nextId(orders);
  const now = new Date().toISOString();
  const order = {
    id,
    orderNumber: `ORD${String(id).padStart(5, '0')}`,
    userId: req.user.id,
    items: lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      image: l.image,
      price: l.price,
      quantity: l.quantity,
      subtotal: l.subtotal
    })),
    shipping: {
      name: v.clean(shipping.name),
      email: shipping.email.trim().toLowerCase(),
      phone: shipping.phone.trim(),
      address: v.clean(shipping.address),
      city: v.clean(shipping.city),
      state: v.clean(shipping.state),
      pincode: shipping.pincode.trim()
    },
    total: sumTotal(lines),
    paymentMethod: 'Cash on Delivery',
    status: 'Placed',
    createdAt: now,
    statusHistory: [{ status: 'Placed', at: now }]
  };
  orders.push(order);
  db.write('orders', orders);
  res.status(201).json(order);
});

// GET /api/orders/mine  - the logged-in customer's order history (newest first)
router.get('/mine', requireAuth, (req, res) => {
  const mine = db
    .read('orders')
    .filter((o) => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(mine);
});

// GET /api/orders/:id  - own order only
router.get('/:id', requireAuth, (req, res) => {
  const order = db.read('orders').find((o) => o.id === Number(req.params.id));
  if (!order || (order.userId !== req.user.id && req.user.role !== 'admin')) {
    return res.status(404).json({ message: 'Order not found' });
  }
  res.json(order);
});

// POST /api/orders/:id/cancel  - customer can cancel before it ships
router.post('/:id/cancel', requireAuth, (req, res) => {
  const orders = db.read('orders');
  const order = orders.find((o) => o.id === Number(req.params.id) && o.userId === req.user.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['Placed', 'Confirmed'].includes(order.status)) {
    return res.status(400).json({ message: `An order that is ${order.status} cannot be cancelled` });
  }
  restoreStock(order);
  order.status = 'Cancelled';
  order.statusHistory.push({ status: 'Cancelled', at: new Date().toISOString() });
  db.write('orders', orders);
  res.json(order);
});

/** Put the quantities of a cancelled order back into stock. */
function restoreStock(order) {
  const products = db.read('products');
  for (const item of order.items) {
    const p = products.find((x) => x.id === item.productId);
    if (p) p.stock += item.quantity;
  }
  db.write('products', products);
}

module.exports = { ordersRouter: router, cartRouter, restoreStock };
