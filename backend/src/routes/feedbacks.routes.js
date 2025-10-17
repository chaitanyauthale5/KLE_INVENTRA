import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listFeedbacks, createFeedback, updateFeedback } from '../controllers/feedbacks.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listFeedbacks);
router.post('/', requireAuth, withUser, createFeedback);
router.put('/:id', requireAuth, withUser, updateFeedback);
router.patch('/:id', requireAuth, withUser, updateFeedback);

export default router;
