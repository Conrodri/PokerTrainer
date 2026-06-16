import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getExamRecords, saveExamScore } from '../controllers/examController';

const router = Router();

// Exam best-score records are tied to the account → auth required.
router.use(requireAuth);

router.get('/records', getExamRecords);
router.post('/record', saveExamScore);

export default router;
