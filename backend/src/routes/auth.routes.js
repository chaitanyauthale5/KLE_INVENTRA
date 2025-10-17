import { Router } from 'express';
import { body } from 'express-validator';
import { signin, signup, me, signout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Validation rules
const signupValidators = [
  body('name').isString().trim().isLength({ min: 2 }).withMessage('Name is required'),
  body().custom((val) => {
    if (!val.email && !val.phone) {
      throw new Error('Either email or phone is required');
    }
    if (val.email && typeof val.email === 'string') {
      const ok = /.+@.+\..+/.test(val.email);
      if (!ok) throw new Error('Valid email is required');
    }
    if (val.phone && String(val.phone).length < 5) {
      throw new Error('Valid phone is required');
    }
    return true;
  }),
  body('role').optional().isString(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const signinValidators = [
  body('identifier').isString().trim().isLength({ min: 1 }).withMessage('Email or phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.post('/signup', signupValidators, signup);
router.post('/signin', signinValidators, signin);
router.get('/me', requireAuth, me);
router.post('/signout', signout);

export default router;
