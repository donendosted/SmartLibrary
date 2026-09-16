import { Router } from 'express';
import { db, serializeMany } from '../db.js';
import { authenticate } from '../middleware/auth.js';
const router = Router(); router.use(authenticate);
router.get('/', async (req, res) => res.json({ data: serializeMany(await db().collection('notifications').find({ user_id: req.user.user_id }).sort({ created_at: -1 }).toArray()) }));
export default router;
