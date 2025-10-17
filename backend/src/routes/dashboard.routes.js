import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';

const router = Router();

// Global dashboards (Super Admin / Ministry)
router.get('/global', requireAuth, authorize('super_admin'), (req, res) => {
  res.json({
    role: req.user.role,
    sections: [
      'Global Dashboard',
      'Hospitals',
      'Global Analytics',
      'Global Reports',
      'All Patients',
      'Staff',
      'Therapy Scheduling (overview)',
      'Notifications',
      'Settings',
    ],
  });
});

// Hospital Admin dashboard
router.get('/hospital', requireAuth, authorize('hospital_admin'), (req, res) => {
  res.json({
    role: req.user.role,
    hospital_id: req.user.hospital_id || null,
    sections: [
      'Hospital Dashboard',
      'Staff',
      'Patients (hospital only)',
      'Therapy Scheduling',
      'Notifications',
      'Reports (hospital-specific)',
      'Settings (hospital only)',
    ],
  });
});

// Doctor dashboard
router.get('/doctor', requireAuth, authorize('doctor'), (req, res) => {
  res.json({
    role: req.user.role,
    sections: [
      'Doctor Dashboard',
      'Assigned Patients',
      'Therapy Scheduling (approve/recommend)',
      'Notifications',
    ],
  });
});

// Therapist dashboard removed

// Patient dashboard
router.get('/patient', requireAuth, authorize('patient'), (req, res) => {
  res.json({
    role: req.user.role,
    sections: [
      'Patient Dashboard',
      'Therapy Scheduling (view only)',
      'Notifications',
      'Feedback / report symptoms',
    ],
  });
});

// Guardian dashboard
router.get('/guardian', requireAuth, authorize('guardian'), (req, res) => {
  res.json({
    role: req.user.role,
    sections: [
      "Guardian Dashboard",
      "Patient’s Therapy Schedule (view only)",
      'Notifications',
    ],
  });
});

// Office Executive dashboard
router.get('/office_executive', requireAuth, authorize('office_executive'), (req, res) => {
  res.json({
    role: req.user.role,
    sections: [
      'Support Dashboard',
      'Notifications',
      'Assist in patient onboarding, tech issues, queries',
    ],
  });
});

export default router;
