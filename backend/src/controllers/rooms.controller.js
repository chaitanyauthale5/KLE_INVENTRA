import { Room } from '../models/Room.js';

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
