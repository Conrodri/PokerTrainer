import { Router } from 'express';
import { requireAuth, premiumOrFreeQuota } from '../middleware/auth';
import { getPostflopExercise, getFullHandScenario } from '../controllers/postflopController';

const router = Router();

// Premium modules, but non-premium users get a daily free allowance (see quota service).
router.get('/exercise',  requireAuth, premiumOrFreeQuota('postflop'), getPostflopExercise);
router.get('/full-hand', requireAuth, premiumOrFreeQuota('fullhand'), getFullHandScenario);

export default router;
