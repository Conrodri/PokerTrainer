import { Router } from 'express';
import { requireAuth, requirePremiumExpert } from '../middleware/auth';
import { getExpertRange, saveExpertRange, deleteExpertRange } from '../controllers/expertRangesController';

const router = Router();

// All expert-range routes are reserved for the premium-expert tier.
router.use(requireAuth, requirePremiumExpert);

router.get('/:position',    getExpertRange);
router.put('/:position',    saveExpertRange);
router.delete('/:position', deleteExpertRange);

export default router;
