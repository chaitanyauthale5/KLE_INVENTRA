import { User } from '../models/User.js';

// Attaches req.user if missing and returns hospital scope filter
export async function withUser(req, res, next) {
  try {
    if (!req.user && req.userId) {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      req.user = user;
    }
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function getHospitalScope(req) {
  const user = req.user;
  if (!user) return {};
  // super admin can access all
  if (user.role === 'super_admin') return {};
  // others limited to their hospital if available
  if (user.hospital_id) return { hospital_id: user.hospital_id };
  return { _id: null }; // no access by default
}
