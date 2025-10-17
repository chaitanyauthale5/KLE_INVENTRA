import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import {
  listClinics,
  getClinicFinances,
  createClinicAdmin,
  reassignClinicAdmin,
  listDoctorsByClinic,
  listFeedbacksByClinic,
  getClinicProgress,
  seedDemoData,
  getGlobalAnalytics
} from '../controllers/superadmin.controller.js';

const router = Router();

// Require auth for all routes under /superadmin
router.use(requireAuth);

// super_admin-only routes
router.get('/clinics', authorize('super_admin'), listClinics);
router.get('/clinics/:hospitalId/finances', authorize('super_admin'), getClinicFinances);
router.get('/clinics/:hospitalId/doctors', authorize('super_admin'), listDoctorsByClinic);
router.get('/clinics/:hospitalId/feedbacks', authorize('super_admin'), listFeedbacksByClinic);
router.get('/clinics/:hospitalId/progress', authorize('super_admin'), getClinicProgress);

// analytics routes available to broader admin roles
router.get('/analytics/global', authorize('super_admin','clinic_admin','hospital_admin','admin'), getGlobalAnalytics);

// DEV utility: seed demo data for charts
router.post('/seed', authorize('super_admin','clinic_admin','hospital_admin','admin'), seedDemoData);

router.post('/clinics/:hospitalId/admin', authorize('super_admin'), createClinicAdmin);
router.put('/clinics/:hospitalId/admin', authorize('super_admin'), reassignClinicAdmin);

export default router;
