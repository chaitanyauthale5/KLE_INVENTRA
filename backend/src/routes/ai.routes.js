import { Router } from 'express';

const router = Router();

// Minimal AI route placeholder so the server boots.
// Extend with actual handlers when AI endpoints are ready.
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
