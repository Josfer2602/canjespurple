import { Router } from 'express';
import { createRedemption, getHistory, checkDniLimit } from '../controllers/redemption.controller';

const router = Router();

router.post('/', createRedemption);
router.get('/history', getHistory);
router.get('/check-dni', checkDniLimit);

export default router;
