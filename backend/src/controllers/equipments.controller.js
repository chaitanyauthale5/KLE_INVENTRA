import { Equipment } from '../models/Equipment.js';

function isSuper(user) { return user?.role === 'super_admin'; }
function isHospAdmin(user) { return ['hospital_admin','admin','clinic_admin'].includes(user?.role); }

export const listEquipment = async (req, res) => {
  try {
    const filter = {};
    if (!isSuper(req.user)) {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      filter.hospital_id = req.user.hospital_id;
    } else if (req.query.hospital_id) {
      filter.hospital_id = req.query.hospital_id;
    }
    const equipment = await Equipment.find(filter).sort({ name: 1 });
    res.json({ equipment });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createEquipment = async (req, res) => {
  try {
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const body = req.body || {};
    if (isSuper(req.user)) {
      if (!body.hospital_id) return res.status(400).json({ message: 'hospital_id required' });
    } else {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      body.hospital_id = req.user.hospital_id;
    }
    const eq = await Equipment.create(body);
    res.status(201).json({ equipment: eq });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updateEquipment = async (req, res) => {
  try {
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const eq = await Equipment.findById(id);
    if (!eq) return res.status(404).json({ message: 'Not found' });
    if (!isSuper(req.user) && String(eq.hospital_id) !== String(req.user.hospital_id)) return res.status(403).json({ message: 'Forbidden' });
    const updates = req.body || {};
    if (updates.name !== undefined) eq.name = updates.name;
    if (updates.quantity !== undefined) eq.quantity = updates.quantity;
    if (updates.status !== undefined) eq.status = updates.status;
    if (updates.notes !== undefined) eq.notes = updates.notes;
    const saved = await eq.save();
    res.json({ equipment: saved });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deleteEquipment = async (req, res) => {
  try {
    if (!(isSuper(req.user) || isHospAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const eq = await Equipment.findById(id);
    if (!eq) return res.status(404).json({ message: 'Not found' });
    if (!isSuper(req.user) && String(eq.hospital_id) !== String(req.user.hospital_id)) return res.status(403).json({ message: 'Forbidden' });
    await Equipment.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
