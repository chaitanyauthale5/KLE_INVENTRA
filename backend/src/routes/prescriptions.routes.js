import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listPrescriptions, createPrescription, deletePrescription, listMyPrescriptions } from '../controllers/prescriptions.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listPrescriptions);
router.get('/mine', requireAuth, withUser, listMyPrescriptions);
router.post('/', requireAuth, withUser, createPrescription);
router.delete('/:id', requireAuth, withUser, deletePrescription);

export default router;
