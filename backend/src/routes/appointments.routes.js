import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAppointment, listMyAppointments, cancelMyAppointment, rescheduleMyAppointment, listMyStaffAppointments, confirmAppointment, completeAppointment } from '../controllers/appointments.controller.js';

const router = Router();

router.get('/mine', requireAuth, listMyAppointments);
router.post('/', requireAuth, createAppointment);
router.post('/:id/cancel', requireAuth, cancelMyAppointment);
router.patch('/:id/reschedule', requireAuth, rescheduleMyAppointment);
router.get('/staff/mine', requireAuth, listMyStaffAppointments);
router.post('/:id/confirm', requireAuth, confirmAppointment);
router.post('/:id/complete', requireAuth, completeAppointment);

export default router;
