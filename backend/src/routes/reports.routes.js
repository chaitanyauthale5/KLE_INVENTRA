import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listReports, generateReport } from '../controllers/reports.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listReports);
router.post('/', requireAuth, withUser, generateReport);

export default router;
