import express from 'express';
import { checkAuthMiddleware } from '../../../../middleware/checkAuthMiddleware.js';
import { OutlookSyncController } from './outlookSync.controller.js';


const router = express.Router();

// All routes are protected and restricted to PROJECT_MANAGER
router.use(checkAuthMiddleware('PROJECT_MANAGER'));

router.get('/unified-inbox', OutlookSyncController.getUnifiedInbox);
router.get('/all-synced', OutlookSyncController.getAllOutlooks);
router.delete('/:id', OutlookSyncController.deleteOutlook);
router.post('/sync', OutlookSyncController.syncInbox);

export const OutlookSyncRoutes = router;
