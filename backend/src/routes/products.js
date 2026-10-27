const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/products
 * Query: search, category, sort (price_asc|price_desc|name_asc|name_desc|rating_desc|newest),
 *        page (default 1), limit (default 12, max 50), featured=true, offers=true
 */
router.get('/', (req, res) => {
  let items = db.read('products');
  const { search, category, sort, featured, offers } = req.query;

  if (search) {
    const q = String(search).toLowerCase().trim();
    items = items.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (category && category !== 'All') items = items.filter((p) => p.category === category);
  if (featured === 'true') items = items.filter((p) => p.featured);
  if (offers === 'true') {
    items = items.filter((p) => p.mrp > p.price).sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
  }

  const sorters = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    name_asc: (a, b) => a.name.localeCompare(b.name),
    name_desc: (a, b) => b.name.localeCompare(a.name),
    rating_desc: (a, b) => b.rating - a.rating,
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  };
  if (sorters[sort]) items.sort(sorters[sort]);

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), totalPages);

  res.json({
    items: items.slice((page - 1) * limit, page * limit),
    total,
    page,
    totalPages,
    limit
  });
});

// GET /api/products/categories  (with product counts)
router.get('/categories', (req, res) => {
  const counts = {};
  db.read('products').forEach((p) => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  res.json(Object.entries(counts).map(([name, count]) => ({ name, count })));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.read('products').find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

module.exports = router;
