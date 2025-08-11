// backend-api/src/controllers/documentController.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DocumentService } from '../services/documentService';
import { AIService } from '../services/aiService';
import { CacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export class DocumentController {
  private documentService = new DocumentService();
  private aiService = new AIService();
  private cacheService = new CacheService();

  /**
   * Upload et traitement d'un document en une seule étape
   */
  uploadAndProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { originalname, mimetype, buffer } = req.file;
      const { mode = 'regex' } = req.body;
      const sessionId = uuidv4();

      logger.info(`Processing document: ${originalname} (${buffer.length} bytes, mode: ${mode})`);

      // 1. Extraction du contenu
      const documentContent = await this.documentService.extractContent(buffer, mimetype);
      
      // 2. Analyse des entités selon le mode
      let entities;
      if (mode === 'ia') {
        entities = await this.aiService.extractEntities(documentContent.text, mode);
      } else {
        entities = await this.documentService.extractEntitiesRegex(documentContent.text);
      }

      // 3. Création de la session temporaire
      const sessionData = {
        sessionId,
        document: {
          filename: originalname,
          format: mimetype.includes('pdf') ? 'pdf' : 'docx',
          size: buffer.length,
          content: documentContent,
          uploadedAt: new Date().toISOString(),
        },
        entities,
        groups: [],
        mode,
        statistics: {
          totalEntities: entities.length,
          entitiesByType: this.calculateEntityStats(entities),
        },
      };

      // 4. Stocker en cache (Redis) pour 2h
      await this.cacheService.setSession(sessionId, sessionData);

      res.json({
        success: true,
        sessionId,
        document: {
          filename: originalname,
          format: sessionData.document.format,
          size: buffer.length,
        },
        entities: entities.length,
        mode,
        statistics: sessionData.statistics,
      });

    } catch (error) {
      logger.error('Upload and process error:', error);
      next(error);
    }
  };

  /**
   * Récupérer les entités d'une session
   */
  getEntities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { confidenceThreshold } = req.query;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      let entities = sessionData.entities;

      // Filtrage par confiance si spécifié
      if (confidenceThreshold) {
        const threshold = parseFloat(confidenceThreshold as string);
        entities = entities.filter(entity => 
          !entity.confidence || entity.confidence >= threshold
        );
      }

      res.json({
        success: true,
        entities,
        groups: sessionData.groups,
        statistics: {
          ...sessionData.statistics,
          filtered: entities.length,
        },
      });

    } catch (error) {
      logger.error('Get entities error:', error);
      next(error);
    }
  };

  /**
   * Mettre à jour les entités
   */
  updateEntities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { entities, groups } = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Mettre à jour les données
      sessionData.entities = entities;
      sessionData.groups = groups || sessionData.groups;
      sessionData.statistics = {
        ...sessionData.statistics,
        totalEntities: entities.length,
        entitiesByType: this.calculateEntityStats(entities),
        lastModified: new Date().toISOString(),
      };

      // Sauvegarder en cache
      await this.cacheService.setSession(sessionId, sessionData);

      res.json({
        success: true,
        message: 'Entities updated successfully',
        statistics: sessionData.statistics,
      });

    } catch (error) {
      logger.error('Update entities error:', error);
      next(error);
    }
  };

  /**
   * Exporter le document anonymisé
   */
  exportDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { format = 'docx', options = {} } = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Générer le document anonymisé
      const anonymizedDocument = await this.documentService.generateAnonymizedDocument(
        sessionData.document,
        sessionData.entities,
        format,
        options
      );

      // Définir les en-têtes pour le téléchargement
      const filename = `${sessionData.document.filename.replace(/\.[^/.]+$/, '')}_anonymise.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getContentType(format));

      res.send(anonymizedDocument);

    } catch (error) {
      logger.error('Export document error:', error);
      next(error);
    }
  };

  /**
   * Supprimer une session
   */
  deleteSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;

      await this.cacheService.deleteSession(sessionId);

      res.json({
        success: true,
        message: 'Session deleted successfully',
      });

    } catch (error) {
      logger.error('Delete session error:', error);
      next(error);
    }
  };

  // Méthodes utilitaires
  private calculateEntityStats(entities: any[]): Record<string, number> {
    return entities.reduce((stats, entity) => {
      stats[entity.type] = (stats[entity.type] || 0) + 1;
      return stats;
    }, {});
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}