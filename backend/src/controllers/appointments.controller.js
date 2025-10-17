import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';
import { Patient } from '../models/Patient.js';

const isAdminRole = (user) => ['super_admin','admin','hospital_admin'].includes(user?.role);

export const createAppointment = async (req, res) => {
  try {
    // Use req.user if provided by an upstream middleware; otherwise resolve from req.userId
    const user = req.user || (req.userId ? await User.findById(req.userId) : null);
    const {
      hospital_id,
      staff_id,
      type, // 'doctor'
      start_time,
      end_time,
      notes,
      patient_user_id,
      patient_record_id,
    } = req.body || {};

    if (!hospital_id || !staff_id || !type || !start_time || !end_time) {
      return res.status(400).json({ message: 'hospital_id, staff_id, type, start_time, end_time are required' });
    }

    const hospital = await Hospital.findById(hospital_id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const staff = await User.findById(staff_id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    if (!['doctor'].includes(staff.role)) {
      return res.status(400).json({ message: 'Selected user is not a doctor' });
    }

    // Resolve patient id: allow staff to book on behalf of a patient
    let patient_id = user?._id || req.userId;
    if (patient_user_id) {
      // When staff books for a patient, trust provided id
      patient_id = patient_user_id;
    } else if (patient_record_id) {
      // Resolve user_id from patient record
      try {
        const pRec = await Patient.findById(patient_record_id);
        if (pRec?.user_id) patient_id = pRec.user_id;
        else if (pRec?._id) patient_id = pRec._id; // fallback to patient record id
      } catch {}
    }
    if (!patient_id) return res.status(401).json({ message: 'Unauthorized' });

    // Scope: hospital must match staff
    if (String(staff.hospital_id) !== String(hospital._id)) {
      return res.status(400).json({ message: 'Staff does not belong to this hospital' });
    }

    const appt = await Appointment.create({
      hospital_id: hospital._id,
      patient_id,
      staff_id: staff._id,
      type: 'doctor',
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      status: 'pending',
      notes: notes || undefined,
    });

    // Ensure there is a Patient record for this user in this hospital
    try {
      let patient = await Patient.findOne({ user_id: patient_id, hospital_id: hospital._id });
      if (!patient) {
        patient = await Patient.create({
          hospital_id: hospital._id,
          user_id: patient_id,
          // Best-effort identity; if creator isn't the patient, try to fetch the patient's user profile
          name: user?.full_name || user?.name || 'Patient',
          email: user?.email || undefined,
          phone: user?.phone || undefined,
          address: user?.address || undefined,
          medical_history: undefined,
          metadata: {
            assigned_doctor: staff?.full_name || staff?.name || undefined,
          },
        });
      } else {
        // Update assigned doctor metadata if missing or different
        const assignedName = staff?.full_name || staff?.name;
        const meta = patient.metadata || {};
        if (assignedName && meta.assigned_doctor !== assignedName) {
          meta.assigned_doctor = assignedName;
          patient.metadata = meta;
        }
        // Ensure hospital alignment
        if (!patient.hospital_id) patient.hospital_id = hospital._id;
        await patient.save();
      }
    } catch (err) {
      // Don't block appointment creation if patient upsert fails; just log
      console.error('patient upsert after appointment failed:', err);
    }

    res.status(201).json({ appointment: appt });
  } catch (e) {
    console.error('createAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listMyStaffAppointments = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    // Only staff (doctor) should list theirs, but allow admin for dashboards
    const user = req.user || await User.findById(userId);
    const allowed = ['doctor','super_admin','admin','hospital_admin'];
    if (!allowed.includes(user?.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const appts = await Appointment.find({ staff_id: userId }).sort({ start_time: 1 });

    // Enrich with patient_name for reliable display on doctor side
    const enriched = await Promise.all(appts.map(async (a) => {
      let name;
      try {
        // First try: patient record linked by user_id within same hospital
        const pByUser = await Patient.findOne({ user_id: a.patient_id, hospital_id: a.hospital_id }).lean();
        if (pByUser) name = pByUser.full_name || pByUser.name;
      } catch {}
      if (!name) {
        try {
          // If patient_id actually refers to a patient record id
          const pById = await Patient.findById(a.patient_id).lean();
          if (pById) name = pById.full_name || pById.name;
        } catch {}
      }
      if (!name) {
        try {
          // Fallback to the user profile
          const u = await User.findById(a.patient_id).lean();
          if (u) name = u.full_name || u.name || u.username || u.email;
        } catch {}
      }
      const obj = a.toObject ? a.toObject() : a;
      return { ...obj, patient_name: name };
    }));

    res.json({ appointments: enriched });
  } catch (e) {
    console.error('listMyStaffAppointments error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listMyAppointments = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const query = { patient_id: userId };
    const appts = await Appointment.find(query).sort({ start_time: 1 });
    res.json({ appointments: appts });
  } catch (e) {
    console.error('listMyAppointments error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelMyAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });
    const user = req.user || (req.userId ? await User.findById(req.userId) : null);
    if (String(appt.patient_id) !== String(user?._id) && !isAdminRole(user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (['completed','cancelled'].includes(appt.status)) {
      return res.status(400).json({ message: 'Cannot cancel a completed/cancelled appointment' });
    }
    appt.status = 'cancelled';
    await appt.save();
    res.json({ appointment: appt });
  } catch (e) {
    console.error('cancelMyAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rescheduleMyAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body || {};
    if (!start_time || !end_time) return res.status(400).json({ message: 'start_time and end_time required' });
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (String(appt.patient_id) !== String(req.user._id) && !isAdminRole(req.user)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (['completed','cancelled'].includes(appt.status)) {
      return res.status(400).json({ message: 'Cannot reschedule a completed/cancelled appointment' });
    }
    appt.start_time = new Date(start_time);
    appt.end_time = new Date(end_time);
    appt.status = 'pending';
    await appt.save();
    res.json({ appointment: appt });
  } catch (e) {
    console.error('rescheduleMyAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Staff actions
export const confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || (req.userId ? await User.findById(req.userId) : null);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });
    const allowed = ['doctor','super_admin','admin','hospital_admin'];
    if (!allowed.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
    if (String(appt.staff_id) !== String(user._id) && !isAdminRole(user)) return res.status(403).json({ message: 'Forbidden' });
    if (['completed','cancelled'].includes(appt.status)) return res.status(400).json({ message: 'Cannot confirm completed/cancelled appointment' });
    appt.status = 'confirmed';
    await appt.save();
    res.json({ appointment: appt });
  } catch (e) {
    console.error('confirmAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || (req.userId ? await User.findById(req.userId) : null);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: 'Not found' });
    const allowed = ['doctor','super_admin','admin','hospital_admin'];
    if (!allowed.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
    if (String(appt.staff_id) !== String(user._id) && !isAdminRole(user)) return res.status(403).json({ message: 'Forbidden' });
    if (appt.status === 'cancelled') return res.status(400).json({ message: 'Cannot complete a cancelled appointment' });
    appt.status = 'completed';
    await appt.save();
    res.json({ appointment: appt });
  } catch (e) {
    console.error('completeAppointment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
