// backend-api/src/controllers/entityController.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export class EntityController {
  private cacheService = new CacheService();

  /**
   * Mettre à jour une entité
   */
  updateEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, entityId } = req.params;
      const updates = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Trouver et mettre à jour l'entité
      const entityIndex = sessionData.entities.findIndex(e => e.id === entityId);
      if (entityIndex === -1) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }

      sessionData.entities[entityIndex] = {
        ...sessionData.entities[entityIndex],
        ...updates,
        isModified: true,
      };

      // Sauvegarder la session mise à jour
      await this.cacheService.updateSession(sessionId, sessionData);

      res.json({
        success: true,
        entity: sessionData.entities[entityIndex],
      });

    } catch (error) {
      logger.error('Update entity error:', error);
      next(error);
    }
  };

  /**
   * Supprimer une entité
   */
  deleteEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, entityId } = req.params;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Filtrer l'entité à supprimer
      const initialLength = sessionData.entities.length;
      sessionData.entities = sessionData.entities.filter(e => e.id !== entityId);

      if (sessionData.entities.length === initialLength) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }

      // Recalculer les statistiques
      sessionData.statistics = {
        ...sessionData.statistics,
        totalEntities: sessionData.entities.length,
        entitiesByType: this.calculateEntityStats(sessionData.entities),
      };

      await this.cacheService.updateSession(sessionId, sessionData);

      res.json({
        success: true,
        message: 'Entity deleted successfully',
        statistics: sessionData.statistics,
      });

    } catch (error) {
      logger.error('Delete entity error:', error);
      next(error);
    }
  };

  /**
   * Créer un groupe d'entités
   */
  createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { name, entityIds, replacementPattern } = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Créer le nouveau groupe
      const newGroup = {
        id: uuidv4(),
        name,
        entities: entityIds,
        replacementPattern: replacementPattern || `${name.toUpperCase()}_[INDEX]`,
        color: this.generateGroupColor(),
        createdAt: new Date().toISOString(),
      };

      // Mettre à jour les entités avec le groupId
      sessionData.entities = sessionData.entities.map(entity => 
        entityIds.includes(entity.id) 
          ? { ...entity, groupId: newGroup.id }
          : entity
      );

      // Ajouter le groupe
      sessionData.groups.push(newGroup);

      await this.cacheService.updateSession(sessionId, sessionData);

      res.json({
        success: true,
        group: newGroup,
        message: `Group "${name}" created with ${entityIds.length} entities`,
      });

    } catch (error) {
      logger.error('Create group error:', error);
      next(error);
    }
  };

  /**
   * Mettre à jour un groupe
   */
  updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, groupId } = req.params;
      const updates = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      const groupIndex = sessionData.groups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      sessionData.groups[groupIndex] = {
        ...sessionData.groups[groupIndex],
        ...updates,
      };

      await this.cacheService.updateSession(sessionId, sessionData);

      res.json({
        success: true,
        group: sessionData.groups[groupIndex],
      });

    } catch (error) {
      logger.error('Update group error:', error);
      next(error);
    }
  };

  /**
   * Supprimer un groupe
   */
  deleteGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, groupId } = req.params;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Supprimer le groupe
      const initialLength = sessionData.groups.length;
      sessionData.groups = sessionData.groups.filter(g => g.id !== groupId);

      if (sessionData.groups.length === initialLength) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      // Enlever le groupId des entités
      sessionData.entities = sessionData.entities.map(entity =>
        entity.groupId === groupId 
          ? { ...entity, groupId: undefined }
          : entity
      );

      await this.cacheService.updateSession(sessionId, sessionData);

      res.json({
        success: true,
        message: 'Group deleted successfully',
      });

    } catch (error) {
      logger.error('Delete group error:', error);
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

  private generateGroupColor(): string {
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-orange-100 border-orange-300 text-orange-800',
      'bg-pink-100 border-pink-300 text-pink-800',
      'bg-indigo-100 border-indigo-300 text-indigo-800',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}