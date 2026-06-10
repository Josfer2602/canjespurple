import { Router } from 'express';
import { importPoints, importInventory, importRules } from '../controllers/import.controller';

const router = Router();

router.post('/points', importPoints);
router.post('/inventory', importInventory);
router.post('/rules', importRules);

export default router;
