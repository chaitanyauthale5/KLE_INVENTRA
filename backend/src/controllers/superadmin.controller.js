import mongoose from 'mongoose';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { FinanceTransaction } from '../models/FinanceTransaction.js';
import { PatientFeedback } from '../models/PatientFeedback.js';
import bcrypt from 'bcryptjs';
import { User as UserModel } from '../models/User.js';
import { TherapySession } from '../models/TherapySession.js';
import { sendMail } from '../utils/mailer.js';

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(String(id)); } catch { return null; }
};

// Global analytics across all clinics for Super Admin dashboard
export const getGlobalAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const gran = (String(req.query.granularity || 'month').toLowerCase()); // 'day' | 'week' | 'month'
    const windowN = Math.max(1, Math.min(365, parseInt(req.query.window || (gran === 'day' ? '7' : gran === 'week' ? '12' : '12'), 10)));

    const to = req.query.to ? new Date(req.query.to) : now;
    let from; let fmt;
    if (gran === 'day') { from = new Date(to.getTime() - (windowN - 1) * 24*60*60*1000); fmt = '%Y-%m-%d'; }
    else if (gran === 'week') { from = new Date(to.getTime() - (windowN - 1) * 7*24*60*60*1000); fmt = '%G-%V'; }
    else { // month
      from = new Date(to.getFullYear(), to.getMonth() - (windowN - 1), 1);
      fmt = '%Y-%m';
    }

    const mode = String(req.query.mode || 'live'); // 'live' | 'demo'
    const isDemoMode = mode === 'demo';

    // Scope by role and mode: prefer explicit hospitalId, else user's clinic; in live mode exclude demo data
    const scope = (coll) => {
      const qHospital = req.query.hospitalId;
      if (qHospital) {
        const val = toObjectId(qHospital) || qHospital;
        const base = { $or: [ { hospital_id: val }, { hospitalId: val } ] };
        if (!isDemoMode) base.demo = { $ne: true };
        return base;
      }
      if (req?.user?.role && req?.user?.hospital_id) {
        const val = toObjectId(req.user.hospital_id) || req.user.hospital_id;
        const base = { $or: [ { hospital_id: val }, { hospitalId: val } ] };
        if (!isDemoMode) base.demo = { $ne: true };
        return base;
      }
      const base = {};
      if (!isDemoMode) base.demo = { $ne: true };
      return base;
    };

    // Monthly patients (users with role patient)
    let patientsSeries;
    if (gran === 'week') {
      patientsSeries = await UserModel.aggregate([
        { $match: { ...scope('users'), ...(isDemoMode?{}:{ email: { $not: /demo\.patient\./ } }), createdAt: { $gte: from, $lte: to }, $expr: { $eq: [ { $toLower: '$role' }, 'patient' ] } } },
        { $group: { _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } }, count: { $sum: 1 } } },
        { $project: { _id: { $concat: [ { $toString: '$_id.year' }, '-', { $toString: '$_id.week' } ] }, count: 1 } },
        { $sort: { _id: 1 } }
      ]);
    } else {
      patientsSeries = await UserModel.aggregate([
        { $match: { ...scope('users'), ...(isDemoMode?{}:{ email: { $not: /demo\.patient\./ } }), createdAt: { $gte: from, $lte: to }, $expr: { $eq: [ { $toLower: '$role' }, 'patient' ] } } },
        { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
    }

    // Completed sessions total and by therapy type distribution (last 90 days window for relevance)
    const lastWindow = from; // use same window for distributions
    const [completedSessions, totalSessionsWindow, therapyDist, activeStaff] = await Promise.all([
      TherapySession.countDocuments({ status: 'completed', ...scope('sessions'), createdAt: { $gte: lastWindow, $lte: to } }),
      TherapySession.countDocuments({ ...scope('sessions'), createdAt: { $gte: lastWindow, $lte: to } }),
      TherapySession.aggregate([
        { $match: { ...scope('sessions'), createdAt: { $gte: lastWindow, $lte: to } } },
        { $group: { _id: { $ifNull: ['$therapy_type', 'Other'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      UserModel.countDocuments({ ...scope('users'), role: { $in: ['doctor','office_executive','clinic_admin','hospital_admin','admin'] } })
    ]);

    // Finance category weightage across all clinics for selected window
    const financeAggCat = await FinanceTransaction.aggregate([
      { $match: { ...scope('finance'), created_at: { $gte: lastWindow, $lte: to } } },
      { $group: { _id: { $ifNull: ['$category','other'] }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // Revenue trend (income grouped by selected granularity)
    let revenueTrend;
    if (gran === 'week') {
      revenueTrend = await FinanceTransaction.aggregate([
        { $match: { ...scope('finance'), created_at: { $gte: from, $lte: to }, type: 'income' } },
        { $group: { _id: { year: { $isoWeekYear: '$created_at' }, week: { $isoWeek: '$created_at' } }, total: { $sum: '$amount' } } },
        { $project: { _id: { $concat: [ { $toString: '$_id.year' }, '-', { $toString: '$_id.week' } ] }, total: 1 } },
        { $sort: { _id: 1 } }
      ]);
    } else {
      revenueTrend = await FinanceTransaction.aggregate([
        { $match: { ...scope('finance'), created_at: { $gte: from, $lte: to }, type: 'income' } },
        { $group: { _id: { $dateToString: { format: fmt, date: '$created_at' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]);
    }

    // Totals
    const [totalPatients, totalStaff] = await Promise.all([
      UserModel.countDocuments({ ...scope('users'), ...(isDemoMode?{}:{ email: { $not: /demo\.patient\./ } }), $expr: { $eq: [ { $toLower: '$role' }, 'patient' ] } }),
      UserModel.countDocuments({ ...scope('users'), $expr: { $in: [ { $toLower: '$role' }, ['doctor','office_executive','clinic_admin','hospital_admin','admin'] ] } })
    ]);

    return res.json({
      kpis: {
        totalPatients,
        completedSessions,
        activeStaff: totalStaff,
        averageProgressPct: totalSessionsWindow > 0 ? Math.round((completedSessions / totalSessionsWindow) * 100) : 0,
      },
      granularity: gran,
      window: windowN,
      series: patientsSeries, // [{ _id: key, count }]
      therapyDistribution: therapyDist.map(d => ({ label: d._id, value: d.count })),
      financeCategoryWeightage: financeAggCat.map(d => ({ label: d._id, value: d.total, count: d.count })),
      revenueTrend,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('getGlobalAnalytics error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Seed demo data for charts (DEV utility)
export const seedDemoData = async (req, res) => {
  try {
    // Seeding enabled for authorized roles via route guard

    const { months = 12, patientsPerClinic = 250, feedbackPerClinic = 120 } = req.body || {};
    let hospitals = await Hospital.find({}).lean();
    if (!hospitals.length) {
      const demo = await Hospital.create({ name: 'Demo Clinic', city: 'Demo City', state: 'Demo State', address: '123 Demo Street' });
      hospitals = [demo.toObject()];
      // Create a clinic admin and staff for the demo clinic (idempotent)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('demo1234', salt);
      await User.updateOne(
        { email: 'clinicadmin@demo.local' },
        { $set: { name: 'Demo Clinic Admin', role: 'clinic_admin', hospital_id: demo._id, passwordHash } },
        { upsert: true }
      );
      await User.updateOne(
        { email: 'doctor@demo.local' },
        { $set: { name: 'Dr. Demo', role: 'doctor', hospital_id: demo._id, passwordHash } },
        { upsert: true }
      );
      await User.updateOne(
        { email: 'exec@demo.local' },
        { $set: { name: 'Executive Demo', role: 'office_executive', hospital_id: demo._id, passwordHash } },
        { upsert: true }
      );
    }
    const now = new Date();

    for (const h of hospitals) {
      const hid = h._id;

      // 1) Create patient users (idempotent-ish by email seed tag)
      const existingPatients = await User.countDocuments({ role: 'patient', hospital_id: hid });
      const toCreate = Math.max(0, patientsPerClinic - existingPatients);
      const patients = [];
      for (let i = 0; i < toCreate; i++) {
        const idx = existingPatients + i + 1;
        const email = `demo.patient.${hid}.${idx}@demo.local`;
        patients.push({
          name: `Demo Patient ${idx}`,
          role: 'patient',
          hospital_id: hid,
          email,
          passwordHash: await bcrypt.hash('demo1234', 10),
          createdAt: new Date(now.getTime() - Math.floor(Math.random()*180)*24*60*60*1000),
          demo: true
        });
      }
      if (patients.length) await User.insertMany(patients, { ordered: false }).catch(()=>{});

      // 2) Generate therapy sessions over last 180 days (dense)
      const types = ['Panchakarma','Shirodhara','Abhyanga','Basti','Udwarthanam','Swedana','Other'];
      const sessions = [];
      for (let d = 0; d < 180; d++) {
        const day = new Date(now.getTime() - d*24*60*60*1000);
        const n = 6 + Math.floor(Math.random()*9); // 6-14 per day
        for (let i = 0; i < n; i++) {
          const type = types[Math.floor(Math.random()*types.length)];
          const createdAt = new Date(day.getTime() + Math.floor(Math.random()*10)*60*60*1000);
          const r = Math.random();
          const status = r < 0.78 ? 'completed' : r < 0.92 ? 'scheduled' : 'cancelled';
          const outcomes = status==='completed' ? { completed_at: new Date(createdAt.getTime() + (1+Math.floor(Math.random()*3))*60*60*1000) } : {};
          sessions.push({ hospital_id: hid, therapy_type: type, status, createdAt, scheduled_at: createdAt, outcomes, demo: true });
        }
      }
      if (sessions.length) await TherapySession.insertMany(sessions, { ordered: false }).catch(()=>{});

      // 3) Finance transactions per month (rich categories)
      const tx = [];
      const cats = ['therapy','medicines','supplies','salary','rent','marketing'];
      for (let m = 0; m < months; m++) {
        const base = new Date(now.getFullYear(), now.getMonth()-m, 5);
        const monthlyIncome = 140000 + Math.round(Math.random()*120000) + (months-m)*5000;
        tx.push({ hospital_id: hid, type: 'income', category: 'therapy', amount: monthlyIncome, created_at: base, demo: true });
        // spread expenses through the month
        cats.filter(c=>c!=='therapy').forEach((c, idx) => {
          const day = new Date(base.getFullYear(), base.getMonth(), 7 + idx*4);
          const amt = 20000 + Math.round(Math.random()*50000);
          tx.push({ hospital_id: hid, type: 'expense', category: c, amount: amt, created_at: day, demo: true });
        });
      }
      if (tx.length) await FinanceTransaction.insertMany(tx, { ordered: false }).catch(()=>{});

      // 4) Patient feedbacks
      const fbs = [];
      for (let i = 0; i < feedbackPerClinic; i++) {
        const created = new Date(now.getTime() - Math.floor(Math.random() * 60) * 86400000);
        fbs.push({
          hospital_id: hid,
          rating: Math.min(5, Math.max(1, Math.round(3 + (Math.random() * 2)))) ,
          comment: 'Demo feedback',
          created_at: created,
          demo: true
        });
      }
      if (fbs.length) {
        await PatientFeedback.insertMany(fbs).catch(()=>{});
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
    // Only show clinics created/managed by this super admin
    if (req.user?._id) {
      match.super_admin_id = req.user._id;
    }
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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);

    const user = new User({
      name: full_name,
      email: email || undefined,
      username: username || undefined,
      passwordHash,
      role: 'clinic_admin',
      hospital_id: hid
    });
    await user.save();

    // Send credentials email to clinic and/or admin
    try {
      const hospital = await Hospital.findById(hid).lean();
      const loginBase = process.env.APP_URL || (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '').split(',')[0] || 'http://localhost:5173';
      const loginUrl = `${loginBase}`;
      const recipients = [email, hospital?.email].filter(Boolean).join(', ');
      if (recipients) {
        const subject = `Clinic Admin Access for ${hospital?.name || 'your clinic'}`;
        const userIdent = email || username;
        const html = `
          <div style="font-family:Arial,sans-serif;">
            <h2>Welcome to AyurSutra</h2>
            <p>Clinic <strong>${hospital?.name || ''}</strong> has been set up with an Admin account.</p>
            <div style="margin:10px 0;padding:10px;border:1px solid #eee;border-radius:8px;background:#fafafa">
              <p style="margin:0 0 6px 0"><strong>Clinic details</strong></p>
              <p style="margin:0">Name: ${hospital?.name || ''}</p>
              <p style="margin:0">Address: ${hospital?.address || ''}</p>
              <p style="margin:0">City/State: ${hospital?.city || ''}${hospital?.state ? ', ' + hospital.state : ''}</p>
              <p style="margin:0">Phone: ${hospital?.phone || ''}</p>
              <p style="margin:0">Email: ${hospital?.email || ''}</p>
            </div>
            <p><strong>Admin Name:</strong> ${full_name}</p>
            <p><strong>Login:</strong> ${userIdent}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
            <p>Sign in here: <a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>
            <p style="margin-top:10px;color:#555">For security, please sign in and change your password immediately.</p>
          </div>
        `;
        const text = `Clinic Admin Access\nClinic: ${hospital?.name || ''}\nAddress: ${hospital?.address || ''}\nCity/State: ${hospital?.city || ''}${hospital?.state ? ', ' + hospital.state : ''}\nPhone: ${hospital?.phone || ''}\nEmail: ${hospital?.email || ''}\nAdmin: ${full_name}\nLogin: ${userIdent}\nTemporary Password: ${password}\nSign in: ${loginUrl}`;
        await sendMail({ to: recipients, subject, text, html });
      }
    } catch (mailErr) {
      console.warn('[SuperAdmin] Failed to send clinic admin credentials email:', mailErr?.message || mailErr);
    }
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

    // Notify reassigned admin and clinic email
    try {
      const hospital = await Hospital.findById(hid).lean();
      const loginBase = process.env.APP_URL || (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '').split(',')[0] || 'http://localhost:5173';
      const loginUrl = `${loginBase}`;
      const recipients = [newAdmin.email, hospital?.email].filter(Boolean).join(', ');
      if (recipients) {
        const subject = `You are now Clinic Admin for ${hospital?.name || 'your clinic'}`;
        const html = `
          <div style="font-family:Arial,sans-serif;">
            <h2>Admin Role Assigned</h2>
            <p>Hello ${newAdmin.name || 'User'}, you have been assigned as <strong>Clinic Admin</strong> for <strong>${hospital?.name || ''}</strong>.</p>
            <div style="margin:10px 0;padding:10px;border:1px solid #eee;border-radius:8px;background:#fafafa">
              <p style="margin:0 0 6px 0"><strong>Clinic details</strong></p>
              <p style="margin:0">Name: ${hospital?.name || ''}</p>
              <p style="margin:0">Address: ${hospital?.address || ''}</p>
              <p style="margin:0">City/State: ${hospital?.city || ''}${hospital?.state ? ', ' + hospital.state : ''}</p>
              <p style="margin:0">Phone: ${hospital?.phone || ''}</p>
              <p style="margin:0">Email: ${hospital?.email || ''}</p>
            </div>
            <p>Please sign in using your existing account credentials.</p>
            <p>Sign in: <a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>
            <p style="margin-top:10px;color:#555">If you forgot your password, please contact support to reset it.</p>
          </div>
        `;
        const text = `You are now Clinic Admin for ${hospital?.name || ''}.\nAddress: ${hospital?.address || ''}\nCity/State: ${hospital?.city || ''}${hospital?.state ? ', ' + hospital.state : ''}\nPhone: ${hospital?.phone || ''}\nEmail: ${hospital?.email || ''}\nSign in: ${loginUrl}`;
        await sendMail({ to: recipients, subject, text, html });
      }
    } catch (mailErr) {
      console.warn('[SuperAdmin] Failed to send reassignment email:', mailErr?.message || mailErr);
    }

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
