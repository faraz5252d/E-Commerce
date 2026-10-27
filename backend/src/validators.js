/** Small reusable validation helpers (used by auth and order routes). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian mobile: 10 digits starting 6-9
const PIN_RE = /^[1-9]\d{5}$/; // Indian PIN: 6 digits, not starting with 0

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
const isPhone = (v) => typeof v === 'string' && PHONE_RE.test(v.trim());
const isPin = (v) => typeof v === 'string' && PIN_RE.test(v.trim());
const isText = (v, min = 1, max = 200) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

/** Password rule: 8+ chars with at least one letter and one number. */
const isStrongPassword = (v) =>
  typeof v === 'string' && v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v);

/** Strip tags/angle brackets so stored text can't carry HTML. */
const clean = (v) => String(v ?? '').replace(/[<>]/g, '').trim();

function validateShipping(s) {
  const errors = {};
  if (!s || typeof s !== 'object') return { shipping: 'Shipping details are required' };
  if (!isText(s.name, 2, 80)) errors.name = 'Enter your full name (2-80 characters)';
  if (!isEmail(s.email)) errors.email = 'Enter a valid email address';
  if (!isPhone(s.phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number (starts with 6-9)';
  if (!isText(s.address, 5, 200)) errors.address = 'Enter your shipping address (5-200 characters)';
  if (!isText(s.city, 2, 60)) errors.city = 'Enter your city';
  if (!isText(s.state, 2, 60)) errors.state = 'Enter your state';
  if (!isPin(s.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code';
  return errors;
}

module.exports = { isEmail, isPhone, isPin, isText, isStrongPassword, clean, validateShipping };
