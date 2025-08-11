// backend-api/src/routes/index.ts
import express from 'express';
import documentsRouter from './documents';
import entitiesRouter from './entities';
import searchRouter from './search';

const router = express.Router();

router.use('/documents', documentsRouter);
router.use('/entities', entitiesRouter);
router.use('/search', searchRouter);

// API info
router.get('/', (req, res) => {
  res.json({
    name: 'Anonymiseur Juridique API',
    version: '1.0.0',
    endpoints: {
      documents: '/api/documents',
      entities: '/api/entities', 
      search: '/api/search',
    },
  });
});

export default router;

// backend-api/src/routes/documents.ts
import express from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/documentController';
import { validateUpload } from '../middleware/validation';

const router = express.Router();
const documentController = new DocumentController();

// Configuration multer (stockage temporaire en mémoire)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    cb(null, allowedMimes.includes(file.mimetype));
  },
});

// Routes principales
router.post('/upload', 
  upload.single('document'),
  validateUpload,
  documentController.uploadAndProcess
);

router.get('/:sessionId/entities',
  documentController.getEntities
);

router.post('/:sessionId/entities',
  documentController.updateEntities
);

router.post('/:sessionId/export',
  documentController.exportDocument
);

router.delete('/:sessionId',
  documentController.deleteSession
);

export default router;

// backend-api/src/routes/entities.ts
import express from 'express';
import { EntityController } from '../controllers/entityController';

const router = express.Router();
const entityController = new EntityController();

// Opérations sur les entités
router.put('/:sessionId/:entityId',
  entityController.updateEntity
);

router.delete('/:sessionId/:entityId',
  entityController.deleteEntity
);

router.post('/:sessionId/groups',
  entityController.createGroup
);

router.put('/:sessionId/groups/:groupId',
  entityController.updateGroup
);

router.delete('/:sessionId/groups/:groupId',
  entityController.deleteGroup
);

export default router;

// backend-api/src/routes/search.ts
import express from 'express';
import { SearchController } from '../controllers/searchController';

const router = express.Router();
const searchController = new SearchController();

router.post('/:sessionId/text',
  searchController.searchText
);

router.post('/:sessionId/entities',
  searchController.findSimilarEntities
);

export default router;