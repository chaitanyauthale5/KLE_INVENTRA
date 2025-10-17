import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withUser } from '../middleware/hospitalScope.js';
import { listRooms, createRoom, updateRoom, deleteRoom } from '../controllers/rooms.controller.js';

const router = Router();

router.get('/', requireAuth, withUser, listRooms);
router.post('/', requireAuth, withUser, createRoom);
router.put('/:id', requireAuth, withUser, updateRoom);
router.delete('/:id', requireAuth, withUser, deleteRoom);

export default router;
