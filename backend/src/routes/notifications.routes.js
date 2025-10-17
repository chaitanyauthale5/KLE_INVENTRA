import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listNotifications, createNotification, markRead, registerFcmToken } from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listNotifications);
router.post('/', requireAuth, withUser, createNotification);
router.patch('/:id/read', requireAuth, withUser, markRead);
router.post('/register-token', requireAuth, withUser, registerFcmToken);

export default router;
