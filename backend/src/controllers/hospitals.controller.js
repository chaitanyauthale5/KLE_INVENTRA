import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { FinanceTransaction } from '../models/FinanceTransaction.js';
import { TherapySession } from '../models/TherapySession.js';
import { Appointment } from '../models/Appointment.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { sendMail } from '../utils/mailer.js';

function isSuperAdmin(user) { return user?.role === 'super_admin'; }
function isHospitalAdmin(user) { return user?.role === 'hospital_admin'; }
function isClinicAdmin(user) { return user?.role === 'clinic_admin'; }
function isAdmin(user) { return user?.role === 'admin'; }

export const listHospitals = async (req, res) => {
  try {
    // Super admin: all hospitals
    if (isSuperAdmin(req.user)) {
      const hospitals = await Hospital.find();
      return res.json({ hospitals });
    }
    // Admin: all hospitals
    if (isAdmin(req.user)) {
      const hospitals = await Hospital.find();
      return res.json({ hospitals });
    }
    // Hospital admin: only their own assigned hospital
    if (isHospitalAdmin(req.user)) {
      if (!req.user.hospital_id) return res.json({ hospitals: [] });
      const hospital = await Hospital.findById(req.user.hospital_id);
      return res.json({ hospitals: hospital ? [hospital] : [] });
    }
    // Other roles (patient, doctor, office_executive, guardian): allow reading all hospitals for selection/booking
    const hospitals = await Hospital.find();
    return res.json({ hospitals });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id: hospitalId, userId } = req.params;
    // Scope: super/admin allowed; hospital_admin/clinic_admin only for their own hospital
    if (!isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user.hospital_id) !== String(hospitalId)) {
      return res.status(400).json({ message: 'User not in this hospital' });
    }

    const allowedRoles = new Set(['doctor','office_executive','therapist']);
    if (!allowedRoles.has(user.role)) {
      return res.status(400).json({ message: 'Cannot update this role via hospital staff endpoint' });
    }

    const { full_name, email, phone, department, role, password } = req.body || {};
    if (role && !allowedRoles.has(String(role))) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (typeof full_name === 'string') user.name = full_name;
    if (typeof email === 'string') user.email = email;
    if (typeof phone === 'string') user.phone = phone;
    if (typeof department === 'string') user.department = department;
    if (role) user.role = role;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(String(password), salt);
    }

    await user.save();
    return res.json({ message: 'Staff updated', user: user.toJSON() });
  } catch (e) {
    console.error('updateStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Summary KPIs for a hospital (patients, staff, revenue)
export const getHospitalSummary = async (req, res) => {
  try {
    const { id: hospitalId } = req.params;

    // Access control: hospital_admin/clinic_admin can only access their own hospital
    if (!isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0);
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);

    // Support non-ObjectId IDs gracefully to avoid 500 on invalid ObjectId
    const hid = mongoose.Types.ObjectId.isValid(hospitalId)
      ? new mongoose.Types.ObjectId(hospitalId)
      : hospitalId;

    const [patientsCount, patientUsersCount, doctorsCount, execsCount, financeAgg, financeAggMTD, patientsMTD, patientUsersMTD, apptTotal, completedMTD, visitsToday, patientsToday, apptsToday] = await Promise.all([
      // Patients may have hospital_id saved as ObjectId or string
      Patient.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ] }),
      // Users collection: handle both ObjectId and string hospital_id
      User.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], role: 'patient' }),
      User.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], role: 'doctor' }),
      User.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], role: 'office_executive' }),
      // Finance: also match both types
      FinanceTransaction.aggregate([
        { $match: { $and: [ { $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ] }, { status: 'approved' } ] } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
      FinanceTransaction.aggregate([
        { $match: { $and: [ { $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ] }, { createdAt: { $gte: firstOfMonth } }, { status: 'approved' } ] } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
      Patient.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], createdAt: { $gte: firstOfMonth } }),
      User.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], role: 'patient', createdAt: { $gte: firstOfMonth } }),
      TherapySession.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ] }),
      TherapySession.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], status: 'completed', 'outcomes.completed_at': { $gte: firstOfMonth } }),
      TherapySession.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], scheduled_at: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'cancelled' } }),
      // New today counts
      Patient.countDocuments({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], createdAt: { $gte: startOfToday, $lte: endOfToday } }),
      Appointment.countDocuments({ hospital_id: hid, start_time: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: 'cancelled' } }).catch(() => 0),
    ]);

    const income = financeAgg.find(f => f._id === 'income')?.total || 0;
    const expense = financeAgg.find(f => f._id === 'expense')?.total || 0;
    const net = income - expense;
    const income_mtd = financeAggMTD.find(f => f._id === 'income')?.total || 0;
    const expense_mtd = financeAggMTD.find(f => f._id === 'expense')?.total || 0;

    // Fallback for legacy data where patients are stored as users with role 'patient'
    const patientsFinal = patientsCount > 0 ? patientsCount : patientUsersCount;
    const patientsMTDFinal = patientsMTD > 0 ? patientsMTD : patientUsersMTD;

    return res.json({
      patients: patientsFinal,
      doctors: doctorsCount,
      office_executives: execsCount,
      // Compatibility aliases for existing frontend
      totalRevenue: income,
      totalExpenses: expense,
      revenue: income,
      income,
      expense,
      net,
      revenue_mtd: income_mtd,
      expense_mtd,
      patients_mtd: patientsMTDFinal,
      appointments_total: apptTotal,
      sessions_completed_mtd: completedMTD,
      visits_today: visitsToday,
      patients_today: patientsToday || 0,
      appointments_today: apptsToday || 0
    });
  } catch (e) {
    console.error('getHospitalSummary error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listStaff = async (req, res) => {
  try {
    const { id: hospitalId } = req.params;
    // Scope rules:
    // - super_admin/admin: can view any hospital's staff
    // - hospital_admin/clinic_admin: can view only their own hospital's staff
    // - other roles (patient/doctor/office_executive/guardian): can view any hospital's staff (read-only for booking)
    if ((isHospitalAdmin(req.user) || isClinicAdmin(req.user)) && !isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const allowedRoles = ['doctor','office_executive','therapist'];
    const hid = mongoose.Types.ObjectId.isValid(hospitalId) ? new mongoose.Types.ObjectId(hospitalId) : hospitalId;
    const users = await User.find({ $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ], role: { $in: allowedRoles } });
    return res.json({ staff: users.map(u => u.toJSON()) });
  } catch (e) {
    console.error('listStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const removeStaff = async (req, res) => {
  try {
    const { id: hospitalId, userId } = req.params;
    if (!isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const allowedRoles = new Set(['doctor','office_executive']);
    if (!allowedRoles.has(user.role)) {
      return res.status(400).json({ message: 'Cannot remove this role via hospital staff endpoint' });
    }
    if (String(user.hospital_id) !== String(hospitalId)) {
      return res.status(400).json({ message: 'User not in this hospital' });
    }
    await user.deleteOne();
    return res.json({ message: 'Staff removed' });
  } catch (e) {
    console.error('removeStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const assignStaff = async (req, res) => {
  try {
    const { id: hospitalId } = req.params;
    const {
      full_name,
      email,
      phone,
      role,
      username,
      password,
      department,
    } = req.body || {};

    // Scope: hospital_admin/clinic_admin can only assign to their own hospital
    if (!isSuperAdmin(req.user) && !isAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(hospitalId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const allowedRoles = new Set(['doctor', 'office_executive', 'therapist']);
    if (!allowedRoles.has(String(role))) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!full_name) {
      return res.status(400).json({ message: 'full_name is required' });
    }
    // For therapist, email/username/password can be omitted (no login needed). For others, require email/username + password
    const isTherapist = String(role) === 'therapist';
    if (!isTherapist) {
      if (!(email || username) || !password) {
        return res.status(400).json({ message: 'For non-therapists, password and one of email/username are required' });
      }
    }

    // Ensure hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    // Check conflicts
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ message: 'Email already registered' });
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(409).json({ message: 'Phone already registered' });
    }
    if (username) {
      const existingUsername = await User.findOne({ username: String(username).toLowerCase() });
      if (existingUsername) return res.status(409).json({ message: 'Username already taken' });
    }

    // Compute password hash. If therapist and no password, generate a random one to satisfy schema requirement.
    let passwordToUse = password;
    if (isTherapist && !passwordToUse) {
      passwordToUse = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(passwordToUse), salt);

    const user = await User.create({
      name: full_name,
      email: email || undefined,
      phone: phone || undefined,
      username: username ? String(username).toLowerCase() : undefined,
      role,
      hospital_id: hospital._id,
      has_selected_role: true,
      passwordHash,
      department: department || undefined,
    });

    // Email credentials to staff (if email provided)
    try {
      if (email) {
        const loginBase = process.env.APP_URL || (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '').split(',')[0] || 'http://localhost:5173';
        const loginUrl = `${loginBase}`;
        const subject = `Your ${hospital.name || 'Clinic'} account credentials`;
        const userIdent = email || (username ? String(username).toLowerCase() : '');
        const html = `
          <div style="font-family:Arial,sans-serif;">
            <h2>Welcome to ${hospital.name || 'the Clinic'}</h2>
            <p>You have been added as <strong>${role}</strong>.</p>
            <div style="margin:10px 0;padding:10px;border:1px solid #eee;border-radius:8px;background:#fafafa">
              <p style="margin:0 0 6px 0"><strong>Clinic details</strong></p>
              <p style="margin:0">Name: ${hospital.name || ''}</p>
              <p style="margin:0">Address: ${hospital.address || ''}</p>
              <p style="margin:0">City/State: ${hospital.city || ''}${hospital.state ? ', ' + hospital.state : ''}</p>
              <p style="margin:0">Phone: ${hospital.phone || ''}</p>
              <p style="margin:0">Email: ${hospital.email || ''}</p>
            </div>
            <p><strong>Your Login:</strong> ${userIdent}</p>
            <p><strong>Temporary Password:</strong> ${passwordToUse}</p>
            ${department ? `<p><strong>Department:</strong> ${department}</p>` : ''}
            <p>Sign in here: <a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>
            <p style="margin-top:10px;color:#555">Please sign in and change your password immediately.</p>
          </div>
        `;
        const text = [
          `You have been added as ${role} at ${hospital.name || ''}.`,
          `Clinic: ${hospital.name || ''}`,
          `Address: ${hospital.address || ''}`,
          `City/State: ${hospital.city || ''}${hospital.state ? ', ' + hospital.state : ''}`,
          `Phone: ${hospital.phone || ''}`,
          `Email: ${hospital.email || ''}`,
          `Login: ${userIdent}`,
          `Temporary Password: ${passwordToUse}`,
          department ? `Department: ${department}` : null,
          `Sign in: ${loginUrl}`,
        ].filter(Boolean).join('\n');
        await sendMail({ to: email, subject, text, html });
      }
    } catch (mailErr) {
      console.warn('[Hospitals] Failed to send staff onboarding email:', mailErr?.message || mailErr);
    }

    return res.status(201).json({ message: 'Staff assigned', user: user.toJSON() });
  } catch (e) {
    console.error('assignStaff error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findById(id);
    if (!hospital) return res.status(404).json({ message: 'Not found' });
    if (!isSuperAdmin(req.user)) {
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    res.json({ hospital });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createHospital = async (req, res) => {
  try {
    if (!(isSuperAdmin(req.user) || isAdmin(req.user) || isHospitalAdmin(req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payload = { ...req.body };
    // Link clinic to the creating super admin
    if (isSuperAdmin(req.user)) {
      payload.super_admin_id = req.user._id;
    }
    const hospital = await Hospital.create(payload);
    // If creator is not super admin, auto-assign this hospital to them if they don't already have one
    if (!isSuperAdmin(req.user)) {
      try {
        if (!req.user.hospital_id) {
          req.user.hospital_id = hospital._id;
          await req.user.save();
        }
      } catch {}
    }

    // Optionally create/assign a hospital admin user
    const { admin_email, admin_password, admin_name, admin_phone } = req.body || {};
    if (admin_email && admin_password) {
      let targetUser = await User.findOne({ email: admin_email });
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(String(admin_password), salt);
      if (targetUser) {
        targetUser.role = 'hospital_admin';
        targetUser.hospital_id = hospital._id;
        targetUser.passwordHash = passwordHash;
        if (admin_name) targetUser.name = admin_name;
        if (admin_phone) targetUser.phone = admin_phone;
        await targetUser.save();
      } else {
        await User.create({
          name: admin_name || admin_email.split('@')[0],
          email: admin_email,
          phone: admin_phone || undefined,
          role: 'hospital_admin',
          hospital_id: hospital._id,
          passwordHash,
        });
      }
    }
    res.status(201).json({ hospital });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req.user)) {
      // Admin or hospital_admin must only update their own hospital
      if (!req.user.hospital_id || String(req.user.hospital_id) !== String(id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const hospital = await Hospital.findByIdAndUpdate(id, req.body, { new: true });
    if (!hospital) return res.status(404).json({ message: 'Not found' });
    res.json({ hospital });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};

export const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;
    // super_admin: can delete any
    if (!isSuperAdmin(req.user)) {
      // admin: can delete any
      if (isAdmin(req.user)) {
        // allowed
      } else {
        // hospital_admin: only their own hospital
        if (!req.user.hospital_id || String(req.user.hospital_id) !== String(id)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
    }
    const hospital = await Hospital.findByIdAndDelete(id);
    if (!hospital) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
