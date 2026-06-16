import { Router } from 'express';
import authRoutes from './auth';
import trainingRoutes from './training';
import statsRoutes from './stats';
import rangesRoutes from './ranges';
import postflopRoutes from './postflop';
import profilesRoutes from './profiles';
import quotaRoutes from './quota';
import expertRangesRoutes from './expertRanges';
import examRoutes from './exam';

const router = Router();

router.use('/auth', authRoutes);
router.use('/training', trainingRoutes);
router.use('/stats', statsRoutes);
router.use('/ranges', rangesRoutes);
router.use('/postflop', postflopRoutes);
router.use('/profiles', profilesRoutes);
router.use('/quota', quotaRoutes);
router.use('/expert-ranges', expertRangesRoutes);
router.use('/exam', examRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
