import { Notification } from '../models/Notification.js';

function isSuper(user) { return user?.role === 'super_admin'; }

export const listNotifications = async (req, res) => {
  try {
    const { sent_by_me } = req.query || {};
    let filter = {};
    if (String(sent_by_me) === '1' || String(sent_by_me).toLowerCase() === 'true') {
      // Outgoing view: list notifications created by current user
      filter = { sender_id: req.user._id };
    } else if (!isSuper(req.user)) {
      // Incoming view (default): notifications targeted to the user or broadcast to their clinic/global
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
    const user = req.user;
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    if (!title || !message) return res.status(400).json({ message: 'title and message are required' });

    const role = String(user?.role || '');

    // Admins and super admins can create broadcast notifications (clinic/global)
    const isAdmin = isSuper(user) || role === 'hospital_admin' || role === 'admin' || role === 'clinic_admin';
    const isStaff = role === 'doctor' || role === 'office_executive';

    // Staff can only send targeted notifications to a specific user within their own hospital
    if (isStaff) {
      if (!user?.hospital_id) return res.status(400).json({ message: 'No hospital associated with sender' });
      if (!body.user_id) return res.status(400).json({ message: 'Target user_id is required' });
      const doc = await Notification.create({
        hospital_id: user.hospital_id,
        user_id: body.user_id,
        sender_id: user._id,
        title,
        message,
        type: body.type || 'info',
      });
      return res.status(201).json({ notification: doc });
    }

    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    // For admins: allow broadcast to hospital or global, and allow targeted user if provided
    const doc = await Notification.create({
      hospital_id: Object.prototype.hasOwnProperty.call(body, 'hospital_id') ? body.hospital_id : (user?.hospital_id || null),
      user_id: body.user_id || null,
      sender_id: user._id,
      title,
      message,
      type: body.type || 'info',
    });
    return res.status(201).json({ notification: doc });
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
