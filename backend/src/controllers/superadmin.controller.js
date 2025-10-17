import mongoose from 'mongoose';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { FinanceTransaction } from '../models/FinanceTransaction.js';
import { PatientFeedback } from '../models/PatientFeedback.js';

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(String(id)); } catch { return null; }
};

// Seed demo data for charts (DEV utility)
export const seedDemoData = async (req, res) => {
  try {
    // Optional safeguard for production
    if (process.env.NODE_ENV === 'production' && req.query.allow !== 'true') {
      return res.status(403).json({ message: 'Seeding disabled in production' });
    }

    const { months = 12, patientsPerClinic = 40, feedbackPerClinic = 60 } = req.body || {};
    const hospitals = await Hospital.find({}).lean();
    const now = new Date();

    for (const h of hospitals) {
      const hid = h._id;

      // 1) Create patient users (idempotent-ish by email seed tag)
      const existingPatients = await User.countDocuments({ role: 'patient', hospital_id: hid });
      const toCreate = Math.max(0, patientsPerClinic - existingPatients);
      const patients = [];
      for (let i = 0; i < toCreate; i++) {
        patients.push({
          name: `Demo Patient ${i + 1} (${h.name})`,
          email: undefined,
          username: undefined,
          passwordHash: 'demo',
          role: 'patient',
          hospital_id: hid,
          createdAt: new Date(now.getTime() - Math.floor(Math.random() * 90) * 86400000),
          updatedAt: new Date(),
        });
      }
      if (patients.length) {
        await User.insertMany(patients);
      }

      // 2) Finance transactions for last N months (income/expense)
      const financeDocs = [];
      for (let m = months - 1; m >= 0; m--) {
        const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
        const monthlyIncome = 200000 + Math.floor(Math.random() * 200000); // 2-4L
        const monthlyExpense = 80000 + Math.floor(Math.random() * 90000); // 0.8-1.7L

        // split into ~12 entries per month
        const splits = 12;
        for (let s = 0; s < splits; s++) {
          const day = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
          financeDocs.push({
            hospital_id: hid,
            type: 'income',
            amount: Math.round(monthlyIncome / splits + (Math.random() * 5000 - 2500)),
            method: 'cash',
            category: 'therapy',
            created_at: day,
          });
          financeDocs.push({
            hospital_id: hid,
            type: 'expense',
            amount: Math.round(monthlyExpense / splits + (Math.random() * 3000 - 1500)),
            method: 'bank',
            category: 'operations',
            created_at: day,
          });
        }
      }
      if (financeDocs.length) {
        await FinanceTransaction.insertMany(financeDocs);
      }

      // 3) Patient feedback random
      const fbDocs = [];
      for (let i = 0; i < feedbackPerClinic; i++) {
        const created = new Date(now.getTime() - Math.floor(Math.random() * 60) * 86400000);
        fbDocs.push({
          hospital_id: hid,
          rating: Math.min(5, Math.max(1, Math.round(3 + (Math.random() * 2)))) ,
          comment: 'Demo feedback',
          created_at: created,
        });
      }
      if (fbDocs.length) {
        await PatientFeedback.insertMany(fbDocs);
      }
    }

    return res.json({ status: 'seeded', hospitals: hospitals.length });
  } catch (e) {
    console.error('seedDemoData error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listClinics = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const search = String(req.query.search || '').trim();

    const match = {};
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            // KPIs via lookups
            {
              $lookup: {
                from: 'users',
                let: { hid: '$_id' },
                pipeline: [
                  { $match: { $expr: { $and: [ { $eq: ['$hospital_id','$$hid'] }, { $eq: ['$role','patient'] } ] } } },
                  { $count: 'count' }
                ],
                as: 'patients'
              }
            },
            {
              $lookup: {
                from: 'users',
                let: { hid: '$_id' },
                pipeline: [
                  { $match: { $expr: { $and: [ { $eq: ['$hospital_id','$$hid'] }, { $eq: ['$role','doctor'] } ] } } },
                  { $count: 'count' }
                ],
                as: 'doctors'
              }
            },
            {
              $lookup: {
                from: 'financetransactions',
                let: { hid: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$hospital_id','$$hid'] } } },
                  { $group: { _id: '$type', total: { $sum: '$amount' } } }
                ],
                as: 'financeAgg'
              }
            },
            {
              $lookup: {
                from: 'patientfeedbacks',
                let: { hid: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$hospital_id','$$hid'] } } },
                  { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
                ],
                as: 'feedbackAgg'
              }
            },
            {
              $addFields: {
                totalPatients: { $ifNull: [{ $first: '$patients.count' }, 0] },
                totalDoctors: { $ifNull: [{ $first: '$doctors.count' }, 0] },
                totalRevenue: {
                  $ifNull: [
                    {
                      $first: {
                        $map: {
                          input: {
                            $filter: { input: '$financeAgg', as: 'f', cond: { $eq: ['$$f._id', 'income'] } }
                          },
                          as: 'x',
                          in: '$$x.total'
                        }
                      }
                    }, 0]
                },
                totalExpenses: {
                  $ifNull: [
                    {
                      $first: {
                        $map: {
                          input: {
                            $filter: { input: '$financeAgg', as: 'f', cond: { $eq: ['$$f._id', 'expense'] } }
                          },
                          as: 'x',
                          in: '$$x.total'
                        }
                      }
                    }, 0]
                },
                avgRating: { $round: [{ $ifNull: [{ $first: '$feedbackAgg.avgRating' }, null] }, 2] },
                feedbackCount: { $ifNull: [{ $first: '$feedbackAgg.count' }, 0] }
              }
            },
            {
              $addFields: { net: { $subtract: ['$totalRevenue', '$totalExpenses'] } }
            },
            {
              $project: {
                patients: 0, doctors: 0, financeAgg: 0, feedbackAgg: 0
              }
            }
          ],
          total: [ { $count: 'count' } ]
        }
      },
      {
        $project: {
          items: 1,
          total: { $ifNull: [ { $first: '$total.count' }, 0 ] },
          page: { $literal: page },
          limit: { $literal: limit }
        }
      }
    ];

    const result = await Hospital.aggregate(pipeline);
    return res.json(result[0] || { items: [], total: 0, page, limit });
  } catch (e) {
    console.error('listClinics error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClinicFinances = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const hid = toObjectId(hospitalId);
    if (!hid) return res.status(400).json({ message: 'Invalid hospitalId' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const type = req.query.type;
    const method = req.query.method;
    const category = req.query.category;

    const match = { hospital_id: hid };
    if (from) match.created_at = { ...(match.created_at || {}), $gte: from };
    if (to) match.created_at = { ...(match.created_at || {}), $lte: to };
    if (type) match.type = type;
    if (method) match.method = method;
    if (category) match.category = category;

    const [items, summary, total] = await Promise.all([
      FinanceTransaction.find(match)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FinanceTransaction.aggregate([
        { $match: match },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      FinanceTransaction.countDocuments(match)
    ]);

    const income = summary.find(s => s._id === 'income')?.total || 0;
    const expense = summary.find(s => s._id === 'expense')?.total || 0;

    return res.json({ items, total, page, limit, income, expense, net: income - expense });
  } catch (e) {
    console.error('getClinicFinances error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createClinicAdmin = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { full_name, email, username, password } = req.body || {};
    const hid = toObjectId(hospitalId);
    if (!hid) return res.status(400).json({ message: 'Invalid hospitalId' });
    if (!full_name || !(email || username) || !password) {
      return res.status(400).json({ message: 'full_name, password and one of email/username are required' });
    }

    const existingAdmin = await User.findOne({ role: 'clinic_admin', hospital_id: hid });
    if (existingAdmin) {
      return res.status(409).json({ message: 'Clinic already has an admin' });
    }

    const user = new User({
      name: full_name,
      email: email || undefined,
      username: username || undefined,
      passwordHash: password, // TODO: Replace with hashing in real implementation
      role: 'clinic_admin',
      hospital_id: hid
    });
    await user.save();
    return res.status(201).json({ admin: user.toJSON() });
  } catch (e) {
    console.error('createClinicAdmin error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const reassignClinicAdmin = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { user_id } = req.body || {};
    const hid = toObjectId(hospitalId);
    const uid = toObjectId(user_id);
    if (!hid || !uid) return res.status(400).json({ message: 'Invalid ids' });

    const hospital = await Hospital.findById(hid);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    await User.updateMany({ role: 'clinic_admin', hospital_id: hid }, { $set: { role: 'doctor' } });
    const newAdmin = await User.findByIdAndUpdate(uid, { role: 'clinic_admin', hospital_id: hid }, { new: true });
    if (!newAdmin) return res.status(404).json({ message: 'User not found' });

    return res.json({ admin: newAdmin.toJSON() });
  } catch (e) {
    console.error('reassignClinicAdmin error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listDoctorsByClinic = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const hid = toObjectId(hospitalId);
    if (!hid) return res.status(400).json({ message: 'Invalid hospitalId' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const search = String(req.query.search || '').trim();

    const filter = { hospital_id: hid, role: 'doctor' };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter)
    ]);

    return res.json({ items, total, page, limit });
  } catch (e) {
    console.error('listDoctorsByClinic error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listFeedbacksByClinic = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const hid = toObjectId(hospitalId);
    if (!hid) return res.status(400).json({ message: 'Invalid hospitalId' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const rating = req.query.rating ? parseInt(req.query.rating, 10) : null;

    const match = { hospital_id: hid };
    if (from) match.created_at = { ...(match.created_at || {}), $gte: from };
    if (to) match.created_at = { ...(match.created_at || {}), $lte: to };
    if (rating) match.rating = rating;

    const [items, total] = await Promise.all([
      PatientFeedback.find(match).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PatientFeedback.countDocuments(match)
    ]);

    return res.json({ items, total, page, limit });
  } catch (e) {
    console.error('listFeedbacksByClinic error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getClinicProgress = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const hid = toObjectId(hospitalId);
    if (!hid) return res.status(400).json({ message: 'Invalid hospitalId' });

    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30*24*60*60*1000);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    // Revenue trend using finance transactions
    const revenueTrend = await FinanceTransaction.aggregate([
      { $match: { hospital_id: hid, created_at: { $gte: from, $lte: to }, type: 'income' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Feedback trend (avg rating per day)
    const ratingTrend = await PatientFeedback.aggregate([
      { $match: { hospital_id: hid, created_at: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return res.json({ revenueTrend, ratingTrend, from, to });
  } catch (e) {
    console.error('getClinicProgress error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};
