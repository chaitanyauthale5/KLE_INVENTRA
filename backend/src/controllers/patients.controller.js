import { Patient } from '../models/Patient.js';
import { withUser } from '../middleware/hospitalScope.js';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export const listPatients = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id) return res.json({ patients: [] });
      filter.hospital_id = req.user.hospital_id;
    }
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json({ patients });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

// List patients with aggregated appointment records (count and last_appointment)
export const listPatientsWithRecords = async (req, res) => {
  try {
    const isSuper = req.user.role === 'super_admin';
    const hospitalScope = isSuper ? (req.query.hospital_id || undefined) : req.user.hospital_id;
    const matchPatients = {};
    if (!isSuper) {
      if (!hospitalScope) return res.json({ patients: [] });
      matchPatients.hospital_id = hospitalScope;
    } else if (hospitalScope) {
      matchPatients.hospital_id = hospitalScope;
    }

    // Fetch base patients in scope
    const patients = await Patient.find(matchPatients).sort({ createdAt: -1 }).lean();
    const byUserId = patients.reduce((acc, p) => { if (p.user_id) acc[String(p.user_id)] = p; return acc; }, {});
    const userIds = Object.keys(byUserId);

    // Aggregate appointments for these users
    const apptMatch = {};
    if (userIds.length > 0) apptMatch.patient_id = { $in: userIds.map(id => new mongoose.Types.ObjectId(String(id))) };
    if (hospitalScope) apptMatch.hospital_id = new mongoose.Types.ObjectId(String(hospitalScope));

    const records = userIds.length > 0
      ? await Appointment.aggregate([
          { $match: apptMatch },
          { $group: { _id: "$patient_id", appointment_count: { $sum: 1 }, last_appointment: { $max: "$start_time" } } }
        ])
      : [];

    const byPatientId = records.reduce((acc, r) => { acc[String(r._id)] = r; return acc; }, {});

    const result = patients.map(p => {
      const r = byPatientId[String(p.user_id)] || { appointment_count: 0, last_appointment: null };
      return { patient: p, appointment_count: r.appointment_count, last_appointment: r.last_appointment };
    });

    res.json({ patients: result });
  } catch (e) {
    console.error('listPatientsWithRecords error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const p = await Patient.findById(id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(p.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    res.json({ patient: p });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPatient = async (req, res) => {
  try {
    const body = req.body || {};
    if (req.user.role === 'super_admin') {
      // allow specifying hospital_id
      if (!body.hospital_id) return res.status(400).json({ message: 'hospital_id required' });
    } else {
      if (!req.user.hospital_id) return res.status(403).json({ message: 'Forbidden' });
      body.hospital_id = req.user.hospital_id;
    }
    // Handle doctor assignment by ObjectId if provided
    if (body.doctor_id) {
      try {
        const doctor = await User.findById(body.doctor_id);
        if (!doctor) return res.status(400).json({ message: 'Invalid doctor_id' });
        if (doctor.role !== 'doctor') return res.status(400).json({ message: 'doctor_id must refer to a doctor' });
        if (String(doctor.hospital_id) !== String(body.hospital_id)) return res.status(400).json({ message: 'Doctor must belong to the same hospital' });
        body.assigned_doctor_id = doctor._id;
        body.metadata = body.metadata || {};
        // Keep a human-friendly name as well
        const docName = doctor.full_name || doctor.name;
        if (docName) body.metadata.assigned_doctor = docName;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid doctor_id' });
      }
    }
    const created = await Patient.create(body);
    res.status(201).json({ patient: created });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Patient.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      // Non-super admins cannot change hospital
      if (req.body.hospital_id && String(req.body.hospital_id) !== String(existing.hospital_id)) {
        return res.status(400).json({ message: 'Cannot change hospital_id' });
      }
    }
    const patch = { ...req.body };
    // Handle doctor assignment on update
    if (Object.prototype.hasOwnProperty.call(patch, 'doctor_id')) {
      if (!patch.doctor_id) {
        // Clear assignment if empty string/null
        patch.assigned_doctor_id = null;
        patch.metadata = patch.metadata || {};
        patch.metadata.assigned_doctor = undefined;
      } else {
        const doctor = await User.findById(patch.doctor_id);
        if (!doctor) return res.status(400).json({ message: 'Invalid doctor_id' });
        if (doctor.role !== 'doctor') return res.status(400).json({ message: 'doctor_id must refer to a doctor' });
        if (String(doctor.hospital_id) !== String(existing.hospital_id)) return res.status(400).json({ message: 'Doctor must belong to the same hospital' });
        patch.assigned_doctor_id = doctor._id;
        patch.metadata = patch.metadata || {};
        const docName = doctor.full_name || doctor.name;
        if (docName) patch.metadata.assigned_doctor = docName;
      }
      // Do not persist doctor_id field directly
      delete patch.doctor_id;
    }
    const updated = await Patient.findByIdAndUpdate(id, patch, { new: true });
    res.json({ patient: updated });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Patient.findById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'super_admin') {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(existing.hospital_id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    await Patient.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyPatient = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const patient = await Patient.findOne({ user_id: userId }).sort({ createdAt: -1 });
    if (!patient) return res.json({ patient: null });
    res.json({ patient });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update Patient records for all users who have taken appointments
export const syncPatientsFromAppointments = async (req, res) => {
  try {
    const isSuper = req.user.role === 'super_admin';
    const hospitalScope = isSuper ? (req.query.hospital_id || undefined) : req.user.hospital_id;
    if (!isSuper && !hospitalScope) return res.status(403).json({ message: 'Forbidden' });

    const apptQuery = hospitalScope ? { hospital_id: hospitalScope } : {};
    const appts = await Appointment.find(apptQuery).sort({ start_time: 1 });
    let created = 0, updated = 0;

    for (const appt of appts) {
      const user = await User.findById(appt.patient_id).lean();
      if (!user) continue;

      let patient = await Patient.findOne({ user_id: appt.patient_id, hospital_id: appt.hospital_id });
      if (!patient) {
        await Patient.create({
          hospital_id: appt.hospital_id,
          user_id: appt.patient_id,
          name: user.full_name || user.name || 'Patient',
          email: user.email || undefined,
          phone: user.phone || undefined,
          metadata: { assigned_doctor: undefined },
        });
        created += 1;
      } else {
        let hasChange = false;
        if (!patient.hospital_id) { patient.hospital_id = appt.hospital_id; hasChange = true; }
        if (hasChange) { await patient.save(); updated += 1; }
      }
    }

    res.json({ message: 'Sync complete', created, updated, processed: appts.length });
  } catch (e) {
    console.error('syncPatientsFromAppointments error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
