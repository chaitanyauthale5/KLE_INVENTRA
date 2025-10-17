import RescheduleRequest from '../models/RescheduleRequest.js';
import { Patient as PatientModel } from '../models/Patient.js';
import { TherapySession } from '../models/TherapySession.js';
import { Hospital } from '../models/Hospital.js';
import { Room } from '../models/Room.js';
import { Notification } from '../models/Notification.js';

function canManage(user) {
  return !!user && (user.role === 'office_executive' || user.role === 'super_admin');
}

export async function cleanupStaleRequests(req, res) {
  try {
    const user = req.user || {};
    if (!canManage(user)) return res.status(403).json({ message: 'Not allowed' });
    if (!user.hospital_id) return res.status(400).json({ message: 'Missing clinic scope' });
    const hospital = await Hospital.findById(user.hospital_id);
    const hours = Math.max(1, Number(hospital?.policies?.stale_request_hours || 48));
    const since = new Date(Date.now() - hours * 3600000);
    const result = await RescheduleRequest.updateMany({ hospital_id: user.hospital_id, status: 'pending', createdAt: { $lt: since } }, { $set: { status: 'cancelled', processed_by: user._id || user.id, processed_at: new Date() } });
    return res.json({ cancelled: result.modifiedCount || 0 });
  } catch (e) {
    console.error('cleanupStaleRequests error', e);
    return res.status(500).json({ message: 'Failed to cleanup requests' });
  }
}

async function getPatientByUserId(userId) {
  if (!userId) return null;
  return await PatientModel.findOne({ user_id: userId });
}

export async function createRequest(req, res) {
  try {
    const user = req.user || {};
    const { session_id, requested_date, requested_time, reason } = req.body || {};
    if (!session_id) return res.status(400).json({ message: 'session_id required' });

    const session = await TherapySession.findById(session_id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Patients/guardians can request only for their own session
    if (user.role === 'patient' || user.role === 'guardian') {
      const patient = await getPatientByUserId(user.id || user._id);
      if (!patient || String(patient._id) !== String(session.patient_id)) {
        return res.status(403).json({ message: 'Not allowed' });
      }
    } else if (!canManage(user)) {
      // Other roles not allowed to create for now
      return res.status(403).json({ message: 'Not allowed' });
    }

    const existing = await RescheduleRequest.findOne({ session_id, status: 'pending' });
    if (existing) return res.status(409).json({ message: 'A pending request already exists for this session' });

    // Rate limit per user per week
    const hospital = await Hospital.findById(session.hospital_id);
    const maxPerWeek = Math.max(0, Number(hospital?.policies?.max_reschedule_requests_per_week) || 0);
    if (maxPerWeek > 0) {
      const since = new Date(Date.now() - 7*24*3600*1000);
      const count = await RescheduleRequest.countDocuments({ requested_by: user._id || user.id, createdAt: { $gte: since } });
      if (count >= maxPerWeek) return res.status(429).json({ message: 'Too many reschedule requests this week' });
    }

    // Validate preferred time if provided (business hours / blackout / any room capacity)
    if (requested_date && requested_time) {
      const toMin = (s) => { const [h,m] = String(s||'').split(':'); return (Number(h)||0)*60+(Number(m)||0); };
      const start = new Date(`${requested_date}T${requested_time}:00`);
      if (isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid requested date/time' });
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][start.getDay()];
      const bh = hospital?.business_hours?.[dow];
      if (!bh) return res.status(409).json({ message: 'Clinic closed on requested day' });
      const stM = toMin(`${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`);
      if (stM < toMin(bh.start) || stM >= toMin(bh.end)) return res.status(409).json({ message: 'Requested time outside business hours' });
      const cfg = (hospital?.therapy_config || {})[String(session.therapy_type || '').toLowerCase()] || {};
      if (cfg.allowed_hours && (stM < toMin(cfg.allowed_hours.start) || stM >= toMin(cfg.allowed_hours.end))) return res.status(409).json({ message: 'Therapy not allowed at requested time' });
      const dateStr = requested_date;
      if (Array.isArray(hospital?.blackout_dates) && hospital.blackout_dates.includes(dateStr)) return res.status(409).json({ message: 'Clinic holiday on requested date' });
      // Rough room capacity check similar to availability API
      const duration = Math.max(10, Number(session.duration_min) || 60);
      const bufferMin = Math.max(0, Number(cfg.buffer_min) || 0);
      const end = new Date(start.getTime() + (duration + bufferMin) * 60000);
      const roomFilter = { status: 'active', hospital_id: session.hospital_id };
      const rooms = await Room.find(roomFilter).select('_id');
      const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);
      const overlapsByRoom = await TherapySession.aggregate([
        { $match: { hospital_id: session.hospital_id, status: { $ne: 'cancelled' }, scheduled_at: { $gte: dayStart, $lte: dayEnd } } },
        { $project: { room_id: 1, scheduled_at: 1, duration_min: 1 } }
      ]);
      const hasCapacity = rooms.some(r => {
        const current = overlapsByRoom.filter(s => String(s.room_id) === String(r._id));
        const overlapping = current.filter(s => {
          const sStart = new Date(s.scheduled_at);
          const sEnd = new Date(sStart.getTime() + (Number(s.duration_min)||60)*60000);
          return sStart < end && start < sEnd;
        }).length;
        // If any room has capacity > overlaps
        // Note: need actual capacity; fallback to 1 when unknown
        return overlapping < 1; // conservative fallback
      });
      if (!hasCapacity && rooms.length > 0) return res.status(409).json({ message: 'No room capacity near requested time' });
    }

    const doc = await RescheduleRequest.create({
      hospital_id: session.hospital_id,
      session_id: session._id,
      patient_id: session.patient_id,
      requested_by: user._id || user.id,
      requested_date: requested_date || null,
      requested_time: requested_time || null,
      reason: reason || '',
      status: 'pending'
    });
    // Notify office executives (hospital-wide notice)
    try { await Notification.create({ hospital_id: session.hospital_id, sender_id: user._id || user.id, title: 'Reschedule Request', message: `Patient requested reschedule for session ${String(session._id).slice(-6)}${reason?': '+reason:''}` }); } catch {}
    return res.json({ request: doc });
  } catch (e) {
    console.error('createRequest error', e);
    return res.status(500).json({ message: 'Failed to create request' });
  }
}

