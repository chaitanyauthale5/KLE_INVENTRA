import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    const payload = jwt.verify(token, secret);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Role-based authorization middleware
export function authorize(...allowedRoles) {
  return async function (req, res, next) {
    try {
      if (!req.userId) {
        // Ensure authenticate ran
        return res.status(401).json({ message: 'Unauthorized' });
      }
      // Load user from DB if not already attached
      const user = req.user || (await User.findById(req.userId));
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      req.user = user;

      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      next();
    } catch (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  };
}
