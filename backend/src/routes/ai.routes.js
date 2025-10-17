import { Router } from 'express';
import { generateWithGemini } from '../controllers/ai.controller.js';

const router = Router();

// Public AI route; no auth required so chatbot works on all pages
router.post('/gemini', generateWithGemini);

export default router;
