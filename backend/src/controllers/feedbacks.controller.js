import mongoose from 'mongoose';
import { PatientFeedback } from '../models/PatientFeedback.js';
import { withUser } from '../middleware/hospitalScope.js';

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(String(id)); } catch { return null; }
};

export const updateFeedback = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const fid = toObjectId(id);
    if (!fid) return res.status(400).json({ message: 'Invalid id' });

    const update = {};
    if (typeof req.body.admin_response === 'string') {
      if (!(user?.role === 'clinic_admin' || user?.role === 'hospital_admin' || user?.role === 'super_admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      update.admin_response = req.body.admin_response.trim();
      update.admin_responder_id = user._id;
      update.admin_responded_at = new Date();
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'No updatable fields provided' });
    }

    const docRaw = await PatientFeedback.findByIdAndUpdate(fid, { $set: update }, { new: true })
      .populate({ path: 'patient_id', select: 'name' })
      .lean();
    const doc = docRaw ? { ...docRaw, patient_name: docRaw?.patient_id && typeof docRaw.patient_id === 'object' ? docRaw.patient_id.name : undefined } : null;
    if (!doc) return res.status(404).json({ message: 'Not Found' });
    return res.json({ feedback: doc });
  } catch (e) {
    console.error('updateFeedback error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listFeedbacks = async (req, res) => {
  try {
    const user = req.user;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const sortParam = String(req.query.sort || '-created_at'); // e.g., -created_date

    const filter = {};
    // Filter by hospital
    if (req.query.hospital_id) {
      const hid = toObjectId(req.query.hospital_id);
      if (hid) filter.hospital_id = hid;
    }
    // Filter by patient
    if (req.query.patient_user_id) {
      const pid = toObjectId(req.query.patient_user_id);
      if (pid) filter.patient_id = pid;
    }

    // Default scoping by role
    if (user?.role === 'patient') {
      filter.patient_id = user._id; // patients can only see their own
    } else if (user?.role !== 'super_admin' && user?.hospital_id) {
      // restrict to own hospital unless super admin
      filter.hospital_id = user.hospital_id;
    }

    // Build sort
    const sort = {};
    const parts = sortParam.split(',');
    for (const p of parts) {
      const key = p.trim();
      if (!key) continue;
      if (key.startsWith('-')) sort[key.substring(1)] = -1; else sort[key] = 1;
    }

    let [items, total] = await Promise.all([
      PatientFeedback.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'patient_id', select: 'name' })
        .lean(),
      PatientFeedback.countDocuments(filter)
    ]);
    // Flatten patient name for convenience
    items = items.map((x) => ({
      ...x,
      patient_name: x?.patient_id && typeof x.patient_id === 'object' ? x.patient_id.name : undefined,
    }));
    return res.json({ items, total, page, limit });
  } catch (e) {
    console.error('listFeedbacks error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createFeedback = async (req, res) => {
  try {
    const user = req.user;
    const { rating, message, comment, hospital_id } = req.body || {};

    const r = Number(rating);
    if (!(r >= 1 && r <= 5)) {
      return res.status(400).json({ message: 'rating must be between 1 and 5' });
    }
    const text = (message ?? comment ?? '').toString().trim();
    if (!text) {
      return res.status(400).json({ message: 'message is required' });
    }

    // Determine hospital
    let hid = null;
    if (hospital_id) hid = toObjectId(hospital_id);
    if (!hid && user?.hospital_id) hid = user.hospital_id;
    if (!hid) return res.status(400).json({ message: 'hospital_id is required' });

    const doc = new PatientFeedback({
      hospital_id: hid,
      patient_id: user?._id || toObjectId(req.userId),
      rating: r,
      comment: text,
      created_at: new Date(),
    });
    await doc.save();
    return res.status(201).json({ feedback: doc.toJSON() });
  } catch (e) {
    console.error('createFeedback error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
