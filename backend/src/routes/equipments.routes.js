import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listEquipment, createEquipment, updateEquipment, deleteEquipment } from '../controllers/equipments.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listEquipment);
router.post('/', requireAuth, withUser, createEquipment);
router.put('/:id', requireAuth, withUser, updateEquipment);
router.delete('/:id', requireAuth, withUser, deleteEquipment);

export default router;
