import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cacheService';
import { AIService } from '../services/aiService';
import { logger } from '../utils/logger';

export class SearchController {
  private cacheService = new CacheService();
  private aiService = new AIService();

  /**
   * Recherche de texte simple ou regex
   */
  searchText = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { query, mode = 'text', caseSensitive = false, maxResults = 50 } = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      const text = sessionData.document.content.text;
      const results = await this.performTextSearch(text, query, mode, caseSensitive, maxResults);

      res.json({
        success: true,
        query,
        mode,
        results,
        total: results.length,
      });

    } catch (error) {
      logger.error('Text search error:', error);
      next(error);
    }
  };

  /**
   * Recherche d'entités similaires
   */
  findSimilarEntities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { entityType, similarityThreshold = 0.8 } = req.body;

      const sessionData = await this.cacheService.getSession(sessionId);
      if (!sessionData) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Filtrer par type d'entité
      const entitiesOfType = sessionData.entities.filter(e => e.type === entityType);
      
      // Grouper les entités similaires
      const groups = this.findSimilarEntityGroups(entitiesOfType, similarityThreshold);

      res.json({
        success: true,
        entityType,
        groups,
        total: groups.length,
      });

    } catch (error) {
      logger.error('Similar entities search error:', error);
      next(error);
    }
  };

  // Méthodes utilitaires
  private async performTextSearch(
    text: string,
    query: string,
    mode: string,
    caseSensitive: boolean,
    maxResults: number
  ): Promise<any[]> {
    const results: any[] = [];
    let searchRegex: RegExp;

    try {
      if (mode === 'regex') {
        searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
      }

      let match;
      let resultId = 0;

      while ((match = searchRegex.exec(text)) !== null && results.length < maxResults) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(text.length, match.index + match[0].length + 100);
        const context = text.substring(start, end);

        results.push({
          id: `search_${++resultId}`,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
          page: Math.ceil(match.index / 3000),
          context: context,
          beforeContext: text.substring(start, match.index),
          afterContext: text.substring(match.index + match[0].length, end),
        });
      }

      return results;

    } catch (error) {
      if (mode === 'regex') {
        throw new Error(`Invalid regex pattern: ${error.message}`);
      }
      throw error;
    }
  }

  private findSimilarEntityGroups(entities: any[], threshold: number): any[] {
    const groups: any[] = [];
    const processed = new Set<string>();

    entities.forEach(entity => {
      if (processed.has(entity.id)) return;

      const similarEntities = entities.filter(other => {
        if (other.id === entity.id || processed.has(other.id)) return false;
        return this.calculateSimilarity(entity.value, other.value) >= threshold;
      });

      if (similarEntities.length > 0) {
        const group = {
          id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          representative: entity,
          entities: [entity, ...similarEntities],
          similarity: threshold,
        };

        groups.push(group);
        
        // Marquer toutes les entités du groupe comme traitées
        [entity, ...similarEntities].forEach(e => processed.add(e.id));
      }
    });

    return groups;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Implémentation simple de similarité (Levenshtein distance normalisée)
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}