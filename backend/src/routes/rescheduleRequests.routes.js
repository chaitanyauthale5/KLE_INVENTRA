import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { createRequest, listRequests, actOnRequest } from '../controllers/rescheduleRequests.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listRequests);
router.post('/', requireAuth, withUser, createRequest);
router.patch('/:id', requireAuth, withUser, actOnRequest);

export default router;
