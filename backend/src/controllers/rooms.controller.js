import { Room } from '../models/Room.js';
import { TherapySession } from '../models/TherapySession.js';
import { Hospital } from '../models/Hospital.js';

function isSuper(user) { return user?.role === 'super_admin'; }
function isHospAdmin(user) { return ['hospital_admin','admin','clinic_admin'].includes(user?.role); }

export const listRooms = async (req, res) => {
  try {
    const filter = {};
    if (!isSuper(req.user)) {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      filter.hospital_id = req.user.hospital_id;
    } else if (req.query.hospital_id) {
      filter.hospital_id = req.query.hospital_id;
    }
    const rooms = await Room.find(filter).sort({ name: 1 });
    res.json({ rooms });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const availability = async (req, res) => {
  try {
    const { therapy_type, date, time, duration_min, hospital_id: qHosp } = req.query || {};
    if (!date || !time) return res.status(400).json({ message: 'date and time are required' });
    const duration = Math.max(10, Number(duration_min) || 60);
    const start = new Date(`${date}T${time}:00Z`.replace('Z', ''));
    // Interpret in local timezone; if server runs UTC, it is still consistent for day-bound query
    const newStart = new Date(start);

    const roomFilter = { status: 'active' };
    if (!isSuper(req.user)) {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      roomFilter.hospital_id = req.user.hospital_id;
    } else if (qHosp) {
      roomFilter.hospital_id = qHosp;
    }

    const hospital = roomFilter.hospital_id ? await Hospital.findById(roomFilter.hospital_id) : null;
    const cfg = (hospital?.therapy_config || {})[String(therapy_type || '').toLowerCase()] || {};
    const bufferMin = Math.max(0, Number(cfg.buffer_min) || 0);
    const newEnd = new Date(newStart.getTime() + (duration + bufferMin) * 60000);
    // Business hours and blackout
    if (hospital) {
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][newStart.getDay()];
      const bh = hospital.business_hours?.[dow];
      const toHM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const toMin = (s) => { const [h,m]=String(s||'').split(':'); return (Number(h)||0)*60+(Number(m)||0); };
      if (!bh) return res.json({ rooms: [] });
      const stM = toMin(toHM(newStart));
      if (stM < toMin(bh.start) || stM >= toMin(bh.end)) return res.json({ rooms: [] });
      if (cfg.allowed_hours && (stM < toMin(cfg.allowed_hours.start) || stM >= toMin(cfg.allowed_hours.end))) return res.json({ rooms: [] });
      const dateStr = String(date);
      if (Array.isArray(hospital.blackout_dates) && hospital.blackout_dates.includes(dateStr)) return res.json({ rooms: [] });
    }

    let rooms = await Room.find(roomFilter).sort({ name: 1 });
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_');
    const wanted = norm(therapy_type || '');
    if (wanted) {
      rooms = rooms.filter(r => !Array.isArray(r.therapy_types) || r.therapy_types.map(norm).includes(wanted));
    }

    // Fetch sessions for the day to compute overlaps
    const dayStart = new Date(newStart);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(newStart);
    dayEnd.setHours(23,59,59,999);

    const sessions = await TherapySession.find({
      ...(roomFilter.hospital_id ? { hospital_id: roomFilter.hospital_id } : {}),
      status: { $ne: 'cancelled' },
      scheduled_at: { $gte: dayStart, $lte: dayEnd },
    }).select('room_id scheduled_at duration_min');

    const result = rooms.map(r => {
      const current = sessions.filter(s => String(s.room_id) === String(r._id));
      const overlaps = current.filter(s => {
        const sStart = new Date(s.scheduled_at);
        const sEnd = new Date(sStart.getTime() + (Number(s.duration_min) || 60) * 60000);
        return sStart < newEnd && newStart < sEnd;
      }).length;
      const capacity = Math.max(0, Number(r.capacity) || 0);
      const available_spots = Math.max(0, capacity - overlaps);
      return { id: r._id, name: r.name, capacity, available_spots };
    });

    res.json({ rooms: result });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createRoom = async (req, res) => {
  try {
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const body = req.body || {};
    if (isSuper(req.user)) {
      if (!body.hospital_id) return res.status(400).json({ message: 'hospital_id required' });
    } else {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      body.hospital_id = req.user.hospital_id;
    }
    const r = await Room.create(body);
    res.status(201).json({ room: r });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updateRoom = async (req, res) => {
  try {
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const r = await Room.findById(id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (!isSuper(req.user) && String(r.hospital_id) !== String(req.user.hospital_id)) return res.status(403).json({ message: 'Forbidden' });
    const updates = req.body || {};
    if (updates.name !== undefined) r.name = updates.name;
    if (updates.capacity !== undefined) r.capacity = updates.capacity;
    if (updates.therapy_types !== undefined) r.therapy_types = updates.therapy_types;
    if (updates.status !== undefined) r.status = updates.status;
    if (updates.notes !== undefined) r.notes = updates.notes;
    const saved = await r.save();
    res.json({ room: saved });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const r = await Room.findById(id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (!isSuper(req.user) && String(r.hospital_id) !== String(req.user.hospital_id)) return res.status(403).json({ message: 'Forbidden' });
    await Room.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
