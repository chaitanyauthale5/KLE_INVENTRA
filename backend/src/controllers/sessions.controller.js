import { TherapySession } from '../models/TherapySession.js';

function isSuper(user) { return user?.role === 'super_admin'; }
function isHospAdmin(user) {
  // Allow clinic_admin and office_executive to manage sessions
  return ['hospital_admin', 'admin', 'clinic_admin', 'office_executive'].includes(user?.role);
}
function isDoctor(user) { return user?.role === 'doctor'; }
// isTherapist removed - role no longer exists

export const listSessions = async (req, res) => {
  try {
    const filter = {};
    // Query-based filters
    const q = req.query || {};
    if (q.patient_id) filter.patient_id = q.patient_id;
    if (q.doctor_id) filter.doctor_id = q.doctor_id;
    if (q.status) filter.status = q.status;
    // scheduled_date (YYYY-MM-DD) or from/to ISO
    if (q.scheduled_date) {
      const d = new Date(q.scheduled_date);
      if (!isNaN(d.getTime())) {
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
        filter.scheduled_at = { $gte: start, $lte: end };
      }
    } else if (q.from || q.to) {
      const range = {};
      if (q.from) { const f = new Date(q.from); if (!isNaN(f.getTime())) range.$gte = f; }
      if (q.to) { const t = new Date(q.to); if (!isNaN(t.getTime())) range.$lte = t; }
      if (Object.keys(range).length) filter.scheduled_at = range;
    }

    // Scope by role
    if (!isSuper(req.user)) {
      if (req.user.hospital_id) filter.hospital_id = req.user.hospital_id;
      if (isDoctor(req.user)) filter.doctor_id = req.user._id;
    }

    const sessions = await TherapySession.find(filter).sort({ scheduled_at: 1 });
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSession = async (req, res) => {
  try {
    // Only super/admin/hospital_admin/clinic_admin/office_executive can create scheduling
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });

    const body = req.body || {};
    if (isSuper(req.user)) {
      if (!body.hospital_id) return res.status(400).json({ message: 'hospital_id required' });
    } else {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      body.hospital_id = req.user.hospital_id;
    }
    const s = await TherapySession.create(body);
    res.status(201).json({ session: s });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await TherapySession.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    if (!isSuper(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // Doctor can approve
    if (isDoctor(req.user) && req.body?.approvals?.doctor_approved !== undefined) {
      existing.approvals.doctor_approved = !!req.body.approvals.doctor_approved;
    }
    // Admins can approve admin_approved and reschedule
    if (isSuper(req.user) || isHospAdmin(req.user)) {
      if (req.body?.approvals?.admin_approved !== undefined) {
        existing.approvals.admin_approved = !!req.body.approvals.admin_approved;
      }
      if (req.body.scheduled_at) existing.scheduled_at = new Date(req.body.scheduled_at);
      // therapist_id removed
      if (req.body.doctor_id) existing.doctor_id = req.body.doctor_id;
      if (req.body.assigned_staff_id) existing.assigned_staff_id = req.body.assigned_staff_id;
      if (req.body.therapy_type) existing.therapy_type = req.body.therapy_type;
    }
    // Doctor can mark completed and add outcomes
    if (isDoctor(req.user)) {
      if (req.body.status === 'completed') existing.status = 'completed';
      if (req.body.outcomes) {
        existing.outcomes = { ...existing.outcomes, ...req.body.outcomes };
        if (!existing.outcomes.completed_at && existing.status === 'completed') {
          existing.outcomes.completed_at = new Date();
        }
      }
    }

    const saved = await existing.save();
    res.json({ session: saved });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await TherapySession.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    if (!isSuper(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    await TherapySession.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
