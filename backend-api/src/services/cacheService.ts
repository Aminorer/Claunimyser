// backend-api/src/services/cacheService.ts
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface SessionData {
  sessionId: string;
  document: {
    filename: string;
    format: string;
    size: number;
    content: any;
    uploadedAt: string;
  };
  entities: any[];
  groups: any[];
  mode: string;
  statistics: {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    lastModified?: string;
  };
  createdAt: string;
  lastAccessed: string;
}

export class CacheService {
  private redis: Redis;
  private readonly SESSION_PREFIX = 'session:';
  private readonly DEFAULT_TTL = config.redis.sessionTTL; // 2 heures

  constructor() {
    this.redis = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Sauvegarder une session
   */
  async setSession(sessionId: string, data: Omit<SessionData, 'sessionId' | 'createdAt' | 'lastAccessed'>): Promise<void> {
    try {
      const sessionData: SessionData = {
        ...data,
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };

      const key = `${this.SESSION_PREFIX}${sessionId}`;
      
      await this.redis.setex(
        key,
        this.DEFAULT_TTL,
        JSON.stringify(sessionData)
      );

      logger.info(`Session ${sessionId} saved to cache (TTL: ${this.DEFAULT_TTL}s)`);

    } catch (error) {
      logger.error(`Failed to save session ${sessionId}:`, error);
      throw new Error(`Cache error: ${error.message}`);
    }
  }

  /**
   * Récupérer une session
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const data = await this.redis.get(key);

      if (!data) {
        logger.warn(`Session ${sessionId} not found or expired`);
        return null;
      }

      const sessionData = JSON.parse(data) as SessionData;
      
      // Mettre à jour le timestamp d'accès et prolonger le TTL
      sessionData.lastAccessed = new Date().toISOString();
      await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(sessionData));

      logger.info(`Session ${sessionId} retrieved from cache`);
      return sessionData;

    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Mettre à jour une session existante
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    try {
      const existingSession = await this.getSession(sessionId);
      
      if (!existingSession) {
        logger.warn(`Cannot update non-existent session ${sessionId}`);
        return false;
      }

      const updatedSession: SessionData = {
        ...existingSession,
        ...updates,
        sessionId, // Préserver l'ID
        lastAccessed: new Date().toISOString(),
      };

      const key = `${this.SESSION_PREFIX}${sessionId}`;
      await this.redis.setex(key, this.DEFAULT_TTL, JSON.stringify(updatedSession));

      logger.info(`Session ${sessionId} updated in cache`);
      return true;

    } catch (error) {
      logger.error(`Failed to update session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Supprimer une session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const result = await this.redis.del(key);

      if (result === 1) {
        logger.info(`Session ${sessionId} deleted from cache`);
        return true;
      } else {
        logger.warn(`Session ${sessionId} was not found for deletion`);
        return false;
      }

    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Lister toutes les sessions actives (pour monitoring)
   */
  async listActiveSessions(): Promise<string[]> {
    try {
      const keys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
      const sessionIds = keys.map(key => key.replace(this.SESSION_PREFIX, ''));
      
      logger.info(`Found ${sessionIds.length} active sessions`);
      return sessionIds;

    } catch (error) {
      logger.error('Failed to list active sessions:', error);
      return [];
    }
  }

  /**
   * Obtenir les statistiques des sessions
   */
  async getSessionStats(): Promise<{
    activeSessions: number;
    totalMemoryUsage: string;
    oldestSession: string | null;
  }> {
    try {
      const sessionIds = await this.listActiveSessions();
      const memoryUsage = await this.redis.memory('usage');
      
      let oldestSession: string | null = null;
      let oldestDate = new Date();

      // Trouver la session la plus ancienne
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          const createdAt = new Date(session.createdAt);
          if (createdAt < oldestDate) {
            oldestDate = createdAt;
            oldestSession = sessionId;
          }
        }
      }

      return {
        activeSessions: sessionIds.length,
        totalMemoryUsage: `${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`,
        oldestSession,
      };

    } catch (error) {
      logger.error('Failed to get session stats:', error);
      return {
        activeSessions: 0,
        totalMemoryUsage: '0 MB',
        oldestSession: null,
      };
    }
  }

  /**
   * Nettoyer les sessions expirées (appelé par un cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const sessionIds = await this.listActiveSessions();
      let deletedCount = 0;
      const now = new Date();
      const maxAge = this.DEFAULT_TTL * 1000; // Convertir en millisecondes

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          const lastAccessed = new Date(session.lastAccessed);
          const age = now.getTime() - lastAccessed.getTime();
          
          if (age > maxAge) {
            await this.deleteSession(sessionId);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired sessions`);
      }

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Test de connectivité Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Sauvegarder des données temporaires (ex: résultats de recherche)
   */
  async setTemporaryData(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await this.redis.setex(
        `temp:${key}`,
        ttl,
        JSON.stringify(data)
      );
      
      logger.debug(`Temporary data saved with key: temp:${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Failed to save temporary data ${key}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer des données temporaires
   */
  async getTemporaryData(key: string): Promise<any | null> {
    try {
      const data = await this.redis.get(`temp:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Failed to get temporary data ${key}:`, error);
      return null;
    }
  }

  /**
   * Incrémenter un compteur (ex: nombre de documents traités)
   */
  async incrementCounter(key: string): Promise<number> {
    try {
      return await this.redis.incr(`counter:${key}`);
    } catch (error) {
      logger.error(`Failed to increment counter ${key}:`, error);
      return 0;
    }
  }

  /**
   * Fermer la connexion Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}