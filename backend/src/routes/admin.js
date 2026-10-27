const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, publicUser } = require('../auth');
const { restoreStock } = require('./orders');
const v = require('../validators');

const router = express.Router();
router.use(requireAuth, requireAdmin); // every route below is admin-only

const STATUSES = ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

/** Validates product fields from the admin form. Returns { errors, value }. */
function parseProduct(body) {
  const errors = {};
  const b = body || {};
  const price = Number(b.price);
  const mrp = Number(b.mrp || b.price);
  const stock = Number(b.stock);
  const rating = b.rating === undefined || b.rating === '' ? 4 : Number(b.rating);

  if (!v.isText(b.name, 2, 120)) errors.name = 'Name is required (2-120 characters)';
  if (!v.isText(b.description, 10, 1000)) errors.description = 'Description is required (10-1000 characters)';
  if (!v.isText(b.category, 2, 40)) errors.category = 'Category is required';
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Price must be greater than 0';
  if (!Number.isFinite(mrp) || mrp < price) errors.mrp = 'MRP cannot be lower than the price';
  if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Stock must be a whole number (0 or more)';
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.rating = 'Rating must be between 0 and 5';

  let image = typeof b.image === 'string' ? b.image.trim() : '';
  if (image && !/^(\/images\/[\w.-]+|https?:\/\/\S+)$/.test(image)) {
    errors.image = 'Image must be an http(s) URL or /images/<file>';
  }

  return {
    errors,
    value: {
      name: v.clean(b.name),
      description: v.clean(b.description),
      category: v.clean(b.category),
      price: Math.round(price * 100) / 100,
      mrp: Math.round(mrp * 100) / 100,
      stock,
      rating: Math.round(rating * 10) / 10,
      image,
      featured: !!b.featured
    }
  };
}

// ---------- Dashboard ----------
router.get('/stats', (req, res) => {
  const products = db.read('products');
  const orders = db.read('orders');
  const users = db.read('users');
  const active = orders.filter((o) => o.status !== 'Cancelled');
  res.json({
    products: products.length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
    customers: users.filter((u) => u.role === 'customer').length,
    orders: orders.length,
    pendingOrders: orders.filter((o) => ['Placed', 'Confirmed'].includes(o.status)).length,
    revenue: active.reduce((t, o) => t + o.total, 0)
  });
});

// ---------- Products ----------
router.post('/products', (req, res) => {
  const { errors, value } = parseProduct(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
  const products = db.read('products');
  const product = {
    id: db.nextId(products),
    ...value,
    image: value.image || '/images/placeholder.svg',
    createdAt: new Date().toISOString()
  };
  products.push(product);
  db.write('products', products);
  res.status(201).json(product);
});

router.put('/products/:id', (req, res) => {
  const products = db.read('products');
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const { errors, value } = parseProduct(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
  Object.assign(product, value, { image: value.image || product.image });
  db.write('products', products);
  res.json(product);
});

// Quick inventory update
router.patch('/products/:id/stock', (req, res) => {
  const stock = Number(req.body && req.body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: 'Stock must be a whole number (0 or more)' });
  }
  const products = db.read('products');
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  product.stock = stock;
  db.write('products', products);
  res.json(product);
});

router.delete('/products/:id', (req, res) => {
  const products = db.read('products');
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Product not found' });
  const [removed] = products.splice(index, 1);
  db.write('products', products);
  res.json({ message: `"${removed.name}" deleted` });
});

// ---------- Users ----------
router.get('/users', (req, res) => {
  const orders = db.read('orders');
  res.json(
    db.read('users').map((u) => ({
      ...publicUser(u),
      orderCount: orders.filter((o) => o.userId === u.id).length
    }))
  );
});

router.patch('/users/:id', (req, res) => {
  const users = db.read('users');
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own role or status' });
  }
  const { role, active } = req.body || {};
  if (role !== undefined) {
    if (!['admin', 'customer'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    user.role = role;
  }
  if (active !== undefined) user.active = !!active;
  db.write('users', users);
  res.json(publicUser(user));
});

// ---------- Orders ----------
router.get('/orders', (req, res) => {
  const { status } = req.query;
  let orders = db.read('orders');
  if (status && STATUSES.includes(status)) orders = orders.filter((o) => o.status === status);
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

router.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const orders = db.read('orders');
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status === status) return res.json(order);
  if (['Cancelled', 'Delivered'].includes(order.status)) {
    return res.status(400).json({ message: `A ${order.status} order cannot be changed` });
  }
  if (status === 'Cancelled') restoreStock(order);
  order.status = status;
  order.statusHistory.push({ status, at: new Date().toISOString() });
  db.write('orders', orders);
  res.json(order);
});

module.exports = router;
