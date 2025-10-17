import { Report } from '../models/Report.js';

function isSuper(user) { return user?.role === 'super_admin'; }
function isHospAdmin(user) { return user?.role === 'hospital_admin' || user?.role === 'admin'; }

export const listReports = async (req, res) => {
  try {
    const filter = {};
    if (!isSuper(req.user)) {
      filter.scope = 'hospital';
      if (req.user.hospital_id) filter.hospital_id = req.user.hospital_id;
      else return res.json({ reports: [] });
    }
    const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ reports });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const generateReport = async (req, res) => {
  try {
    // Only super admin or hospital admins can generate
    if (!(isSuper(req.user) || isHospAdmin(req.user))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const body = req.body || {};
    let scope = 'hospital';
    let hospital_id = null;

    if (isSuper(req.user) && body.scope === 'global') {
      scope = 'global';
    } else {
      hospital_id = req.user.hospital_id || body.hospital_id || null;
    }

    const report = await Report.create({
      title: body.title || (scope === 'global' ? 'Global Report' : 'Hospital Report'),
      scope,
      hospital_id,
      payload: body.payload || {},
      generated_at: new Date(),
    });

    res.status(201).json({ report });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad request' });
  }
};
