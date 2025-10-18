import { Prescription } from '../models/Prescription.js';
import { Patient } from '../models/Patient.js';
import { getHospitalScope } from '../middleware/hospitalScope.js';
import mongoose from 'mongoose';

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
    if (!body.patient_id) return res.status(400).json({ message: 'patient_id is required' });
    if (!mongoose.isValidObjectId(body.patient_id)) return res.status(400).json({ message: 'Invalid patient_id' });
    // Ensure patient exists within hospital scope
    const pat = await Patient.findOne({ _id: body.patient_id, hospital_id: user.hospital_id }).select('_id name full_name').lean();
    if (!pat) return res.status(404).json({ message: 'Patient not found for this clinic' });

    // Validate dates
    const prescDate = body.date ? new Date(body.date) : new Date();
    if (isNaN(prescDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

    let followUpDate;
    if (body.clinical?.follow_up) {
      const fu = new Date(body.clinical.follow_up);
      if (!isNaN(fu.getTime())) followUpDate = fu; // only set if valid
    }

    // Normalize therapies with structured plan fields
    const therapies = Array.isArray(body.therapies) ? body.therapies.map((t)=>{
      const out = {
        name: typeof t.name === 'string' ? t.name : '',
        duration: typeof t.duration === 'string' ? t.duration : '',
        frequency: typeof t.frequency === 'string' ? t.frequency : '',
        type: typeof t.type === 'string' ? t.type : undefined,
      };
      const intOr = (v, d=0) => {
        const n = Number(v); return Number.isFinite(n) ? n : d;
      };
      if (t.plan_sessions != null) out.plan_sessions = intOr(t.plan_sessions, 0);
      if (t.plan_interval_days != null) out.plan_interval_days = intOr(t.plan_interval_days, 1);
      if (t.plan_duration_min != null) out.plan_duration_min = intOr(t.plan_duration_min, undefined);
      if (t.plan_start_date) {
        const d = new Date(t.plan_start_date);
        if (!isNaN(d.getTime())) out.plan_start_date = d;
      }
      if (t.plan_preferred_time) out.plan_preferred_time = String(t.plan_preferred_time);
      if (Array.isArray(t.plan_preferred_days)) out.plan_preferred_days = t.plan_preferred_days.map(String);
      if (t.plan_assigned_staff_id && mongoose.isValidObjectId(String(t.plan_assigned_staff_id))) out.plan_assigned_staff_id = t.plan_assigned_staff_id;
      if (t.plan_notes) out.plan_notes = String(t.plan_notes);
      return out;
    }) : [];

    const doc = await Prescription.create({
      hospital_id: user.hospital_id,
      patient_id: body.patient_id,
      patient_name: body.patient_name || pat?.full_name || pat?.name,
      doctor_id: user._id,
      doctor_name: user.full_name || user.name,
      date: prescDate,
      complaints: body.complaints || '',
      advice: body.advice || '',
      meds: Array.isArray(body.meds) ? body.meds : [],
      therapies,
      pk_plan: body.pk_plan ? {
        procedures: body.pk_plan.procedures || '',
        oils: body.pk_plan.oils || '',
        basti: body.pk_plan.basti || '',
        diet: body.pk_plan.diet || '',
      } : undefined,
      clinical: body.clinical ? {
        vitals: {
          bp: body.clinical?.vitals?.bp || '',
          pulse: body.clinical?.vitals?.pulse || '',
          temp: body.clinical?.vitals?.temp || '',
          spo2: body.clinical?.vitals?.spo2 || '',
        },
        diagnosis: body.clinical?.diagnosis || '',
        subjective: body.clinical?.subjective || '',
        objective: body.clinical?.objective || '',
        assessment: body.clinical?.assessment || '',
        plan: body.clinical?.plan || '',
        follow_up: followUpDate,
        consent: !!body.clinical?.consent,
      } : undefined,
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
