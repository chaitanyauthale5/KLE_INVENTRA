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
  seedDemoData
} from '../controllers/superadmin.controller.js';

const router = Router();

router.use(requireAuth, authorize('super_admin'));

router.get('/clinics', listClinics);
router.get('/clinics/:hospitalId/finances', getClinicFinances);
router.get('/clinics/:hospitalId/doctors', listDoctorsByClinic);
router.get('/clinics/:hospitalId/feedbacks', listFeedbacksByClinic);
router.get('/clinics/:hospitalId/progress', getClinicProgress);

// DEV utility: seed demo data for charts
router.post('/seed', seedDemoData);

router.post('/clinics/:hospitalId/admin', createClinicAdmin);
router.put('/clinics/:hospitalId/admin', reassignClinicAdmin);

export default router;
