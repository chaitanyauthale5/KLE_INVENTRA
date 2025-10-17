import { TherapySession } from '../models/TherapySession.js';
import { Room } from '../models/Room.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';

function isSuper(user) { return user?.role === 'super_admin'; }
function isHospAdmin(user) {
  // Allow clinic_admin and office_executive to manage sessions
  return ['hospital_admin', 'admin', 'clinic_admin', 'office_executive'].includes(user?.role);
}
function isDoctor(user) { return user?.role === 'doctor'; }
// isTherapist removed - role no longer exists

function canScheduleRole(user) {
  // Only office_executive and super_admin can create/reschedule/delete sessions
  return user?.role === 'office_executive' || user?.role === 'super_admin';
}

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
    // Only office_executive and super_admin can create scheduling
    if (!canScheduleRole(req.user)) return res.status(403).json({ message: 'Forbidden' });

    const body = req.body || {};
    if (isSuper(req.user)) {
      if (!body.hospital_id) return res.status(400).json({ message: 'hospital_id required' });
    } else {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      body.hospital_id = req.user.hospital_id;
    }
    // Normalize therapy type (snake_case)
    if (body.therapy_type) {
      body.therapy_type = String(body.therapy_type).toLowerCase().trim().replace(/\s+/g, '_');
    }

    const duration = Math.max(10, Number(body.duration_min) || 60);
    const at = new Date(body.scheduled_at);
    if (isNaN(at.getTime())) return res.status(400).json({ message: 'scheduled_at invalid' });
    const hospital = await Hospital.findById(body.hospital_id);
    const policies = hospital?.policies || {};
    const biz = hospital?.business_hours || {};
    const cfg = (hospital?.therapy_config || {})[String(body.therapy_type || '').toLowerCase()] || {};
    const bufferMin = Math.max(0, Number(cfg.buffer_min) || 0);
    const start = new Date(at);
    const end = new Date(start.getTime() + (duration + bufferMin) * 60000);
    const dow = ['sun','mon','tue','wed','thu','fri','sat'][start.getDay()];
    const bh = biz && biz[dow];
    const toHM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const toMin = (s) => { const [h,m]=String(s||'').split(':'); return (Number(h)||0)*60+(Number(m)||0); };
    if (!bh) return res.status(409).json({ message: 'Clinic closed' });
    const stM = toMin(toHM(start));
    if (stM < toMin(bh.start) || stM >= toMin(bh.end)) return res.status(409).json({ message: 'Outside business hours' });
    if (cfg.allowed_hours && (stM < toMin(cfg.allowed_hours.start) || stM >= toMin(cfg.allowed_hours.end))) return res.status(409).json({ message: 'Therapy not allowed at this time' });
    const dateStr = start.toISOString().slice(0,10);
    if (Array.isArray(hospital?.blackout_dates) && hospital.blackout_dates.includes(dateStr)) return res.status(409).json({ message: 'Clinic holiday' });
    if (!isSuper(req.user)) {
      const leadH = Math.max(0, Number(policies.lead_time_hours) || 0);
      if (leadH > 0 && start.getTime() < Date.now() + leadH*3600000) return res.status(409).json({ message: `Must schedule at least ${leadH}h in advance` });
    }
    const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);
    if (hospital?.policies?.max_sessions_per_patient_per_day && body.patient_id) {
      const n = await TherapySession.countDocuments({ hospital_id: body.hospital_id, patient_id: body.patient_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } });
      if (n >= hospital.policies.max_sessions_per_patient_per_day) return res.status(409).json({ message: 'Daily patient session cap reached' });
    }
    if (hospital?.policies?.max_sessions_per_staff_per_day && body.assigned_staff_id) {
      const n = await TherapySession.countDocuments({ hospital_id: body.hospital_id, assigned_staff_id: body.assigned_staff_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } });
      if (n >= hospital.policies.max_sessions_per_staff_per_day) return res.status(409).json({ message: 'Daily staff session cap reached' });
    }
    if (hospital?.policies?.auto_assign_staff && !body.assigned_staff_id) {
      const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);
      const therapists = await User.find({ hospital_id: body.hospital_id, role: 'therapist' }).select('_id');
      if (therapists.length) {
        const loads = await Promise.all(therapists.map(async (t) => ({
          id: t._id,
          count: await TherapySession.countDocuments({ hospital_id: body.hospital_id, assigned_staff_id: t._id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } })
        })));
        const chosen = loads.sort((a,b)=>a.count-b.count)[0];
        if (chosen) body.assigned_staff_id = chosen.id;
      }
    }
    if (body.patient_id) {
      const sameDay = await TherapySession.find({ hospital_id: body.hospital_id, patient_id: body.patient_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } }).select('scheduled_at duration_min therapy_type');
      const overlap = sameDay.some(s => { const sStart=new Date(s.scheduled_at); const sEnd=new Date(sStart.getTime()+((Number(s.duration_min)||60))*60000); return sStart < end && start < sEnd; });
      if (overlap) return res.status(409).json({ message: 'Patient has overlapping session' });
    }
    if (body.assigned_staff_id) {
      const sameDay = await TherapySession.find({ hospital_id: body.hospital_id, assigned_staff_id: body.assigned_staff_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } }).select('scheduled_at duration_min');
      const overlap = sameDay.some(s => { const sStart=new Date(s.scheduled_at); const sEnd=new Date(sStart.getTime()+((Number(s.duration_min)||60))*60000); return sStart < end && start < sEnd; });
      if (overlap) return res.status(409).json({ message: 'Therapist has overlapping session' });
    }
    const roomFilter = { status: 'active', hospital_id: body.hospital_id };

    async function roomHasCapacity(roomId) {
      const r = await Room.findOne({ _id: roomId, ...roomFilter });
      if (!r) return { ok: false, reason: 'Room not found' };
      // therapy compatibility if configured
      const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_');
      if (Array.isArray(r.therapy_types) && r.therapy_types.length) {
        if (!r.therapy_types.map(norm).includes(norm(body.therapy_type))) {
          return { ok: false, reason: 'Room does not support therapy' };
        }
      }
      const capacity = Math.max(0, Number(r.capacity) || 0);
      if (capacity === 0) return { ok: false, reason: 'Room capacity is 0' };
      const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);
      const sessions = await TherapySession.find({
        hospital_id: body.hospital_id,
        room_id: r._id,
        status: { $ne: 'cancelled' },
        scheduled_at: { $gte: dayStart, $lte: dayEnd },
      }).select('scheduled_at duration_min');
      const overlaps = sessions.filter(s => {
        const sStart = new Date(s.scheduled_at);
        const sEnd = new Date(sStart.getTime() + (Number(s.duration_min) || 60) * 60000);
        return sStart < end && start < sEnd;
      }).length;
      return { ok: overlaps < capacity, capacity, overlaps, room: r };
    }

    // If client specified room, validate it
    if (body.room_id) {
      const cap = await roomHasCapacity(body.room_id);
      if (!cap.ok) return res.status(409).json({ message: cap.reason || 'Room full' });
    } else {
      // Auto-assign a room that supports therapy and has spot
      const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_');
      const wanted = norm(body.therapy_type || '');
      let rooms = await Room.find(roomFilter).sort({ name: 1 });
      if (wanted) {
        rooms = rooms.filter(r => !Array.isArray(r.therapy_types) || r.therapy_types.map(norm).includes(wanted));
      }
      let assigned = null;
      for (const r of rooms) {
        const cap = await roomHasCapacity(r._id);
        if (cap.ok) { assigned = r; break; }
      }
      if (!assigned) return res.status(409).json({ message: 'No room available for selected time/therapy' });
      body.room_id = assigned._id;
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
    // Admins who can schedule: allow admin_approved and reschedule (no clinic_admin)
    if (canScheduleRole(req.user)) {
      if (req.body?.approvals?.admin_approved !== undefined) {
        existing.approvals.admin_approved = !!req.body.approvals.admin_approved;
      }
      const candidateScheduledAt = req.body.scheduled_at ? new Date(req.body.scheduled_at) : existing.scheduled_at;
      const candidateDuration = Math.max(10, Number(req.body.duration_min || existing.duration_min) || 60);
      if (req.body.scheduled_at && isNaN(candidateScheduledAt.getTime())) {
        return res.status(400).json({ message: 'scheduled_at invalid' });
      }
      const hospital = await Hospital.findById(existing.hospital_id);
      const policies = hospital?.policies || {};
      const biz = hospital?.business_hours || {};
      const cfg = (hospital?.therapy_config || {})[String((req.body.therapy_type || existing.therapy_type) || '').toLowerCase()] || {};
      const bufferMin = Math.max(0, Number(cfg.buffer_min) || 0);
      if ((req.body.scheduled_at || req.body.duration_min || req.body.room_id) && (existing.status === 'in_progress' || existing.status === 'completed')) {
        return res.status(409).json({ message: 'Cannot reschedule this session' });
      }
      if (!isSuper(req.user) && req.body.scheduled_at) {
        const leadH = Math.max(0, Number(policies.lead_time_hours) || 0);
        if (leadH > 0 && candidateScheduledAt.getTime() < Date.now() + leadH*3600000) return res.status(409).json({ message: `Changes must be ${leadH}h in advance` });
      }
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][candidateScheduledAt.getDay()];
      const bh = biz && biz[dow];
      const toHM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const toMin = (s) => { const [h,m]=String(s||'').split(':'); return (Number(h)||0)*60+(Number(m)||0); };
      if (req.body.scheduled_at) {
        if (!bh) return res.status(409).json({ message: 'Clinic closed' });
        const stM = toMin(toHM(candidateScheduledAt));
        if (stM < toMin(bh.start) || stM >= toMin(bh.end)) return res.status(409).json({ message: 'Outside business hours' });
        if (cfg.allowed_hours && (stM < toMin(cfg.allowed_hours.start) || stM >= toMin(cfg.allowed_hours.end))) return res.status(409).json({ message: 'Therapy not allowed at this time' });
        const dateStr = candidateScheduledAt.toISOString().slice(0,10);
        if (Array.isArray(hospital?.blackout_dates) && hospital.blackout_dates.includes(dateStr)) return res.status(409).json({ message: 'Clinic holiday' });
      }
      if (req.body.doctor_id) existing.doctor_id = req.body.doctor_id;
      if (req.body.assigned_staff_id) existing.assigned_staff_id = req.body.assigned_staff_id;
      if (req.body.therapy_type) existing.therapy_type = String(req.body.therapy_type).toLowerCase().trim().replace(/\s+/g, '_');
      // Allow status update by office_executive/super_admin
      if (typeof req.body.status === 'string') {
        const allowed = ['scheduled','awaiting_confirmation','in_progress','completed','cancelled','no_show'];
        if (allowed.includes(req.body.status)) {
          // Lead-time guard for cancellation
          if (req.body.status === 'cancelled' && !isSuper(req.user)) {
            const hospital = await Hospital.findById(existing.hospital_id);
            const leadH = Math.max(0, Number(hospital?.policies?.lead_time_hours) || 0);
            if (leadH > 0 && existing.scheduled_at.getTime() < Date.now() + leadH*3600000) {
              return res.status(409).json({ message: `Cannot cancel within ${leadH}h of start` });
            }
          }
          existing.status = req.body.status;
          if (existing.status === 'in_progress') {
            existing.outcomes = existing.outcomes || {};
            if (!existing.outcomes.started_at) existing.outcomes.started_at = new Date();
          }
          if (existing.status === 'completed') {
            existing.outcomes = existing.outcomes || {};
            if (!existing.outcomes.completed_at) existing.outcomes.completed_at = new Date();
          }
        }
      }
      // Determine target room (new or existing) and validate capacity if we reschedule or change room
      const targetRoomId = req.body.room_id || existing.room_id;
      if (targetRoomId && (req.body.room_id || req.body.scheduled_at || req.body.duration_min)) {
        const start = new Date(candidateScheduledAt);
        const end = new Date(start.getTime() + (candidateDuration + bufferMin) * 60000);
        const r = await Room.findOne({ _id: targetRoomId, hospital_id: existing.hospital_id, status: 'active' });
        if (!r) return res.status(404).json({ message: 'Room not found' });
        const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_');
        if (Array.isArray(r.therapy_types) && r.therapy_types.length) {
          if (!r.therapy_types.map(norm).includes(norm(existing.therapy_type))) {
            return res.status(409).json({ message: 'Room does not support therapy' });
          }
        }
        const capacity = Math.max(0, Number(r.capacity) || 0);
        const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);
        const sessions = await TherapySession.find({
          hospital_id: existing.hospital_id,
          room_id: r._id,
          _id: { $ne: existing._id },
          status: { $ne: 'cancelled' },
          scheduled_at: { $gte: dayStart, $lte: dayEnd },
        }).select('scheduled_at duration_min');
        const overlaps = sessions.filter(s => {
          const sStart = new Date(s.scheduled_at);
          const sEnd = new Date(sStart.getTime() + (Number(s.duration_min) || 60) * 60000);
          return sStart < end && start < sEnd;
        }).length;
        if (overlaps >= capacity) return res.status(409).json({ message: 'Room full for the selected time' });
        if (req.body.room_id) existing.room_id = req.body.room_id;
      }
      {
        const start = new Date(candidateScheduledAt);
        const end = new Date(start.getTime() + (candidateDuration + bufferMin) * 60000);
        const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);
        if (hospital?.policies?.max_sessions_per_patient_per_day && existing.patient_id) {
          const n = await TherapySession.countDocuments({ hospital_id: existing.hospital_id, _id: { $ne: existing._id }, patient_id: existing.patient_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } });
          if (n >= hospital.policies.max_sessions_per_patient_per_day) return res.status(409).json({ message: 'Daily patient session cap reached' });
        }
        if (hospital?.policies?.max_sessions_per_staff_per_day && (req.body.assigned_staff_id || existing.assigned_staff_id)) {
          const staffId = req.body.assigned_staff_id || existing.assigned_staff_id;
          if (staffId) {
            const n = await TherapySession.countDocuments({ hospital_id: existing.hospital_id, _id: { $ne: existing._id }, assigned_staff_id: staffId, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } });
            if (n >= hospital.policies.max_sessions_per_staff_per_day) return res.status(409).json({ message: 'Daily staff session cap reached' });
          }
        }
        const sameDayPatient = await TherapySession.find({ hospital_id: existing.hospital_id, _id: { $ne: existing._id }, patient_id: existing.patient_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } }).select('scheduled_at duration_min');
        const overlapP = sameDayPatient.some(s => { const sStart=new Date(s.scheduled_at); const sEnd=new Date(sStart.getTime()+((Number(s.duration_min)||60))*60000); return sStart < end && start < sEnd; });
        if (overlapP) return res.status(409).json({ message: 'Patient has overlapping session' });
        const staffId = req.body.assigned_staff_id || existing.assigned_staff_id;
        if (staffId) {
          const sameDayStaff = await TherapySession.find({ hospital_id: existing.hospital_id, _id: { $ne: existing._id }, assigned_staff_id: staffId, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } }).select('scheduled_at duration_min');
          const overlapS = sameDayStaff.some(s => { const sStart=new Date(s.scheduled_at); const sEnd=new Date(sStart.getTime()+((Number(s.duration_min)||60))*60000); return sStart < end && start < sEnd; });
          if (overlapS) return res.status(409).json({ message: 'Therapist has overlapping session' });
        }
      }
      if (req.body.scheduled_at) existing.scheduled_at = candidateScheduledAt;
      if (req.body.duration_min) existing.duration_min = candidateDuration;
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
    if (!canScheduleRole(req.user)) return res.status(403).json({ message: 'Forbidden' });
    if (!isSuper(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const hospital = await Hospital.findById(existing.hospital_id);
      const leadH = Math.max(0, Number(hospital?.policies?.lead_time_hours) || 0);
      if (leadH > 0 && existing.scheduled_at.getTime() < Date.now() + leadH*3600000) {
        return res.status(409).json({ message: `Cannot delete within ${leadH}h of start` });
      }
    }
    await TherapySession.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
