import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { createFinance, listFinances, approveFinance, rejectFinance } from '../controllers/finances.controller.js';

const router = Router();

router.use(requireAuth, withUser);

router.post('/', authorize('super_admin','clinic_admin','hospital_admin','office_executive'), createFinance);
router.get('/', authorize('super_admin','clinic_admin','hospital_admin','office_executive'), listFinances);
router.post('/:id/approve', authorize('super_admin','clinic_admin','hospital_admin'), approveFinance);
router.post('/:id/reject', authorize('super_admin','clinic_admin','hospital_admin'), rejectFinance);

export default router;
