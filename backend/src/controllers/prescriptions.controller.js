import { Prescription } from '../models/Prescription.js';
import { Patient } from '../models/Patient.js';
import { getHospitalScope } from '../middleware/hospitalScope.js';

export async function listPrescriptions(req, res) {
  try {
    const scope = getHospitalScope(req);
    const { patient_id } = req.query;
    const filter = { ...scope };
    if (patient_id) filter.patient_id = patient_id;
    const items = await Prescription.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ prescriptions: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list prescriptions', error: String(e.message || e) });
  }
}

export async function createPrescription(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const allowed = ['doctor','clinic_admin','office_executive','super_admin'];
    if (!allowed.includes(String(user.role))) return res.status(403).json({ message: 'Forbidden' });
    if (!user.hospital_id) return res.status(400).json({ message: 'hospital_id missing' });
    const body = req.body || {};
    const doc = await Prescription.create({
      hospital_id: user.hospital_id,
      patient_id: body.patient_id,
      patient_name: body.patient_name,
      doctor_id: user._id,
      doctor_name: user.full_name || user.name,
      date: body.date ? new Date(body.date) : new Date(),
      complaints: body.complaints || '',
      advice: body.advice || '',
      meds: Array.isArray(body.meds) ? body.meds : [],
      therapies: Array.isArray(body.therapies) ? body.therapies : [],
    });
    res.status(201).json({ prescription: doc });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create prescription', error: String(e.message || e) });
  }
}

export async function deletePrescription(req, res) {
  try {
    const { id } = req.params;
    const scope = getHospitalScope(req);
    const found = await Prescription.findOne({ _id: id, ...scope });
    if (!found) return res.status(404).json({ message: 'Not found' });
    await Prescription.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete prescription', error: String(e.message || e) });
  }
}

export async function listMyPrescriptions(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const pats = await Patient.find({ user_id: user._id }).select('_id').lean();
    const ids = pats.map(p => p._id);
    if (ids.length === 0) return res.json({ prescriptions: [] });
    const items = await Prescription.find({ patient_id: { $in: ids } }).sort({ createdAt: -1 }).lean();
    res.json({ prescriptions: items });
  } catch (e) {
    res.status(500).json({ message: 'Failed to list prescriptions', error: String(e.message || e) });
  }
}
