import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { User } from '../models/User.js';

const signToken = (userId) => {
  let secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback to prevent signin failures when JWT_SECRET is not configured locally
      secret = 'insecure-dev-secret-change-me';
      console.warn('[Auth] JWT_SECRET missing; using insecure dev fallback. Configure JWT_SECRET in .env for production.');
    } else {
      throw new Error('JWT_SECRET not set');
    }
  }
  return jwt.sign({ sub: userId }, secret, { expiresIn });
};

export const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, role: requestedRole = 'patient', password } = req.body;

  try {
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ message: 'Email already registered' });
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(409).json({ message: 'Phone already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Only allow safe roles during public signup
    const safePublicRoles = new Set(['patient', 'guardian']);
    const role = safePublicRoles.has(String(requestedRole)) ? String(requestedRole) : 'patient';

    const user = await User.create({ name, email, phone, role, passwordHash });

    const token = signToken(user._id);

    res.status(201).json({
      message: 'Signup successful',
      user: user.toJSON(),
      token,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const signin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { identifier, password } = req.body; // email, phone, or username

  try {
    let user = null;
    const ident = String(identifier || '').trim();
    if (ident.includes('@')) {
      user = await User.findOne({ email: ident.toLowerCase() });
    }
    if (!user && /^\d{6,}$/.test(ident)) {
      user = await User.findOne({ phone: ident });
      if (!user) {
        user = await User.findOne({ email: `${ident}@local.mobile` });
      }
    }
    if (!user && ident) {
      // Try username fallback
      user = await User.findOne({ username: ident.toLowerCase() });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Support both hashed and legacy plaintext passwords with auto-upgrade
    let ok = false;
    const stored = user.passwordHash || '';
    const isBcrypt = /^\$2[aby]\$/.test(String(stored));
    if (isBcrypt) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // Legacy plaintext; compare directly and upgrade to hash
      if (String(stored) === String(password)) {
        ok = true;
        try {
          const salt = await bcrypt.genSalt(10);
          user.passwordHash = await bcrypt.hash(String(password), salt);
          await user.save();
        } catch (e) {
          // best-effort upgrade; proceed even if saving fails
        }
      }
    }
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);

    res.json({
      message: 'Signin successful',
      user: user.toJSON(),
      token,
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toJSON() });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const signout = async (req, res) => {
  // Using stateless JWT; nothing to invalidate server-side unless maintaining token blacklist
  res.json({ message: 'Signed out' });
};