export async function listRequests(req, res) {
  try {
    const user = req.user || {};
    const { status, limit } = req.query || {};
    let q = {};
    if (canManage(user)) {
      if (!user.hospital_id) return res.json({ requests: [] });
      q.hospital_id = user.hospital_id;
      if (status) q.status = status;
    } else if (user.role === 'patient' || user.role === 'guardian') {
      const patient = await getPatientByUserId(user.id || user._id);
      if (!patient) return res.json({ requests: [] });
      q.$or = [ { requested_by: user._id || user.id }, { patient_id: patient._id } ];
      if (status) q.status = status;
    } else {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const lim = Math.min(200, Math.max(1, Number(limit) || 100));
    const items = await RescheduleRequest.find(q).sort({ createdAt: -1 }).limit(lim);
    return res.json({ requests: items });
  } catch (e) {
    console.error('listRequests error', e);
    return res.status(500).json({ message: 'Failed to list requests' });
  }
}

export async function actOnRequest(req, res) {
  try {
    const user = req.user || {};
    if (!canManage(user)) return res.status(403).json({ message: 'Not allowed' });
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['approved','rejected','cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const doc = await RescheduleRequest.findById(id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });
    if (String(doc.hospital_id) !== String(user.hospital_id)) return res.status(403).json({ message: 'Wrong clinic' });

    doc.status = status;
    doc.processed_by = user._id || user.id;
    doc.processed_at = new Date();
    await doc.save();
    // Notify requester
    try { await Notification.create({ hospital_id: doc.hospital_id, user_id: doc.requested_by, sender_id: user._id || user.id, title: 'Reschedule Request Update', message: `Your reschedule request was ${status}.` }); } catch {}

    return res.json({ request: doc });
  } catch (e) {
    console.error('actOnRequest error', e);
    return res.status(500).json({ message: 'Failed to update request' });
  }
}
