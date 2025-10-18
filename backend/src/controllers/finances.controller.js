import mongoose from 'mongoose';
import { FinanceTransaction } from '../models/FinanceTransaction.js';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
// Notifications removed for simple save workflow

function isSuperAdmin(user) { return user?.role === 'super_admin'; }
function isClinicAdmin(user) { return user?.role === 'clinic_admin' || user?.role === 'hospital_admin'; }
function isOfficeExecutive(user) { return user?.role === 'office_executive'; }

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(String(id)); } catch { return null; }
};

export const createFinance = async (req, res) => {
  try {
    const { patient_id, patient_record_id, therapy_name, amount, method = 'cash', notes, category = 'therapy', type = 'income' } = req.body || {};

    if (!(isOfficeExecutive(req.user) || isClinicAdmin(req.user) || isSuperAdmin(req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const hospitalId = isSuperAdmin(req.user) ? (req.body?.hospital_id || req.user?.hospital_id) : req.user?.hospital_id;
    const hid = toObjectId(hospitalId);
    if (!hid) return res.status(400).json({ message: 'hospital_id is required' });

    const amt = Number(amount);
    if (!(amt > 0)) return res.status(400).json({ message: 'amount must be > 0' });

    // Determine whether provided patient_id points to Patient record or User(patient)
    let patientUserId = undefined;
    let patientRecordId = undefined;
    if (patient_id) {
      const pid = toObjectId(patient_id);
      if (pid) {
        // Try Patient model first
        const pRec = await Patient.findById(pid).select('hospital_id').lean();
        if (pRec) {
          if (String(pRec.hospital_id) !== String(hid)) {
            return res.status(400).json({ message: 'Patient not in this clinic' });
          }
          patientRecordId = pid;
        } else {
          // Fallback to User collection with role patient
          const pUser = await User.findOne({ _id: pid, role: 'patient', $or: [ { hospital_id: hid }, { hospital_id: String(hid) } ] }).lean();
          if (!pUser) {
            return res.status(400).json({ message: 'Patient not in this clinic' });
          }
          patientUserId = pid;
        }
      }
    }

    const doc = await FinanceTransaction.create({
      hospital_id: hid,
      patient_id: patientUserId,
      patient_record_id: patientRecordId || (patient_record_id ? toObjectId(patient_record_id) : undefined),
      therapy_name: therapy_name || undefined,
      amount: amt,
      method,
      notes: notes || undefined,
      category: category || 'therapy',
      type: type || 'income',
      status: 'approved',
      approved_by: req.user?._id || undefined,
      approved_at: new Date(),
      created_by: req.user?._id || undefined,
      created_at: new Date(),
    });

    return res.status(201).json({ transaction: doc.toJSON() });
  } catch (e) {
    console.error('createFinance error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listFinances = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

    let hospitalId = req.query.hospital_id;
    if (!isSuperAdmin(req.user)) hospitalId = req.user?.hospital_id || hospitalId;
    const hid = hospitalId ? toObjectId(hospitalId) : null;
    if (!hid) return res.json({ items: [], total: 0, page, limit });

    const match = { hospital_id: hid };
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const type = req.query.type;
    const status = req.query.status;

    if (from) match.created_at = { ...(match.created_at || {}), $gte: from };
    if (to) match.created_at = { ...(match.created_at || {}), $lte: to };
    if (type) match.type = type;
    if (status) match.status = status;

    const baseMatch = { ...match };
    // Build a match that ignores status for overall totals
    const matchAll = { ...baseMatch };
    delete matchAll.status;

    const [items, total, summary, summaryAll] = await Promise.all([
      FinanceTransaction.find(match)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patient_id', 'name username email')
        .populate('patient_record_id', 'name email phone')
        .populate('created_by', 'name username email role')
        .populate('approved_by', 'name username email role')
        .lean(),
      FinanceTransaction.countDocuments(match),
      FinanceTransaction.aggregate([
        { $match: match },
        { $group: { _id: { type: '$type', status: '$status' }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      FinanceTransaction.aggregate([
        { $match: matchAll },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const incomeApproved = summary.filter(s => s._id.type === 'income' && s._id.status === 'approved').reduce((a,c)=>a+c.total,0);
    const expenseApproved = summary.filter(s => s._id.type === 'expense' && s._id.status === 'approved').reduce((a,c)=>a+c.total,0);

    const incomeAll = summaryAll.find(s => s._id === 'income')?.total
      || summaryAll.filter(s => s._id === 'income').reduce((a,c)=>a+c.total,0);
    const expenseAll = summaryAll.find(s => s._id === 'expense')?.total
      || summaryAll.filter(s => s._id === 'expense').reduce((a,c)=>a+c.total,0);

    return res.json({ items, total, page, limit, summary: { incomeApproved, expenseApproved, netApproved: incomeApproved - expenseApproved, incomeAll: incomeAll || 0, expenseAll: expenseAll || 0, netAll: (incomeAll||0) - (expenseAll||0) } });
  } catch (e) {
    console.error('listFinances error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const approveFinance = async (req, res) => {
  try {
    if (!(isClinicAdmin(req.user) || isSuperAdmin(req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { id } = req.params;
    const doc = await FinanceTransaction.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (!isSuperAdmin(req.user) && String(doc.hospital_id) !== String(req.user.hospital_id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    doc.status = 'approved';
    doc.approved_by = req.user?._id;
    doc.approved_at = new Date();
    await doc.save();
    return res.json({ transaction: doc.toJSON() });
  } catch (e) {
    console.error('approveFinance error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const rejectFinance = async (req, res) => {
  try {
    if (!(isClinicAdmin(req.user) || isSuperAdmin(req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { id } = req.params;
    const doc = await FinanceTransaction.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (!isSuperAdmin(req.user) && String(doc.hospital_id) !== String(req.user.hospital_id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    doc.status = 'rejected';
    doc.approved_by = req.user?._id;
    doc.approved_at = new Date();
    await doc.save();
    return res.json({ transaction: doc.toJSON() });
  } catch (e) {
    console.error('rejectFinance error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};
