import { Router } from 'express';
import { register, login, getMe, dismissTutorial } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.patch('/dismiss-tutorial', requireAuth, dismissTutorial);

export default router;
