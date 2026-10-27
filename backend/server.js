const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { seed } = require('./src/seed');

const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const { ordersRouter, cartRouter } = require('./src/routes/orders');
const adminRoutes = require('./src/routes/admin');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:4200,http://127.0.0.1:4200').split(',');

// Create data files + sample products/users on the very first run
seed();

// Fallback picture used when an admin adds a product without an image
const placeholder = path.join(__dirname, 'public', 'images', 'placeholder.svg');
if (!fs.existsSync(placeholder)) {
  fs.writeFileSync(
    placeholder,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e2e8f0"/><text x="200" y="160" font-size="90" text-anchor="middle" dominant-baseline="middle">🛍️</text></svg>`
  );
}

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  // A few basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use(
  cors({
    origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed'))),
    credentials: false
  })
);
app.use(express.json({ limit: '50kb' }));

// Product pictures
app.use('/images', express.static(path.join(__dirname, 'public', 'images'), { maxAge: '1d' }));

// REST API
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRoutes);

// Unknown API route
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// Central error handler (bad JSON, CORS errors, unexpected crashes)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request too large' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`E-Commerce API running at http://localhost:${PORT}`);
});
