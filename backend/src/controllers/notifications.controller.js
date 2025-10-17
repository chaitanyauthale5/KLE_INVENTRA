import { Notification } from '../models/Notification.js';

function isSuper(user) { return user?.role === 'super_admin'; }

export const listNotifications = async (req, res) => {
  try {
    const filter = {};
    if (!isSuper(req.user)) {
      // Show notifications for the user and for their hospital (broadcast)
      filter.$or = [
        { user_id: req.user._id },
        ...(req.user.hospital_id ? [{ hospital_id: req.user.hospital_id }] : []),
        { hospital_id: null, user_id: null }, // global
      ];
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ notifications });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNotification = async (req, res) => {
  try {
    // Only admins or super admins can create broadcast notifications
    if (!(isSuper(req.user) || req.user.role === 'hospital_admin' || req.user.role === 'admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const body = req.body || {};
    if (isSuper(req.user)) {
      // allow any hospital/global
    } else {
      body.hospital_id = req.user.hospital_id || null;
    }
    const n = await Notification.create(body);
    res.status(201).json({ notification: n });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const n = await Notification.findById(id);
    if (!n) return res.status(404).json({ message: 'Not found' });
    if (!isSuper(req.user)) {
      // User can only mark their own notification or hospital/global they can see
      const allowed = (
        (n.user_id && String(n.user_id) === String(req.user._id)) ||
        (n.hospital_id && req.user.hospital_id && String(n.hospital_id) === String(req.user.hospital_id)) ||
        (!n.user_id && !n.hospital_id)
      );
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }
    n.read = true;
    await n.save();
    res.json({ notification: n });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};
