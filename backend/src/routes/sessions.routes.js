import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listSessions, createSession, updateSession, deleteSession } from '../controllers/sessions.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listSessions);
router.post('/', requireAuth, withUser, createSession);
router.put('/:id', requireAuth, withUser, updateSession);
router.delete('/:id', requireAuth, withUser, deleteSession);

export default router;
