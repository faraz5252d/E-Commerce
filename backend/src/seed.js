/**
 * Seeds the JSON "database" the first time the server starts
 * (or when you run `npm run seed` to reset everything).
 *
 * Creates:
 *   data/products.json  - 24 sample products
 *   data/users.json     - 1 admin + 1 demo customer (passwords are bcrypt-hashed)
 *   data/orders.json    - empty
 *   public/images/*.svg - a generated picture for every product (works offline)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images');

const PRODUCTS = [
  // name, category, price, mrp, rating, stock, emoji, colors, featured, description
  ['Wireless Bluetooth Headphones', 'Electronics', 2499, 3999, 4.5, 25, '🎧', ['#4f46e5', '#818cf8'], true, 'Over-ear wireless headphones with deep bass, 30-hour battery life, soft cushions and a built-in microphone for calls.'],
  ['Smart Fitness Watch', 'Electronics', 3299, 4999, 4.3, 18, '⌚', ['#0ea5e9', '#38bdf8'], true, 'Track steps, heart rate and sleep. Water resistant with a bright AMOLED display and 7-day battery.'],
  ['Portable Power Bank 20000mAh', 'Electronics', 1599, 2299, 4.4, 40, '🔋', ['#16a34a', '#4ade80'], false, 'High-capacity power bank with dual USB output and fast charging. Charges a phone up to 4 times.'],
  ['Mechanical Gaming Keyboard', 'Electronics', 2899, 3999, 4.6, 12, '⌨️', ['#7c3aed', '#a78bfa'], true, 'RGB backlit mechanical keyboard with tactile blue switches and a sturdy aluminium frame.'],
  ['Bluetooth Speaker', 'Electronics', 1899, 2999, 4.2, 0, '🔊', ['#ea580c', '#fb923c'], false, 'Compact waterproof speaker with 360-degree sound and 12 hours of playtime.'],
  ['Cotton Casual T-Shirt', 'Fashion', 499, 899, 4.1, 80, '👕', ['#0891b2', '#22d3ee'], false, 'Soft 100% cotton round-neck t-shirt. Breathable, durable and perfect for everyday wear.'],
  ['Slim Fit Denim Jeans', 'Fashion', 1299, 1999, 4.3, 35, '👖', ['#1d4ed8', '#60a5fa'], true, 'Stretchable slim-fit jeans with a comfortable waist and a classic five-pocket design.'],
  ['Running Shoes', 'Fashion', 1999, 3499, 4.5, 22, '👟', ['#dc2626', '#f87171'], true, 'Lightweight running shoes with cushioned soles and breathable mesh for all-day comfort.'],
  ['Leather Wallet', 'Fashion', 699, 1199, 4.0, 50, '👛', ['#92400e', '#d97706'], false, 'Genuine leather bi-fold wallet with card slots, coin pocket and a slim profile.'],
  ['Sunglasses UV400', 'Fashion', 799, 1499, 4.2, 30, '🕶️', ['#334155', '#64748b'], false, 'Polarised UV400 sunglasses with a lightweight frame that suits every face shape.'],
  ['Non-Stick Cookware Set', 'Home & Kitchen', 2199, 3499, 4.4, 15, '🍳', ['#be123c', '#fb7185'], true, '3-piece non-stick cookware set with heat-resistant handles. Works on gas and induction.'],
  ['Stainless Steel Water Bottle', 'Home & Kitchen', 599, 899, 4.5, 60, '🍶', ['#0d9488', '#5eead4'], false, 'Double-wall insulated 1 litre bottle that keeps drinks cold for 24 hours and hot for 12.'],
  ['LED Table Lamp', 'Home & Kitchen', 899, 1399, 4.1, 28, '💡', ['#ca8a04', '#fde047'], false, 'Dimmable LED study lamp with three colour modes, flexible neck and USB charging port.'],
  ['Cotton Bed Sheet Set', 'Home & Kitchen', 1199, 1999, 4.3, 20, '🛏️', ['#9333ea', '#c084fc'], false, 'Double bed sheet with 2 pillow covers. Soft, wrinkle-resistant and colour-fast.'],
  ['Python Programming for Beginners', 'Books', 449, 699, 4.6, 45, '📘', ['#2563eb', '#93c5fd'], true, 'A beginner-friendly guide to Python with practical examples and exercises in every chapter.'],
  ['Data Structures Made Easy', 'Books', 549, 799, 4.4, 33, '📗', ['#15803d', '#86efac'], false, 'Learn arrays, linked lists, trees and graphs step by step with clear diagrams and solved problems.'],
  ['The Startup Playbook', 'Books', 399, 599, 4.2, 0, '📙', ['#c2410c', '#fdba74'], false, 'Practical lessons on building a business from idea to launch, with real founder stories.'],
  ['Yoga Mat Anti-Slip', 'Sports', 799, 1299, 4.3, 55, '🧘', ['#059669', '#6ee7b7'], false, 'Extra-thick 6 mm anti-slip yoga mat with a carry strap. Easy to clean and lightweight.'],
  ['Adjustable Dumbbell Set', 'Sports', 2999, 4499, 4.5, 10, '🏋️', ['#374151', '#9ca3af'], true, 'Adjustable dumbbells from 2 kg to 10 kg per hand, with secure locking collars.'],
  ['Cricket Bat (Kashmir Willow)', 'Sports', 1799, 2799, 4.2, 14, '🏏', ['#b45309', '#fcd34d'], false, 'Well-balanced Kashmir willow bat with a comfortable grip. Ideal for practice and club matches.'],
  ['Herbal Face Wash', 'Beauty', 249, 399, 4.1, 90, '🧴', ['#65a30d', '#bef264'], false, 'Gentle neem and aloe vera face wash that cleanses oil and dirt without drying the skin.'],
  ['Vitamin C Face Serum', 'Beauty', 599, 999, 4.4, 38, '✨', ['#f59e0b', '#fde68a'], true, 'Brightening serum with 10% Vitamin C and hyaluronic acid for glowing, even-toned skin.'],
  ['Hair Dryer 1800W', 'Beauty', 1299, 1999, 4.0, 16, '💇', ['#db2777', '#f9a8d4'], false, 'Powerful 1800W dryer with 3 heat settings, a cool-shot button and a concentrator nozzle.'],
  ['Aromatic Candle Gift Set', 'Beauty', 549, 899, 4.3, 42, '🕯️', ['#7e22ce', '#d8b4fe'], false, 'Set of 4 scented soy candles in lavender, vanilla, jasmine and sandalwood.']
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function makeSvg(emoji, [c1, c2], label) {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <circle cx="330" cy="50" r="90" fill="#ffffff" opacity="0.12"/>
  <circle cx="60" cy="270" r="110" fill="#ffffff" opacity="0.10"/>
  <text x="200" y="165" font-size="120" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="200" y="272" font-size="16" font-family="Arial, sans-serif" fill="#ffffff" opacity="0.9" text-anchor="middle">${safe}</text>
</svg>`;
}

function seed({ reset = false } = {}) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const now = Date.now();

  if (reset || !fs.existsSync(path.join(db.DATA_DIR, 'products.json'))) {
    const products = PRODUCTS.map((p, i) => {
      const [name, category, price, mrp, rating, stock, emoji, colors, featured, description] = p;
      const slug = slugify(name);
      fs.writeFileSync(path.join(IMG_DIR, `${slug}.svg`), makeSvg(emoji, colors, category), 'utf8');
      return {
        id: i + 1,
        name,
        description,
        price,
        mrp,
        category,
        rating,
        stock,
        image: `/images/${slug}.svg`,
        featured,
        createdAt: new Date(now - (PRODUCTS.length - i) * 86400000).toISOString()
      };
    });
    db.write('products', products);
    console.log(`Seeded ${products.length} products`);
  }

  if (reset || !fs.existsSync(path.join(db.DATA_DIR, 'users.json'))) {
    const created = new Date().toISOString();
    db.write('users', [
      {
        id: 1,
        name: 'Store Admin',
        email: 'admin@shop.com',
        phone: '9876543210',
        passwordHash: bcrypt.hashSync('Admin@123', 10),
        role: 'admin',
        active: true,
        createdAt: created
      },
      {
        id: 2,
        name: 'Demo Customer',
        email: 'customer@shop.com',
        phone: '9123456780',
        passwordHash: bcrypt.hashSync('Customer@123', 10),
        role: 'customer',
        active: true,
        createdAt: created
      }
    ]);
    console.log('Seeded users: admin@shop.com / Admin@123 and customer@shop.com / Customer@123');
  }

  if (reset || !fs.existsSync(path.join(db.DATA_DIR, 'orders.json'))) {
    db.write('orders', []);
  }
}

module.exports = { seed };

if (require.main === module) {
  seed({ reset: process.argv.includes('--reset') });
  console.log('Done.');
}
