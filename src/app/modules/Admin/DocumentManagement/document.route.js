import express from 'express';
import { checkInternalService } from '../../../middleware/checkInternalService.js';
import { DocumentController } from './document.controller.js';

const router = express.Router();


// Public API protected by internal service key (x-backend-service)
router.get(
    '/public/all',
    checkInternalService(),
    DocumentController.getAllDocumentsForAi
);

router.get(
    '/public/:id',
     checkInternalService(),
    DocumentController.getSingleDocument
);


export const AdminDocumentRoutes = router;
