const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { signToken, publicUser, requireAuth } = require('../auth');
const v = require('../validators');

const router = express.Router();

// Slow down password-guessing: max 20 login/register attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' }
});

// POST /api/auth/register
router.post('/register', authLimiter, (req, res) => {
  const { name, email, phone, password } = req.body || {};
  const errors = {};
  if (!v.isText(name, 2, 80)) errors.name = 'Enter your full name (2-80 characters)';
  if (!v.isEmail(email)) errors.email = 'Enter a valid email address';
  if (!v.isPhone(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number';
  if (!v.isStrongPassword(password)) errors.password = 'Password needs 8+ characters with a letter and a number';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', errors });

  const users = db.read('users');
  const emailNorm = email.trim().toLowerCase();
  if (users.some((u) => u.email === emailNorm)) {
    return res.status(409).json({ message: 'An account with this email already exists', errors: { email: 'Email already registered' } });
  }

  const user = {
    id: db.nextId(users),
    name: v.clean(name),
    email: emailNorm,
    phone: phone.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'customer', // public sign-up can NEVER create an admin
    active: true,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  db.write('users', users);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!v.isEmail(email) || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Enter your email and password' });
  }
  const user = db.read('users').find((u) => u.email === email.trim().toLowerCase());
  // Same message for unknown email / wrong password so attackers can't probe which emails exist
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (user.active === false) return res.status(403).json({ message: 'This account has been disabled' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, (req, res) => {
  const { name, phone } = req.body || {};
  const errors = {};
  if (!v.isText(name, 2, 80)) errors.name = 'Enter your full name (2-80 characters)';
  if (!v.isPhone(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields', errors });

  const users = db.read('users');
  const user = users.find((u) => u.id === req.user.id);
  user.name = v.clean(name);
  user.phone = phone.trim();
  db.write('users', users);
  res.json(publicUser(user));
});

// PUT /api/auth/password
router.put('/password', requireAuth, authLimiter, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !bcrypt.compareSync(currentPassword, req.user.passwordHash)) {
    return res.status(400).json({ message: 'Current password is incorrect', errors: { currentPassword: 'Incorrect password' } });
  }
  if (!v.isStrongPassword(newPassword)) {
    return res.status(400).json({ message: 'Password needs 8+ characters with a letter and a number', errors: { newPassword: 'Too weak' } });
  }
  const users = db.read('users');
  users.find((u) => u.id === req.user.id).passwordHash = bcrypt.hashSync(newPassword, 10);
  db.write('users', users);
  res.json({ message: 'Password updated' });
});

module.exports = router;
