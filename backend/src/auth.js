const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'college-demo-secret-change-me';
const JWT_EXPIRES = '4h';

if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET not set - using the demo secret. Fine for a college demo only.');
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/** Remove the password hash before sending a user to the browser. */
function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

/** Requires a valid token. Attaches req.user (fresh from users.json). */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.read('users').find((u) => u.id === payload.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    if (user.active === false) return res.status(403).json({ message: 'This account has been disabled' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = { signToken, publicUser, requireAuth, requireAdmin };
