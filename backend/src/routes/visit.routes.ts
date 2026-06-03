import { Router } from 'express';
import { startVisit, endVisit, getActiveVisit } from '../controllers/visit.controller';

const router = Router();

router.get('/get-active', getActiveVisit);
router.post('/start', startVisit);
router.post('/end', endVisit);

export default router;
