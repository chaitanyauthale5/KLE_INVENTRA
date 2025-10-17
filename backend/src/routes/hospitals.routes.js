import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listHospitals, getHospital, createHospital, updateHospital, deleteHospital, assignStaff, listStaff, removeStaff, getHospitalSummary, updateStaff } from '../controllers/hospitals.controller.js';

const router = Router();

// Super admin has full control; hospital_admin can read/update their own hospital
router.get('/', requireAuth, withUser, listHospitals);
router.get('/:id', requireAuth, withUser, getHospital);
router.get('/:id/summary', requireAuth, withUser, getHospitalSummary);
router.post('/', requireAuth, withUser, authorize('super_admin','admin','hospital_admin'), createHospital);
router.put('/:id', requireAuth, withUser, updateHospital);
router.delete('/:id', requireAuth, withUser, authorize('super_admin','admin','hospital_admin'), deleteHospital);
router.post('/:id/staff', requireAuth, withUser, authorize('super_admin','admin','hospital_admin','clinic_admin'), assignStaff);
router.get('/:id/staff', requireAuth, withUser, authorize('super_admin','admin','hospital_admin','clinic_admin','doctor','patient','office_executive','guardian'), listStaff);
router.put('/:id/staff/:userId', requireAuth, withUser, authorize('super_admin','admin','hospital_admin','clinic_admin'), updateStaff);
router.delete('/:id/staff/:userId', requireAuth, withUser, authorize('super_admin','admin','hospital_admin','clinic_admin'), removeStaff);

export default router;
