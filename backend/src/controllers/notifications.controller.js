import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { getMessaging } from '../config/firebaseAdmin.js';

function isSuper(user) { return user?.role === 'super_admin'; }

export const listNotifications = async (req, res) => {
  try {
    const { sent_by_me } = req.query || {};
    let filter = {};
    if (String(sent_by_me) === '1' || String(sent_by_me).toLowerCase() === 'true') {
      // Outgoing view: list notifications created by current user
      filter = { sender_id: req.user._id };
    } else if (!isSuper(req.user)) {
      // Incoming view (default):
      // - Always include user-targeted
      // - Include clinic broadcasts (hospital_id set, user_id null) ONLY for clinic_admin role
      // - Include global broadcasts
      const or = [ { user_id: req.user._id }, { hospital_id: null, user_id: null } ];
      if (req.user.role === 'clinic_admin' && req.user.hospital_id) {
        or.push({ hospital_id: req.user.hospital_id, user_id: null });
      }
      filter.$or = or;
    } else {
      // Super admin incoming view: only notifications explicitly targeted to them
      filter = { user_id: req.user._id };
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ notifications });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const registerFcmToken = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'token is required' });
    }
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    // Add token to current user and optionally prune duplicates across other users
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { fcm_tokens: token } },
      { new: true }
    ).select('_id');
    // Best-effort dedupe across other users (do not block response)
    User.updateMany({ _id: { $ne: userId }, fcm_tokens: token }, { $pull: { fcm_tokens: token } }).catch(() => {});
    return res.json({ ok: true });
  } catch (e) {
    console.error('registerFcmToken error:', e);
    return res.status(400).json({ message: e.message || 'Bad request' });
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
    // Fire-and-forget push delivery via FCM, if configured
    try {
      const messaging = getMessaging();
      if (messaging) {
        let tokens = [];
        if (doc.user_id) {
          const u = await User.findById(doc.user_id).select('fcm_tokens').lean();
          tokens = Array.isArray(u?.fcm_tokens) ? u.fcm_tokens : [];
        } else if (doc.hospital_id) {
          const users = await User.find({ hospital_id: doc.hospital_id, fcm_tokens: { $exists: true, $ne: [] } }).select('fcm_tokens').lean();
          tokens = users.flatMap((x) => Array.isArray(x.fcm_tokens) ? x.fcm_tokens : []);
        } else {
          const users = await User.find({ fcm_tokens: { $exists: true, $ne: [] } }).select('fcm_tokens').limit(500).lean();
          tokens = users.flatMap((x) => Array.isArray(x.fcm_tokens) ? x.fcm_tokens : []);
        }
        tokens = Array.from(new Set(tokens)).slice(0, 500);
        if (tokens.length > 0) {
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title, body: message },
            data: {
              title,
              message,
              type: String(doc.type || 'info'),
              notification_id: String(doc._id),
            }
          });
        }
      }
    } catch (pushErr) {
      console.warn('[Notifications] FCM push failed:', pushErr?.message || pushErr);
    }
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
